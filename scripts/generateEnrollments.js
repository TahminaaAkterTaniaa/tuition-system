const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting enrollment data generation...');

  // Fetch all students
  const students = await prisma.student.findMany();
  console.log(`Found ${students.length} students`);

  if (students.length === 0) {
    console.log('No students found. Please create students first.');
    return;
  }

  // Fetch all classes
  const classes = await prisma.class.findMany();
  console.log(`Found ${classes.length} classes`);

  if (classes.length === 0) {
    console.log('No classes found. Please create classes first.');
    return;
  }

  // Create enrollments - each student enrolls in 1-3 random classes
  for (const student of students) {
    console.log(`Creating enrollments for student: ${student.studentId}`);
    
    // Randomly select 1-3 classes for this student
    const shuffledClasses = [...classes].sort(() => 0.5 - Math.random());
    const numClassesToEnroll = Math.min(1 + Math.floor(Math.random() * 3), classes.length);
    const classesToEnroll = shuffledClasses.slice(0, numClassesToEnroll);
    
    for (const classItem of classesToEnroll) {
      // Check if enrollment already exists
      const existingEnrollment = await prisma.enrollment.findFirst({
        where: {
          studentId: student.id,
          classId: classItem.id
        }
      });
      
      if (!existingEnrollment) {
        // Create enrollment
        const enrollment = await prisma.enrollment.create({
          data: {
            studentId: student.id,
            classId: classItem.id,
            status: 'enrolled',
            notes: 'Automatically enrolled via test data generation',
            enrollmentDate: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000) // Random date within last 30 days
          }
        });
        
        console.log(`Created enrollment for student ${student.studentId} in class ${classItem.name}`);
        
        // Create a payment for this enrollment
        await prisma.payment.create({
          data: {
            enrollmentId: enrollment.id,
            amount: classItem.fee,
            currency: 'USD',
            description: `Tuition fee for ${classItem.name}`,
            invoiceNumber: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // Due 15 days from now
            paymentDate: new Date(), // Paid today
            status: 'PAID',
            paymentMethod: Math.random() > 0.5 ? 'CREDIT_CARD' : 'BANK_TRANSFER',
            transactionId: `TRX-${Date.now()}-${Math.floor(Math.random() * 10000)}`
          }
        });
        
        console.log(`Created payment for enrollment in ${classItem.name}`);
      } else {
        console.log(`Student ${student.studentId} already enrolled in ${classItem.name}`);
      }
    }
  }

  console.log('Enrollment data generation complete!');
}

main()
  .catch((e) => {
    console.error('Error generating enrollment data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
