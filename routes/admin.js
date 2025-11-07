const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware');
const { Program, School, SchoolProgram } = require('../models/schemas');
const User = require('../models/user');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  console.log('=== ADMIN CHECK ===');
  console.log('User:', req.user ? req.user.username : 'Not logged in');
  console.log('isAdmin:', req.user ? req.user.isAdmin : 'N/A');
  
  if (!req.user) {
    console.log('No user found - redirecting to login');
    req.flash('error', 'You must be logged in to access this page.');
    return res.redirect('/login');
  }
  
  // Refresh user from database to ensure isAdmin is current
  User.findById(req.user._id).then(user => {
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/login');
    }
    
    console.log('User from DB - isAdmin:', user.isAdmin);
    
    if (!user.isAdmin) {
      console.log('User is not admin - redirecting to dashboard');
      req.flash('error', 'You do not have permission to access this page. Contact an administrator to grant you admin access.');
      return res.redirect('/dashboard');
    }
    
    // Update req.user with fresh data
    req.user = user;
    next();
  }).catch(error => {
    console.error('Error checking admin status:', error);
    req.flash('error', 'Error checking permissions.');
    res.redirect('/dashboard');
  });
};

// Admin Dashboard
router.get('/admin/dashboard', isLoggedIn, isAdmin, async (req, res) => {
  try {
    const programs = await Program.find().sort({ name: 1 });
    const schools = await School.find().sort({ name: 1 });
    const schoolPrograms = await SchoolProgram.find()
      .populate('school')
      .populate('program')
      .sort({ enrolledAt: -1 });

    res.render('admin/dashboard', {
      currentUser: req.user,
      programs,
      schools,
      schoolPrograms
    });
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    req.flash('error', 'Error loading admin dashboard.');
    res.redirect('/dashboard');
  }
});

// ========== PROGRAM ROUTES ==========

// Get all programs (API)
router.get('/admin/api/programs', isLoggedIn, isAdmin, async (req, res) => {
  try {
    const programs = await Program.find().sort({ name: 1 });
    res.json(programs);
  } catch (error) {
    console.error('Error fetching programs:', error);
    res.status(500).json({ error: 'Failed to fetch programs' });
  }
});

// Create new program
router.post('/admin/programs', isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    const program = new Program({
      name,
      description
    });
    await program.save();
    req.flash('success', `Program "${name}" created successfully!`);
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Error creating program:', error);
    if (error.code === 11000) {
      req.flash('error', 'A program with this name already exists.');
    } else {
      req.flash('error', 'Failed to create program.');
    }
    res.redirect('/admin/dashboard');
  }
});

// Update program
router.put('/admin/programs/:id', isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    const program = await Program.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        isActive: isActive === 'on' || isActive === true,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }
    req.flash('success', 'Program updated successfully!');
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Error updating program:', error);
    req.flash('error', 'Failed to update program.');
    res.redirect('/admin/dashboard');
  }
});

// Delete program
router.delete('/admin/programs/:id', isLoggedIn, isAdmin, async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }
    
    // Check if any schools are enrolled in this program
    const enrollments = await SchoolProgram.find({ program: program._id });
    if (enrollments.length > 0) {
      return res.status(400).json({ 
        error: `Cannot delete program. ${enrollments.length} school(s) are enrolled in this program.` 
      });
    }
    
    await Program.findByIdAndDelete(req.params.id);
    req.flash('success', 'Program deleted successfully!');
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Error deleting program:', error);
    req.flash('error', 'Failed to delete program.');
    res.redirect('/admin/dashboard');
  }
});

// ========== SCHOOL ROUTES ==========

// Get all schools (API)
router.get('/admin/api/schools', isLoggedIn, isAdmin, async (req, res) => {
  try {
    const schools = await School.find().sort({ name: 1 });
    res.json(schools);
  } catch (error) {
    console.error('Error fetching schools:', error);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

// Create new school
router.post('/admin/schools', isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { name, address, city, state, country } = req.body;
    const school = new School({
      name,
      address,
      city,
      state,
      country: country || 'India'
    });
    await school.save();
    req.flash('success', `School "${name}" created successfully!`);
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Error creating school:', error);
    if (error.code === 11000) {
      req.flash('error', 'A school with this name already exists.');
    } else {
      req.flash('error', 'Failed to create school.');
    }
    res.redirect('/admin/dashboard');
  }
});

// Update school
router.put('/admin/schools/:id', isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { name, address, city, state, country, isActive } = req.body;
    const school = await School.findByIdAndUpdate(
      req.params.id,
      {
        name,
        address,
        city,
        state,
        country: country || 'India',
        isActive: isActive === 'on' || isActive === true,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }
    req.flash('success', 'School updated successfully!');
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Error updating school:', error);
    req.flash('error', 'Failed to update school.');
    res.redirect('/admin/dashboard');
  }
});

// Delete school
router.delete('/admin/schools/:id', isLoggedIn, isAdmin, async (req, res) => {
  try {
    const school = await School.findById(req.params.id);
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }
    
    // Delete all enrollments for this school
    await SchoolProgram.deleteMany({ school: school._id });
    
    await School.findByIdAndDelete(req.params.id);
    req.flash('success', 'School deleted successfully!');
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Error deleting school:', error);
    req.flash('error', 'Failed to delete school.');
    res.redirect('/admin/dashboard');
  }
});

// ========== SCHOOL-PROGRAM ENROLLMENT ROUTES ==========

// Enroll school in program
router.post('/admin/school-programs', isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { schoolId, programId, numberOfStudents } = req.body;
    
    // Check if enrollment already exists
    const existing = await SchoolProgram.findOne({ 
      school: schoolId, 
      program: programId 
    });
    
    if (existing) {
      req.flash('error', 'This school is already enrolled in this program.');
      return res.redirect('/admin/dashboard');
    }
    
    const schoolProgram = new SchoolProgram({
      school: schoolId,
      program: programId,
      numberOfStudents: parseInt(numberOfStudents) || 0
    });
    await schoolProgram.save();
    
    req.flash('success', 'School enrolled in program successfully!');
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Error enrolling school in program:', error);
    if (error.code === 11000) {
      req.flash('error', 'This school is already enrolled in this program.');
    } else {
      req.flash('error', 'Failed to enroll school in program.');
    }
    res.redirect('/admin/dashboard');
  }
});

// Update school-program enrollment (number of students)
router.put('/admin/school-programs/:id', isLoggedIn, isAdmin, async (req, res) => {
  try {
    const { numberOfStudents, isActive } = req.body;
    const schoolProgram = await SchoolProgram.findByIdAndUpdate(
      req.params.id,
      {
        numberOfStudents: parseInt(numberOfStudents) || 0,
        isActive: isActive === 'on' || isActive === true,
        updatedAt: Date.now()
      },
      { new: true }
    );
    
    if (!schoolProgram) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    
    req.flash('success', 'Enrollment updated successfully!');
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Error updating enrollment:', error);
    req.flash('error', 'Failed to update enrollment.');
    res.redirect('/admin/dashboard');
  }
});

// Remove school from program
router.delete('/admin/school-programs/:id', isLoggedIn, isAdmin, async (req, res) => {
  try {
    await SchoolProgram.findByIdAndDelete(req.params.id);
    req.flash('success', 'School removed from program successfully!');
    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Error removing school from program:', error);
    req.flash('error', 'Failed to remove school from program.');
    res.redirect('/admin/dashboard');
  }
});

module.exports = router;


