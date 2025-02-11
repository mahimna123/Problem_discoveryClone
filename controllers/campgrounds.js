const Campground = require('../models/campgrounds');
const { cloudinary } = require("../cloudinary");
const multer = require('multer');
const maptilerClient = require("@maptiler/client");
maptilerClient.config.apiKey = process.env.MAPTILER_API_KEY;

module.exports.index = async (req, res) => {
    const campgrounds = await Campground.find({});
    res.render('campgrounds/index', { campgrounds }); // Pass campgrounds data to the template
  }

module.exports.renderNewForm = (req, res) => {
    res.render('campgrounds/new');
  }

  module.exports.createCampground = async(req, res, next) => {
     const geoData = await maptilerClient.geocoding.forward(req.body.campground.location, { limit: 1 });
     const campground = new Campground(req.body.campground);
     campground.geometry = geoData.features[0].geometry;

    //const campground = new Campground (req.body.campground);
    campground.images = req.files.map( f => ({url: f.path,filename: f.filename}))
    campground.author = req.user._id;
    await campground.save(); // Whenever we want to send a form request, we encode the data into the url and send a post request with the new tag attached to the database and await and save it
    console.log(campground);
    req.flash('success', 'successfully made a new campground');
    res.redirect(`/campgrounds/${campground._id}`);// Once this action is performed, the user should be redirected to the this page
  }

  module.exports.showCampground = async (req, res) => {
    const campground = await Campground.findById(req.params.id).populate({
      path:'reviews',
      populate: {
        path: 'author'
      }
    }).populate('author');
    console.log(campground);
    if(!campground){
        req.flash('error', 'Cannot find that campground');
       return res.redirect('/campgrounds')
    }
    res.render('campgrounds/show', { campground });
  }

  module.exports.renderEditForm = async(req, res) => {
    const campground = await Campground.findById(req.params.id)
    if(!campground){
      req.flash('error', 'Cannot find that campground');
     return res.redirect('/campgrounds')
  }
    res.render('campgrounds/edit', { campground });
  }

//   module.exports.updateCampground = async(req, res) => {
//     const campground = await Campground.findById(req.params.id)
//     res.render('campgrounds/edit', { campground });
//   }

  module.exports.updateCampground = async (req, res) => {
    const { id } = req.params;
    const campground = await Campground.findByIdAndUpdate(id,{ ...req.body.campground });
    const geoData = await maptilerClient.geocoding.forward(req.body.campground.location, { limit: 1 });
    campground.geometry = geoData.features[0].geometry;
    const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
    campground.images.push(...imgs);
    if (req.body.deleteImages) {
      for(let filename of req.body.deleteImages){
        await cloudinary.uploader.destroy(filename);
      }
    await campground.updateOne({ $pull: {images: {filename: { $in: req.body.deleteImages } } } } )
    console.log(campground)
  }
    await campground.save();
    req.flash('success', 'successfully made a new campground');
    res.redirect(`/campgrounds/${campground._id}`)
  }

  module.exports.deleteCampground = async(req, res) =>{
    const { id } = req.params;
    await Campground.findByIdAndDelete(id);
     res.redirect('/campgrounds');
     req.flash('success', 'successfully made a new campground');
  }