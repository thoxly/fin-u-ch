-- Проверяем существование таблицы перед изменением
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'import_sessions') THEN
        -- AlterTable: делаем userId опциональным (если колонка существует)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_sessions' AND column_name = 'userId' AND is_nullable = 'NO') THEN
            ALTER TABLE "import_sessions" ALTER COLUMN "userId" DROP NOT NULL;
        END IF;

        -- AlterTable: делаем fileName опциональным (если колонка существует)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_sessions' AND column_name = 'fileName' AND is_nullable = 'NO') THEN
            ALTER TABLE "import_sessions" ALTER COLUMN "fileName" DROP NOT NULL;
        END IF;

        -- AlterTable: добавляем новые поля для Ozon синхронизаций
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_sessions' AND column_name = 'type') THEN
            ALTER TABLE "import_sessions" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'bank';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_sessions' AND column_name = 'integrationId') THEN
            ALTER TABLE "import_sessions" ADD COLUMN "integrationId" TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_sessions' AND column_name = 'skippedCount') THEN
            ALTER TABLE "import_sessions" ADD COLUMN "skippedCount" INTEGER NOT NULL DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_sessions' AND column_name = 'dataHash') THEN
            ALTER TABLE "import_sessions" ADD COLUMN "dataHash" TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_sessions' AND column_name = 'lastError') THEN
            ALTER TABLE "import_sessions" ADD COLUMN "lastError" TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_sessions' AND column_name = 'retryCount') THEN
            ALTER TABLE "import_sessions" ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_sessions' AND column_name = 'duration') THEN
            ALTER TABLE "import_sessions" ADD COLUMN "duration" INTEGER;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_sessions' AND column_name = 'periodFrom') THEN
            ALTER TABLE "import_sessions" ADD COLUMN "periodFrom" TIMESTAMP(3);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'import_sessions' AND column_name = 'periodTo') THEN
            ALTER TABLE "import_sessions" ADD COLUMN "periodTo" TIMESTAMP(3);
        END IF;
        -- CreateIndex (только если таблица существует)
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'import_sessions_companyId_type_idx') THEN
            CREATE INDEX "import_sessions_companyId_type_idx" ON "import_sessions"("companyId", "type");
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'import_sessions_integrationId_idx') THEN
            CREATE INDEX "import_sessions_integrationId_idx" ON "import_sessions"("integrationId");
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'import_sessions_dataHash_idx') THEN
            CREATE INDEX "import_sessions_dataHash_idx" ON "import_sessions"("dataHash");
        END IF;

        -- AddForeignKey
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'import_sessions_integrationId_fkey'
        ) THEN
            ALTER TABLE "import_sessions" ADD CONSTRAINT "import_sessions_integrationId_fkey" 
                FOREIGN KEY ("integrationId") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

