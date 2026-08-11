import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/ai/auth";

type AttemptAnswer = { question_id: number };
type QuestionRow = { id: number; quiz_id: number | null };
type QuizRow = { id: number; chapter_id: number | null };

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) return NextResponse.json({ error: "Bạn cần đăng nhập để sử dụng tính năng này." }, { status: 401 });

    const { supabase, userId } = authContext;
    const body = await req.json();
    const attemptId = body?.attemptId;
    const rawQuestionIds: unknown[] = Array.isArray(body?.questionIds) ? body.questionIds : [];
    const questionIds = [...new Set(rawQuestionIds.filter((id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0))].slice(0, 10);

    if (!Number.isInteger(attemptId) || attemptId <= 0 || questionIds.length === 0) {
      return NextResponse.json({ valid: false, error: "Invalid adaptive practice session." }, { status: 400 });
    }

    const { data: attempt, error: attemptError } = await supabase
      .from("quiz_attempts")
      .select("id, total_questions")
      .eq("id", attemptId)
      .eq("user_id", userId)
      .maybeSingle();
    if (attemptError) return NextResponse.json({ error: "Không thể xác thực phiên luyện tập." }, { status: 500 });
    if (!attempt) return NextResponse.json({ valid: false, error: "Không tìm thấy phiên học." }, { status: 404 });
    if (attempt.total_questions <= 0) return NextResponse.json({ valid: false, error: "Phiên học không có câu hỏi hợp lệ." }, { status: 400 });

    const { data: sourceAnswers, error: answersError } = await supabase
      .from("quiz_attempt_answers")
      .select("question_id")
      .eq("attempt_id", attemptId);
    if (answersError) return NextResponse.json({ error: "Không thể xác thực dữ liệu phiên học." }, { status: 500 });

    const sourceQuestionIds = [...new Set(((sourceAnswers ?? []) as AttemptAnswer[]).map((answer) => answer.question_id))];
    if (sourceQuestionIds.length === 0) return NextResponse.json({ valid: false, error: "Phiên học chưa có dữ liệu câu hỏi." }, { status: 400 });

    const { data: sourceQuestions, error: sourceQuestionsError } = await supabase
      .from("questions")
      .select("id, quiz_id")
      .in("id", sourceQuestionIds);
    if (sourceQuestionsError) return NextResponse.json({ error: "Không thể xác thực phạm vi câu hỏi." }, { status: 500 });

    const sourceQuizIds = [...new Set((sourceQuestions ?? []).map((question) => question.quiz_id).filter((id): id is number => id !== null))];
    if (sourceQuizIds.length === 0) return NextResponse.json({ valid: false, error: "Phiên học không có phạm vi chương hợp lệ." }, { status: 400 });

    const { data: sourceQuizzes, error: sourceQuizzesError } = await supabase
      .from("quizzes")
      .select("id, chapter_id")
      .in("id", sourceQuizIds);
    if (sourceQuizzesError) return NextResponse.json({ error: "Không thể xác thực phạm vi bộ đề." }, { status: 500 });

    const sourceQuizMap = new Map((sourceQuizzes ?? []).map((quiz) => [quiz.id, quiz as QuizRow]));
    const sourceChapterIds = [...new Set(
      (sourceQuestions ?? [])
        .map((question) => question.quiz_id !== null ? sourceQuizMap.get(question.quiz_id)?.chapter_id : null)
        .filter((id): id is number => id !== null && id !== undefined)
    )];
    if (sourceChapterIds.length === 0) return NextResponse.json({ valid: false, error: "Không xác định được phạm vi học tập." }, { status: 400 });

    const { data: candidateRows, error: candidatesError } = await supabase
      .from("questions")
      .select("id, quiz_id, quizzes!inner(chapter_id)")
      .in("quizzes.chapter_id", sourceChapterIds);
    if (candidatesError) return NextResponse.json({ error: "Không thể xác thực câu hỏi luyện tập." }, { status: 500 });

    const candidateIds = new Set((candidateRows ?? []).map((question) => question.id));
    const invalidIds = questionIds.filter((id) => !candidateIds.has(id));
    if (invalidIds.length > 0) {
      return NextResponse.json({ valid: false, error: "Một hoặc nhiều câu hỏi không thuộc phạm vi luyện tập hợp lệ." }, { status: 403 });
    }

    return NextResponse.json({ valid: true, questionIds });
  } catch (error) {
    console.error("[adaptivePractice/validate] Unexpected error:", error);
    return NextResponse.json({ error: "Không thể xác thực phiên luyện tập." }, { status: 500 });
  }
}
