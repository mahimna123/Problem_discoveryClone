const express = require('express');
const router = express.Router();
const campgrounds = require('../controllers/campgrounds');
const catchAsync = require('../utils/catchAsync');
const { isLoggedIn, isAuthor, validateCampground } = require('../middleware');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage });

const Campground = require('../models/campgrounds');

router.route('/')
    .get(catchAsync(campgrounds.index))
    .post(isLoggedIn, upload.array('image'), validateCampground, catchAsync(campgrounds.createCampground))


router.get('/new', isLoggedIn, campgrounds.renderNewForm)

router.route('/:id')
    .get(catchAsync(campgrounds.showCampground))
    .put(isLoggedIn, isAuthor, upload.array('image'), validateCampground, catchAsync(campgrounds.updateCampground))
    .delete(isLoggedIn, isAuthor, catchAsync(campgrounds.deleteCampground));

router.get('/:id/edit', isLoggedIn, isAuthor, catchAsync(campgrounds.renderEditForm))

// Save notes route
router.post('/:id/notes', isLoggedIn, isAuthor, catchAsync(async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    console.log('Saving notes for campground:', id);
    console.log('Notes content:', notes);
    
    const campground = await Campground.findById(id);
    if (!campground) {
      req.flash('error', 'Campground not found');
      return res.redirect('/');
    }
    
    // Update notes field directly
    campground.notes = notes || '';
    await campground.save();
    
    console.log('Notes saved successfully, campground notes:', campground.notes);
    req.flash('success', 'Notes saved successfully!');
    res.redirect(`/problems/${id}`);
  } catch (error) {
    console.error('Error saving notes:', error);
    req.flash('error', 'Failed to save notes: ' + error.message);
    res.redirect(`/problems/${req.params.id}`);
  }
}));

// Add images route
router.post('/:id/images', isLoggedIn, isAuthor, upload.array('image'), catchAsync(async (req, res) => {
  try {
    const { id } = req.params;
    const campground = await Campground.findById(id);
    
    if (!campground) {
      req.flash('error', 'Problem statement not found');
      return res.redirect('/');
    }
    
    // Handle new images
    if (req.files && req.files.length > 0) {
      const imgs = req.files.map(f => {
        // Check if Cloudinary (has secure_url or path is URL) or disk storage
        let url;
        if (f.secure_url || f.url || (f.path && f.path.startsWith('http'))) {
          url = f.secure_url || f.url || f.path;
        } else {
          // Disk storage - create URL path
          const path = require('path');
          const filename = path.basename(f.path);
          url = `/uploads/${filename}`;
        }
        return { url: url, filename: f.filename || f.originalname };
      });
      campground.images.push(...imgs);
      await campground.save();
      req.flash('success', `${req.files.length} image(s) uploaded successfully!`);
    } else {
      req.flash('error', 'No images selected');
    }
    
    res.redirect(`/problems/${id}`);
  } catch (error) {
    console.error('Error uploading images:', error);
    req.flash('error', 'Failed to upload images: ' + error.message);
    res.redirect(`/problems/${req.params.id}`);
  }
}));

// Delete image route
router.delete('/:id/images/:filename', isLoggedIn, isAuthor, catchAsync(async (req, res) => {
  try {
    const { id, filename } = req.params;
    const campground = await Campground.findById(id);
    
    if (!campground) {
      req.flash('error', 'Problem statement not found');
      return res.redirect('/');
    }
    
    // Delete from Cloudinary
    const { cloudinary } = require('../cloudinary');
    await cloudinary.uploader.destroy(filename);
    
    // Remove from campground
    await campground.updateOne({ $pull: { images: { filename: filename } } });
    
    req.flash('success', 'Image deleted successfully!');
    res.redirect(`/problems/${id}`);
  } catch (error) {
    console.error('Error deleting image:', error);
    req.flash('error', 'Failed to delete image: ' + error.message);
    res.redirect(`/problems/${req.params.id}`);
  }
}));

module.exports = router;