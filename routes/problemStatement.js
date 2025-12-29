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

// Create a new project (campground)
router.post('/create-project', isLoggedIn, async (req, res) => {
  try {
    console.log('=== CREATING NEW PROJECT ===');
    console.log('User ID:', req.user._id);
    
    // Create a new campground with minimal data
    const campground = new Campground({
      title: 'New Project',
      description: '',
      author: req.user._id,
      teamInfo: {},
      problemStatementInfo: {}
    });
    
    await campground.save();
    console.log('Project created successfully:', campground._id);
    
    req.flash('success', 'Project created! Click on the card to start Excite & Enrol.');
    res.redirect('/');
  } catch (error) {
    console.error('Error creating project:', error);
    req.flash('error', 'Failed to create project: ' + error.message);
    res.redirect('/');
  }
});

// Excite and Enrol: Initial Form (Page 1)
router.get('/excite-and-enrol', isLoggedIn, async (req, res) => {
  try {
    const { campgroundId } = req.query;
    let campground = null;
    
    // If campgroundId is provided, fetch it and verify ownership
    if (campgroundId) {
      campground = await Campground.findById(campgroundId)
        .populate('teamInfo.enrolledProgram');
      if (!campground || campground.author.toString() !== req.user._id.toString()) {
        req.flash('error', 'Project not found or access denied.');
        return res.redirect('/');
      }
    }
    
    const programs = await Program.find({ isActive: true }).sort({ name: 1 });
    const schools = await School.find({ isActive: true }).sort({ name: 1 });
    res.render('problemStatement/page1', { 
      currentUser: req.user,
      sdgGoals: SDG_GOALS,
      programs: programs,
      schools: schools,
      campgroundId: campgroundId || null,
      campground: campground
    });
  } catch (error) {
    console.error('Error loading excite and enrol form:', error);
    req.flash('error', 'Error loading form. Please try again.');
    res.redirect('/');
  }
});

// Handle Excite and Enrol form submission
router.post('/excite-and-enrol', isLoggedIn, async (req, res) => {
  try {
    console.log('=== EXCITE & ENROL FORM SUBMISSION ===');
    console.log('Request body:', req.body);
    const { campgroundId } = req.body;
    console.log('Campground ID:', campgroundId);
    
    // Get school name from school ID
    let schoolName = req.body.schoolName;
    if (schoolName && mongoose.Types.ObjectId.isValid(schoolName)) {
      const school = await School.findById(schoolName);
      if (school) {
        schoolName = school.name;
      }
    }

    // If campgroundId exists, update the existing campground
    if (campgroundId) {
      console.log('Updating existing campground:', campgroundId);
      const campground = await Campground.findById(campgroundId);
      if (!campground) {
        console.error('Campground not found:', campgroundId);
        req.flash('error', 'Project not found.');
        return res.redirect('/');
      }
      if (campground.author.toString() !== req.user._id.toString()) {
        console.error('Access denied for user:', req.user._id);
        req.flash('error', 'Access denied.');
        return res.redirect('/');
      }
      
      // Update campground with Excite & Enrol data
      campground.teamInfo = {
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
        technologyApplicationReason: req.body.technologyApplicationReason
      };
      
      // Update title if group name is provided
      if (req.body.groupName) {
        campground.title = req.body.groupName + ' - Innovation Project';
      }
      
      await campground.save();
      console.log('Campground saved successfully:', campground._id);
      
      req.flash('success', 'Excite & Enrol form saved successfully!');
      return res.redirect('/');
    }
    
    // Otherwise, create new form data (legacy flow)
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

    const problemFormData = new ProblemFormData(formData);
    await problemFormData.save();

    req.flash('success', 'Excite & Enrol form submitted successfully! Continue with Problem Discovery.');
    res.redirect('/');
  } catch (error) {
    console.error('Error saving excite and enrol data:', error);
    req.flash('error', 'Failed to save form data. Please try again.');
    res.redirect('/');
  }
});

// Page 2: SDG Goal and Predefined Problem Selection
router.get('/problem-statement/page2', isLoggedIn, async (req, res) => {
  try {
    const { formId, campgroundId } = req.query;
    let formData = null;
    let campground = null;
    
    // If campgroundId is provided, fetch the campground and use its data
    if (campgroundId) {
      campground = await Campground.findById(campgroundId)
        .populate('teamInfo.enrolledProgram');
      if (!campground || campground.author.toString() !== req.user._id.toString()) {
        req.flash('error', 'Project not found or access denied.');
        return res.redirect('/');
      }
      
      // Create formData object from campground for compatibility
      formData = {
        schoolName: campground.teamInfo?.schoolName || '',
        className: campground.teamInfo?.className || '',
        groupMembers: campground.teamInfo?.groupMembers || '',
        groupName: campground.teamInfo?.groupName || '',
        enrolledProgram: campground.teamInfo?.enrolledProgram || null,
        sdgGoal: campground.teamInfo?.sdgGoal || '',
        innovationProcessSteps: campground.teamInfo?.innovationProcessSteps || '',
        problemDiscoveryMethod: campground.teamInfo?.problemDiscoveryMethod || '',
        communityChallenges: campground.teamInfo?.communityChallenges || '',
        fiveYearProblem: campground.teamInfo?.fiveYearProblem || '',
        technologyApplicationReason: campground.teamInfo?.technologyApplicationReason || '',
        selectedPredefinedProblem: campground.problemStatementInfo?.selectedPredefinedProblem || null,
        recommendedStakeholders: campground.problemStatementInfo?.recommendedStakeholders || [],
        problemType: campground.problemStatementInfo?.problemType || 'predefined',
        customProblem: campground.problemStatementInfo?.customProblem || {}
      };
    } else if (formId) {
      // Legacy flow with formId
      formData = await ProblemFormData.findById(formId);
      if (!formData || formData.user.toString() !== req.user._id.toString()) {
        req.flash('error', 'Form data not found or access denied.');
        return res.redirect('/excite-and-enrol');
      }
    } else {
      req.flash('error', 'Invalid form session. Please start from Excite & Enrol.');
      return res.redirect('/');
    }

    // Get predefined problems for the selected SDG
    // The SDG goal might be stored as "No Poverty" but database has "SDG 1: No Poverty"
    // Try multiple matching strategies
    const selectedSdgGoal = campground ? (campground.teamInfo?.sdgGoal || '') : formData.sdgGoal;
    console.log('Looking for problems with SDG Goal:', selectedSdgGoal);
    
    // Normalize the search term - remove common words and punctuation
    const normalizeForSearch = (text) => {
      return text.toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Remove punctuation
        .replace(/\s+/g, ' ')     // Normalize whitespace
        .trim();
    };
    
    const searchTerm = normalizeForSearch(selectedSdgGoal);
    console.log('Normalized search term:', searchTerm);
    
    // Try exact match first (case-insensitive)
    let predefinedProblems = await PredefinedProblem.find({ 
      sdgGoal: { $regex: new RegExp(`^${selectedSdgGoal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
    
    // If no exact match, try partial matching with normalized terms
    if (predefinedProblems.length === 0) {
      // Extract key words from the search term (remove "SDG", numbers, common words)
      const keyWords = searchTerm
        .split(' ')
        .filter(word => word.length > 2 && !word.match(/^\d+$/))
        .filter(word => !['sdg', 'goal', 'the', 'and', 'for'].includes(word));
      
      if (keyWords.length > 0) {
        // Match if any key word appears in the SDG goal
        const regexPattern = keyWords.map(word => `(?=.*${word})`).join('');
        predefinedProblems = await PredefinedProblem.find({ 
          sdgGoal: { $regex: regexPattern, $options: 'i' }
        });
      }
    }
    
    // If still no match, try simple contains match
    if (predefinedProblems.length === 0) {
      predefinedProblems = await PredefinedProblem.find({ 
        sdgGoal: { $regex: searchTerm, $options: 'i' }
      });
    }
    
    console.log(`Found ${predefinedProblems.length} problems for SDG: ${selectedSdgGoal}`);
    if (predefinedProblems.length > 0) {
      console.log('Sample matched SDG goals:', predefinedProblems.slice(0, 3).map(p => p.sdgGoal));
    }

    res.render('problemStatement/page2', {
      currentUser: req.user,
      formData: formData,
      sdgGoals: SDG_GOALS,
      predefinedProblems: predefinedProblems,
      formId: formId || null,
      campgroundId: campgroundId || null,
      campground: campground
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
    const { formId, campgroundId, selectedProblem, stakeholders } = req.body;
    
    // If campgroundId exists, update the existing campground
    if (campgroundId) {
      const campground = await Campground.findById(campgroundId);
      if (!campground || campground.author.toString() !== req.user._id.toString()) {
        req.flash('error', 'Project not found or access denied.');
        return res.redirect('/');
      }
      
      // Get the predefined problem details
      const predefinedProblem = await PredefinedProblem.findById(selectedProblem);
      
      // Update campground with problem statement info
      campground.problemStatementInfo = {
        selectedPredefinedProblem: selectedProblem,
        recommendedStakeholders: Array.isArray(stakeholders) ? stakeholders : [stakeholders].filter(Boolean),
        problemType: 'predefined'
      };
      
      // Update title and description if predefined problem exists
      if (predefinedProblem) {
        campground.title = predefinedProblem.problemStatement || campground.title;
        campground.description = predefinedProblem.problemStatement || campground.description;
      }
      
      await campground.save();
      
      req.flash('success', 'Problem statement saved successfully!');
      return res.redirect('/');
    }
    
    // Legacy flow with formId
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
    
    // Create the actual problem/campground with all team information
    const problem = new Campground({
      title: predefinedProblem ? predefinedProblem.problemStatement : 'Problem Statement',
      description: predefinedProblem ? predefinedProblem.problemStatement : '',
      location: formData.schoolName,
      author: req.user._id,
      // Save all team information
      teamInfo: {
        schoolName: formData.schoolName,
        className: formData.className,
        groupMembers: formData.groupMembers,
        groupName: formData.groupName,
        enrolledProgram: formData.enrolledProgram,
        sdgGoal: formData.sdgGoal,
        innovationProcessSteps: formData.innovationProcessSteps,
        problemDiscoveryMethod: formData.problemDiscoveryMethod,
        communityChallenges: formData.communityChallenges,
        fiveYearProblem: formData.fiveYearProblem,
        technologyApplicationReason: formData.technologyApplicationReason
      },
      // Save problem statement information
      problemStatementInfo: {
        selectedPredefinedProblem: selectedProblem,
        recommendedStakeholders: Array.isArray(stakeholders) ? stakeholders : [stakeholders].filter(Boolean),
        problemType: 'predefined'
      },
      // Link to form data
      formDataId: formData._id
    });
    await problem.save();

    // Link problem to form data
    formData.problemId = problem._id;
    await formData.save();

    req.flash('success', 'Problem statement created successfully!');
    res.redirect('/');
  } catch (error) {
    console.error('Error saving page 2 data:', error);
    req.flash('error', 'Failed to save problem statement. Please try again.');
    if (req.body.campgroundId) {
      res.redirect(`/problem-statement/page2?campgroundId=${req.body.campgroundId}`);
    } else {
      res.redirect(`/problem-statement/page2?formId=${req.body.formId}`);
    }
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

    // Create the actual problem/campground with all team information
    const problemTitle = `${whoHasProblem} - ${whatIsProblem}`;
    const problemDescription = `Problem: ${whatIsProblem}\n\nWho is affected: ${whoHasProblem}\n\nExpected Benefit: ${expectedBenefit}`;
    
    const problem = new Campground({
      title: problemTitle,
      description: problemDescription,
      location: formData.schoolName,
      author: req.user._id,
      // Save all team information
      teamInfo: {
        schoolName: formData.schoolName,
        className: formData.className,
        groupMembers: formData.groupMembers,
        groupName: formData.groupName,
        enrolledProgram: formData.enrolledProgram,
        sdgGoal: formData.sdgGoal,
        innovationProcessSteps: formData.innovationProcessSteps,
        problemDiscoveryMethod: formData.problemDiscoveryMethod,
        communityChallenges: formData.communityChallenges,
        fiveYearProblem: formData.fiveYearProblem,
        technologyApplicationReason: formData.technologyApplicationReason
      },
      // Save problem statement information
      problemStatementInfo: {
        recommendedStakeholders: [],
        problemType: 'custom',
        customProblem: {
          whoHasProblem: whoHasProblem,
          whatIsProblem: whatIsProblem,
          expectedBenefit: expectedBenefit
        }
      },
      // Link to form data
      formDataId: formData._id
    });
    await problem.save();

    // Link problem to form data
    formData.problemId = problem._id;
    await formData.save();

    req.flash('success', 'Custom problem statement created successfully!');
    res.redirect('/');
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
    console.log('API: Looking for problems with SDG Goal:', decodedSdgGoal);
    
    // Normalize the search term
    const normalizeForSearch = (text) => {
      return text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };
    
    const searchTerm = normalizeForSearch(decodedSdgGoal);
    
    // Try exact match first (case-insensitive)
    let problems = await PredefinedProblem.find({ 
      sdgGoal: { $regex: new RegExp(`^${decodedSdgGoal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
    
    // If no exact match, try partial matching with key words
    if (problems.length === 0) {
      const keyWords = searchTerm
        .split(' ')
        .filter(word => word.length > 2 && !word.match(/^\d+$/))
        .filter(word => !['sdg', 'goal', 'the', 'and', 'for'].includes(word));
      
      if (keyWords.length > 0) {
        const regexPattern = keyWords.map(word => `(?=.*${word})`).join('');
        problems = await PredefinedProblem.find({ 
          sdgGoal: { $regex: regexPattern, $options: 'i' }
        });
      }
    }
    
    // If still no match, try simple contains match
    if (problems.length === 0) {
      problems = await PredefinedProblem.find({ 
        sdgGoal: { $regex: searchTerm, $options: 'i' }
      });
    }
    
    console.log(`API: Found ${problems.length} problems for SDG: ${decodedSdgGoal}`);
    res.json(problems);
  } catch (error) {
    console.error('Error fetching predefined problems:', error);
    res.status(500).json({ error: 'Failed to fetch predefined problems' });
  }
});

module.exports = router;

