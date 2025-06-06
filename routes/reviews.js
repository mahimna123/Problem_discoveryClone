const express = require('express');
const router = express.Router({ mergeParams: true });
const { validateReview, isLoggedIn, isReviewAuthor } = require('../middleware'); 
const catchAsync = require('../utils/catchAsync');
const Campground = require('../models/campgrounds');
const Review = require('../models/review');
const reviews = require('../controllers/reviews');
const {reviewSchema} = require('../schemas.js');
const flash = require('connect-flash');


const ExpressError = require ('../utils/ExpressError');


  

  router.post('/', isLoggedIn, validateReview, catchAsync(reviews.createReview))
  
  router.delete('/:reviewId', isLoggedIn, isReviewAuthor, catchAsync (reviews.deleteReview))

  module.exports = router;
