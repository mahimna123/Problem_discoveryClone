const mongoose = require('mongoose');
const User = require('../models/user');

const dbUrl = process.env.DB_URL || 'mongodb://127.0.0.1:27017/yelp-camp';
mongoose.connect(dbUrl);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', async () => {
  try {
    // Get the first user (or you can specify username)
    const username = process.argv[2];
    
    let user;
    if (username) {
      user = await User.findOne({ username });
      if (!user) {
        console.log(`User "${username}" not found.`);
        mongoose.connection.close();
        return;
      }
    } else {
      // Get first user
      user = await User.findOne();
      if (!user) {
        console.log('No users found. Please register first at /register');
        mongoose.connection.close();
        return;
      }
    }

    user.isAdmin = true;
    await user.save();
    
    console.log(`\n✅ SUCCESS! User "${user.username}" is now an admin!`);
    console.log(`\nYou can now access the admin dashboard at:`);
    console.log(`http://localhost:3000/admin/dashboard\n`);
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error making user admin:', error);
    mongoose.connection.close();
  }
});


