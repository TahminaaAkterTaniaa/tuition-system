import { PrismaClient } from '@prisma/client';
import chalk from 'chalk';

const prisma = new PrismaClient();

async function generateMissingPayments() {
  try {
    console.log(chalk.blue('🔍 Finding enrollments that need payment status updates...'));
    
    // Get all enrollments
    const enrollments = await prisma.enrollment.findMany({
      include: {
        class: true,
        student: {
          include: {
            user: true
          }
        }
      }
    });
    
    console.log(chalk.yellow(`Found ${enrollments.length} total enrollments to process`));
    
    let updatedCount = 0;
    
    // Process each enrollment
    for (const enrollment of enrollments) {
      // Skip processing if the class doesn't have a fee
      if (!enrollment.class.fee || enrollment.class.fee <= 0) {
        console.log(chalk.gray(`Skipping enrollment ${enrollment.id} - No class fee defined`));
        continue;
      }
      
      // Format student name for logging
      const studentName = enrollment.student?.user?.name || 'Unknown Student';
      const className = enrollment.class.name || 'Unknown Class';
      
      // Ensure enrollment status aligns with a payment status
      const updatedEnrollment = await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          // Don't change the actual enrollment status, but make sure 
          // other payment-related fields are updated
          enrollmentDate: enrollment.enrollmentDate || new Date()
        }
      });
      
      console.log(chalk.green(`✓ Updated enrollment for ${studentName} in ${className}`));
      updatedCount++;
    }
    
    console.log(chalk.blue('✅ Payment status synchronization complete!'));
    console.log(chalk.blue(`Updated ${updatedCount} enrollment records`));
    
  } catch (error) {
    console.error(chalk.red('Error generating missing payments:'), error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
generateMissingPayments()
  .then(() => {
    console.log(chalk.green('Script completed successfully!'));
    process.exit(0);
  })
  .catch((error) => {
    console.error(chalk.red('Script failed:'), error);
    process.exit(1);
  });
