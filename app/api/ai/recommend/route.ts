import { NextRequest, NextResponse } from "next/server";
import { getReviewRecommendation } from "@/lib/ai/provider";
import type { RecommendationItem } from "@/lib/ai/provider";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: RecommendationItem[] = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Thiếu danh sách câu hỏi." }, { status: 400 });
    }
    if (items.length > 30) {
      return NextResponse.json({ error: "Tối đa 30 câu mỗi lần gợi ý." }, { status: 400 });
    }

    const result = await getReviewRecommendation(items);
    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}