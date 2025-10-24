-- AlterTable
ALTER TABLE "users" ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT;

-- CreateIndex
CREATE INDEX "operations_companyId_accountId_operationDate_idx" ON "operations"("companyId", "accountId", "operationDate");
