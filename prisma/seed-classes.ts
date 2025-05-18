const { prisma } = require('../src/app/lib/prisma');

// No need to instantiate PrismaClient as it's already done in the imported module

async function main() {
  try {
    // First, find a teacher to assign classes to
    const teacher = await prisma.teacher.findFirst();
    
    if (!teacher) {
      console.error('No teacher found in the database. Please create a teacher first.');
      return;
    }
    
    console.log(`Found teacher with ID: ${teacher.id}`);
    
    // Create sample classes
    const classes = [
      {
        name: 'Advanced Mathematics',
        subject: 'Mathematics',
        description: 'Advanced calculus and linear algebra for senior students',
        grade: '12',
        teacherId: teacher.id,
      },
      {
        name: 'Physics 101',
        subject: 'Physics',
        description: 'Introduction to physics concepts and principles',
        grade: '10',
        teacherId: teacher.id,
      },
      {
        name: 'Chemistry Lab',
        subject: 'Chemistry',
        description: 'Practical chemistry experiments and lab work',
        grade: '11',
        teacherId: teacher.id,
      },
      {
        name: 'English Literature',
        subject: 'English',
        description: 'Study of classic and contemporary literature',
        grade: '9',
        teacherId: teacher.id,
      },
    ];
    
    // Create the classes in the database
    for (const classData of classes) {
      const existingClass = await prisma.class.findFirst({
        where: {
          name: classData.name,
          teacherId: teacher.id,
        },
      });
      
      if (!existingClass) {
        const newClass = await prisma.class.create({
          data: classData,
        });
        console.log(`Created class: ${newClass.name} with ID: ${newClass.id}`);
      } else {
        console.log(`Class ${classData.name} already exists with ID: ${existingClass.id}`);
      }
    }
    
    console.log('Sample classes created successfully');
  } catch (error) {
    console.error('Error creating sample classes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => console.log('Seed completed'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
