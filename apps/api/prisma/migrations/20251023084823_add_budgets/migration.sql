-- AlterTable
ALTER TABLE "plan_items" ADD COLUMN     "budgetId" TEXT;

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "budgets_companyId_status_idx" ON "budgets"("companyId", "status");

-- CreateIndex
CREATE INDEX "plan_items_companyId_budgetId_startDate_idx" ON "plan_items"("companyId", "budgetId", "startDate");

-- AddForeignKey
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
