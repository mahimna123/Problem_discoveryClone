const mongoose = require('mongoose');
const { Program } = require('../models/schemas');

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

const seedPrograms = async () => {
  try {
    // Clear existing programs
    await Program.deleteMany({});
    console.log('Cleared existing programs');

    // Create default programs
    const programs = [
      {
        name: 'ABPS Group',
        description: 'ABPS Group Program',
        isActive: true
      },
      {
        name: 'Erehwon Championship',
        description: 'Erehwon Championship Program',
        isActive: true
      },
      {
        name: 'Erehwon lab school',
        description: 'Erehwon Lab School Program',
        isActive: true
      }
    ];

    const createdPrograms = await Program.insertMany(programs);
    console.log(`Created ${createdPrograms.length} programs:`);
    createdPrograms.forEach(program => {
      console.log(`  - ${program.name}`);
    });

    mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding programs:', error);
    mongoose.connection.close();
  }
};

seedPrograms();


