const mongoose = require('mongoose');
const User = require('../models/user');
const { Program } = require('../models/schemas');

const dbUrl = process.env.DB_URL || 'mongodb://127.0.0.1:27017/yelp-camp';
mongoose.connect(dbUrl);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', async () => {
  try {
    console.log('\n=== DIAGNOSTIC REPORT ===\n');
    
    // Check users
    const users = await User.find({});
    console.log(`1. Total Users: ${users.length}`);
    if (users.length > 0) {
      console.log('   Users:');
      users.forEach(u => {
        console.log(`     - ${u.username} (Admin: ${u.isAdmin ? 'YES' : 'NO'})`);
      });
    } else {
      console.log('   ⚠️  No users found. Please register at /register first.');
    }
    
    // Check programs
    const programs = await Program.find({});
    console.log(`\n2. Total Programs: ${programs.length}`);
    if (programs.length > 0) {
      console.log('   Programs:');
      programs.forEach(p => {
        console.log(`     - ${p.name} (Active: ${p.isActive ? 'YES' : 'NO'})`);
      });
    } else {
      console.log('   ⚠️  No programs found. Run: node seeds/seedPrograms.js');
    }
    
    // Check User schema
    console.log('\n3. User Schema Fields:');
    const userSchema = User.schema.paths;
    console.log(`   - isAdmin field exists: ${userSchema.isAdmin ? 'YES' : 'NO'}`);
    
    console.log('\n=== END DIAGNOSTIC ===\n');
    
    if (users.length === 0) {
      console.log('📝 ACTION REQUIRED:');
      console.log('   1. Register a user at http://localhost:3000/register');
      console.log('   2. Then run: node seeds/makeAdmin.js YOUR_USERNAME');
      console.log('   3. Log out and log back in');
      console.log('   4. Access: http://localhost:3000/admin/dashboard\n');
    } else if (users.every(u => !u.isAdmin)) {
      console.log('📝 ACTION REQUIRED:');
      console.log('   1. Run: node seeds/makeAdmin.js YOUR_USERNAME');
      console.log('   2. Log out and log back in');
      console.log('   3. Access: http://localhost:3000/admin/dashboard\n');
    } else {
      const adminUsers = users.filter(u => u.isAdmin);
      console.log('✅ Admin users found:');
      adminUsers.forEach(u => {
        console.log(`   - ${u.username}`);
      });
      console.log('\n   Make sure you:');
      console.log('   1. Log out and log back in');
      console.log('   2. Access: http://localhost:3000/admin/dashboard\n');
    }
    
    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.connection.close();
  }
});

