const allowedOrigins = [
  'https://deergayu.com',
  'https://www.deergayu.com',
  /\.vercel\.app$/,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some((o) =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    callback(null, allowed ? true : new Error('CORS: Origin not allowed'));
  },
  credentials: true,
};

module.exports = corsOptions;
