import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import logger from '../../config/logger';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Создаем transporter на основе переменных окружения
function createTransporter() {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    throw new Error(
      'SMTP configuration is missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env file'
    );
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    requireTLS: !env.SMTP_SECURE && env.SMTP_PORT === 587, // Требовать TLS для порта 587 (STARTTLS)
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

export type EmailTemplate =
  | 'email-verification'
  | 'password-reset'
  | 'password-changed'
  | 'email-change-old-verification'
  | 'email-change-verification'
  | 'user-invitation';

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
  // Проверяем наличие SMTP настроек
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    logger.warn('SMTP configuration is missing - email will not be sent', {
      missing: [
        !env.SMTP_HOST && 'SMTP_HOST',
        !env.SMTP_USER && 'SMTP_USER',
        !env.SMTP_PASS && 'SMTP_PASS',
      ].filter(Boolean),
      to: options.to,
      template: options.template,
    });

    if (env.NODE_ENV === 'development') {
      logger.warn(
        'Skipping email send in development mode due to missing SMTP configuration'
      );
      return;
    }

    throw new Error(
      'SMTP configuration is missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env file'
    );
  }

  try {
    const transporter = createTransporter();
    const fromAddress = env.SMTP_FROM || env.SMTP_USER;

    logger.info('Attempting to send email', {
      to: options.to,
      template: options.template,
      smtpHost: env.SMTP_HOST,
      smtpPort: env.SMTP_PORT,
      smtpUser: env.SMTP_USER,
    });

    const template = loadTemplate(options.template);
    const html = replaceVariables(template, options.variables);

    const result = await transporter.sendMail({
      from: `"Vecta — Финучёт" <${fromAddress}>`,
      to: options.to,
      subject: options.subject,
      html,
    });

    logger.info(`Email sent successfully to ${options.to}`, {
      template: options.template,
      messageId: result.messageId,
    });
  } catch (error) {
    logger.error(`Failed to send email to ${options.to}`, {
      template: options.template,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
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

export async function sendInvitationEmail(
  email: string,
  token: string,
  companyName: string
): Promise<void> {
  const invitationUrl = `${env.FRONTEND_URL}/accept-invitation?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Приглашение в компанию',
    template: 'user-invitation',
    variables: {
      invitationUrl,
      companyName,
    },
  });
}
