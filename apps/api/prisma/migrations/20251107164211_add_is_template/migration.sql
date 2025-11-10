-- AlterTable
ALTER TABLE "operations" ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "operations_companyId_repeat_isTemplate_idx" ON "operations"("companyId", "repeat", "isTemplate");

-- Migrate existing recurring operations to templates
-- Set isTemplate = true for operations that have repeat != 'none' and no parent
UPDATE "operations"
SET "isTemplate" = true
WHERE "repeat" != 'none' 
  AND "recurrenceParentId" IS NULL
  AND "isTemplate" = false;
