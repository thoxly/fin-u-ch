-- AlterTable
ALTER TABLE "operations" ADD COLUMN     "isConfirmed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "recurrenceEndDate" TIMESTAMP(3),
ADD COLUMN     "recurrenceParentId" TEXT,
ADD COLUMN     "repeat" TEXT NOT NULL DEFAULT 'none';

-- CreateIndex
CREATE INDEX "operations_companyId_repeat_isConfirmed_idx" ON "operations"("companyId", "repeat", "isConfirmed");

-- CreateIndex
CREATE INDEX "operations_recurrenceParentId_operationDate_idx" ON "operations"("recurrenceParentId", "operationDate");

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_recurrenceParentId_fkey" FOREIGN KEY ("recurrenceParentId") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
