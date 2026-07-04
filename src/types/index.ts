// 用户角色
export type UserRole = 'teacher' | 'parent';

// 题目类型
export type QuestionType = 'choice' | 'judge' | 'fill' | 'math' | 'short_answer' | 'essay';

// 作业状态
export type HomeworkStatus = 'pending' | 'grading' | 'graded' | 'published';

// 班级
export interface ClassInfo {
  id: string;
  name: string;
  grade: string;
  studentCount: number;
  subject: string;
  headTeacher: string;
}

// 学生
export interface Student {
  id: string;
  name: string;
  avatar: string;
  classId: string;
  className: string;
  studentNo: string;
  parentId: string;
}

// 知识点
export interface KnowledgePoint {
  id: string;
  name: string;
  subject: string;
}

// 题目
export interface Question {
  id: string;
  type: QuestionType;
  content: string;
  options?: string[]; // 选择题选项
  correctAnswer: string;
  score: number;
  knowledgePointId: string;
  knowledgePointName: string;
  difficulty: 1 | 2 | 3; // 1简单 2中等 3难
}

// 学生答案
export interface StudentAnswer {
  questionId: string;
  answer: string;
  imageUrl?: string; // 手写答案图片
}

// 批改结果
export interface GradingResult {
  questionId: string;
  score: number;
  maxScore: number;
  isCorrect: boolean;
  comment: string;
  correctAnswer: string;
  errorType?: 'concept' | 'calculation' | 'careless' | 'expression'; // 错误类型
}

// 作业/试卷
export interface Homework {
  id: string;
  title: string;
  description: string;
  classId: string;
  className: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  createTime: string;
  deadline: string;
  status: HomeworkStatus;
  questions: Question[];
  totalScore: number;
  submissionCount: number;
  totalStudents: number;
}

// 学生提交的作业
export interface StudentSubmission {
  id: string;
  homeworkId: string;
  studentId: string;
  studentName: string;
  submitTime: string;
  answers: StudentAnswer[];
  gradingResults?: GradingResult[];
  totalScore?: number;
  aiComment?: string;
  weakPoints?: string[]; // 薄弱知识点
}

// 班级学情分析
export interface ClassAnalytics {
  homeworkId: string;
  homeworkTitle: string;
  classId: string;
  className: string;
  averageScore: number;
  maxScore: number;
  minScore: number;
  submissionRate: number;
  scoreDistribution: { score: string; count: number }[];
  knowledgePointMastery: {
    id: string;
    name: string;
    correctRate: number;
    totalQuestions: number;
    wrongCount: number;
  }[];
  commonMistakes: {
    questionId: string;
    questionContent: string;
    wrongCount: number;
    errorAnalysis: string;
  }[];
  teachingSuggestions: string[];
}

// 学生个人分析
export interface StudentAnalytics {
  studentId: string;
  studentName: string;
  overallMastery: { name: string; value: number }[]; // 知识点掌握度雷达图数据
  recentTrend: { date: string; score: number; average: number }[];
  weakPoints: {
    knowledgePoint: string;
    mastery: number;
    suggestion: string;
  }[];
  strengths: string[];
}

// 老师信息
export interface Teacher {
  id: string;
  name: string;
  avatar: string;
  subject: string;
  classes: ClassInfo[];
}

// 家长信息
export interface Parent {
  id: string;
  name: string;
  avatar: string;
  children: Student[];
}
