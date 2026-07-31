export type Question = {
  id: number;
  quizId: number;
  content: string;
  options: string[];
  correctIndex: number; // vị trí đáp án đúng trong options (0 = A, 1 = B, 2 = C, 3 = D)
};

export const questions: Question[] = [
  {
    id: 1,
    quizId: 1,
    content: "SAP là viết tắt của gì?",
    options: [
      "Systems, Applications, and Products in Data Processing",
      "System Analysis Program",
      "Software Application Platform",
      "Standard Application Process",
    ],
    correctIndex: 0,
  },
  {
    id: 2,
    quizId: 1,
    content: "Module nào của SAP quản lý bán hàng?",
    options: ["MM", "SD", "FI", "PP"],
    correctIndex: 1,
  },
  {
    id: 3,
    quizId: 1,
    content: "SAP thuộc loại phần mềm nào?",
    options: ["CRM", "ERP", "CMS", "OS"],
    correctIndex: 1,
  },
];