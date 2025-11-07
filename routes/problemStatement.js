const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { isLoggedIn } = require('../middleware');
const { ProblemFormData, SDGGoal, PredefinedProblem, Program, School } = require('../models/schemas');
const Campground = require('../models/campgrounds');

// List of 18 SDG Goals
const SDG_GOALS = [
  { number: 1, title: 'No Poverty', description: 'End poverty in all its forms everywhere' },
  { number: 2, title: 'Zero Hunger', description: 'End hunger, achieve food security and improved nutrition' },
  { number: 3, title: 'Good Health and Well-being', description: 'Ensure healthy lives and promote well-being for all' },
  { number: 4, title: 'Quality Education', description: 'Ensure inclusive and equitable quality education' },
  { number: 5, title: 'Gender Equality', description: 'Achieve gender equality and empower all women and girls' },
  { number: 6, title: 'Clean Water and Sanitation', description: 'Ensure availability and sustainable management of water' },
  { number: 7, title: 'Affordable and Clean Energy', description: 'Ensure access to affordable, reliable, sustainable energy' },
  { number: 8, title: 'Decent Work and Economic Growth', description: 'Promote sustained, inclusive economic growth' },
  { number: 9, title: 'Industry, Innovation and Infrastructure', description: 'Build resilient infrastructure, promote innovation' },
  { number: 10, title: 'Reduced Inequalities', description: 'Reduce inequality within and among countries' },
  { number: 11, title: 'Sustainable Cities and Communities', description: 'Make cities and human settlements inclusive, safe, resilient' },
  { number: 12, title: 'Responsible Consumption and Production', description: 'Ensure sustainable consumption and production patterns' },
  { number: 13, title: 'Climate Action', description: 'Take urgent action to combat climate change and its impacts' },
  { number: 14, title: 'Life Below Water', description: 'Conserve and sustainably use the oceans, seas and marine resources' },
  { number: 15, title: 'Life on Land', description: 'Protect, restore and promote sustainable use of terrestrial ecosystems' },
  { number: 16, title: 'Peace, Justice and Strong Institutions', description: 'Promote peaceful and inclusive societies' },
  { number: 17, title: 'Partnerships for the Goals', description: 'Strengthen the means of implementation and revitalize partnerships' },
  { number: 18, title: 'Women and Welfare', description: 'Promote women\'s welfare and empowerment' }
];

// Excite and Enrol: Initial Form (Page 1)
router.get('/excite-and-enrol', isLoggedIn, async (req, res) => {
  try {
    const programs = await Program.find({ isActive: true }).sort({ name: 1 });
    const schools = await School.find({ isActive: true }).sort({ name: 1 });
    res.render('problemStatement/page1', { 
      currentUser: req.user,
      sdgGoals: SDG_GOALS,
      programs: programs,
      schools: schools
    });
  } catch (error) {
    console.error('Error loading excite and enrol form:', error);
    req.flash('error', 'Error loading form. Please try again.');
    res.redirect('/dashboard');
  }
});

// Handle Excite and Enrol form submission
router.post('/excite-and-enrol', isLoggedIn, async (req, res) => {
  try {
    // Get school name from school ID
    let schoolName = req.body.schoolName;
    if (schoolName && mongoose.Types.ObjectId.isValid(schoolName)) {
      const school = await School.findById(schoolName);
      if (school) {
        schoolName = school.name;
      }
    }

    const formData = {
      schoolName: schoolName,
      className: req.body.className,
      groupMembers: req.body.groupMembers,
      groupName: req.body.groupName,
      enrolledProgram: req.body.enrolledProgram,
      sdgGoal: req.body.sdgGoal,
      innovationProcessSteps: req.body.innovationProcessSteps,
      problemDiscoveryMethod: req.body.problemDiscoveryMethod,
      communityChallenges: req.body.communityChallenges,
      fiveYearProblem: req.body.fiveYearProblem,
      technologyApplicationReason: req.body.technologyApplicationReason,
      user: req.user._id,
      username: req.user.username
    };

    // Save form data to session or create temporary record
    const problemFormData = new ProblemFormData(formData);
    await problemFormData.save();

    // Redirect to page 2 (Problem Discovery)
    res.redirect(`/problem-statement/page2?formId=${problemFormData._id}`);
  } catch (error) {
    console.error('Error saving excite and enrol data:', error);
    req.flash('error', 'Failed to save form data. Please try again.');
    res.redirect('/excite-and-enrol');
  }
});

// Page 2: SDG Goal and Predefined Problem Selection
router.get('/problem-statement/page2', isLoggedIn, async (req, res) => {
  try {
    const { formId } = req.query;
    if (!formId) {
      req.flash('error', 'Invalid form session. Please start from page 1.');
      return res.redirect('/problem-statement/page1');
    }

    const formData = await ProblemFormData.findById(formId);
    if (!formData || formData.user.toString() !== req.user._id.toString()) {
      req.flash('error', 'Form data not found or access denied.');
      return res.redirect('/excite-and-enrol');
    }

    // Get predefined problems for the selected SDG
    const predefinedProblems = await PredefinedProblem.find({ 
      sdgGoal: formData.sdgGoal 
    });

    res.render('problemStatement/page2', {
      currentUser: req.user,
      formData: formData,
      sdgGoals: SDG_GOALS,
      predefinedProblems: predefinedProblems,
      formId: formId
    });
  } catch (error) {
    console.error('Error loading page 2:', error);
    req.flash('error', 'Error loading form. Please try again.');
    res.redirect('/excite-and-enrol');
  }
});

// Handle Page 2 form submission (predefined problem selected)
router.post('/problem-statement/page2', isLoggedIn, async (req, res) => {
  try {
    const { formId, selectedProblem, stakeholders } = req.body;
    
    const formData = await ProblemFormData.findById(formId);
    if (!formData || formData.user.toString() !== req.user._id.toString()) {
      req.flash('error', 'Form data not found or access denied.');
      return res.redirect('/excite-and-enrol');
    }

    // Update form data
    formData.selectedPredefinedProblem = selectedProblem;
    formData.recommendedStakeholders = Array.isArray(stakeholders) ? stakeholders : [stakeholders].filter(Boolean);
    formData.problemType = 'predefined';
    await formData.save();

    // Get the predefined problem details
    const predefinedProblem = await PredefinedProblem.findById(selectedProblem);
    
    // Create the actual problem/campground
    const problem = new Campground({
      title: predefinedProblem ? predefinedProblem.problemStatement : 'Problem Statement',
      description: predefinedProblem ? predefinedProblem.problemStatement : '',
      location: formData.schoolName,
      author: req.user._id
    });
    await problem.save();

    // Link problem to form data
    formData.problemId = problem._id;
    await formData.save();

    req.flash('success', 'Problem statement created successfully!');
    res.redirect(`/problems/${problem._id}`);
  } catch (error) {
    console.error('Error saving page 2 data:', error);
    req.flash('error', 'Failed to save problem statement. Please try again.');
    res.redirect(`/problem-statement/page2?formId=${req.body.formId}`);
  }
});

// Page 3: Custom Problem Statement
router.get('/problem-statement/page3', isLoggedIn, async (req, res) => {
  try {
    const { formId } = req.query;
    if (!formId) {
      req.flash('error', 'Invalid form session. Please start from Excite and Enrol.');
      return res.redirect('/excite-and-enrol');
    }

    const formData = await ProblemFormData.findById(formId);
    if (!formData || formData.user.toString() !== req.user._id.toString()) {
      req.flash('error', 'Form data not found or access denied.');
      return res.redirect('/excite-and-enrol');
    }

    res.render('problemStatement/page3', {
      currentUser: req.user,
      formData: formData,
      formId: formId
    });
  } catch (error) {
    console.error('Error loading page 3:', error);
    req.flash('error', 'Error loading form. Please try again.');
    res.redirect('/excite-and-enrol');
  }
});

// Handle Page 3 form submission (custom problem)
router.post('/problem-statement/page3', isLoggedIn, async (req, res) => {
  try {
    const { formId, whoHasProblem, whatIsProblem, expectedBenefit } = req.body;
    
    const formData = await ProblemFormData.findById(formId);
    if (!formData || formData.user.toString() !== req.user._id.toString()) {
      req.flash('error', 'Form data not found or access denied.');
      return res.redirect('/excite-and-enrol');
    }

    // Update form data with custom problem
    formData.customProblem = {
      whoHasProblem: whoHasProblem,
      whatIsProblem: whatIsProblem,
      expectedBenefit: expectedBenefit
    };
    formData.problemType = 'custom';
    await formData.save();

    // Create the actual problem/campground
    const problemTitle = `${whoHasProblem} - ${whatIsProblem}`;
    const problemDescription = `Problem: ${whatIsProblem}\n\nWho is affected: ${whoHasProblem}\n\nExpected Benefit: ${expectedBenefit}`;
    
    const problem = new Campground({
      title: problemTitle,
      description: problemDescription,
      location: formData.schoolName,
      author: req.user._id
    });
    await problem.save();

    // Link problem to form data
    formData.problemId = problem._id;
    await formData.save();

    req.flash('success', 'Custom problem statement created successfully!');
    res.redirect(`/problems/${problem._id}`);
  } catch (error) {
    console.error('Error saving page 3 data:', error);
    req.flash('error', 'Failed to save custom problem statement. Please try again.');
    res.redirect(`/problem-statement/page3?formId=${req.body.formId}`);
  }
});

// API endpoint to get predefined problems for an SDG
router.get('/api/predefined-problems/:sdgGoal', isLoggedIn, async (req, res) => {
  try {
    const { sdgGoal } = req.params;
    const decodedSdgGoal = decodeURIComponent(sdgGoal);
    const problems = await PredefinedProblem.find({ sdgGoal: decodedSdgGoal });
    res.json(problems);
  } catch (error) {
    console.error('Error fetching predefined problems:', error);
    res.status(500).json({ error: 'Failed to fetch predefined problems' });
  }
});

module.exports = router;

