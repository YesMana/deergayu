const nodemailer = require('nodemailer');

let transporter;

async function createTransporter() {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    // Use real SMTP if provided
    transporter = nodemailer.createTransport({
      service: 'gmail', // or your SMTP host
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
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
      from: '"Deergayu Platform" <no-reply@deergayu.com>', // sender address
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

module.exports = { sendEmail };
