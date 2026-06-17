const sequelize = require('./db');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const seedVendor = async () => {
  try {
    await sequelize.sync();
    
    // Check if vendor already exists
    const vendorExists = await User.findOne({ where: { email: 'vendor@deergayu.lk' } });
    if (!vendorExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('vendor123', salt);
      
      await User.create({
        name: 'Sanjeewani Weda Madura',
        email: 'vendor@deergayu.lk',
        password: hashedPassword,
        role: 'vendor'
      });
      console.log('Vendor user created: vendor@deergayu.lk / vendor123');
    } else {
      console.log('Vendor user already exists');
    }
  } catch (error) {
    console.error('Error seeding vendor:', error);
  } finally {
    process.exit(0);
  }
};

seedVendor();
