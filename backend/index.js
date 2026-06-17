const express = require('express');
const cors = require('cors');
const sequelize = require('./db');

// Import Models to initialize them
const User = require('./models/User');
const Product = require('./models/Product');
const Appointment = require('./models/Appointment');
const Order = require('./models/Order');

const authRoutes = require('./routes/auth');

const app = express();

app.use(cors());
app.use(express.json());

// Auth Routes
app.use('/api/auth', authRoutes);

// Test route
app.get('/api/health', (req, res) => {
  res.send('Ayurweda API is running');
});

// Sync database and start server
const PORT = process.env.PORT || 5000;

sequelize.sync({ alter: true }).then(() => {
  console.log('Database synced');
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to sync db:', err);
});
