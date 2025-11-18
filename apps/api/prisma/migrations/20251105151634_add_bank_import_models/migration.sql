-- AlterTable
ALTER TABLE "companies" ADD COLUMN "inn" TEXT;

-- CreateTable
CREATE TABLE "import_sessions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "confirmedCount" INTEGER NOT NULL DEFAULT 0,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imported_operations" (
    "id" TEXT NOT NULL,
    "importSessionId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "number" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "direction" TEXT,
    "payer" TEXT,
    "payerInn" TEXT,
    "payerAccount" TEXT,
    "receiver" TEXT,
    "receiverInn" TEXT,
    "receiverAccount" TEXT,
    "matchedArticleId" TEXT,
    "matchedCounterpartyId" TEXT,
    "matchedAccountId" TEXT,
    "matchedBy" TEXT,
    "matchedRuleId" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "draft" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imported_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mapping_rules" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "targetName" TEXT,
    "sourceField" TEXT NOT NULL DEFAULT 'description',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mapping_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_sessions_companyId_status_idx" ON "import_sessions"("companyId", "status");

-- CreateIndex
CREATE INDEX "import_sessions_companyId_createdAt_idx" ON "import_sessions"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "imported_operations_companyId_importSessionId_idx" ON "imported_operations"("companyId", "importSessionId");

-- CreateIndex
CREATE INDEX "imported_operations_companyId_confirmed_processed_idx" ON "imported_operations"("companyId", "confirmed", "processed");

-- CreateIndex
CREATE INDEX "imported_operations_importSessionId_idx" ON "imported_operations"("importSessionId");

-- CreateIndex
CREATE INDEX "mapping_rules_companyId_ruleType_sourceField_idx" ON "mapping_rules"("companyId", "ruleType", "sourceField");

-- CreateIndex
CREATE INDEX "mapping_rules_companyId_targetType_idx" ON "mapping_rules"("companyId", "targetType");

-- AddForeignKey
ALTER TABLE "import_sessions" ADD CONSTRAINT "import_sessions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_operations" ADD CONSTRAINT "imported_operations_importSessionId_fkey" FOREIGN KEY ("importSessionId") REFERENCES "import_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_operations" ADD CONSTRAINT "imported_operations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_operations" ADD CONSTRAINT "imported_operations_matchedArticleId_fkey" FOREIGN KEY ("matchedArticleId") REFERENCES "articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_operations" ADD CONSTRAINT "imported_operations_matchedCounterpartyId_fkey" FOREIGN KEY ("matchedCounterpartyId") REFERENCES "counterparties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_operations" ADD CONSTRAINT "imported_operations_matchedAccountId_fkey" FOREIGN KEY ("matchedAccountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_operations" ADD CONSTRAINT "imported_operations_matchedRuleId_fkey" FOREIGN KEY ("matchedRuleId") REFERENCES "mapping_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mapping_rules" ADD CONSTRAINT "mapping_rules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

