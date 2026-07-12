const express = require('express');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Deergayu API is running',
    timestamp: new Date().toISOString(),
    requestId: res.locals.requestId,
  });
});

module.exports = router;
