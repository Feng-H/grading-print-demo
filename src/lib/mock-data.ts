import { ClassInfo, Student, Homework, Question, StudentSubmission, Teacher, Parent, ClassAnalytics } from "@/types";

export const currentTeacher: Teacher = {
  id: "t1",
  name: "李老师",
  avatar: "👩‍🏫",
  subject: "数学",
  classes: [
    { id: "c1", name: "三年级2班", grade: "三年级", studentCount: 45, subject: "数学", headTeacher: "李老师" }
  ]
};

export const classes: ClassInfo[] = [
  { id: "c1", name: "三年级2班", grade: "三年级", studentCount: 45, subject: "数学", headTeacher: "李老师" }
];

export const students: Student[] = [
  { id: "s1", name: "张小明", avatar: "👦", classId: "c1", className: "三年级2班", studentNo: "001", parentId: "p1" },
  { id: "s2", name: "李小红", avatar: "👧", classId: "c1", className: "三年级2班", studentNo: "002", parentId: "p2" },
  { id: "s3", name: "王小华", avatar: "👦", classId: "c1", className: "三年级2班", studentNo: "003", parentId: "p3" },
  { id: "s4", name: "赵小丽", avatar: "👧", classId: "c1", className: "三年级2班", studentNo: "004", parentId: "p4" },
  { id: "s5", name: "陈小强", avatar: "👦", classId: "c1", className: "三年级2班", studentNo: "005", parentId: "p5" },
];

export const currentParent: Parent = {
  id: "p1",
  name: "张明爸爸",
  avatar: "👨",
  children: [students[0]]
};

// 示例题目（5种不同题型）
const sampleQuestions: Question[] = [
  {
    id: "q1",
    type: "choice",
    content: "下列哪个数字是偶数？",
    options: ["A. 3", "B. 5", "C. 8", "D. 7"],
    correctAnswer: "C",
    score: 10,
    knowledgePointId: "kp1",
    knowledgePointName: "奇数与偶数",
    difficulty: 1
  },
  {
    id: "q2",
    type: "fill",
    content: "计算：25 + 37 = ______",
    correctAnswer: "62",
    score: 10,
    knowledgePointId: "kp2",
    knowledgePointName: "两位数加法",
    difficulty: 1
  },
  {
    id: "q3",
    type: "judge",
    content: "1千克棉花比1千克铁轻。（  ）",
    correctAnswer: "错误",
    score: 10,
    knowledgePointId: "kp3",
    knowledgePointName: "重量单位认识",
    difficulty: 2
  },
  {
    id: "q4",
    type: "math",
    content: "小明有36颗糖，平均分给6个小朋友，每个小朋友分到几颗？如果每个小朋友分4颗，可以分给几个小朋友？",
    correctAnswer: "每个小朋友分到6颗；可以分给9个小朋友",
    score: 25,
    knowledgePointId: "kp4",
    knowledgePointName: "表内除法",
    difficulty: 2
  },
  {
    id: "q5",
    type: "short_answer",
    content: "请说一说，你在生活中见过哪些平行四边形的例子？请至少举出2个。",
    correctAnswer: "示例：楼梯扶手、伸缩门、篱笆格子、七巧板等（言之有理即可）",
    score: 20,
    knowledgePointId: "kp5",
    knowledgePointName: "平行四边形认识",
    difficulty: 2
  },
];

export const homeworkList: Homework[] = [
  {
    id: "hw1",
    title: "第三单元测试卷",
    description: "除法、图形认识综合测试",
    classId: "c1",
    className: "三年级2班",
    subject: "数学",
    teacherId: "t1",
    teacherName: "李老师",
    createTime: "2026-07-01",
    deadline: "2026-07-03",
    status: "pending",
    questions: sampleQuestions,
    totalScore: 100,
    submissionCount: 42,
    totalStudents: 45
  },
  {
    id: "hw2",
    title: "第二单元课后练习",
    description: "加减法竖式计算练习",
    classId: "c1",
    className: "三年级2班",
    subject: "数学",
    teacherId: "t1",
    teacherName: "李老师",
    createTime: "2026-06-25",
    deadline: "2026-06-27",
    status: "published",
    questions: sampleQuestions.slice(0, 4),
    totalScore: 80,
    submissionCount: 45,
    totalStudents: 45
  },
  {
    id: "hw3",
    title: "第一单元小测",
    description: "时、分、秒认识",
    classId: "c1",
    className: "三年级2班",
    subject: "数学",
    teacherId: "t1",
    teacherName: "李老师",
    createTime: "2026-06-18",
    deadline: "2026-06-20",
    status: "published",
    questions: sampleQuestions.slice(0, 3),
    totalScore: 30,
    submissionCount: 45,
    totalStudents: 45
  }
];

// 模拟学生提交答案（张小明）
export const sampleSubmission: StudentSubmission = {
  id: "sub1",
  homeworkId: "hw1",
  studentId: "s1",
  studentName: "张小明",
  submitTime: "2026-07-02 19:35",
  answers: [
    { questionId: "q1", answer: "C" },
    { questionId: "q2", answer: "52" },
    { questionId: "q3", answer: "正确" },
    { questionId: "q4", answer: "36÷6=6，每个小朋友6颗；36÷4=9，可以分给9个小朋友" },
    { questionId: "q5", answer: "伸缩门、楼梯的栏杆。" },
  ]
};

// 模拟AI批改结果
export const sampleGradingResults = [
  {
    questionId: "q1",
    score: 10,
    maxScore: 10,
    isCorrect: true,
    comment: "回答正确！对奇数偶数概念掌握清晰。",
    correctAnswer: "C",
  },
  {
    questionId: "q2",
    score: 0,
    maxScore: 10,
    isCorrect: false,
    comment: "计算错误，25+37应该是62，你算成了52，注意个位相加进位哦。",
    correctAnswer: "62",
    errorType: "calculation" as const,
  },
  {
    questionId: "q3",
    score: 0,
    maxScore: 10,
    isCorrect: false,
    comment: "判断错误。1千克棉花和1千克铁重量都是1千克，是一样重的，不要被物体材质迷惑啦～",
    correctAnswer: "错误",
    errorType: "concept" as const,
  },
  {
    questionId: "q4",
    score: 23,
    maxScore: 25,
    isCorrect: true,
    comment: "解题思路清晰，除法计算准确！第一问答对得12分，第二问答对得11分，继续保持～",
    correctAnswer: "每个小朋友分到6颗；可以分给9个小朋友",
  },
  {
    questionId: "q5",
    score: 18,
    maxScore: 20,
    isCorrect: true,
    comment: "例子举得很好！伸缩门和楼梯栏杆确实都是平行四边形在生活中的应用，观察很仔细，再想想还有没有其他例子呢？",
    correctAnswer: "示例：楼梯扶手、伸缩门、篱笆格子、七巧板等",
  },
];

export const sampleClassAnalytics: ClassAnalytics = {
  homeworkId: "hw1",
  homeworkTitle: "第三单元测试卷",
  classId: "c1",
  className: "三年级2班",
  averageScore: 78.5,
  maxScore: 98,
  minScore: 42,
  submissionRate: 93.3,
  scoreDistribution: [
    { score: "90-100", count: 8 },
    { score: "80-89", count: 15 },
    { score: "70-79", count: 12 },
    { score: "60-69", count: 5 },
    { score: "60以下", count: 2 },
  ],
  knowledgePointMastery: [
    { id: "kp1", name: "奇数与偶数", correctRate: 92, totalQuestions: 1, wrongCount: 3 },
    { id: "kp2", name: "两位数加法", correctRate: 75, totalQuestions: 1, wrongCount: 10 },
    { id: "kp3", name: "重量单位认识", correctRate: 58, totalQuestions: 1, wrongCount: 17 },
    { id: "kp4", name: "表内除法", correctRate: 82, totalQuestions: 1, wrongCount: 7 },
    { id: "kp5", name: "平行四边形认识", correctRate: 88, totalQuestions: 1, wrongCount: 5 },
  ],
  commonMistakes: [
    {
      questionId: "q3",
      questionContent: "1千克棉花比1千克铁轻。（  ）",
      wrongCount: 17,
      errorAnalysis: "近40%的学生受生活直觉影响，误认为棉花比铁轻，说明对重量概念理解不透彻"
    },
    {
      questionId: "q2",
      questionContent: "计算：25 + 37 = ______",
      wrongCount: 10,
      errorAnalysis: "主要错误是个位相加进位1后，十位计算忘记加进位1"
    }
  ],
  teachingSuggestions: [
    "重量单位概念是班级共性薄弱点，建议下节课增加1千克实物掂一掂的体验活动，帮助学生建立直观认知",
    "两位数加法进位问题需要强化练习，重点关注进位标记习惯的培养",
    "整体掌握情况良好，可以适当增加拓展题满足学有余力的学生需求",
    "对60分以下的2名学生建议进行一对一知识点补漏"
  ]
};

// 学生个人雷达图数据（知识点掌握度）
export const studentRadarData = [
  { name: "数的认识", value: 85 },
  { name: "计算能力", value: 70 },
  { name: "单位认识", value: 55 },
  { name: "除法应用", value: 90 },
  { name: "图形认识", value: 88 },
  { name: "问题解决", value: 80 },
];

export const studentTrendData = [
  { date: "6/18", score: 82, average: 76 },
  { date: "6/25", score: 76, average: 74 },
  { date: "7/1", score: 61, average: 78.5 },
];

export function getHomeworkById(id: string) {
  return homeworkList.find(hw => hw.id === id);
}

export function getStudentById(id: string) {
  return students.find(s => s.id === id);
}
