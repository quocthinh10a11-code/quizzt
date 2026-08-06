import { NextRequest, NextResponse } from "next/server";
import { askTutor } from "@/lib/ai/provider";
import type { TutorQuestionContext, ChatMessage } from "@/lib/ai/provider";

const MAX_MESSAGE_LENGTH = 500;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const questionContext: TutorQuestionContext = body.questionContext;
    const history: ChatMessage[] = body.history ?? [];
    const userMessage: string = body.userMessage;

    if (!questionContext || !questionContext.content || !Array.isArray(questionContext.options)) {
      return NextResponse.json({ error: "Thiếu thông tin câu hỏi." }, { status: 400 });
    }
    if (!userMessage || typeof userMessage !== "string" || !userMessage.trim()) {
      return NextResponse.json({ error: "Vui lòng nhập câu hỏi." }, { status: 400 });
    }
    if (userMessage.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Câu hỏi tối đa ${MAX_MESSAGE_LENGTH} ký tự.` }, { status: 400 });
    }

    const reply = await askTutor(questionContext, history, userMessage.trim());
    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}