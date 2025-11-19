-- AlterTable
ALTER TABLE "imported_operations" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'RUB',
ADD COLUMN     "matchedDealId" TEXT,
ADD COLUMN     "matchedDepartmentId" TEXT,
ADD COLUMN     "repeat" TEXT NOT NULL DEFAULT 'none';

-- AddForeignKey
ALTER TABLE "imported_operations" ADD CONSTRAINT "imported_operations_matchedDealId_fkey" FOREIGN KEY ("matchedDealId") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_operations" ADD CONSTRAINT "imported_operations_matchedDepartmentId_fkey" FOREIGN KEY ("matchedDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
