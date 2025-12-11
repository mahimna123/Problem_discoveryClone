const cloudinary = require ('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');

// Configure Cloudinary - check both possible env var names
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_KEY || process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_SECRET || process.env.CLOUDINARY_API_SECRET;

let isCloudinaryConfigured = false;

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret
  });
  isCloudinaryConfigured = true;
  console.log('Cloudinary configured in cloudinary/index.js');
} else {
  console.error('Cloudinary configuration missing! Check environment variables.');
  console.error('Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_KEY (or CLOUDINARY_API_KEY), CLOUDINARY_SECRET (or CLOUDINARY_API_SECRET)');
  console.error('Uploads will fail until Cloudinary is properly configured.');
}

// Fallback disk storage for when Cloudinary is not configured
const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

// Create storage - use Cloudinary if configured, otherwise use disk storage
let storage;
let prototypeStorage;

if (isCloudinaryConfigured) {
  storage = new CloudinaryStorage({
    cloudinary,
    params: { 
      folder:'YelpCamp',
      allowedFormats:['jpeg', 'png', 'jpg']
    }
  });

  // Separate storage for prototypes that supports more file types
  prototypeStorage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'Prototypes',
      resource_type: 'auto', // 'auto' allows images, videos, and raw files
      allowedFormats: ['jpeg', 'png', 'jpg', 'gif', 'mp4', 'mov', 'avi', 'pdf', 'doc', 'docx', 'zip', 'rar', '7z']
    }
  });
} else {
  // Use disk storage as fallback
  storage = diskStorage;
  prototypeStorage = diskStorage;
  console.warn('Using disk storage as fallback. Files will be saved locally in uploads/ folder.');
}

module.exports = {
    cloudinary, 
    storage,
    prototypeStorage,
    isCloudinaryConfigured
}