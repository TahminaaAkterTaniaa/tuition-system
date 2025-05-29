import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');
  
  // Hash the test password
  const hashedPassword = await hash('test123', 12);
  
  // Create test users (students and teachers)
  console.log('Creating test users...');
  
  // Create 5 test students
  const students = await Promise.all(
    Array.from({ length: 5 }, async (_, i) => {
      const studentNum = i + 1;
      // Add timestamp to email to ensure uniqueness
      const timestamp = Date.now();
      const user = await prisma.user.create({
        data: {
          email: `student${studentNum}_${timestamp}@test.com`,
          name: `Student ${studentNum}`,
          password: hashedPassword,
          role: 'STUDENT',
          emailVerified: new Date(),
        },
      });
      
      return prisma.student.create({
        data: {
          userId: user.id,
          studentId: `ST${100000 + studentNum}`,
          dateOfBirth: new Date(2000, 0, studentNum),
          address: `${100 + studentNum} Test St, Test City`,
          phoneNumber: `+123456789${studentNum}`,
          emergencyContact: `+123456788${studentNum}`,
          academicLevel: `Grade ${10 + (studentNum % 3)}`,
        },
      });
    })
  );
  
  // Create 2 additional test teachers
  const newTeachers = await Promise.all(
    [
      { name: 'Sarah Johnson', email: 'sarah.johnson@test.com' },
      { name: 'Michael Brown', email: 'michael.brown@test.com' },
    ].map(async (teacher, index) => {
      const teacherNum = index + 1;
      // Add timestamp to email to ensure uniqueness
      const timestamp = Date.now();
      const user = await prisma.user.create({
        data: {
          email: `${teacher.email.split('@')[0]}_${timestamp}@${teacher.email.split('@')[1]}`,
          name: teacher.name,
          password: hashedPassword,
          role: 'TEACHER',
          emailVerified: new Date(),
        },
      });
      
      return prisma.teacher.create({
        data: {
          userId: user.id,
          teacherId: `TCH${1000 + teacherNum}`,
          qualification: `Ph.D. in Education`,
          specialization: teacher.name.includes('Sarah') ? 'Mathematics' : 'Science',
          experience: 5 + teacherNum,
        },
      });
    })
  );
  
  // Get all teachers (existing + new)
  const allTeachers = await prisma.teacher.findMany({
    include: { user: true },
  });
  
  // Get all classes
  const allClasses = await prisma.class.findMany({
    include: {
      teacher: {
        include: {
          user: true,
        },
      },
    },
  });
  
  console.log(`Found ${allClasses.length} classes to populate`);
  
  // Enroll students in classes and create attendance/grades
  for (const student of students) {
    for (const classItem of allClasses) {
      // Randomly decide if student enrolls (80% chance)
      if (Math.random() > 0.2) {
        const enrollment = await prisma.enrollment.create({
          data: {
            studentId: student.id,
            classId: classItem.id,
            enrollmentDate: new Date(),
            status: 'enrolled',
          },
        });
        
        // Create attendance records (random 1-3 sessions per class)
        const sessionCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < sessionCount; i++) {
          await prisma.attendance.create({
            data: {
              studentId: student.id,
              classId: classItem.id,
              date: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000), // One week apart
              status: Math.random() > 0.2 ? 'PRESENT' : 'ABSENT',
              recordedBy: allTeachers && allTeachers.length > 0 ? allTeachers[0].id : null,
            },
          });
        }
        
        // Create grades (1-3 per enrollment)
        const gradeCount = Math.floor(Math.random() * 3) + 1;
        const assignmentTypes = ['HOMEWORK', 'QUIZ', 'TEST', 'PROJECT'];
        
        for (let i = 0; i < gradeCount; i++) {
          // Use defined values to avoid undefined errors
          const scoreOptions = [10, 20, 50, 100];
          const index = Math.floor(Math.random() * scoreOptions.length);
          const maxScoreValue = scoreOptions[index];
          const scoreValue = Math.floor(Math.random() * maxScoreValue * 0.7) + (maxScoreValue * 0.3); // Ensure passing grade
          
          await prisma.grade.create({
            data: {
              studentId: student.id,
              classId: classItem.id,
              score: scoreValue,
              maxScore: maxScoreValue,
              weight: [10, 15, 20, 25][Math.floor(Math.random() * 4)] || 10,
              assessmentName: `${assignmentTypes[Math.floor(Math.random() * assignmentTypes.length)] || 'QUIZ'} ${i + 1}`,
              assessmentType: assignmentTypes[Math.floor(Math.random() * assignmentTypes.length)] || 'QUIZ',
              feedback: Math.random() > 0.5 ? 'Good work!' : 'Keep practicing!',
              gradedDate: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000),
            },
          });
        }
      }
    }
  }
  
  // Create some withdrawal requests (for about 20% of enrollments)
  const enrollments = await prisma.enrollment.findMany();
  for (const enrollment of enrollments) {
    if (Math.random() < 0.2) {
      await prisma.withdrawalRequest.create({
        data: {
          studentId: enrollment.studentId,
          classId: enrollment.classId,
          enrollmentId: enrollment.id,
          reason: 'Personal reasons',
          status: Math.random() > 0.7 ? 'APPROVED' : 'PENDING',
          requestDate: new Date(),
          reviewedAt: Math.random() > 0.7 ? new Date() : null,
          reviewedBy: Math.random() > 0.7 && allTeachers && allTeachers.length > 0 && allTeachers[0] ? allTeachers[0].userId : null,
          reviewNotes: Math.random() > 0.7 ? 'Withdrawal request processed' : null,
        },
      });
    }
  }
  
  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
