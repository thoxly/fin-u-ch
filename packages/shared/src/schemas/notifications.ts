import { z } from 'zod';

export const NotificationTypeSchema = z.enum([
  'success',
  'error',
  'warning',
  'info',
]);

export const CreateNotificationParamsSchema = z.object({
  type: NotificationTypeSchema,
  title: z.string().max(50).optional(), // ограничение 50 символов
  message: z.string().min(1).max(200), // ограничение 200 символов
  duration: z.number().int().positive().max(30000).optional(), // максимум 30 секунд
});

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  type: NotificationTypeSchema,
  title: z.string().max(50).optional(),
  message: z.string().min(1).max(200),
  duration: z.number().int().positive().max(30000).optional(),
  isVisible: z.boolean(),
  createdAt: z.number().int().positive(),
});
