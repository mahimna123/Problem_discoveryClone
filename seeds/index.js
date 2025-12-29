const mongoose = require('mongoose');
const cities = require('./cities');
const { places, descriptors } = require('./seedHelpers');
const Campground = require('../models/campgrounds');

mongoose.connect('mongodb://localhost:27017/problem_discovery', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

const sample = array => array[Math.floor(Math.random() * array.length)];


const seedDB = async () => {
    await Campground.deleteMany({});
    for (let i = 0; i < 50; i++) {
        const random1000 = Math.floor(Math.random() * 1000);
        const camp = new Campground({
            author: '675935f1d2e2455f1c452680',
            location: `${cities[random1000].city}, ${cities[random1000].state}`,
            title: `${sample(descriptors)} ${sample(places)}`,
            problem: `This is a sample problem statement: ${sample(descriptors)} ${sample(places)} in ${cities[random1000].city}`,
            description: `Detailed description of the problem: ${sample(descriptors)} ${sample(places)} affects many people in ${cities[random1000].city}, ${cities[random1000].state}. This problem requires innovative solutions and community involvement.`,
            geometry: {
                type: 'Point',
                coordinates: [
                    cities[random1000].longitude,
                    cities[random1000].latitude,
                ]
            },          
            images: [
                {
                  url: 'https://res.cloudinary.com/dahphkomw/image/upload/v1734112479/YelpCamp/nponnxm0oemk98dlqn1r.webp',
                  filename: 'YelpCamp/nponnxm0oemk98dlqn1r',
                }
              ]
            
        })
        await camp.save();
    }
}

seedDB().then(() => {
    mongoose.connection.close();
})
