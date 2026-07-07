/**
 * 初始化测试数据：teacher (用demo-teacher id匹配NextAuth硬编码), class, students, homework
 */
import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  // 清理
  await prisma.annotation.deleteMany();
  await prisma.generatedPdf.deleteMany();
  await prisma.printJob.deleteMany();
  await prisma.job.deleteMany();
  await prisma.webdavSeen.deleteMany();
  await prisma.studentAnswer.deleteMany();
  await prisma.gradingResult.deleteMany();
  await prisma.paperSheet.deleteMany();
  await prisma.paperBatch.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.question.deleteMany();
  await prisma.homework.deleteMany();
  await prisma.student.deleteMany();
  await prisma.class.deleteMany();
  await prisma.user.deleteMany();

  // 创建老师 - 使用固定id匹配NextAuth DEMO_USERS的demo-teacher
  const teacher = await prisma.user.create({
    data: {
      id: 'demo-teacher',
      username: 'teacher',
      passwordHash: await bcrypt.hash('123456', 10),
      name: '李老师',
      role: 'teacher',
      avatar: '👩‍🏫',
    },
  });
  console.log('Teacher created:', teacher.id, teacher.username);

  // 班级
  const cls = await prisma.class.create({
    data: {
      name: '三年级(1)班',
      grade: '三年级',
      subject: '数学',
      teacherId: teacher.id,
      studentCount: 3,
    },
  });
  console.log('Class created:', cls.id);

  // 学生
  const studentInfos = [
    { name: 'Alice', no: '2024001' },
    { name: 'Bob', no: '2024002' },
    { name: 'Charlie', no: '2024003' },
  ];
  const students = [];
  for (const info of studentInfos) {
    const s = await prisma.student.create({
      data: {
        name: info.name, studentNo: info.no, className: cls.name,
        classId: cls.id,
      },
    });
    students.push(s);
    console.log('Student:', s.id, info.name);
  }

  // 作业（试卷）- 注意：真实流程中question bbox应该由OCR得到，这里seed只做结构
  const hw = await prisma.homework.create({
    data: {
      title: '三年级数学期末试卷',
      description: '扫描上传测试作业',
      subject: '数学',
      totalScore: 100,
      pagesPerStudent: 2,
      classId: cls.id,
      teacherId: teacher.id,
    },
    include: { questions: true },
  });
  console.log('Homework created:', hw.id);
  console.log('\n=== Seed done. Login: teacher / 123456 ===');
}

main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
