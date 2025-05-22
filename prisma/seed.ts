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

  // Create multiple teachers
  const teacherPassword = await hash('teacher123', 10);
  
  // Math Teacher
  const mathTeacher = await prisma.user.upsert({
    where: { email: 'math@example.com' },
    update: {},
    create: {
      email: 'math@example.com',
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
  
  // Science Teacher
  const scienceTeacher = await prisma.user.upsert({
    where: { email: 'science@example.com' },
    update: {},
    create: {
      email: 'science@example.com',
      name: 'Emily Johnson',
      password: teacherPassword,
      role: 'TEACHER',
      teacher: {
        create: {
          teacherId: 'TCH002',
          qualification: 'PhD in Physics',
          specialization: 'Quantum Physics',
          experience: 6
        }
      }
    },
    include: {
      teacher: true
    }
  });
  
  // English Teacher
  const englishTeacher = await prisma.user.upsert({
    where: { email: 'english@example.com' },
    update: {},
    create: {
      email: 'english@example.com',
      name: 'Sarah Williams',
      password: teacherPassword,
      role: 'TEACHER',
      teacher: {
        create: {
          teacherId: 'TCH003',
          qualification: 'MA in English Literature',
          specialization: 'Creative Writing',
          experience: 5
        }
      }
    },
    include: {
      teacher: true
    }
  });
  
  // History Teacher
  const historyTeacher = await prisma.user.upsert({
    where: { email: 'history@example.com' },
    update: {},
    create: {
      email: 'history@example.com',
      name: 'Michael Brown',
      password: teacherPassword,
      role: 'TEACHER',
      teacher: {
        create: {
          teacherId: 'TCH004',
          qualification: 'PhD in History',
          specialization: 'World History',
          experience: 7
        }
      }
    },
    include: {
      teacher: true
    }
  });
  
  // Art Teacher
  const artTeacher = await prisma.user.upsert({
    where: { email: 'art@example.com' },
    update: {},
    create: {
      email: 'art@example.com',
      name: 'Jessica Lee',
      password: teacherPassword,
      role: 'TEACHER',
      teacher: {
        create: {
          teacherId: 'TCH005',
          qualification: 'MFA in Fine Arts',
          specialization: 'Contemporary Art',
          experience: 4
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

  // Create classes with timetable-compatible schedules
  // Math Classes
  const algebraClass = await prisma.class.upsert({
    where: { id: 'cls001' },
    update: {},
    create: {
      id: 'cls001',
      name: 'Algebra I',
      subject: 'Mathematics',
      description: 'Fundamentals of algebra for beginners',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-05-30'),
      schedule: 'Monday at 9:00 AM',
      capacity: 25,
      room: 'Room 101',
      fee: 99.99,
      status: 'active',
      teacherId: mathTeacher.teacher?.id
    }
  });

  const calculusClass = await prisma.class.upsert({
    where: { id: 'cls002' },
    update: {},
    create: {
      id: 'cls002',
      name: 'Calculus',
      subject: 'Mathematics',
      description: 'Introduction to differential and integral calculus',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-05-30'),
      schedule: 'Wednesday at 10:00 AM',
      capacity: 20,
      room: 'Room 102',
      fee: 129.99,
      status: 'active',
      teacherId: mathTeacher.teacher?.id
    }
  });

  // Science Classes
  const physicsClass = await prisma.class.upsert({
    where: { id: 'cls003' },
    update: {},
    create: {
      id: 'cls003',
      name: 'Physics 101',
      subject: 'Science',
      description: 'Introduction to mechanics and thermodynamics',
      startDate: new Date('2025-01-16'),
      endDate: new Date('2025-05-28'),
      schedule: 'Tuesday at 11:00 AM',
      capacity: 24,
      room: 'Lab 203',
      fee: 149.99,
      status: 'active',
      teacherId: scienceTeacher.teacher?.id
    }
  });

  const chemistryClass = await prisma.class.upsert({
    where: { id: 'cls004' },
    update: {},
    create: {
      id: 'cls004',
      name: 'Chemistry',
      subject: 'Science',
      description: 'Fundamentals of chemistry with lab work',
      startDate: new Date('2025-01-16'),
      endDate: new Date('2025-05-28'),
      schedule: 'Thursday at 1:00 PM',
      capacity: 22,
      room: 'Lab 204',
      fee: 149.99,
      status: 'active',
      teacherId: scienceTeacher.teacher?.id
    }
  });

  // English Classes
  const literatureClass = await prisma.class.upsert({
    where: { id: 'cls005' },
    update: {},
    create: {
      id: 'cls005',
      name: 'English Literature',
      subject: 'English',
      description: 'Study of classic and contemporary literature',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-05-30'),
      schedule: 'Monday at 2:00 PM',
      capacity: 30,
      room: 'Room 105',
      fee: 89.99,
      status: 'active',
      teacherId: englishTeacher.teacher?.id
    }
  });

  const writingClass = await prisma.class.upsert({
    where: { id: 'cls006' },
    update: {},
    create: {
      id: 'cls006',
      name: 'Creative Writing',
      subject: 'English',
      description: 'Workshop-based creative writing course',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-05-30'),
      schedule: 'Friday at 10:00 AM',
      capacity: 20,
      room: 'Room 106',
      fee: 99.99,
      status: 'active',
      teacherId: englishTeacher.teacher?.id
    }
  });

  // History Classes
  const worldHistoryClass = await prisma.class.upsert({
    where: { id: 'cls007' },
    update: {},
    create: {
      id: 'cls007',
      name: 'World History',
      subject: 'History',
      description: 'Survey of major historical events and civilizations',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-05-30'),
      schedule: null, // Unscheduled class for timetable generator demo
      capacity: 35,
      room: null,
      fee: 89.99,
      status: 'active',
      teacherId: historyTeacher.teacher?.id
    }
  });

  const americanHistoryClass = await prisma.class.upsert({
    where: { id: 'cls008' },
    update: {},
    create: {
      id: 'cls008',
      name: 'American History',
      subject: 'History',
      description: 'Comprehensive study of American history',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-05-30'),
      schedule: null, // Unscheduled class for timetable generator demo
      capacity: 30,
      room: null,
      fee: 89.99,
      status: 'active',
      teacherId: historyTeacher.teacher?.id
    }
  });

  // Art Classes
  const drawingClass = await prisma.class.upsert({
    where: { id: 'cls009' },
    update: {},
    create: {
      id: 'cls009',
      name: 'Drawing Fundamentals',
      subject: 'Art',
      description: 'Introduction to drawing techniques',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-05-30'),
      schedule: null, // Unscheduled class for timetable generator demo
      capacity: 20,
      room: null,
      fee: 119.99,
      status: 'active',
      teacherId: artTeacher.teacher?.id
    }
  });

  const paintingClass = await prisma.class.upsert({
    where: { id: 'cls010' },
    update: {},
    create: {
      id: 'cls010',
      name: 'Painting',
      subject: 'Art',
      description: 'Exploration of various painting styles and techniques',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-05-30'),
      schedule: null, // Unscheduled class for timetable generator demo
      capacity: 18,
      room: null,
      fee: 129.99,
      status: 'active',
      teacherId: artTeacher.teacher?.id
    }
  });

  // Create enrollments for the student in various classes
  const classesToEnroll = [algebraClass, calculusClass, physicsClass, literatureClass];
  
  for (const cls of classesToEnroll) {
    if (student.student?.id && cls.id) {
      await prisma.enrollment.upsert({
        where: {
          studentId_classId: {
            studentId: student.student.id,
            classId: cls.id
          }
        },
        update: {},
        create: {
          studentId: student.student.id,
          classId: cls.id,
          status: 'enrolled',
          enrollmentDate: new Date()
        }
      });
    }
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
