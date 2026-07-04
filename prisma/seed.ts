import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始写入种子数据...');

  // 清理旧数据（按外键顺序）
  await prisma.gradingResult.deleteMany();
  await prisma.studentAnswer.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.question.deleteMany();
  await prisma.homework.deleteMany();
  await prisma.student.deleteMany();
  await prisma.class.deleteMany();
  await prisma.user.deleteMany();

  // 老师用户
  const teacher = await prisma.user.create({
    data: {
      id: 'demo-teacher',
      username: 'teacher',
      name: '李老师',
      role: 'teacher',
      avatar: '👩‍🏫',
    },
  });

  // 家长用户（张小明爸爸）
  const parent = await prisma.user.create({
    data: {
      id: 'demo-parent',
      username: 'parent',
      name: '张明爸爸',
      role: 'parent',
      avatar: '👨',
    },
  });

  // 家长2-5
  const parent2 = await prisma.user.create({ data: { username: 'parent2', name: '李红妈妈', role: 'parent', avatar: '👩' } });
  const parent3 = await prisma.user.create({ data: { username: 'parent3', name: '王华爸爸', role: 'parent', avatar: '👨' } });
  const parent4 = await prisma.user.create({ data: { username: 'parent4', name: '赵丽妈妈', role: 'parent', avatar: '👩' } });
  const parent5 = await prisma.user.create({ data: { username: 'parent5', name: '陈强爸爸', role: 'parent', avatar: '👨' } });

  // 班级 - 三年级2班
  const klass = await prisma.class.create({
    data: {
      id: 'class-c1',
      name: '三年级2班',
      grade: '三年级',
      subject: '数学',
      studentCount: 45,
      teacherId: teacher.id,
    },
  });

  // 5个演示学生
  const studentData = [
    { name: '张小明', avatar: '👦', studentNo: '001', parentId: parent.id },
    { name: '李小红', avatar: '👧', studentNo: '002', parentId: parent2.id },
    { name: '王小华', avatar: '👦', studentNo: '003', parentId: parent3.id },
    { name: '赵小丽', avatar: '👧', studentNo: '004', parentId: parent4.id },
    { name: '陈小强', avatar: '👦', studentNo: '005', parentId: parent5.id },
  ];

  const students = [];
  for (const s of studentData) {
    const stu = await prisma.student.create({
      data: { ...s, className: klass.name, classId: klass.id },
    });
    students.push(stu);
  }

  // 创建3份演示历史作业（isDemo=true）
  // HW2 第二单元课后练习（已发布已批改）
  const hw2 = await prisma.homework.create({
    data: {
      id: 'hw2',
      title: '第二单元课后练习',
      description: '加减法竖式计算练习',
      subject: '数学',
      totalScore: 55,
      status: 'published',
      deadline: new Date('2026-06-27'),
      isDemo: true,
      classId: klass.id,
      teacherId: teacher.id,
      questions: {
        create: [
          {
            type: 'choice', content: '下列哪个数字是偶数？',
            options: ['A. 3', 'B. 5', 'C. 8', 'D. 7'],
            correctAnswer: 'C', score: 10,
            knowledgePointId: 'kp1', knowledgePointName: '奇数与偶数', difficulty: 1, order: 1,
          },
          {
            type: 'fill', content: '计算：25 + 37 = ______',
            correctAnswer: '62', score: 10,
            knowledgePointId: 'kp2', knowledgePointName: '两位数加法', difficulty: 1, order: 2,
          },
          {
            type: 'judge', content: '1千克棉花比1千克铁轻。（  ）',
            correctAnswer: '错误', score: 10,
            knowledgePointId: 'kp3', knowledgePointName: '重量单位认识', difficulty: 2, order: 3,
          },
          {
            type: 'math', content: '小明有36颗糖，平均分给6个小朋友，每个小朋友分到几颗？',
            correctAnswer: '每个小朋友分到6颗', score: 25,
            knowledgePointId: 'kp4', knowledgePointName: '表内除法', difficulty: 2, order: 4,
          },
        ],
      },
    },
    include: { questions: true },
  });

  // 张小明对hw2的提交（已批改）
  const xm = students[0];
  const sub2 = await prisma.submission.create({
    data: {
      homeworkId: hw2.id,
      studentId: xm.id,
      teacherId: teacher.id,
      status: 'graded',
      totalScore: 43,
      aiComment: '张小明同学本次练习整体不错，奇偶数和除法掌握扎实，但重量单位概念需要加强。',
      submitTime: new Date('2026-06-26T19:35:00'),
      answers: {
        create: [
          { questionId: hw2.questions[0].id, answer: 'C' },
          { questionId: hw2.questions[1].id, answer: '52' },
          { questionId: hw2.questions[2].id, answer: '正确' },
          { questionId: hw2.questions[3].id, answer: '36÷6=6，每个小朋友6颗' },
        ],
      },
    },
    include: { answers: true },
  });

  await prisma.gradingResult.createMany({
    data: [
      { questionId: hw2.questions[0].id, submissionId: sub2.id, score: 10, maxScore: 10, isCorrect: true, comment: '回答正确！对奇数偶数概念掌握清晰。', correctAnswer: 'C' },
      { questionId: hw2.questions[1].id, submissionId: sub2.id, score: 0, maxScore: 10, isCorrect: false, comment: '计算错误，25+37应该是62，你算成了52，注意个位相加进位哦。', correctAnswer: '62', errorType: 'calculation' },
      { questionId: hw2.questions[2].id, submissionId: sub2.id, score: 0, maxScore: 10, isCorrect: false, comment: '判断错误。1千克棉花和1千克铁重量都是1千克，是一样重的，不要被物体材质迷惑啦～', correctAnswer: '错误', errorType: 'concept' },
      { questionId: hw2.questions[3].id, submissionId: sub2.id, score: 23, maxScore: 25, isCorrect: true, comment: '解题思路清晰，除法计算准确！如果能写上答语就更完美了。', correctAnswer: '每个小朋友分到6颗' },
    ],
  });

  // HW3 第一单元小测（已发布已批改）
  const hw3 = await prisma.homework.create({
    data: {
      id: 'hw3',
      title: '第一单元小测',
      description: '时、分、秒认识',
      subject: '数学',
      totalScore: 30,
      status: 'published',
      deadline: new Date('2026-06-20'),
      isDemo: true,
      classId: klass.id,
      teacherId: teacher.id,
      questions: {
        create: [
          { type: 'choice', content: '1小时等于多少分钟？', options: ['A. 30', 'B. 60', 'C. 100', 'D. 24'], correctAnswer: 'B', score: 10, knowledgePointId: 'kp6', knowledgePointName: '时分秒换算', difficulty: 1, order: 1 },
          { type: 'fill', content: '钟面上时针走一大格是______小时。', correctAnswer: '1', score: 10, knowledgePointId: 'kp6', knowledgePointName: '时钟认识', difficulty: 1, order: 2 },
          { type: 'judge', content: '分针走一圈是1小时。（  ）', correctAnswer: '正确', score: 10, knowledgePointId: 'kp6', knowledgePointName: '时分秒换算', difficulty: 2, order: 3 },
        ],
      },
    },
    include: { questions: true },
  });

  const sub3 = await prisma.submission.create({
    data: {
      homeworkId: hw3.id, studentId: xm.id, teacherId: teacher.id,
      status: 'graded', totalScore: 30,
      aiComment: '本次小测全部正确！对时分秒的概念掌握很好，继续保持！',
      submitTime: new Date('2026-06-19T20:00:00'),
      answers: { create: hw3.questions.map(q => ({ questionId: q.id, answer: q.correctAnswer })) },
    },
    include: { answers: true },
  });
  await prisma.gradingResult.createMany({
    data: hw3.questions.map((q, i) => ({
      questionId: q.id, submissionId: sub3.id,
      score: q.score, maxScore: q.score, isCorrect: true,
      comment: '回答正确！', correctAnswer: q.correctAnswer,
    })),
  });

  // HW1 第三单元测试卷（待批改 - 作为AI批改演示入口）
  await prisma.homework.create({
    data: {
      id: 'hw1',
      title: '第三单元测试卷',
      description: '除法、图形认识综合测试（示例数据，点击"开始批改"体验AI批改）',
      subject: '数学',
      totalScore: 75,
      status: 'pending',
      deadline: new Date('2026-07-03'),
      isDemo: true,
      classId: klass.id,
      teacherId: teacher.id,
      questions: {
        create: [
          { type: 'choice', content: '下列哪个数字是偶数？', options: ['A. 3', 'B. 5', 'C. 8', 'D. 7'], correctAnswer: 'C', score: 10, knowledgePointId: 'kp1', knowledgePointName: '奇数与偶数', difficulty: 1, order: 1 },
          { type: 'fill', content: '计算：25 + 37 = ______', correctAnswer: '62', score: 10, knowledgePointId: 'kp2', knowledgePointName: '两位数加法', difficulty: 1, order: 2 },
          { type: 'judge', content: '1千克棉花比1千克铁轻。（  ）', correctAnswer: '错误', score: 10, knowledgePointId: 'kp3', knowledgePointName: '重量单位认识', difficulty: 2, order: 3 },
          { type: 'math', content: '小明有36颗糖，平均分给6个小朋友，每个小朋友分到几颗？如果每个小朋友分4颗，可以分给几个小朋友？', correctAnswer: '每个小朋友分到6颗；可以分给9个小朋友', score: 25, knowledgePointId: 'kp4', knowledgePointName: '表内除法', difficulty: 2, order: 4 },
          { type: 'short_answer', content: '请说一说，你在生活中见过哪些平行四边形的例子？请至少举出2个。', correctAnswer: '示例：楼梯扶手、伸缩门、篱笆格子、七巧板等（言之有理即可）', score: 20, knowledgePointId: 'kp5', knowledgePointName: '平行四边形认识', difficulty: 2, order: 5 },
        ],
      },
    },
  });

  console.log('✅ 种子数据写入完成！');
  console.log(`   - 老师: ${teacher.username} / 123456`);
  console.log(`   - 家长: ${parent.username} / 123456 (孩子: ${xm.name})`);
  console.log(`   - 班级: ${klass.name} (${students.length}个演示学生)`);
  console.log(`   - 作业: 3份演示作业`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
