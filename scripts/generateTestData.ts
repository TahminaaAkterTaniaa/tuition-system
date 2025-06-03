const { PrismaClient } = require('@prisma/client');
const { addDays, subDays, format } = require('date-fns');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting test data generation...');

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

  // Generate assessments for each class
  await generateAssessments(classes);
  
  // Generate attendance records for each class
  await generateAttendance(classes);
  
  // Generate grades for enrolled students
  await generateGrades(classes);

  console.log('Test data generation complete!');
}

async function generateAssessments(classes) {
  console.log('Generating assessments...');
  
  const assessmentTypes = ['QUIZ', 'ASSIGNMENT', 'PROJECT', 'EXAM', 'MIDTERM', 'FINAL'];
  const now = new Date();
  
  for (const classItem of classes) {
    console.log(`Creating assessments for class: ${classItem.name}`);
    
    // Create 4-6 assessments per class
    const numAssessments = 4 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < numAssessments; i++) {
      const assessmentType = assessmentTypes[Math.floor(Math.random() * assessmentTypes.length)];
      const dueDate = addDays(now, 7 + (i * 7)); // Each assessment is a week apart
      const maxScore = assessmentType === 'QUIZ' ? 20 : assessmentType === 'ASSIGNMENT' ? 50 : 100;
      const weight = assessmentType === 'FINAL' ? 2.0 : assessmentType === 'MIDTERM' ? 1.5 : 1.0;
      
      await prisma.assessment.create({
        data: {
          name: `${classItem.subject} ${assessmentType} ${i + 1}`,
          description: `${assessmentType} for ${classItem.subject} covering recent materials`,
          type: assessmentType,
          maxScore,
          weight,
          dueDate,
          classId: classItem.id
        }
      });
    }
  }
  
  console.log('Assessment generation complete!');
}

async function generateAttendance(classes) {
  console.log('Generating attendance records...');
  
  const attendanceStatuses = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
  const now = new Date();
  
  for (const classItem of classes) {
    console.log(`Creating attendance for class: ${classItem.name}`);
    
    if (classItem.enrollments.length === 0) {
      console.log(`No students enrolled in ${classItem.name}. Skipping attendance generation.`);
      continue;
    }
    
    // Create attendance for the past 4 weeks (8 sessions, twice a week)
    for (let i = 0; i < 8; i++) {
      const sessionDate = subDays(now, i * 3 + 1); // Sessions every 3 days in the past
      
      for (const enrollment of classItem.enrollments) {
        // 80% chance of being present
        const statusIdx = Math.random() < 0.8 ? 0 : Math.floor(1 + Math.random() * 3);
        const status = attendanceStatuses[statusIdx];
        
        // Skip creating attendance if already exists
        const existingAttendance = await prisma.attendance.findFirst({
          where: {
            studentId: enrollment.studentId,
            classId: classItem.id,
            date: {
              equals: sessionDate
            }
          }
        });
        
        if (!existingAttendance) {
          await prisma.attendance.create({
            data: {
              studentId: enrollment.studentId,
              classId: classItem.id,
              date: sessionDate,
              status,
              notes: status !== 'PRESENT' ? `Student was ${status.toLowerCase()}` : null,
              recordedBy: 'SYSTEM_GENERATOR'
            }
          });
        }
      }
    }
  }
  
  console.log('Attendance generation complete!');
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
              gradedDate: new Date()
            }
          });
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
