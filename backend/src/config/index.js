require('dotenv').config();

const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  firebaseServiceAccount: process.env.FIREBASE_SERVICE_ACCOUNT || '',
  adminEmails: (process.env.ADMIN_EMAILS || 'yes.manujaya@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  smtp: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};

module.exports = config;
