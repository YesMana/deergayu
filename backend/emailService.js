const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

let transporter;
let transporterMeta = { mode: 'uninitialized', host: null, user: null, lastError: null };

const ENV_PATH = path.join(__dirname, '.env');

function loadEnvFile() {
  if (fs.existsSync(ENV_PATH)) {
    dotenv.config({ path: ENV_PATH, override: true });
  }
}

loadEnvFile();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'yes.manujaya@gmail.com';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'info@deergayu.com';

function getResendKey() {
  return (process.env.RESEND_API_KEY || '').trim();
}

function getFromAddress() {
  // Prefer explicit RESEND_FROM after domain verify; else SMTP_USER; else support inbox
  const explicit = (process.env.RESEND_FROM || process.env.MAIL_FROM || '').trim();
  if (explicit) return explicit;
  const user = (process.env.SMTP_USER || process.env.SMTP_EMAIL || SUPPORT_EMAIL).trim();
  return `"Deergayu" <${user}>`;
}

function resolveSmtpConfig() {
  loadEnvFile();
  const user = (process.env.SMTP_USER || process.env.SMTP_EMAIL || 'info@deergayu.com').trim();
  const pass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '').trim();
  // On cPanel (/home/...), localhost SMTP works; Render must use Resend — never default to mail.* from cloud
  const onCpanel = __dirname.includes('/home/') || __dirname.includes('\\home\\');
  const host = (
    process.env.SMTP_HOST ||
    process.env.MAIL_HOST ||
    (onCpanel ? 'localhost' : 'mail.deergayu.com')
  ).trim();
  const port = Number(process.env.SMTP_PORT || (onCpanel ? 587 : 465));
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === 'true'
    : port === 465;

  return { user, pass, host, port, secure };
}

async function createTransporter() {
  const { user, pass, host, port, secure } = resolveSmtpConfig();
  transporter = null;

  if (getResendKey()) {
    transporterMeta = {
      mode: 'resend',
      host: 'api.resend.com',
      user: getFromAddress(),
      lastError: null,
    };
    console.log('[Email] Using Resend API (HTTPS) — good for Render');
    return;
  }

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
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
    transporterMeta = { mode: 'smtp', host, user, port, secure, lastError: null };
    console.log(`[Email] SMTP transporter ready → ${user} @ ${host}:${port} (secure=${secure})`);
  } else {
    console.warn('[Email] No RESEND_API_KEY / SMTP_PASS — Ethereal TEST mode (not real delivery)');
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
      lastError: 'RESEND_API_KEY or SMTP_PASS not set',
    };
  }
}

async function ensureTransporter() {
  if (getResendKey()) {
    if (transporterMeta.mode !== 'resend') await createTransporter();
    return null;
  }
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

async function sendViaResend(to, subject, text, html) {
  const apiKey = getResendKey();
  const from = getFromAddress();
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: SUPPORT_EMAIL,
      subject,
      text: text || undefined,
      html: html || undefined,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || data?.error || `Resend HTTP ${res.status}`;
    throw new Error(msg);
  }
  return { ok: true, messageId: data.id, mode: 'resend' };
}

/**
 * @returns {Promise<{ ok: boolean, messageId?: string, previewUrl?: string, error?: string }>}
 */
const sendEmail = async (to, subject, text, html) => {
  await ensureTransporter();

  try {
    if (getResendKey()) {
      const result = await sendViaResend(to, subject, text, html);
      console.log('[Email] Resend sent:', result.messageId, '→', to);
      return result;
    }

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
  if (getResendKey()) {
    try {
      const res = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${getResendKey()}` },
      });
      if (res.status === 401) {
        return {
          ok: false,
          configured: true,
          mode: 'resend',
          error: 'RESEND_API_KEY is invalid',
          hint: 'Create a new API key at https://resend.com/api-keys and update Render Environment',
        };
      }
      // 200 or other = key accepted (domains list may be empty before verify)
      return {
        ok: true,
        configured: true,
        mode: 'resend',
        host: 'api.resend.com',
        user: getFromAddress(),
        adminEmail: ADMIN_EMAIL,
        hint: 'Optional: verify deergayu.com in Resend → Domains, then set RESEND_FROM="Deergayu <info@deergayu.com>"',
      };
    } catch (error) {
      return {
        ok: false,
        configured: true,
        mode: 'resend',
        error: error.message,
        hint: 'Could not reach Resend API from Render',
      };
    }
  }

  const { user, pass, host, port, secure } = resolveSmtpConfig();
  if (!pass) {
    return {
      ok: false,
      configured: false,
      mode: transporterMeta.mode,
      error: 'No RESEND_API_KEY or SMTP_PASS set',
      hint: 'cPanel SMTP times out from Render. Add RESEND_API_KEY in Render Environment (https://resend.com)',
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
        error.message?.toLowerCase().includes('timeout') || error.message?.toLowerCase().includes('timed out')
          ? 'cPanel SMTP is blocked from Render. Add RESEND_API_KEY instead (https://resend.com — free).'
          : 'Wrong mailbox password, or use RESEND_API_KEY on Render.',
    };
  }
}

function getEmailStatus() {
  loadEnvFile();
  const { user, pass, host, port, secure } = resolveSmtpConfig();
  const resend = Boolean(getResendKey());
  const smtpKeys = Object.keys(process.env)
    .filter(
      (k) =>
        /^SMTP_/i.test(k) ||
        /^MAIL_/i.test(k) ||
        /^ADMIN_EMAIL$/i.test(k) ||
        /^RESEND_/i.test(k)
    )
    .sort();

  return {
    mode: resend ? 'resend' : pass ? (transporterMeta.mode === 'smtp' ? 'smtp' : 'smtp-pending') : 'ethereal',
    configured: resend || Boolean(pass),
    host: resend ? 'api.resend.com' : host,
    port: resend ? 443 : port,
    secure: resend ? true : secure,
    user: resend ? getFromAddress() : user,
    adminEmail: ADMIN_EMAIL,
    lastError: transporterMeta.lastError,
    envFilePresent: fs.existsSync(ENV_PATH),
    passLength: pass.length,
    resendConfigured: resend,
    cwd: process.cwd(),
    appDir: __dirname,
    envKeysSeen: smtpKeys,
    okHint: resend
      ? 'Resend API configured. Send test email — works from Render.'
      : pass
        ? 'SMTP password set, but Render often cannot reach cPanel mail (timeout). Prefer RESEND_API_KEY.'
        : 'Set RESEND_API_KEY on Render (recommended) — cPanel SMTP times out from cloud hosts.',
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
