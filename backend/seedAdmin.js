const sequelize = require('./db');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const seedAdmin = async () => {
  try {
    await sequelize.sync();
    
    // Check if admin already exists
    const adminExists = await User.findOne({ where: { email: 'admin@deergayu.lk' } });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      await User.create({
        name: 'Deergayu Admin',
        email: 'admin@deergayu.lk',
        password: hashedPassword,
        role: 'admin'
      });
      console.log('Admin user created: admin@deergayu.lk / admin123');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error seeding admin:', error);
  } finally {
    process.exit(0);
  }
};

seedAdmin();
