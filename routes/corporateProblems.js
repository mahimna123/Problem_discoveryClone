const express = require('express');
const router = express.Router({ mergeParams: true });
const { isLoggedIn } = require('../middleware');
const corporateProblems = require('../controllers/corporateProblems');
const CorporateProblem = require('../models/corporateProblem');

// Middleware to check if user is a problem creator
const isProblemCreator = async (req, res, next) => {
    if (!req.user) {
        req.flash('error', 'You must be logged in to access this page.');
        return res.redirect('/login');
    }
    
    // Refresh user from database
    const User = require('../models/user');
    const user = await User.findById(req.user._id);
    
    if (!user || (!user.isProblemCreator && !user.isAdmin)) {
        req.flash('error', 'You do not have permission to create corporate problems.');
        return res.redirect('/corporate-problems');
    }
    
    req.user = user;
    next();
};

// Middleware to check if user can edit/delete (creator or admin)
const isCorporateProblemAuthor = async (req, res, next) => {
    const { id } = req.params;
    const corporateProblem = await CorporateProblem.findById(id);
    
    if (!corporateProblem) {
        req.flash('error', 'Corporate problem not found');
        return res.redirect('/corporate-problems');
    }
    
    // Allow admins to edit/delete any corporate problem
    if (req.user && req.user.isAdmin) {
        return next();
    }
    
    // Check if user is the creator
    if (!corporateProblem.createdBy.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to do that');
        return res.redirect(`/corporate-problems/${id}`);
    }
    
    next();
};

// Browse all corporate problems (all logged in users)
router.get('/', isLoggedIn, corporateProblems.index);

// Create new corporate problem (only problem creators) - MUST come before /:id route
router.get('/new', isLoggedIn, isProblemCreator, corporateProblems.renderNewForm);
router.post('/', isLoggedIn, isProblemCreator, corporateProblems.createCorporateProblem);

// Show single corporate problem
router.get('/:id', isLoggedIn, corporateProblems.showCorporateProblem);

// Adopt a corporate problem (create project from it)
router.post('/:id/adopt', isLoggedIn, corporateProblems.adoptCorporateProblem);

// Edit corporate problem (only creator or admin) - MUST come before /:id route
router.get('/:id/edit', isLoggedIn, isProblemCreator, isCorporateProblemAuthor, corporateProblems.renderEditForm);
router.put('/:id', isLoggedIn, isProblemCreator, isCorporateProblemAuthor, corporateProblems.updateCorporateProblem);

// Delete corporate problem (only creator or admin)
router.delete('/:id', isLoggedIn, isProblemCreator, isCorporateProblemAuthor, corporateProblems.deleteCorporateProblem);

module.exports = router;

