/*
  Warnings:

  - You are about to drop the column `metadata` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `processedBy` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `processedDate` on the `Payment` table. All the data in the column will be lost.
  - Added the required column `dueDate` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Made the column `description` on table `Payment` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_enrollmentId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_processedBy_fkey";

-- DropIndex
DROP INDEX "Payment_transactionId_key";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "metadata",
DROP COLUMN "processedBy",
DROP COLUMN "processedDate",
ADD COLUMN     "dueDate" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "enrollmentId" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING',
ALTER COLUMN "paymentMethod" DROP NOT NULL,
ALTER COLUMN "transactionId" DROP NOT NULL,
ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "paymentDate" DROP NOT NULL,
ALTER COLUMN "paymentDate" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
