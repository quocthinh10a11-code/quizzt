export type Difficulty = "easy" | "medium" | "hard";

export type ParsedQuestion = {
  content: string;
  options: string[];
  correctIndex: number | null;
  difficulty: Difficulty;
};
const QUESTION_START_REGEX =
  /^(Câu|Cau|Question|Q)\s*\.?\s*\d+\s*[:.)\-]?|^\d+\s*[.):]/i;

const SECTION_HEADER_REGEX = /^(Phần|Chương|Chủ\s*đề|Part|Unit|Mục)\s*\d+/i;

// A./B./C./D. phải đứng ĐẦU DÒNG (sau \n hoặc đầu block) mới được coi là đáp án.
// Tránh nhận nhầm chữ "A." xuất hiện giữa câu hỏi (vd: "điều A. trong hợp đồng...").
// Dùng [\s\S] thay cho ".", KHÔNG dùng flag /s (dotAll) vì flag này cần target
// ES2018+ trong tsconfig, một số môi trường build (kể cả Vercel) sẽ báo lỗi.
const STRICT_OPTION_REGEX =
  /^([\s\S]*?)(?:^|\n)[ \t]*A[.\)]\s*([\s\S]*?)(?:^|\n)[ \t]*B[.\)]\s*([\s\S]*?)(?:^|\n)[ \t]*C[.\)]\s*([\s\S]*?)(?:^|\n)[ \t]*D[.\)]\s*([\s\S]*)$/;

// Fallback: dùng khi văn bản dồn dính liền không có dấu xuống dòng nào để phân biệt.
// An toàn vì block đã được cắt đúng ranh giới câu từ bước trước (normalizeQuestionBreaks).
const LOOSE_OPTION_REGEX =
  /^([\s\S]*?)A[.\)]\s*([\s\S]*?)B[.\)]\s*([\s\S]*?)C[.\)]\s*([\s\S]*?)D[.\)]\s*([\s\S]*)$/;

function trySplitInline(
  block: string
): { content: string; options: string[] } | null {
  let match = STRICT_OPTION_REGEX.exec(block);
  if (!match) {
    match = LOOSE_OPTION_REGEX.exec(block);
  }
  if (!match) return null;

  const [, content, a, b, c, d] = match;
  const options = [a, b, c, d].map((s) => s.replace(/\s+/g, " ").trim());
  const cleanContent = content.replace(/\s+/g, " ").trim();
  if (options.some((o) => o.length === 0)) return null;

  return { content: cleanContent, options };
}

// Chèn "\n" trước mỗi mốc "Câu N/Question N/..." nếu nó đang bị dính liền vào nội dung
// câu trước đó (trường hợp Word paste toàn bộ dồn thành 1 dòng, không xuống dòng).
const KEYWORD_MARKER_GLOBAL = /(Câu|Cau|Question|Q)\s*\.?\s*\d+\s*[:.)\-]?/gi;

function normalizeQuestionBreaks(raw: string): string {
  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  KEYWORD_MARKER_GLOBAL.lastIndex = 0;
  while ((match = KEYWORD_MARKER_GLOBAL.exec(raw)) !== null) {
    const before = raw.slice(lastIndex, match.index);
    const precedingChar = raw.slice(0, match.index).slice(-1);
    const alreadyAtLineStart = match.index === 0 || precedingChar === "\n";
    result += before;
    if (!alreadyAtLineStart) {
      result += "\n";
    }
    result += match[0];
    lastIndex = match.index + match[0].length;
  }
  result += raw.slice(lastIndex);
  return result;
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

export function parseText(rawInput: string): {
  questions: ParsedQuestion[];
  errors: string[];
} {
  const raw = normalizeQuestionBreaks(rawInput);
  const lines = getCleanLines(raw);
  const markerIdx = lines
    .map((l, i) => (QUESTION_START_REGEX.test(l) ? i : -1))
    .filter((i) => i !== -1);

  let rawBlocks: string[];

  if (markerIdx.length >= 1) {
    // Có ít nhất 1 mốc "Câu N:" -> dùng chính các mốc này làm ranh giới cắt câu.
    // Giữ nguyên dấu xuống dòng trong block (không gộp thành 1 dòng) để bước
    // nhận diện A/B/C/D phân biệt được đáp án thật (đầu dòng) với chữ "A."
    // tình cờ xuất hiện giữa câu hỏi.
    rawBlocks = markerIdx.map((start, i) => {
      const end = i + 1 < markerIdx.length ? markerIdx[i + 1] : lines.length;
      const blockLines = lines.slice(start, end);
      blockLines[0] = blockLines[0].replace(QUESTION_START_REGEX, "").trim();
      return blockLines.join("\n").trim();
    });
  } else {
    // Không có mốc đánh số nào cả -> lùi về cắt theo dòng trống
    rawBlocks = raw
      .split(/\n\s*\n/)
      .map((b) =>
        b
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0)
          .join("\n")
      )
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
    questions.push({
  content: parsed.content,
  options: parsed.options,
  correctIndex: null,
  difficulty: "medium",
});
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