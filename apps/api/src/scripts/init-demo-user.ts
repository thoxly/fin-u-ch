#!/usr/bin/env ts-node

/**
 * Скрипт инициализации демо-пользователя
 * Запускается отдельно от основного сервера для соблюдения принципа разделения ответственности
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Determine project root: go up from apps/api/src/scripts to project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// From apps/api/src/scripts/init-demo-user.ts -> apps/api/src/scripts -> apps/api/src -> apps/api -> apps -> root
const projectRoot = path.resolve(__dirname, '../../..');

// Load environment variables
dotenv.config({ path: path.resolve(projectRoot, '.env') });

// import { env } from '../config/env';
import logger from '../config/logger';
import demoUserService from '../modules/demo/demo.service';

async function initDemoUser(): Promise<void> {
  logger.info('🚀 Initializing demo user...');

  try {
    const exists = await demoUserService.exists();
    if (!exists) {
      logger.info('Demo user not found, creating...');
      const demoUser = await demoUserService.create();
      logger.info(`✅ Demo user created: ${demoUser.user.email}`);
      logger.info(
        `📊 Demo data: ${demoUser.operationsCount} operations, ${demoUser.accountsCount} accounts`
      );
    } else {
      logger.info('✅ Demo user already exists');
    }

    logger.info('🎉 Demo user initialization completed');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Failed to setup demo user:', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// Запуск только если скрипт вызван напрямую
if (require.main === module) {
  initDemoUser();
}

export { initDemoUser };
