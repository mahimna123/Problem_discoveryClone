const mongoose = require('mongoose');
const User = require('../models/user');

const dbUrl = process.env.DB_URL || 'mongodb://127.0.0.1:27017/yelp-camp';
mongoose.connect(dbUrl);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', async () => {
  try {
    const users = await User.find({}).select('username email isAdmin');
    console.log('\n=== Available Users ===');
    if (users.length === 0) {
      console.log('No users found.');
    } else {
      users.forEach(user => {
        console.log(`Username: ${user.username}`);
        console.log(`  Email: ${user.email || 'N/A'}`);
        console.log(`  Admin: ${user.isAdmin ? 'YES' : 'NO'}`);
        console.log('');
      });
    }
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
});


