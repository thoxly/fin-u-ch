-- AlterTable
ALTER TABLE "imported_operations" ADD COLUMN "isDuplicate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "imported_operations" ADD COLUMN "duplicateOfId" TEXT;

-- CreateIndex
CREATE INDEX "imported_operations_companyId_isDuplicate_idx" ON "imported_operations"("companyId", "isDuplicate");

