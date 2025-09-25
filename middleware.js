const { campgroundSchema, reviewSchema } = require('./schemas.js');
const ExpressError = require('./utils/ExpressError');
const Campground = require('./models/campgrounds');
const Review = require('./models/review');

module.exports.isLoggedIn = (req, res, next) => {
    console.log('=== AUTHENTICATION CHECK ===');
    console.log('Path:', req.path);
    console.log('Method:', req.method);
    console.log('Authenticated:', req.isAuthenticated());
    console.log('User:', req.user);
    console.log('Session ID:', req.sessionID);
    
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'You must be signed in first!');
        
        // Check if this is an API request
        if (req.path.startsWith('/api/')) {
            console.log('API request - returning 401');
            return res.status(401).json({ 
                error: 'Authentication required',
                message: 'You must be signed in first!'
            });
        }
        
        console.log('Web request - redirecting to login');
        return res.redirect('/login');
    }
    console.log('User authenticated - proceeding');
    next();
}

module.exports.storeReturnTo = (req, res, next) => {
    if (req.session.returnTo) {
        res.locals.returnTo = req.session.returnTo;
    }
    next();
}

module.exports.validateCampground = (req, res, next) => {
  const { error } = campgroundSchema.validate(req.body);
  console.log(req.body);
  if (error) {
      const msg = error.details.map(el => el.message).join(',')
      throw new ExpressError(msg, 400)
  } else {
      next();
  }
}

  module.exports.isAuthor = async (req, res, next) => {
    const { id } = req.params;
    const campground = await Campground.findById(id);
    if (!campground.author.equals(req.user._id)){
      req.flash('error', 'You do not have permission to do that');
      return res.redirect(`/campgrounds/${id}`);
    }
    next();
    
  } 

  module.exports.isReviewAuthor = async (req, res, next) => {
    const { id, reviewId } = req.params;
    const review = await Review.findById(reviewId);
    if (!review.author.equals(req.user._id)){
      req.flash('error', 'You do not have permission to do that');
      return res.redirect(`/campgrounds/${id}`);
    }
    next();
    
  } 



module.exports.validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);
    if(error){
      const msg = error.details.map(el => el.message).join(',')
        throw new ExpressError(msg, 400)
    }else {
      next();
    }
  }

