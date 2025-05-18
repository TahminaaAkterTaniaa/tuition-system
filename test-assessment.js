const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client
const prisma = new PrismaClient();

async function testAssessmentCreation() {
  try {
    console.log('Starting assessment creation test...');
    
    // First, get a class to associate with the assessment
    const classes = await prisma.class.findMany({
      take: 1,
    });
    
    if (classes.length === 0) {
      console.log('No classes found. Creating a test class first...');
      
      // Find a teacher to associate with the class
      const teacher = await prisma.teacher.findFirst();
      
      if (!teacher) {
        console.log('No teachers found. Please seed the database first.');
        return;
      }
      
      // Create a test class
      const testClass = await prisma.class.create({
        data: {
          name: 'Test Class',
          subject: 'Test Subject',
          description: 'Test class for assessment creation',
          startDate: new Date(),
          capacity: 30,
          teacherId: teacher.id,
        },
      });
      
      console.log('Created test class:', testClass);
      
      // Now create an assessment for this class
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days
      
      const assessment = await prisma.assessment.create({
        data: {
          name: 'Test Assessment',
          description: 'Test assessment for verification',
          type: 'ASSIGNMENT',
          maxScore: 100,
          weight: 1.0,
          dueDate,
          classId: testClass.id,
        },
      });
      
      console.log('Successfully created assessment:', assessment);
    } else {
      // Use existing class to create an assessment
      const classId = classes[0].id;
      console.log('Found existing class:', classes[0]);
      
      // Create a test assessment
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days
      
      const assessment = await prisma.assessment.create({
        data: {
          name: 'Test Assessment',
          description: 'Test assessment for verification',
          type: 'ASSIGNMENT',
          maxScore: 100,
          weight: 1.0,
          dueDate,
          classId,
        },
      });
      
      console.log('Successfully created assessment:', assessment);
    }
    
    // Query all assessments to verify
    const allAssessments = await prisma.assessment.findMany();
    console.log(`Found ${allAssessments.length} assessments in the database:`);
    console.log(allAssessments);
    
  } catch (error) {
    console.error('Error in test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testAssessmentCreation();
