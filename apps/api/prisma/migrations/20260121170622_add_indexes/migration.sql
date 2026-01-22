-- Add indexes for performance optimization
-- This migration adds indexes that were defined in schema.prisma but not yet in migrations
-- Note: Some indexes already exist from previous migrations and are excluded here

-- Account indexes (new)
CREATE INDEX IF NOT EXISTS "accounts_companyId_isActive_idx" ON "accounts"("companyId", "isActive");

-- Article indexes (new)
CREATE INDEX IF NOT EXISTS "articles_companyId_type_idx" ON "articles"("companyId", "type");
CREATE INDEX IF NOT EXISTS "articles_companyId_isActive_idx" ON "articles"("companyId", "isActive");
CREATE INDEX IF NOT EXISTS "articles_counterpartyId_idx" ON "articles"("counterpartyId");

-- Budget indexes (new)
CREATE INDEX IF NOT EXISTS "budgets_companyId_startDate_endDate_idx" ON "budgets"("companyId", "startDate", "endDate");

-- Counterparty indexes (new)
CREATE INDEX IF NOT EXISTS "counterparties_companyId_category_idx" ON "counterparties"("companyId", "category");

-- Deal indexes (new)
CREATE INDEX IF NOT EXISTS "deals_counterpartyId_idx" ON "deals"("counterpartyId");
CREATE INDEX IF NOT EXISTS "deals_departmentId_idx" ON "deals"("departmentId");

-- ImportedOperation indexes (new)
-- First, add missing columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'imported_operations' AND column_name = 'isDuplicate') THEN
    ALTER TABLE "imported_operations" ADD COLUMN "isDuplicate" BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'imported_operations' AND column_name = 'duplicateOfId') THEN
    ALTER TABLE "imported_operations" ADD COLUMN "duplicateOfId" TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "imported_operations_companyId_date_idx" ON "imported_operations"("companyId", "date");
CREATE INDEX IF NOT EXISTS "imported_operations_companyId_draft_idx" ON "imported_operations"("companyId", "draft");
CREATE INDEX IF NOT EXISTS "imported_operations_companyId_isDuplicate_idx" ON "imported_operations"("companyId", "isDuplicate");
CREATE INDEX IF NOT EXISTS "imported_operations_matchedAccountId_idx" ON "imported_operations"("matchedAccountId");
CREATE INDEX IF NOT EXISTS "imported_operations_matchedArticleId_idx" ON "imported_operations"("matchedArticleId");
CREATE INDEX IF NOT EXISTS "imported_operations_matchedCounterpartyId_idx" ON "imported_operations"("matchedCounterpartyId");
CREATE INDEX IF NOT EXISTS "imported_operations_matchedDealId_idx" ON "imported_operations"("matchedDealId");
CREATE INDEX IF NOT EXISTS "imported_operations_matchedDepartmentId_idx" ON "imported_operations"("matchedDepartmentId");

-- Operation indexes (new)
CREATE INDEX IF NOT EXISTS "operations_companyId_type_idx" ON "operations"("companyId", "type");
CREATE INDEX IF NOT EXISTS "operations_companyId_isConfirmed_idx" ON "operations"("companyId", "isConfirmed");
CREATE INDEX IF NOT EXISTS "operations_companyId_type_isConfirmed_idx" ON "operations"("companyId", "type", "isConfirmed");
CREATE INDEX IF NOT EXISTS "operations_sourceAccountId_idx" ON "operations"("sourceAccountId");
CREATE INDEX IF NOT EXISTS "operations_targetAccountId_idx" ON "operations"("targetAccountId");
CREATE INDEX IF NOT EXISTS "operations_counterpartyId_idx" ON "operations"("counterpartyId");
CREATE INDEX IF NOT EXISTS "operations_dealId_idx" ON "operations"("dealId");
CREATE INDEX IF NOT EXISTS "operations_departmentId_idx" ON "operations"("departmentId");

-- PlanItem indexes (new)
CREATE INDEX IF NOT EXISTS "plan_items_companyId_status_idx" ON "plan_items"("companyId", "status");
CREATE INDEX IF NOT EXISTS "plan_items_companyId_type_idx" ON "plan_items"("companyId", "type");
CREATE INDEX IF NOT EXISTS "plan_items_companyId_type_status_idx" ON "plan_items"("companyId", "type", "status");
CREATE INDEX IF NOT EXISTS "plan_items_articleId_idx" ON "plan_items"("articleId");
CREATE INDEX IF NOT EXISTS "plan_items_accountId_idx" ON "plan_items"("accountId");
CREATE INDEX IF NOT EXISTS "plan_items_dealId_idx" ON "plan_items"("dealId");

-- Integration indexes (new)
-- Only create indexes if the table exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integrations') THEN
    CREATE INDEX IF NOT EXISTS "integrations_accountId_idx" ON "integrations"("accountId");
    CREATE INDEX IF NOT EXISTS "integrations_articleId_idx" ON "integrations"("articleId");
    CREATE INDEX IF NOT EXISTS "integrations_companyId_idx" ON "integrations"("companyId");
  END IF;
END $$;

-- User indexes (new)
CREATE INDEX IF NOT EXISTS "users_companyId_isActive_idx" ON "users"("companyId", "isActive");
