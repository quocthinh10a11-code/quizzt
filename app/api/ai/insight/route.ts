import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/ai/auth";
import { checkAndRecordRateLimit } from "@/lib/ai/rateLimit";
import { getLearningInsight, type LearningInsightContext } from "@/lib/ai/provider";

const INSIGHT_RATE_LIMIT_PER_MINUTE = 5;
const MAX_WRONG_QUESTIONS = 20;
const MAX_TEXT_LENGTH = 4_000;

type AttemptAnswerRow = {
  question_id: number;
  question_content: string;
  difficulty: string | null;
  selected_index: number | null;
  correct_index: number;
  is_correct: boolean;
};

type QuestionRow = {
  id: number;
  options: string[];
  quiz_id: number | null;
};

type QuizRow = {
  id: number;
  chapter_id: number | null;
};

type ChapterRow = {
  id: number;
  name: string;
  subject_id: number | null;
};

type SubjectRow = {
  id: number;
  name: string;
};

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return NextResponse.json({ error: "Bạn cần đăng nhập để sử dụng tính năng này." }, { status: 401 });
    }

    const { supabase, userId } = authContext;
    const rateLimitResult = await checkAndRecordRateLimit(
      supabase,
      userId,
      "insight",
      INSIGHT_RATE_LIMIT_PER_MINUTE
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: `Bạn đã yêu cầu phân tích quá nhanh. Vui lòng đợi ${rateLimitResult.retryAfterSeconds} giây rồi thử lại.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const attemptId = body?.attemptId;

    if (!Number.isInteger(attemptId) || attemptId <= 0) {
      return NextResponse.json({ error: "Invalid attempt id." }, { status: 400 });
    }

    const { data: attempt, error: attemptError } = await supabase
      .from("quiz_attempts")
      .select("id, total_questions, correct_count")
      .eq("id", attemptId)
      .eq("user_id", userId)
      .maybeSingle();

    if (attemptError) {
      console.error("[learningInsight] Không thể tải attempt:", attemptError.message);
      return NextResponse.json({ error: "Không thể tải dữ liệu phiên học." }, { status: 500 });
    }

    if (!attempt) {
      return NextResponse.json({ error: "Không tìm thấy phiên học." }, { status: 404 });
    }

    if (attempt.total_questions <= 0) {
      return NextResponse.json({ insight: null, reason: "empty_session" });
    }

    const { data: answerRows, error: answersError } = await supabase
      .from("quiz_attempt_answers")
      .select("question_id, question_content, difficulty, selected_index, correct_index, is_correct")
      .eq("attempt_id", attemptId)
      .order("id");

    if (answersError) {
      console.error("[learningInsight] Không thể tải answers:", answersError.message);
      return NextResponse.json({ error: "Không thể tải dữ liệu câu trả lời." }, { status: 500 });
    }

    const answers = (answerRows ?? []) as AttemptAnswerRow[];
    const questionIds = [...new Set(answers.map((answer) => answer.question_id))];

    const questionMap = new Map<number, QuestionRow>();
    const quizMap = new Map<number, QuizRow>();
    const chapterMap = new Map<number, ChapterRow>();
    const subjectMap = new Map<number, SubjectRow>();

    if (questionIds.length > 0) {
      const { data: questionRows, error: questionsError } = await supabase
        .from("questions")
        .select("id, options, quiz_id")
        .in("id", questionIds);

      if (questionsError) {
        console.error("[learningInsight] Không thể tải questions:", questionsError.message);
        return NextResponse.json({ error: "Không thể tải ngữ cảnh câu hỏi." }, { status: 500 });
      }

      for (const row of (questionRows ?? []) as QuestionRow[]) {
        questionMap.set(row.id, row);
      }

      const quizIds = [...new Set((questionRows ?? []).map((row: QuestionRow) => row.quiz_id).filter((id): id is number => id !== null))];
      if (quizIds.length > 0) {
        const { data: quizRows, error: quizzesError } = await supabase
          .from("quizzes")
          .select("id, chapter_id")
          .in("id", quizIds);

        if (quizzesError) {
          console.error("[learningInsight] Không thể tải quizzes:", quizzesError.message);
          return NextResponse.json({ error: "Không thể tải ngữ cảnh bộ đề." }, { status: 500 });
        }

        for (const row of (quizRows ?? []) as QuizRow[]) {
          quizMap.set(row.id, row);
        }

        const chapterIds = [...new Set((quizRows ?? []).map((row: QuizRow) => row.chapter_id).filter((id): id is number => id !== null))];
        if (chapterIds.length > 0) {
          const { data: chapterRows, error: chaptersError } = await supabase
            .from("chapters")
            .select("id, name, subject_id")
            .in("id", chapterIds);

          if (chaptersError) {
            console.error("[learningInsight] Không thể tải chapters:", chaptersError.message);
            return NextResponse.json({ error: "Không thể tải ngữ cảnh chương học." }, { status: 500 });
          }

          for (const row of (chapterRows ?? []) as ChapterRow[]) {
            chapterMap.set(row.id, row);
          }

          const subjectIds = [...new Set((chapterRows ?? []).map((row: ChapterRow) => row.subject_id).filter((id): id is number => id !== null))];
          if (subjectIds.length > 0) {
            const { data: subjectRows, error: subjectsError } = await supabase
              .from("subjects")
              .select("id, name")
              .in("id", subjectIds);

            if (subjectsError) {
              console.error("[learningInsight] Không thể tải subjects:", subjectsError.message);
              return NextResponse.json({ error: "Không thể tải ngữ cảnh môn học." }, { status: 500 });
            }

            for (const row of (subjectRows ?? []) as SubjectRow[]) {
              subjectMap.set(row.id, row);
            }
          }
        }
      }
    }

    const chapterPerformance = new Map<number, {
      chapter: string;
      subject: string | null;
      correct: number;
      total: number;
    }>();

    for (const answer of answers) {
      const question = questionMap.get(answer.question_id);
      const quiz = question?.quiz_id !== null && question?.quiz_id !== undefined ? quizMap.get(question.quiz_id) : undefined;
      const chapter = quiz?.chapter_id !== null && quiz?.chapter_id !== undefined ? chapterMap.get(quiz.chapter_id) : undefined;
      if (!chapter) continue;

      const subject = chapter.subject_id !== null ? subjectMap.get(chapter.subject_id) : undefined;
      const current = chapterPerformance.get(chapter.id) ?? {
        chapter: chapter.name,
        subject: subject?.name ?? null,
        correct: 0,
        total: 0,
      };
      current.total += 1;
      if (answer.is_correct) current.correct += 1;
      chapterPerformance.set(chapter.id, current);
    }

    const wrongQuestions = answers
      .filter((answer) => !answer.is_correct)
      .slice(0, MAX_WRONG_QUESTIONS)
      .map((answer) => {
        const question = questionMap.get(answer.question_id);
        const quiz = question?.quiz_id !== null && question?.quiz_id !== undefined ? quizMap.get(question.quiz_id) : undefined;
        const chapter = quiz?.chapter_id !== null && quiz?.chapter_id !== undefined ? chapterMap.get(quiz.chapter_id) : undefined;
        const subject = chapter?.subject_id !== null && chapter?.subject_id !== undefined ? subjectMap.get(chapter.subject_id) : undefined;
        const options = Array.isArray(question?.options) ? question.options : [];

        return {
          question: answer.question_content.slice(0, MAX_TEXT_LENGTH),
          selectedAnswer:
            answer.selected_index !== null && options[answer.selected_index] !== undefined
              ? String(options[answer.selected_index]).slice(0, 1_000)
              : null,
          correctAnswer:
            options[answer.correct_index] !== undefined
              ? String(options[answer.correct_index]).slice(0, 1_000)
              : `Đáp án ${String.fromCharCode(65 + answer.correct_index)}`,
          chapter: chapter?.name ?? null,
          subject: subject?.name ?? null,
          difficulty: answer.difficulty ?? null,
        };
      });

    const context: LearningInsightContext = {
      score: attempt.correct_count,
      totalQuestions: attempt.total_questions,
      wrongQuestions,
      chapterPerformance: [...chapterPerformance.values()].map((item) => ({
        ...item,
        accuracy: item.total > 0 ? (item.correct / item.total) * 100 : 0,
      })),
    };

    const insight = await getLearningInsight(context);
    return NextResponse.json({ insight });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định.";
    console.error("[learningInsight] Unexpected error:", message);
    return NextResponse.json({ error: "Không thể tạo phân tích học tập lúc này." }, { status: 500 });
  }
}
