import { NextRequest, NextResponse } from "next/server";
import { askTutor } from "@/lib/ai/provider";
import type { TutorQuestionContext, ChatMessage, TutorMode } from "@/lib/ai/provider";

const MAX_MESSAGE_LENGTH = 500;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const rawContext = body.questionContext;
    const submitted: boolean = body.submitted === true;
    const history: ChatMessage[] = body.history ?? [];
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

    // Backend quyết định mode dựa trên "submitted", KHÔNG dựa trên field "mode" tự ý gửi từ client.
    const mode: TutorMode = submitted ? "review" : "learning";

    // correctIndex chỉ được đưa vào prompt khi mode = "review".
    // Ở mode "learning", dù client có gửi correctIndex lên hay không, backend vẫn loại bỏ,
    // để prompt injection từ phía client không thể ép AI tiết lộ đáp án sớm.
    const questionContext: TutorQuestionContext = {
      content: String(rawContext.content),
      options: rawContext.options.map((o: unknown) => String(o)),
      correctIndex: mode === "review" && typeof rawContext.correctIndex === "number"
        ? rawContext.correctIndex
        : undefined,
    };

    const reply = await askTutor(questionContext, mode, history, userMessage.trim());
    return NextResponse.json({ reply, mode });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}