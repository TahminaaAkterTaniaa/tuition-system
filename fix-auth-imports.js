const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// List of files to check and fix
const filesToCheck = [
  '/home/tania/Desktop/NexStack/tuition-system/src/app/api/users/teachers/route.ts',
  '/home/tania/Desktop/NexStack/tuition-system/src/app/api/classes/[classId]/route.ts',
  '/home/tania/Desktop/NexStack/tuition-system/src/app/api/student/enrollments/route.ts',
  '/home/tania/Desktop/NexStack/tuition-system/src/app/api/enrollment/enroll/route.ts',
  '/home/tania/Desktop/NexStack/tuition-system/src/app/api/enrollment/application/route.ts',
  '/home/tania/Desktop/NexStack/tuition-system/src/app/api/payments/parent/route.ts',
  // Add more files if needed
];

// The incorrect import pattern to look for
const incorrectImport = "import { authOptions } from '@/app/api/auth/[...nextauth]/route';";
const correctImport = "import { authOptions } from '@/app/lib/auth';";

// Process each file
filesToCheck.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    console.log(`Checking file: ${filePath}`);
    
    // Read the file content
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if the file has the incorrect import
    if (content.includes(incorrectImport)) {
      console.log(`  - Found incorrect import in ${filePath}`);
      
      // Replace the import
      content = content.replace(incorrectImport, correctImport);
      
      // Write the updated content back to the file
      fs.writeFileSync(filePath, content);
      console.log(`  - Fixed import in ${filePath}`);
    } else {
      console.log(`  - No incorrect import found in ${filePath}`);
    }
  } else {
    console.log(`File does not exist: ${filePath}`);
  }
});

console.log('Import paths fixed successfully!');
