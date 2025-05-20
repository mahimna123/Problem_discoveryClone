const { Solution } = require('../models/schemas');

// Save a new solution
exports.saveSolution = async (req, res) => {
  try {
    const { title, detail, keyFeatures, implementationSteps } = req.body;
    const solution = new Solution({
      title,
      detail,
      keyFeatures,
      implementationSteps,
      user: req.user._id,
      username: req.user.username
    });
    await solution.save();
    res.status(201).json({ message: 'Solution saved successfully' });
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