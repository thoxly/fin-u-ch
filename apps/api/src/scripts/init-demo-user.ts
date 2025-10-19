#!/usr/bin/env ts-node

/**
 * Скрипт инициализации демо-пользователя
 * Запускается отдельно от основного сервера для соблюдения принципа разделения ответственности
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { env } from '../config/env';
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
