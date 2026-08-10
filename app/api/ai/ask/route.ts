import { NextRequest, NextResponse } from "next/server";
import { askTutor } from "@/lib/ai/provider";
import type { TutorQuestionContext, ChatMessage } from "@/lib/ai/provider";
import type { TutorMode } from "@/lib/ai/provider";
import type { TutorScreenContext, ReviewMeta } from "@/lib/ai/types/tutor";
import { getAuthenticatedContext } from "@/lib/ai/auth";
import { checkAndRecordRateLimit } from "@/lib/ai/rateLimit";

const MAX_MESSAGE_LENGTH = 500;
const MAX_QUESTION_CONTENT_LENGTH = 4_000;
const MAX_OPTIONS = 10;
const MAX_OPTION_LENGTH = 1_000;
const MAX_HISTORY_MESSAGES = 6;
const MAX_HISTORY_MESSAGE_LENGTH = 2_000;
const ASK_RATE_LIMIT_PER_MINUTE = 10;
const VALID_SCREEN_CONTEXTS: TutorScreenContext[] = ["practice", "review", "smart_review"];
const VALID_REVIEW_SOURCES = ["wrong_answer", "bookmark", "note", "manual"];

// Kiểm tra shape của reviewMeta gửi từ client — không tin bất kỳ field nào chưa qua validate.
function isValidReviewMeta(value: unknown): value is ReviewMeta {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.intervalDays === "number" &&
    typeof v.reviewCount === "number" &&
    typeof v.source === "string" &&
    VALID_REVIEW_SOURCES.includes(v.source) &&
    (v.daysSinceLastReview === null || typeof v.daysSinceLastReview === "number")
  );
}

export async function POST(req: NextRequest) {
  try {
    // Xác thực người gọi TRƯỚC khi làm bất kỳ việc gì khác. userId chỉ được lấy
    // từ token đã xác thực, không phải từ bất kỳ field nào trong request body.
    const authContext = await getAuthenticatedContext(req);
    if (!authContext) {
      return NextResponse.json({ error: "Bạn cần đăng nhập để sử dụng tính năng này." }, { status: 401 });
    }
    const { supabase: authedSupabase, userId } = authContext;

    const rateLimitResult = await checkAndRecordRateLimit(
      authedSupabase,
      userId,
      "ask",
      ASK_RATE_LIMIT_PER_MINUTE
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: `Bạn đã hỏi quá nhanh. Vui lòng đợi ${rateLimitResult.retryAfterSeconds} giây rồi thử lại.` },
        { status: 429 }
      );
    }

    const body = await req.json();

    const rawContext = body.questionContext;
    if (
      !rawContext ||
      typeof rawContext !== "object" ||
      typeof rawContext.content !== "string" ||
      !rawContext.content.trim() ||
      rawContext.content.length > MAX_QUESTION_CONTENT_LENGTH ||
      !Array.isArray(rawContext.options) ||
      rawContext.options.length === 0 ||
      rawContext.options.length > MAX_OPTIONS ||
      !rawContext.options.every(
        (option: unknown) => typeof option === "string" && option.length <= MAX_OPTION_LENGTH
      )
    ) {
      return NextResponse.json({ error: "Invalid question context." }, { status: 400 });
    }
    const submitted: boolean = body.submitted === true;
    const history: ChatMessage[] = body.history ?? [];
    if (!isValidHistory(history)) {
      return NextResponse.json({ error: "Invalid chat history." }, { status: 400 });
    }
    const userMessage: string = body.userMessage;

    if (!rawContext || !rawContext.content || !Array.isArray(rawContext.options)) {
      return NextResponse.json({ error: "Thiếu thông tin câu hỏi." }, { status: 400 });
    }
    if (!userMessage || typeof userMessage !== "string" || !userMessage.trim()) {
      return NextResponse.json({ error: "Vui lòng nhập câu hỏi." }, { status: 400 });
    }
    if (userMessage.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Câu hỏi tối đa ${MAX_MESSAGE_LENGTH} ký tự.` }, { status: 400 });
    }

    // --- screenContext: optional, mặc định "practice" để backward compatible ---
    const rawScreenContext = body.screenContext;
    let screenContext: TutorScreenContext = "practice";
    if (rawScreenContext !== undefined) {
      if (typeof rawScreenContext !== "string" || !VALID_SCREEN_CONTEXTS.includes(rawScreenContext as TutorScreenContext)) {
        return NextResponse.json(
          { error: `screenContext không hợp lệ. Chỉ chấp nhận: ${VALID_SCREEN_CONTEXTS.join(", ")}` },
          { status: 400 }
        );
      }
      screenContext = rawScreenContext as TutorScreenContext;
    }

    // --- reviewMeta: optional, chỉ dùng khi screenContext = "smart_review" ---
    let reviewMeta: ReviewMeta | undefined = undefined;
    if (body.reviewMeta !== undefined) {
      if (screenContext !== "smart_review") {
        // Client gửi reviewMeta nhưng screenContext không phải smart_review -> bỏ qua, không dùng.
        reviewMeta = undefined;
      } else {
        if (!isValidReviewMeta(body.reviewMeta)) {
          return NextResponse.json({ error: "reviewMeta không đúng định dạng." }, { status: 400 });
        }
        reviewMeta = body.reviewMeta;
      }
    }

    // Backend quyết định mode (Answer Visibility) dựa trên "submitted", KHÔNG dựa trên field
    // "mode"/"visibility" tự ý gửi từ client. Nguyên tắc bảo mật này giữ nguyên từ các bước trước.
    const mode: TutorMode = submitted ? "review" : "learning";

    if (
      submitted &&
      (!Number.isInteger(rawContext.correctIndex) ||
        rawContext.correctIndex < 0 ||
        rawContext.correctIndex >= rawContext.options.length)
    ) {
      return NextResponse.json({ error: "Invalid correct answer." }, { status: 400 });
    }

    const questionContext: TutorQuestionContext = {
      content: String(rawContext.content),
      options: rawContext.options.map((o: unknown) => String(o)),
      correctIndex:
        mode === "review" && typeof rawContext.correctIndex === "number" ? rawContext.correctIndex : undefined,
    };

    const reply = await askTutor(questionContext, mode, history, userMessage.trim(), screenContext, reviewMeta);
    return NextResponse.json({ reply, mode, screenContext });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function isValidHistory(value: unknown): value is ChatMessage[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_HISTORY_MESSAGES &&
    value.every(
      (message) =>
        message &&
        typeof message === "object" &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.length <= MAX_HISTORY_MESSAGE_LENGTH
    )
  );
}
