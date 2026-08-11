import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/ai/auth";
import { checkAndRecordRateLimit } from "@/lib/ai/rateLimit";
import { getAdaptivePracticeRanking, type AdaptivePracticeContext } from "@/lib/ai/provider";

type AttemptAnswer = { question_id: number; is_correct: boolean };
type QuestionRow = { id: number; content: string; difficulty: "easy" | "medium" | "hard"; quiz_id: number | null };
type QuizRow = { id: number; chapter_id: number | null };
type ChapterRow = { id: number; name: string; subject_id: number | null };
type SubjectRow = { id: number; name: string };
type HistoryAttempt = { id: number; created_at: string };
type HistoryAnswer = { attempt_id: number; question_id: number; is_correct: boolean };
type CandidateQuestion = QuestionRow & { quizzes?: { chapter_id: number } | { chapter_id: number }[] };

const ADAPTIVE_RATE_LIMIT_PER_MINUTE = 5;
const MAX_CANDIDATES = 60;
const MAX_HISTORY_ATTEMPTS = 50;
const TARGET_COUNT = 10;

function deterministicRank(candidates: AdaptivePracticeContext["candidates"], targetChapterNames: Set<string>): number[] {
  return [...candidates]
    .sort((a, b) => {
      const score = (item: AdaptivePracticeContext["candidates"][number]) =>
        (item.wasWrongRecently ? 50 : 0) +
        (item.priorWrong > 0 ? 20 : 0) +
        (item.priorAttempts === 0 ? 15 : 0) +
        (targetChapterNames.has(item.chapter ?? "") ? 10 : 0) +
        (item.priorAttempts <= 1 ? 5 : 0);
      return score(b) - score(a) || a.id - b.id;
    })
    .slice(0, TARGET_COUNT)
    .map((item) => item.id);
}

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) return NextResponse.json({ error: "Bạn cần đăng nhập để sử dụng tính năng này." }, { status: 401 });

    const { supabase, userId } = authContext;
    const rateLimitResult = await checkAndRecordRateLimit(supabase, userId, "insight", ADAPTIVE_RATE_LIMIT_PER_MINUTE);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: `Bạn đã yêu cầu luyện tập quá nhanh. Vui lòng đợi ${rateLimitResult.retryAfterSeconds} giây rồi thử lại.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const attemptId = body?.attemptId;
    if (!Number.isInteger(attemptId) || attemptId <= 0) return NextResponse.json({ error: "Invalid attempt id." }, { status: 400 });

    const { data: attempt, error: attemptError } = await supabase
      .from("quiz_attempts")
      .select("id, total_questions, correct_count")
      .eq("id", attemptId)
      .eq("user_id", userId)
      .maybeSingle();
    if (attemptError) return NextResponse.json({ error: "Không thể tải dữ liệu phiên học." }, { status: 500 });
    if (!attempt) return NextResponse.json({ error: "Không tìm thấy phiên học." }, { status: 404 });
    if (attempt.total_questions <= 0) return NextResponse.json({ questionIds: [] });

    const { data: answerRows, error: answersError } = await supabase
      .from("quiz_attempt_answers")
      .select("question_id, is_correct")
      .eq("attempt_id", attemptId);
    if (answersError) return NextResponse.json({ error: "Không thể tải dữ liệu câu trả lời." }, { status: 500 });

    const sourceAnswers = (answerRows ?? []) as AttemptAnswer[];
    const sourceQuestionIds = [...new Set(sourceAnswers.map((answer) => answer.question_id))];
    if (sourceQuestionIds.length === 0) return NextResponse.json({ questionIds: [] });

    const { data: sourceQuestions, error: sourceQuestionsError } = await supabase
      .from("questions")
      .select("id, quiz_id")
      .in("id", sourceQuestionIds);
    if (sourceQuestionsError) return NextResponse.json({ error: "Không thể tải ngữ cảnh câu hỏi." }, { status: 500 });

    const sourceQuizIds = [...new Set((sourceQuestions ?? []).map((q) => q.quiz_id).filter((id): id is number => id !== null))];
    const { data: sourceQuizzes, error: sourceQuizzesError } = sourceQuizIds.length
      ? await supabase.from("quizzes").select("id, chapter_id").in("id", sourceQuizIds)
      : { data: [], error: null };
    if (sourceQuizzesError) return NextResponse.json({ error: "Không thể tải ngữ cảnh bộ đề." }, { status: 500 });

    const sourceChapterIds = [...new Set((sourceQuizzes ?? []).map((q) => q.chapter_id).filter((id): id is number => id !== null))];
    if (sourceChapterIds.length === 0) return NextResponse.json({ questionIds: [] });

    const { data: chapters, error: chaptersError } = await supabase
      .from("chapters")
      .select("id, name, subject_id")
      .in("id", sourceChapterIds);
    if (chaptersError) return NextResponse.json({ error: "Không thể tải chương học." }, { status: 500 });

    const chapterMap = new Map((chapters ?? []).map((chapter) => [chapter.id, chapter as ChapterRow]));
    const sourceQuizMap = new Map((sourceQuizzes ?? []).map((quiz) => [quiz.id, quiz as QuizRow]));
    const sourceQuestionMap = new Map((sourceQuestions ?? []).map((question) => [question.id, question]));

    const wrongByChapter = new Map<number, number>();
    for (const answer of sourceAnswers) {
      if (answer.is_correct) continue;
      const question = sourceQuestionMap.get(answer.question_id);
      const chapterId = question?.quiz_id !== null && question?.quiz_id !== undefined
        ? sourceQuizMap.get(question.quiz_id)?.chapter_id
        : null;
      if (chapterId !== null && chapterId !== undefined) wrongByChapter.set(chapterId, (wrongByChapter.get(chapterId) ?? 0) + 1);
    }

    const focusChapterIds = [...wrongByChapter.entries()]
      .filter(([, wrongCount]) => wrongCount >= 2)
      .sort((a, b) => b[1] - a[1])
      .map(([chapterId]) => chapterId);
    const targetChapterIds = focusChapterIds.length > 0 ? focusChapterIds : sourceChapterIds;
    const targetChapterNames = new Set(
      targetChapterIds.map((id) => chapterMap.get(id)?.name).filter((name): name is string => !!name)
    );

    const { data: candidateRows, error: candidatesError } = await supabase
      .from("questions")
      .select("id, content, difficulty, quiz_id, quizzes!inner(chapter_id)")
      .in("quizzes.chapter_id", targetChapterIds)
      .limit(MAX_CANDIDATES);
    if (candidatesError) return NextResponse.json({ error: "Không thể chọn câu hỏi luyện tập." }, { status: 500 });

    const candidates = (candidateRows ?? []) as CandidateQuestion[];
    const candidateIds = [...new Set(candidates.map((candidate) => candidate.id))];
    if (candidateIds.length === 0) return NextResponse.json({ questionIds: [], reason: "no_candidates" });

    const { data: historyAttempts, error: historyAttemptsError } = await supabase
      .from("quiz_attempts")
      .select("id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(MAX_HISTORY_ATTEMPTS);
    if (historyAttemptsError) return NextResponse.json({ error: "Không thể tải lịch sử học tập." }, { status: 500 });

    const historyAttemptIds = ((historyAttempts ?? []) as HistoryAttempt[]).map((item) => item.id);
    const { data: historyAnswers, error: historyAnswersError } = historyAttemptIds.length
      ? await supabase.from("quiz_attempt_answers").select("attempt_id, question_id, is_correct").in("attempt_id", historyAttemptIds).in("question_id", candidateIds)
      : { data: [], error: null };
    if (historyAnswersError) return NextResponse.json({ error: "Không thể tải lịch sử câu hỏi." }, { status: 500 });

    const historyMap = new Map<number, { attempts: number; correct: number; wrong: number; wrongRecently: boolean }>();
    const attemptDateMap = new Map((historyAttempts ?? []).map((item) => [item.id, item.created_at]));
    for (const answer of (historyAnswers ?? []) as HistoryAnswer[]) {
      const current = historyMap.get(answer.question_id) ?? { attempts: 0, correct: 0, wrong: 0, wrongRecently: false };
      current.attempts += 1;
      if (answer.is_correct) current.correct += 1;
      else {
        current.wrong += 1;
        const createdAt = attemptDateMap.get(answer.attempt_id);
        if (createdAt && Date.now() - new Date(createdAt).getTime() <= 30 * 24 * 60 * 60 * 1000) current.wrongRecently = true;
      }
      historyMap.set(answer.question_id, current);
    }

    const subjectIds = [...new Set((chapters ?? []).map((chapter) => chapter.subject_id).filter((id): id is number => id !== null))];
    const { data: subjects } = subjectIds.length
      ? await supabase.from("subjects").select("id, name").in("id", subjectIds)
      : { data: [] };
    const subjectMap = new Map(((subjects ?? []) as SubjectRow[]).map((subject) => [subject.id, subject.name]));

    const adaptiveCandidates: AdaptivePracticeContext["candidates"] = candidates.map((candidate) => {
      const relation = candidate.quizzes;
      const chapterId = Array.isArray(relation) ? relation[0]?.chapter_id : relation?.chapter_id;
      const chapter = chapterId ? chapterMap.get(chapterId) : undefined;
      const history = historyMap.get(candidate.id) ?? { attempts: 0, correct: 0, wrong: 0, wrongRecently: false };
      return {
        id: candidate.id,
        content: candidate.content.slice(0, 500),
        difficulty: candidate.difficulty,
        chapter: chapter?.name ?? null,
        subject: chapter?.subject_id ? subjectMap.get(chapter.subject_id) ?? null : null,
        priorAttempts: history.attempts,
        priorCorrect: history.correct,
        priorWrong: history.wrong,
        wasWrongRecently: history.wrongRecently,
      };
    });

    const context: AdaptivePracticeContext = {
      targetChapters: [...targetChapterNames],
      sourceAttemptScore: attempt.correct_count,
      sourceAttemptTotal: attempt.total_questions,
      candidates: adaptiveCandidates,
      desiredCount: TARGET_COUNT,
    };
    const candidateIdSet = new Set(candidateIds);

    let selectedIds: number[] = [];
    let usedAiRanking = false;
    let rationale = "Quizzt đã chọn các câu hỏi phù hợp từ ngân hàng câu hỏi hiện có.";
    try {
      const ranked = await getAdaptivePracticeRanking(context);
      selectedIds = [...new Set(ranked.selectedQuestionIds)].filter((id) => candidateIdSet.has(id)).slice(0, TARGET_COUNT);
      usedAiRanking = selectedIds.length > 0;
      if (ranked.rationale) rationale = ranked.rationale;
    } catch (error) {
      console.error("[adaptivePractice] AI ranking failed, using deterministic fallback:", error);
    }

    if (selectedIds.length < TARGET_COUNT) {
      const fallbackIds = deterministicRank(adaptiveCandidates, targetChapterNames);
      selectedIds = [...new Set([...selectedIds, ...fallbackIds])].filter((id) => candidateIdSet.has(id)).slice(0, TARGET_COUNT);
    }

    return NextResponse.json({ questionIds: selectedIds, rationale, targetChapterNames: [...targetChapterNames], usedAiRanking });
  } catch (error) {
    console.error("[adaptivePractice] Unexpected error:", error);
    return NextResponse.json({ error: "Không thể tạo phiên luyện tập cá nhân hóa lúc này." }, { status: 500 });
  }
}
