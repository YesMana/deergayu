const config = require('../config');

function errorHandler(err, req, res, _next) {
  const requestId = res.locals.requestId || 'unknown';
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (status >= 500) {
    console.error(JSON.stringify({
      level: 'error',
      requestId,
      method: req.method,
      path: req.path,
      message,
      stack: config.nodeEnv === 'development' ? err.stack : undefined,
    }));
  }

  if (message === 'CORS: Origin not allowed') {
    return res.status(403).json({ error: message, code: 'CORS_FORBIDDEN', requestId });
  }

  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : message,
    code: err.code || 'ERROR',
    requestId,
  });
}

module.exports = errorHandler;
