const nodemailer = require('nodemailer');

let transporter;
let transporterMeta = { mode: 'uninitialized', host: null, user: null, lastError: null };

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'yes.manujaya@gmail.com';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'info@deergayu.com';

function resolveSmtpConfig() {
  // Prefer explicit SMTP_* ; also accept Rudraksha-style SMTP_EMAIL / SMTP_PASSWORD
  const user = process.env.SMTP_USER || process.env.SMTP_EMAIL || 'info@deergayu.com';
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '';
  // Namecheap/cPanel shared hosting often needs mail.domain.com or the server hostname
  const host =
    process.env.SMTP_HOST ||
    process.env.MAIL_HOST ||
    'mail.deergayu.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === 'true'
    : port === 465;

  return { user, pass, host, port, secure };
}

async function createTransporter() {
  const { user, pass, host, port, secure } = resolveSmtpConfig();

  if (user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      // Helpful on shared cPanel / Namecheap when certs mismatch slightly
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
    // No password → Ethereal (NOT real delivery). Warn loudly.
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

createTransporter().catch((e) => {
  console.error('[Email] Failed to init transporter:', e.message);
  transporterMeta.lastError = e.message;
});

/**
 * @returns {Promise<{ ok: boolean, messageId?: string, previewUrl?: string, error?: string }>}
 */
const sendEmail = async (to, subject, text, html) => {
  if (!transporter) await createTransporter();

  try {
    const fromUser = process.env.SMTP_USER || process.env.SMTP_EMAIL || 'info@deergayu.com';
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
  if (!transporter) await createTransporter();
  const { user, pass, host, port, secure } = resolveSmtpConfig();
  if (!pass) {
    return {
      ok: false,
      configured: false,
      mode: transporterMeta.mode,
      error: 'SMTP_PASS (or SMTP_PASSWORD) is not set on the Node app',
      hint: 'cPanel → Setup Node.js App → Environment Variables → add SMTP_PASS → Restart',
    };
  }
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
        'Try SMTP_HOST=mail.deergayu.com or server221.web-hosting.com, port 465. Confirm info@deergayu.com password in Email Accounts.',
    };
  }
}

function getEmailStatus() {
  const { user, pass, host, port, secure } = resolveSmtpConfig();
  return {
    mode: transporterMeta.mode,
    configured: Boolean(pass),
    host,
    port,
    secure,
    user,
    adminEmail: ADMIN_EMAIL,
    lastError: transporterMeta.lastError,
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
