import mammoth from "mammoth";

export async function extractTextFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  if (file.name.toLowerCase().endsWith(".docx")) {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  if (file.name.toLowerCase().endsWith(".pdf")) {
    // Dynamic import: chỉ load pdfjs-dist khi hàm này thực sự chạy trong trình duyệt.
    // Import tĩnh ở đầu file sẽ khiến Next.js load thư viện này lúc build/prerender
    // ở server (Node.js), nơi không có DOMMatrix -> gây lỗi build.
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      fullText += pageText + "\n\n";
    }

    return fullText;
  }

  throw new Error("Chỉ hỗ trợ file .docx hoặc .pdf");
}