"use client";

import { useState } from "react";
import { Upload, Copy, Check } from "lucide-react";
import { STANDARD_FORMAT_PROMPT } from "@/lib/quizParser";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import Badge from "@/components/ui/Badge";

type Props = {
  rawText: string;
  onChangeRawText: (value: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onParse: () => void;
  fileLoading: boolean;
  fileError: string;
  parseErrors: string[];
};

export default function ImportPanel({
  rawText,
  onChangeRawText,
  onFileUpload,
  onParse,
  fileLoading,
  fileError,
  parseErrors,
}: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopyPrompt() {
    await navigator.clipboard.writeText(STANDARD_FORMAT_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Upload file Word/PDF (nội dung sẽ đổ vào ô bên dưới để bạn kiểm tra lại)
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors">
            <Upload size={14} />
            Chọn file
          </span>
          <input type="file" accept=".docx,.pdf" onChange={onFileUpload} className="hidden" />
        </label>
        {fileLoading && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Đang đọc file...</p>}
        {fileError && <p className="text-sm text-danger mt-2">{fileError}</p>}
      </div>

      <Textarea
        rows={12}
        placeholder={`Dán câu hỏi vào đây, ví dụ:\n\nSAP là viết tắt của gì?\nA. Systems, Applications, and Products\nB. System Analysis Program\nC. Software Application Platform\nD. Standard Application Process\n\n(để trống 1 dòng rồi tiếp câu 2)`}
        value={rawText}
        onChange={(e) => onChangeRawText(e.target.value)}
        className="font-mono text-sm"
      />

      <Button onClick={onParse} variant="primary" className="mt-4">
        Tách câu hỏi
      </Button>

      {parseErrors.length > 0 && (
        <Card className="mt-4 p-5 border-warning/40 bg-amber-50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="warning">Không tách được {parseErrors.length} câu</Badge>
          </div>
          <ul className="text-sm text-amber-700 dark:text-amber-400 mb-4 list-disc list-inside">
            {parseErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            Nội dung của bạn không đúng định dạng chuẩn. Bạn có thể copy đoạn hướng dẫn dưới đây,
            gửi cho một AI khác (ChatGPT, Gemini...) kèm nội dung gốc, rồi dán kết quả AI trả về vào ô văn bản
            phía trên và bấm &quot;Tách câu hỏi&quot; lại.
          </p>
          <Button
            onClick={handleCopyPrompt}
            variant="secondary"
            size="sm"
            leftIcon={copied ? <Check size={14} /> : <Copy size={14} />}
          >
            {copied ? "Đã copy!" : "Copy hướng dẫn định dạng"}
          </Button>
        </Card>
      )}
    </>
  );
}