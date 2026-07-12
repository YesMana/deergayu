const nodemailer = require('nodemailer');
const config = require('../config');

let transporter;

async function createTransporter() {
  if (config.smtp.user && config.smtp.pass) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  } else {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`[Email] Using Ethereal test account: ${testAccount.user}`);
  }
}

createTransporter();

async function sendEmail(to, subject, text, html) {
  if (!transporter) await createTransporter();

  try {
    const info = await transporter.sendMail({
      from: '"Deergayu Platform" <no-reply@deergayu.com>',
      to,
      subject,
      text,
      html,
    });

    console.log('[Email] Sent:', info.messageId);

    if (!config.smtp.user) {
      console.log('[Email] Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return true;
  } catch (error) {
    console.error('[Email] Send failed:', error.message);
    return false;
  }
}

module.exports = { sendEmail };
