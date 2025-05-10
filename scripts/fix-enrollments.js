// Script to check and fix enrollment data in the database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Checking enrollment data...');

  // 1. Get all students
  const students = await prisma.student.findMany({
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });
  console.log(`Found ${students.length} students`);

  // 2. Get all classes
  const classes = await prisma.class.findMany({
    select: {
      id: true,
      name: true,
      subject: true,
      status: true
    }
  });
  console.log(`Found ${classes.length} classes`);

  // 3. Get all enrollments
  const enrollments = await prisma.enrollment.findMany({
    include: {
      student: {
        select: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      },
      class: {
        select: {
          name: true,
          subject: true
        }
      }
    }
  });
  console.log(`Found ${enrollments.length} enrollments`);

  // 4. Log enrollment details
  enrollments.forEach(enrollment => {
    console.log(`Enrollment ID: ${enrollment.id}`);
    console.log(`  Student: ${enrollment.student.user.name} (${enrollment.student.user.email})`);
    console.log(`  Class: ${enrollment.class.name} (${enrollment.class.subject})`);
    console.log(`  Status: ${enrollment.status}`);
    console.log(`  Created At: ${enrollment.createdAt}`);
    console.log('---');
  });

  // 5. Check if there are any enrollments with status 'pending' that should be 'enrolled'
  const pendingEnrollments = enrollments.filter(e => e.status === 'pending');
  console.log(`Found ${pendingEnrollments.length} pending enrollments`);

  if (pendingEnrollments.length > 0) {
    console.log('Would you like to update these to enrolled? (Run with --fix to apply changes)');
    
    if (process.argv.includes('--fix')) {
      console.log('Updating pending enrollments to enrolled...');
      
      for (const enrollment of pendingEnrollments) {
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: { status: 'enrolled' }
        });
        console.log(`Updated enrollment ${enrollment.id} to enrolled`);
      }
      
      console.log('All pending enrollments updated to enrolled');
    }
  }

  // 6. Create a test enrollment if none exist
  if (enrollments.length === 0 && students.length > 0 && classes.length > 0) {
    console.log('No enrollments found. Creating a test enrollment...');
    
    if (process.argv.includes('--fix')) {
      const student = students[0];
      const classItem = classes[0];
      
      const newEnrollment = await prisma.enrollment.create({
        data: {
          studentId: student.id,
          classId: classItem.id,
          status: 'enrolled',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log(`Created test enrollment: ${JSON.stringify(newEnrollment)}`);
    }
  }
}

main()
  .catch(e => {
    console.error('Error in fix-enrollments script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
