-- Create Assessment table if it doesn't exist
CREATE TABLE IF NOT EXISTS "Assessment" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL DEFAULT 'ASSIGNMENT',
  "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "classId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Assessment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
