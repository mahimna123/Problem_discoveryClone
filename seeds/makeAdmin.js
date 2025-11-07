const mongoose = require('mongoose');
const User = require('../models/user');

// Connect to MongoDB
const dbUrl = process.env.DB_URL || 'mongodb://127.0.0.1:27017/yelp-camp';
mongoose.connect(dbUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Database connected');
});

const makeAdmin = async () => {
  try {
    const username = process.argv[2];
    
    if (!username) {
      console.log('Usage: node seeds/makeAdmin.js <username>');
      console.log('Example: node seeds/makeAdmin.js admin');
      mongoose.connection.close();
      return;
    }

    const user = await User.findOne({ username });
    
    if (!user) {
      console.log(`User "${username}" not found.`);
      mongoose.connection.close();
      return;
    }

    user.isAdmin = true;
    await user.save();
    
    console.log(`User "${username}" is now an admin!`);
    mongoose.connection.close();
  } catch (error) {
    console.error('Error making user admin:', error);
    mongoose.connection.close();
  }
};

makeAdmin();


