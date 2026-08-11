import { supabase } from "@/lib/supabase";

export const WEAK_CHAPTER_CONFIG = {
  recentDays: 30,
  maxAttempts: 100,
  minUniqueQuestions: 5,
  minAnswers: 10,
  accuracyThreshold: 70,
} as const;

export type WeakChapter = {
  chapterId: number;
  chapterName: string;
  subjectName: string | null;
  uniqueQuestionCount: number;
  answerCount: number;
  correctCount: number;
  accuracy: number;
};

type ChapterAccumulator = {
  chapterId: number;
  chapterName: string;
  subjectName: string | null;
  answerCount: number;
  correctCount: number;
  questions: Map<number, { answerCount: number; correctCount: number }>;
};

export type WeakChapterResult = {
  data: WeakChapter | null;
  error: string | null;
};

/**
 * Finds one chapter with enough recent evidence and the lowest
 * question-balanced accuracy below the configured threshold.
 *
 * Each question contributes equally to chapter accuracy, so repeatedly
 * answering the same question does not dominate the result.
 */
export async function getWeakChapterResult(userId: string): Promise<WeakChapterResult> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - WEAK_CHAPTER_CONFIG.recentDays);

  const { data: attempts, error: attemptsError } = await supabase
    .from("quiz_attempts")
    .select("id, created_at")
    .eq("user_id", userId)
    .in("attempt_type", ["quiz", "weak_topics"])
    .gte("created_at", cutoff.toISOString())
    .order("created_at", { ascending: false })
    .limit(WEAK_CHAPTER_CONFIG.maxAttempts);

  if (attemptsError) {
    return { data: null, error: attemptsError.message };
  }

  const attemptIds = (attempts ?? []).map((attempt) => attempt.id);
  if (attemptIds.length === 0) return { data: null, error: null };

  const { data: answers, error: answersError } = await supabase
    .from("quiz_attempt_answers")
    .select("attempt_id, question_id, is_correct")
    .in("attempt_id", attemptIds);

  if (answersError) {
    return { data: null, error: answersError.message };
  }

  const answerRows = answers ?? [];
  if (answerRows.length === 0) return { data: null, error: null };

  const questionIds = Array.from(new Set(answerRows.map((answer) => answer.question_id)));
  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("id, quiz_id")
    .in("id", questionIds);

  if (questionsError) {
    return { data: null, error: questionsError.message };
  }

  const questionMap = new Map((questions ?? []).map((question) => [question.id, question.quiz_id]));
  const quizIds = Array.from(
    new Set((questions ?? []).map((question) => question.quiz_id).filter((id): id is number => id !== null))
  );
  if (quizIds.length === 0) return { data: null, error: null };

  const { data: quizzes, error: quizzesError } = await supabase
    .from("quizzes")
    .select("id, chapter_id")
    .in("id", quizIds);

  if (quizzesError) {
    return { data: null, error: quizzesError.message };
  }

  const quizMap = new Map((quizzes ?? []).map((quiz) => [quiz.id, quiz.chapter_id]));
  const chapterIds = Array.from(
    new Set((quizzes ?? []).map((quiz) => quiz.chapter_id).filter((id): id is number => id !== null))
  );
  if (chapterIds.length === 0) return { data: null, error: null };

  const { data: chapters, error: chaptersError } = await supabase
    .from("chapters")
    .select("id, name, subject_id")
    .in("id", chapterIds);

  if (chaptersError) {
    return { data: null, error: chaptersError.message };
  }

  const chapterMap = new Map(
    (chapters ?? []).map((chapter) => [
      chapter.id,
      { name: chapter.name, subjectId: chapter.subject_id },
    ])
  );
  const subjectIds = Array.from(
    new Set((chapters ?? []).map((chapter) => chapter.subject_id).filter((id): id is number => id !== null))
  );

  const { data: subjects, error: subjectsError } = subjectIds.length
    ? await supabase.from("subjects").select("id, name").in("id", subjectIds)
    : { data: [], error: null };

  if (subjectsError) {
    return { data: null, error: subjectsError.message };
  }

  const subjectMap = new Map((subjects ?? []).map((subject) => [subject.id, subject.name]));
  const chapterStats = new Map<number, ChapterAccumulator>();

  for (const answer of answerRows) {
    const quizId = questionMap.get(answer.question_id);
    if (quizId === undefined || quizId === null) continue;

    const chapterId = quizMap.get(quizId);
    if (chapterId === undefined || chapterId === null) continue;

    const chapter = chapterMap.get(chapterId);
    if (!chapter) continue;

    let stats = chapterStats.get(chapterId);
    if (!stats) {
      stats = {
        chapterId,
        chapterName: chapter.name,
        subjectName: chapter.subjectId ? subjectMap.get(chapter.subjectId) ?? null : null,
        answerCount: 0,
        correctCount: 0,
        questions: new Map(),
      };
      chapterStats.set(chapterId, stats);
    }

    stats.answerCount += 1;
    if (answer.is_correct) stats.correctCount += 1;

    const questionStats = stats.questions.get(answer.question_id) ?? {
      answerCount: 0,
      correctCount: 0,
    };
    questionStats.answerCount += 1;
    if (answer.is_correct) questionStats.correctCount += 1;
    stats.questions.set(answer.question_id, questionStats);
  }

  const candidates = Array.from(chapterStats.values())
    .map((stats) => {
      const uniqueQuestionCount = stats.questions.size;
      const questionAccuracySum = Array.from(stats.questions.values()).reduce(
        (sum, question) => sum + question.correctCount / Math.max(1, question.answerCount),
        0
      );
      const accuracy = uniqueQuestionCount
        ? Math.round((questionAccuracySum / uniqueQuestionCount) * 100)
        : 0;

      return {
        chapterId: stats.chapterId,
        chapterName: stats.chapterName,
        subjectName: stats.subjectName,
        uniqueQuestionCount,
        answerCount: stats.answerCount,
        correctCount: stats.correctCount,
        accuracy,
      } satisfies WeakChapter;
    })
    .filter(
      (chapter) =>
        chapter.uniqueQuestionCount >= WEAK_CHAPTER_CONFIG.minUniqueQuestions &&
        chapter.answerCount >= WEAK_CHAPTER_CONFIG.minAnswers &&
        chapter.accuracy < WEAK_CHAPTER_CONFIG.accuracyThreshold
    )
    .sort((a, b) =>
      a.accuracy - b.accuracy ||
      b.uniqueQuestionCount - a.uniqueQuestionCount ||
      b.answerCount - a.answerCount
    );

  return { data: candidates[0] ?? null, error: null };
}
