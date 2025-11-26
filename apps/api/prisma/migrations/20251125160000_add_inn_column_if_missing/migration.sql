-- Добавляем колонку inn, если она отсутствует
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'inn') THEN
            ALTER TABLE "companies" ADD COLUMN "inn" TEXT;
        END IF;
    END IF;
END $$;

