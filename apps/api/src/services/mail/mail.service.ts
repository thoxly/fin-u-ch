import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import logger from '../../config/logger';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE, // true для 465 (SSL/TLS), false для 587 (STARTTLS)
  requireTLS: !env.SMTP_SECURE, // Требовать TLS для порта 587 (STARTTLS)
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

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
  // Проверяем настройки SMTP
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    const missingConfig = [];
    if (!env.SMTP_HOST) missingConfig.push('SMTP_HOST');
    if (!env.SMTP_USER) missingConfig.push('SMTP_USER');
    if (!env.SMTP_PASS) missingConfig.push('SMTP_PASS');

    logger.error('SMTP configuration is missing', {
      missing: missingConfig,
      smtpHost: env.SMTP_HOST || 'not set',
      smtpUser: env.SMTP_USER || 'not set',
      smtpPass: env.SMTP_PASS ? '***' : 'not set',
    });
    throw new Error(
      `SMTP configuration is incomplete. Missing: ${missingConfig.join(', ')}`
    );
  }

  try {
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
      from: `"Vecta — Финучёт" <${env.SMTP_FROM}>`,
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
    subject: 'Приглашение в Vecta — Финучёт',
    template: 'user-invitation',
    variables: {
      invitationUrl,
      companyName,
    },
  });
}
