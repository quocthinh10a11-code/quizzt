export type ParsedQuestion = {
  content: string;
  options: string[];
  correctIndex: number | null;
};

const QUESTION_START_REGEX =
  /^(Câu|Cau|Question|Q)\s*\.?\s*\d+\s*[:.)\-]?|^\d+\s*[.):]/i;

const SECTION_HEADER_REGEX = /^(Phần|Chương|Chủ\s*đề|Part|Unit|Mục)\s*\d+/i;

function trySplitInline(
  block: string
): { content: string; options: string[] } | null {
  const match = /^(.*?)A\.\s*(.*?)B\.\s*(.*?)C\.\s*(.*?)D\.\s*(.*)$/s.exec(block);
  if (!match) return null;

  const [, content, a, b, c, d] = match;
  const options = [a, b, c, d].map((s) => s.trim());
  if (options.some((o) => o.length === 0)) return null;

  return { content: content.trim(), options };
}

function getCleanLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !SECTION_HEADER_REGEX.test(l));
}

export function extractTitleAndBody(raw: string): { title: string; body: string } {
  const lines = getCleanLines(raw);
  const firstQuestionIndex = lines.findIndex((l) => QUESTION_START_REGEX.test(l));

  if (firstQuestionIndex <= 0) {
    return { title: "", body: raw };
  }

  const titleLines = lines.slice(0, firstQuestionIndex);
  const bodyLines = lines.slice(firstQuestionIndex);

  let title = titleLines.join(" ");
  title = title.replace(/^\d+\s*[.):]\s*/, "");
  title = title.replace(/\s*(bộ\s*đề|questions?|câu\s*hỏi)\s*[:.]?\s*\d*.*$/i, "");
  title = title.trim();

  return { title, body: bodyLines.join("\n") };
}

export function parseText(raw: string): {
  questions: ParsedQuestion[];
  errors: string[];
} {
  const lines = getCleanLines(raw);
  const markerIdx = lines
    .map((l, i) => (QUESTION_START_REGEX.test(l) ? i : -1))
    .filter((i) => i !== -1);

  let rawBlocks: string[];

  if (markerIdx.length >= 2) {
    // Có đủ mốc "Câu N:" -> dùng chính các mốc này làm ranh giới cắt câu
    rawBlocks = markerIdx.map((start, i) => {
      const end = i + 1 < markerIdx.length ? markerIdx[i + 1] : lines.length;
      return lines
        .slice(start, end)
        .join(" ")
        .replace(QUESTION_START_REGEX, "")
        .trim();
    });
  } else {
    // Không có mốc đánh số -> lùi về cắt theo dòng trống
    rawBlocks = raw
      .split(/\n\s*\n/)
      .map((b) => b.replace(/\s+/g, " ").trim())
      .filter((b) => b.length > 0 && !SECTION_HEADER_REGEX.test(b))
      .map((b) => b.replace(QUESTION_START_REGEX, "").trim());
  }

  const questions: ParsedQuestion[] = [];
  const errors: string[] = [];

  rawBlocks.forEach((block, index) => {
    const parsed = trySplitInline(block);
    if (!parsed) {
      errors.push(
        `Câu ${index + 1} (${block.slice(0, 40)}...): không nhận diện đủ 4 đáp án.`
      );
      return;
    }
    questions.push({ content: parsed.content, options: parsed.options, correctIndex: null });
  });

  return { questions, errors };
}

export const STANDARD_FORMAT_PROMPT = `Hãy chuyển đổi nội dung câu hỏi trắc nghiệm bên dưới sang ĐÚNG định dạng sau, giữ nguyên thứ tự và nội dung câu hỏi:

Câu 1: <nội dung câu hỏi>
A. <đáp án A>
B. <đáp án B>
C. <đáp án C>
D. <đáp án D>

Câu 2: <nội dung câu hỏi>
A. <đáp án A>
B. <đáp án B>
C. <đáp án C>
D. <đáp án D>

(tiếp tục cho hết các câu, giữa mỗi câu để 1 dòng trống)

Yêu cầu bắt buộc:
- Mỗi câu hỏi phải có ĐÚNG 4 đáp án A, B, C, D
- KHÔNG đánh dấu đáp án đúng (không in đậm, không ghi chú, không gạch chân)
- KHÔNG thêm tiêu đề phần/chương (ví dụ "Phần 1", "Chương 2")
- KHÔNG thêm lời giải thích, chỉ xuất đúng danh sách câu hỏi theo mẫu trên

Nội dung cần chuyển đổi:
[Dán nội dung câu hỏi gốc của bạn vào đây]`;