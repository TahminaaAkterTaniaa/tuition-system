const { PrismaClient } = require('@prisma/client');
const { addDays, subDays, format } = require('date-fns');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting past assessments and grades generation...');

  // Fetch existing data
  const classes = await prisma.class.findMany({
    include: {
      enrollments: {
        include: {
          student: true
        }
      }
    }
  });

  console.log(`Found ${classes.length} classes to generate data for`);

  if (classes.length === 0) {
    console.log('No classes found. Please create classes first.');
    return;
  }

  // Generate past assessments for each class
  await generatePastAssessments(classes);
  
  // Generate grades for enrolled students based on past assessments
  await generateGrades(classes);

  console.log('Past assessments and grades generation complete!');
}

async function generatePastAssessments(classes) {
  console.log('Generating past assessments...');
  
  const assessmentTypes = ['QUIZ', 'ASSIGNMENT', 'PROJECT', 'EXAM', 'MIDTERM', 'FINAL'];
  const now = new Date();
  
  for (const classItem of classes) {
    console.log(`Creating past assessments for class: ${classItem.name}`);
    
    // Create 3-5 past assessments per class
    const numAssessments = 3 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < numAssessments; i++) {
      const assessmentType = assessmentTypes[Math.floor(Math.random() * assessmentTypes.length)];
      // Make assessment due date in the past (between 30 and 5 days ago)
      const dueDate = subDays(now, 5 + Math.floor(Math.random() * 25)); 
      const maxScore = assessmentType === 'QUIZ' ? 20 : assessmentType === 'ASSIGNMENT' ? 50 : 100;
      const weight = assessmentType === 'FINAL' ? 2.0 : assessmentType === 'MIDTERM' ? 1.5 : 1.0;
      
      await prisma.assessment.create({
        data: {
          name: `${classItem.subject} ${assessmentType} ${i + 1} (Past)`,
          description: `Past ${assessmentType} for ${classItem.subject} covering recent materials`,
          type: assessmentType,
          maxScore,
          weight,
          dueDate,
          classId: classItem.id
        }
      });
    }
  }
  
  console.log('Past assessment generation complete!');
}

async function generateGrades(classes) {
  console.log('Generating grades...');
  
  for (const classItem of classes) {
    console.log(`Creating grades for class: ${classItem.name}`);
    
    if (classItem.enrollments.length === 0) {
      console.log(`No students enrolled in ${classItem.name}. Skipping grade generation.`);
      continue;
    }
    
    // Get all assessments for this class
    const assessments = await prisma.assessment.findMany({
      where: {
        classId: classItem.id,
        dueDate: {
          lt: new Date() // Only grade past-due assessments
        }
      }
    });
    
    if (assessments.length === 0) {
      console.log(`No assessments found for ${classItem.name}. Skipping grade generation.`);
      continue;
    } else {
      console.log(`Found ${assessments.length} past assessments for ${classItem.name}`);
    }
    
    // Create grades for each student and assessment
    for (const enrollment of classItem.enrollments) {
      for (const assessment of assessments) {
        // Check if grade already exists
        const existingGrade = await prisma.grade.findFirst({
          where: {
            studentId: enrollment.studentId,
            classId: classItem.id,
            assessmentName: assessment.name
          }
        });
        
        if (!existingGrade) {
          // Generate a score (60-100 range for most students)
          const baseScore = Math.random() < 0.8 ? 60 + Math.floor(Math.random() * 40) : 50 + Math.floor(Math.random() * 50);
          const score = Math.min(baseScore, assessment.maxScore);
          
          await prisma.grade.create({
            data: {
              studentId: enrollment.studentId,
              classId: classItem.id,
              assessmentName: assessment.name,
              assessmentType: assessment.type,
              score,
              maxScore: assessment.maxScore,
              weight: assessment.weight,
              feedback: generateFeedback(score, assessment.maxScore),
              gradedDate: new Date(Date.now() - Math.floor(Math.random() * 4) * 24 * 60 * 60 * 1000) // Graded 0-3 days ago
            }
          });
          console.log(`Created grade for student ${enrollment.student.studentId} on assessment ${assessment.name}`);
        } else {
          console.log(`Grade already exists for student ${enrollment.student.studentId} on assessment ${assessment.name}`);
        }
      }
    }
  }
  
  console.log('Grade generation complete!');
}

function generateFeedback(score, maxScore) {
  const percentage = (score / maxScore) * 100;
  
  if (percentage >= 90) {
    return 'Excellent work! Keep it up.';
  } else if (percentage >= 80) {
    return 'Good job. You have a solid understanding of the material.';
  } else if (percentage >= 70) {
    return 'Satisfactory work. There\'s room for improvement in some areas.';
  } else if (percentage >= 60) {
    return 'You\'ve met the basic requirements. Please review the material for better understanding.';
  } else {
    return 'You need to improve. Please schedule office hours to discuss areas of difficulty.';
  }
}

main()
  .catch((e) => {
    console.error('Error generating test data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
