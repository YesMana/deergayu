const sendError = (res, status, message, code = 'ERROR') =>
  res.status(status).json({ error: message, code, requestId: res.locals.requestId });

const sendSuccess = (res, data, status = 200) =>
  res.status(status).json(data);

module.exports = { sendError, sendSuccess };
