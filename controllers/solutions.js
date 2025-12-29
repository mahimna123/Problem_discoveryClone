const { Solution } = require('../models/schemas');
const Campground = require('../models/campgrounds');

// Save a new solution (without AI)
exports.saveSolution = async (req, res) => {
  try {
    const { title, shouldDo, shouldNotDo, keyFeatures, implementationSteps, campgroundId } = req.body;
    
    // Check if solution already exists for this campground
    let solution;
    if (campgroundId) {
      const campground = await Campground.findById(campgroundId);
      if (campground && campground.solution) {
        // Update existing solution
        solution = await Solution.findByIdAndUpdate(
          campground.solution,
          {
            title,
            shouldDo,
            shouldNotDo,
            keyFeatures,
            implementationSteps,
            user: req.user._id,
            username: req.user.username
          },
          { new: true }
        );
      } else {
        // Create new solution
        solution = new Solution({
          title,
          shouldDo,
          shouldNotDo,
          keyFeatures,
          implementationSteps,
          user: req.user._id,
          username: req.user.username
        });
        await solution.save();
        
        // Associate with campground
        await Campground.findByIdAndUpdate(campgroundId, { solution: solution._id });
      }
    } else {
      // Create new solution without campground association
      solution = new Solution({
        title,
        shouldDo,
        shouldNotDo,
        keyFeatures,
        implementationSteps,
        user: req.user._id,
        username: req.user.username
      });
      await solution.save();
    }
    
    res.status(201).json({ 
      message: 'Solution saved successfully',
      solutionId: solution._id,
      campgroundId: campgroundId
    });
  } catch (error) {
    console.error('Error saving solution:', error);
    res.status(500).json({ error: 'Failed to save solution' });
  }
};

// Get all solutions for the logged-in user
exports.getSolutions = async (req, res) => {
  try {
    const solutions = await Solution.find({ user: req.user._id });
    res.json(solutions);
  } catch (error) {
    console.error('Error fetching solutions:', error);
    res.status(500).json({ error: 'Failed to fetch solutions' });
  }
}; 