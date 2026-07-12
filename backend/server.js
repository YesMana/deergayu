const config = require('./src/config');
const app = require('./src/app');

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`[Deergayu API] Running on port ${PORT} (${config.nodeEnv})`);
});

module.exports = app;
