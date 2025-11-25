-- CreateTable
CREATE TABLE IF NOT EXISTS "integrations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "clientKey" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "paymentSchedule" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "integrations_companyId_type_key" ON "integrations"("companyId", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "integrations_companyId_idx" ON "integrations"("companyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "integrations_articleId_idx" ON "integrations"("articleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "integrations_accountId_idx" ON "integrations"("accountId");

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'integrations_companyId_fkey'
    ) THEN
        ALTER TABLE "integrations" ADD CONSTRAINT "integrations_companyId_fkey" 
            FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'integrations_articleId_fkey'
    ) THEN
        ALTER TABLE "integrations" ADD CONSTRAINT "integrations_articleId_fkey" 
            FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'integrations_accountId_fkey'
    ) THEN
        ALTER TABLE "integrations" ADD CONSTRAINT "integrations_accountId_fkey" 
            FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

