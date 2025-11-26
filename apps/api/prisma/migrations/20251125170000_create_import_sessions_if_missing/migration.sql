-- Создаём таблицу import_sessions, если она не существует
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'import_sessions') THEN
        -- CreateTable
        CREATE TABLE "import_sessions" (
            "id" TEXT NOT NULL,
            "companyId" TEXT NOT NULL,
            "userId" TEXT,
            "fileName" TEXT,
            "type" TEXT NOT NULL DEFAULT 'bank',
            "integrationId" TEXT,
            "status" TEXT NOT NULL DEFAULT 'draft',
            "importedCount" INTEGER NOT NULL DEFAULT 0,
            "confirmedCount" INTEGER NOT NULL DEFAULT 0,
            "processedCount" INTEGER NOT NULL DEFAULT 0,
            "skippedCount" INTEGER NOT NULL DEFAULT 0,
            "dataHash" TEXT,
            "lastError" TEXT,
            "retryCount" INTEGER NOT NULL DEFAULT 0,
            "duration" INTEGER,
            "periodFrom" TIMESTAMP(3),
            "periodTo" TIMESTAMP(3),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,

            CONSTRAINT "import_sessions_pkey" PRIMARY KEY ("id")
        );

        -- CreateIndex
        CREATE INDEX "import_sessions_companyId_status_idx" ON "import_sessions"("companyId", "status");
        CREATE INDEX "import_sessions_companyId_createdAt_idx" ON "import_sessions"("companyId", "createdAt");
        CREATE INDEX "import_sessions_companyId_type_idx" ON "import_sessions"("companyId", "type");
        CREATE INDEX "import_sessions_integrationId_idx" ON "import_sessions"("integrationId");
        CREATE INDEX "import_sessions_dataHash_idx" ON "import_sessions"("dataHash");

        -- AddForeignKey
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
            ALTER TABLE "import_sessions" ADD CONSTRAINT "import_sessions_companyId_fkey" 
                FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integrations') THEN
            ALTER TABLE "import_sessions" ADD CONSTRAINT "import_sessions_integrationId_fkey" 
                FOREIGN KEY ("integrationId") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    ELSE
        -- Если таблица существует, добавляем недостающие колонки
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'import_sessions' AND column_name = 'type') THEN
            ALTER TABLE "import_sessions" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'bank';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'import_sessions' AND column_name = 'integrationId') THEN
            ALTER TABLE "import_sessions" ADD COLUMN "integrationId" TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'import_sessions' AND column_name = 'skippedCount') THEN
            ALTER TABLE "import_sessions" ADD COLUMN "skippedCount" INTEGER NOT NULL DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'import_sessions' AND column_name = 'dataHash') THEN
            ALTER TABLE "import_sessions" ADD COLUMN "dataHash" TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'import_sessions' AND column_name = 'lastError') THEN
            ALTER TABLE "import_sessions" ADD COLUMN "lastError" TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'import_sessions' AND column_name = 'retryCount') THEN
            ALTER TABLE "import_sessions" ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'import_sessions' AND column_name = 'duration') THEN
            ALTER TABLE "import_sessions" ADD COLUMN "duration" INTEGER;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'import_sessions' AND column_name = 'periodFrom') THEN
            ALTER TABLE "import_sessions" ADD COLUMN "periodFrom" TIMESTAMP(3);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'import_sessions' AND column_name = 'periodTo') THEN
            ALTER TABLE "import_sessions" ADD COLUMN "periodTo" TIMESTAMP(3);
        END IF;

        -- Делаем userId и fileName опциональными, если они ещё не опциональны
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'import_sessions' AND column_name = 'userId' AND is_nullable = 'NO') THEN
            ALTER TABLE "import_sessions" ALTER COLUMN "userId" DROP NOT NULL;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'import_sessions' AND column_name = 'fileName' AND is_nullable = 'NO') THEN
            ALTER TABLE "import_sessions" ALTER COLUMN "fileName" DROP NOT NULL;
        END IF;

        -- Создаём индексы, если их нет
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'import_sessions_companyId_type_idx') THEN
            CREATE INDEX "import_sessions_companyId_type_idx" ON "import_sessions"("companyId", "type");
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'import_sessions_integrationId_idx') THEN
            CREATE INDEX "import_sessions_integrationId_idx" ON "import_sessions"("integrationId");
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'import_sessions_dataHash_idx') THEN
            CREATE INDEX "import_sessions_dataHash_idx" ON "import_sessions"("dataHash");
        END IF;

        -- Добавляем внешние ключи, если их нет
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'import_sessions_integrationId_fkey') THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integrations') THEN
                ALTER TABLE "import_sessions" ADD CONSTRAINT "import_sessions_integrationId_fkey" 
                    FOREIGN KEY ("integrationId") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
            END IF;
        END IF;
    END IF;
END $$;

