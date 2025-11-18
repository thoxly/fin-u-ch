import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import logger from '../../config/logger';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Проверяем, настроен ли SMTP
const isSmtpConfigured = Boolean(
  env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS
);

// Создаем transporter только если SMTP настроен
const transporter = isSmtpConfigured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE, // true для 465 (SSL/TLS), false для 587 (STARTTLS)
      requireTLS: !env.SMTP_SECURE, // Требовать TLS для порта 587 (STARTTLS)
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    })
  : null;

export type EmailTemplate =
  | 'email-verification'
  | 'password-reset'
  | 'password-changed'
  | 'email-change-old-verification'
  | 'email-change-verification';

export interface EmailOptions {
  to: string;
  subject: string;
  template: EmailTemplate;
  variables: Record<string, string>;
}

function loadTemplate(templateName: EmailTemplate): string {
  try {
    // Определяем __dirname для ES modules
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const templatePath = join(__dirname, 'templates', `${templateName}.html`);
    return readFileSync(templatePath, 'utf-8');
  } catch (error) {
    logger.error(`Failed to load email template: ${templateName}`, error);
    throw new Error(`Email template ${templateName} not found`);
  }
}

function replaceVariables(
  template: string,
  variables: Record<string, string>
): string {
  let html = template;
  for (const [key, value] of Object.entries(variables)) {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return html;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  // Если SMTP не настроен
  if (!isSmtpConfigured) {
    if (env.NODE_ENV === 'production') {
      throw new Error(
        'SMTP is not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.'
      );
    }
    // В development режиме просто логируем и не отправляем
    logger.warn(
      `Email not sent (SMTP not configured): ${options.subject} to ${options.to}`,
      {
        template: options.template,
        variables: options.variables,
      }
    );
    return;
  }

  if (!transporter) {
    throw new Error('Email transporter is not initialized');
  }

  try {
    const template = loadTemplate(options.template);
    const html = replaceVariables(template, options.variables);

    await transporter.sendMail({
      from: `"Vecta — Финучёт" <${env.SMTP_FROM}>`,
      to: options.to,
      subject: options.subject,
      html,
    });

    logger.info(`Email sent to ${options.to}`, { template: options.template });
  } catch (error) {
    logger.error(`Failed to send email to ${options.to}`, error);
    throw error;
  }
}

export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<void> {
  const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Подтвердите ваш email',
    template: 'email-verification',
    variables: {
      verificationUrl,
    },
  });
}

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<void> {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Восстановление пароля',
    template: 'password-reset',
    variables: {
      resetUrl,
    },
  });
}

export async function sendPasswordChangedEmail(email: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: 'Пароль изменён',
    template: 'password-changed',
    variables: {},
  });
}

export async function sendEmailChangeOldVerificationEmail(
  email: string,
  newEmail: string,
  token: string
): Promise<void> {
  const verificationUrl = `${env.FRONTEND_URL}/verify-email-change-old?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Подтвердите изменение email',
    template: 'email-change-old-verification',
    variables: {
      verificationUrl,
      newEmail,
    },
  });
}

export async function sendEmailChangeVerificationEmail(
  email: string,
  token: string
): Promise<void> {
  const verificationUrl = `${env.FRONTEND_URL}/verify-email-change?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Подтвердите новый email',
    template: 'email-change-verification',
    variables: {
      verificationUrl,
    },
  });
}
