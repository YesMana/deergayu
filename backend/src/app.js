const express = require('express');
const cors = require('cors');
const corsOptions = require('./config/cors');
const requestId = require('./middleware/requestId');
const errorHandler = require('./middleware/errorHandler');
const apiRoutes = require('./routes');

const app = express();

app.use(requestId);
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

app.use('/api', apiRoutes);

app.all('{*path}', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND',
    method: req.method,
    path: req.path,
    requestId: res.locals.requestId,
  });
});

app.use(errorHandler);

module.exports = app;
