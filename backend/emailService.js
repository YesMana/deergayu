const nodemailer = require('nodemailer');

let transporter;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'yes.manujaya@gmail.com';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'info@deergayu.com';

async function createTransporter() {
  const smtpHost = process.env.SMTP_HOST || 'deergayu.com';
  const smtpPort = Number(process.env.SMTP_PORT) || 465;
  const smtpUser = process.env.SMTP_USER || 'info@deergayu.com';
  const smtpPass = process.env.SMTP_PASS;

  if (smtpUser && smtpPass) {
    // Use real SMTP if provided
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort == 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
  } else {
    // Generate test SMTP service account from ethereal.email
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });
    console.log(`[Email Service] Using Ethereal test account: ${testAccount.user}`);
  }
}

createTransporter();

/**
 * Sends an email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Email plain text body
 * @param {string} html - Email HTML body
 */
const sendEmail = async (to, subject, text, html) => {
  if (!transporter) await createTransporter();

  try {
    const info = await transporter.sendMail({
      from: `"Deergayu Platform" <${process.env.SMTP_USER || 'info@deergayu.com'}>`,
      to,
      subject,
      text,
      html,
    });

    console.log("Message sent: %s", info.messageId);
    
    // Preview only available when sending through an Ethereal account
    if (!process.env.SMTP_USER) {
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

const sendAdminEmail = async (subject, html, text = '') => {
  return sendEmail(ADMIN_EMAIL, subject, text, html);
};

module.exports = { sendEmail, sendAdminEmail, ADMIN_EMAIL, SUPPORT_EMAIL };
