const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

let transporter;
let transporterMeta = { mode: 'uninitialized', host: null, user: null, lastError: null };

const ENV_PATH = path.join(__dirname, '.env');

function loadEnvFile() {
  if (fs.existsSync(ENV_PATH)) {
    // .env must win — empty cPanel UI vars can otherwise block the real password
    dotenv.config({ path: ENV_PATH, override: true });
  }
}

loadEnvFile();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'yes.manujaya@gmail.com';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'info@deergayu.com';

function resolveSmtpConfig() {
  loadEnvFile();
  const user = (process.env.SMTP_USER || process.env.SMTP_EMAIL || 'info@deergayu.com').trim();
  const pass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '').trim();
  const host = (process.env.SMTP_HOST || process.env.MAIL_HOST || 'mail.deergayu.com').trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === 'true'
    : port === 465;

  return { user, pass, host, port, secure };
}

async function createTransporter() {
  const { user, pass, host, port, secure } = resolveSmtpConfig();
  transporter = null;

  if (user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'true',
        minVersion: 'TLSv1.2',
      },
      connectionTimeout: 20000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
    });
    transporterMeta = { mode: 'smtp', host, user, port, secure, lastError: null };
    console.log(`[Email] SMTP transporter ready → ${user} @ ${host}:${port} (secure=${secure})`);
  } else {
    console.warn('[Email] SMTP_PASS / SMTP_PASSWORD missing — using Ethereal TEST mail (not delivered to real inboxes)');
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    transporterMeta = {
      mode: 'ethereal',
      host: 'smtp.ethereal.email',
      user: testAccount.user,
      lastError: 'SMTP_PASS not set on server',
    };
  }
}

async function ensureTransporter() {
  const { pass, host } = resolveSmtpConfig();
  const wantMode = pass ? 'smtp' : 'ethereal';
  if (
    transporter &&
    transporterMeta.mode === wantMode &&
    (wantMode === 'ethereal' || transporterMeta.host === host)
  ) {
    return transporter;
  }
  await createTransporter();
  return transporter;
}

createTransporter().catch((e) => {
  console.error('[Email] Failed to init transporter:', e.message);
  transporterMeta.lastError = e.message;
});

/**
 * @returns {Promise<{ ok: boolean, messageId?: string, previewUrl?: string, error?: string }>}
 */
const sendEmail = async (to, subject, text, html) => {
  await ensureTransporter();

  try {
    const fromUser = (process.env.SMTP_USER || process.env.SMTP_EMAIL || 'info@deergayu.com').trim();
    const info = await transporter.sendMail({
      from: `"Deergayu" <${fromUser}>`,
      to,
      replyTo: fromUser,
      subject,
      text: text || undefined,
      html,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    if (previewUrl) console.log('[Email] Ethereal preview:', previewUrl);
    console.log('[Email] Sent:', info.messageId, '→', to);

    return {
      ok: true,
      messageId: info.messageId,
      previewUrl,
      mode: transporterMeta.mode,
    };
  } catch (error) {
    console.error('[Email] Send failed:', error.message);
    transporterMeta.lastError = error.message;
    return { ok: false, error: error.message, mode: transporterMeta.mode };
  }
};

const sendAdminEmail = async (subject, html, text = '') => {
  return sendEmail(ADMIN_EMAIL, subject, text, html);
};

async function verifySmtp() {
  const { user, pass, host, port, secure } = resolveSmtpConfig();
  if (!pass) {
    return {
      ok: false,
      configured: false,
      mode: transporterMeta.mode,
      error: 'SMTP_PASS (or SMTP_PASSWORD) is not set on the Node app',
      hint: 'Put real mailbox password in /home/dilspxws/api/.env then Restart the Node app',
      debug: {
        envFilePresent: fs.existsSync(ENV_PATH),
        passLength: 0,
        cwd: process.cwd(),
        appDir: __dirname,
      },
    };
  }

  await ensureTransporter();

  try {
    await transporter.verify();
    return {
      ok: true,
      configured: true,
      mode: 'smtp',
      host,
      port,
      secure,
      user,
      adminEmail: ADMIN_EMAIL,
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      mode: 'smtp',
      host,
      port,
      secure,
      user,
      error: error.message,
      hint:
        'Wrong mailbox password, or try SMTP_HOST=server221.web-hosting.com or deergayu.com (port 465).',
    };
  }
}

function getEmailStatus() {
  const { user, pass, host, port, secure } = resolveSmtpConfig();
  return {
    mode: pass ? (transporterMeta.mode === 'smtp' ? 'smtp' : 'smtp-pending') : 'ethereal',
    configured: Boolean(pass),
    host,
    port,
    secure,
    user,
    adminEmail: ADMIN_EMAIL,
    lastError: transporterMeta.lastError,
    // Safe debug — never includes the password
    envFilePresent: fs.existsSync(ENV_PATH),
    passLength: pass.length,
    cwd: process.cwd(),
    appDir: __dirname,
  };
}

module.exports = {
  sendEmail,
  sendAdminEmail,
  verifySmtp,
  getEmailStatus,
  ADMIN_EMAIL,
  SUPPORT_EMAIL,
};
