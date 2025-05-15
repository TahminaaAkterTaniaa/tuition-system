import { PrismaClient } from '../src/generated/prisma';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Create users with different roles
  const adminPassword = await hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'ADMIN',
      admin: {
        create: {
          adminId: 'ADM001',
          department: 'Administration',
          accessLevel: 'super'
        }
      }
    },
    include: {
      admin: true
    }
  });

  const teacherPassword = await hash('teacher123', 10);
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@example.com' },
    update: {},
    create: {
      email: 'teacher@example.com',
      name: 'John Smith',
      password: teacherPassword,
      role: 'TEACHER',
      teacher: {
        create: {
          teacherId: 'TCH001',
          qualification: 'PhD in Mathematics',
          specialization: 'Applied Mathematics',
          experience: 8
        }
      }
    },
    include: {
      teacher: true
    }
  });

  const studentPassword = await hash('student123', 10);
  const student = await prisma.user.upsert({
    where: { email: 'student@example.com' },
    update: {},
    create: {
      email: 'student@example.com',
      name: 'Jane Doe',
      password: studentPassword,
      role: 'STUDENT',
      student: {
        create: {
          studentId: 'STD001',
          academicLevel: 'Undergraduate',
          phoneNumber: '123-456-7890'
        }
      }
    },
    include: {
      student: true
    }
  });

  // Create classes
  const mathClass = await prisma.class.upsert({
    where: { id: 'cls001' },
    update: {
      fee: 129.99 // Update existing records with a fee
    },
    create: {
      id: 'cls001',
      name: 'Advanced Mathematics',
      subject: 'Mathematics',
      description: 'Advanced calculus and linear algebra for senior students',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-05-30'),
      schedule: 'Monday, Wednesday, Friday 10:00 AM - 11:30 AM',
      capacity: 30,
      room: 'Room 101',
      fee: 129.99, // Higher fee for advanced course
      status: 'active',
      teacherId: teacher.teacher?.id
    }
  });

  const physicsClass = await prisma.class.upsert({
    where: { id: 'cls002' },
    update: {
      fee: 149.99 // Update existing records with a fee
    },
    create: {
      id: 'cls002',
      name: 'Physics Fundamentals',
      subject: 'Science',
      description: 'Mechanics, thermodynamics, and electromagnetism',
      startDate: new Date('2025-01-16'),
      endDate: new Date('2025-05-28'),
      schedule: 'Tuesday, Thursday 1:00 PM - 2:30 PM',
      capacity: 24,
      room: 'Lab 203',
      fee: 149.99, // Lab course with higher fee due to materials
      status: 'active',
      teacherId: teacher.teacher?.id
    }
  });

  const historyClass = await prisma.class.upsert({
    where: { id: 'cls003' },
    update: {
      fee: 89.99 // Update existing records with a fee
    },
    create: {
      id: 'cls003',
      name: 'World History',
      subject: 'History',
      description: 'Survey of major historical events and civilizations',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-05-30'),
      schedule: 'Monday, Wednesday 9:00 AM - 10:30 AM',
      capacity: 35,
      room: 'Room 105',
      fee: 89.99, // Lower fee for this course
      status: 'active',
      teacherId: teacher.teacher?.id
    }
  });

  // Enroll student in some classes
  if (student.student?.id && mathClass.id) {
    await prisma.enrollment.upsert({
      where: {
        studentId_classId: {
          studentId: student.student.id,
          classId: mathClass.id
        }
      },
      update: {},
      create: {
        studentId: student.student.id,
        classId: mathClass.id,
        status: 'enrolled',
        enrollmentDate: new Date()
      }
    });
  }

  if (student.student?.id && physicsClass.id) {
    await prisma.enrollment.upsert({
      where: {
        studentId_classId: {
          studentId: student.student.id,
          classId: physicsClass.id
        }
      },
      update: {},
      create: {
        studentId: student.student.id,
        classId: physicsClass.id,
        status: 'enrolled',
        enrollmentDate: new Date()
      }
    });
  }

  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
