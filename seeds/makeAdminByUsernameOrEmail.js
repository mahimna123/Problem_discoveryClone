require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user');

// Connect to MongoDB - use the same DB_URL as the app
const dbUrl = process.env.DB_URL || 'mongodb://127.0.0.1:27017/yelp-camp';
mongoose.connect(dbUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', async () => {
  console.log('Database connected');
  
  try {
    const searchTerm = process.argv[2];
    
    if (!searchTerm) {
      console.log('Usage: node seeds/makeAdminByUsernameOrEmail.js <username or email>');
      console.log('Example: node seeds/makeAdminByUsernameOrEmail.js Admin');
      mongoose.connection.close();
      return;
    }

    // Try to find by username (case-insensitive)
    let user = await User.findOne({ 
      username: { $regex: new RegExp(`^${searchTerm}$`, 'i') }
    });
    
    // If not found, try by email
    if (!user) {
      user = await User.findOne({ 
        email: { $regex: new RegExp(`^${searchTerm}$`, 'i') }
      });
    }
    
    if (!user) {
      console.log(`\n❌ User "${searchTerm}" not found.`);
      console.log('\n📋 Available users:');
      const allUsers = await User.find({});
      if (allUsers.length === 0) {
        console.log('   No users in database. Please register first at /register');
      } else {
        allUsers.forEach(u => {
          console.log(`   - Username: ${u.username} | Email: ${u.email}`);
        });
      }
      mongoose.connection.close();
      return;
    }

    console.log(`\n✅ Found user: ${user.username} (${user.email})`);
    console.log(`   Current admin status: ${user.isAdmin ? 'YES' : 'NO'}`);
    
    user.isAdmin = true;
    await user.save();
    
    console.log(`\n🎉 User "${user.username}" is now an admin!`);
    console.log('\n📝 Next steps:');
    console.log('   1. Log out from your account');
    console.log('   2. Log back in');
    console.log('   3. Access: http://localhost:3000/admin/dashboard');
    console.log('   4. Or click the "Admin" link in the navbar\n');
    
    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error making user admin:', error);
    mongoose.connection.close();
  }
});

