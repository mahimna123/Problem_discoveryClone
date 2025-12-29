const { Program, School, SchoolProgram } = require('../models/schemas');
const { Idea, Solution } = require('../models/schemas');
const Campground = require('../models/campgrounds');

/**
 * Calculate school level based on metrics
 * Level 1 (Red): Less than 5 problem statements (always red for 0-4 problems)
 * Level 2 (Yellow): More than 10 Problem statements, More than 5 ideations, More than 3 conceptual solutions
 * Level 3 (Green): More than 25 Problem statements, more than 15 Ideations, More than 10 Solutions
 * Default: Level 1 (Red) - if doesn't meet Level 2 or 3 criteria
 */
function calculateLevel(problemCount, ideationCount, solutionCount) {
  // Level 1: Less than 5 problem statements (always red)
  if (problemCount < 5) {
    return { level: 1, color: 'red', label: 'Level 1' };
  }
  
  // Level 3: More than 25 problems, more than 15 ideations, more than 10 solutions
  if (problemCount > 25 && ideationCount > 15 && solutionCount > 10) {
    return { level: 3, color: 'green', label: 'Level 3' };
  }
  
  // Level 2: More than 10 problems, more than 5 ideations, more than 3 solutions
  if (problemCount > 10 && ideationCount > 5 && solutionCount > 3) {
    return { level: 2, color: 'yellow', label: 'Level 2' };
  }
  
  // Default: Level 1 (Red) - everything else defaults to red
  return { level: 1, color: 'red', label: 'Level 1' };
}

/**
 * Get dashboard data for program administrator
 * Can accept program ID from route parameter or query string
 */
module.exports.getDashboard = async (req, res) => {
  try {
    // Get program ID from route parameter or query string
    const programId = req.params.programId || req.query.programId;
    
    let program;
    if (programId) {
      // Find program by ID
      program = await Program.findById(programId);
    } else {
      // Fallback: Find ABPS Group of schools program (for backward compatibility)
      program = await Program.findOne({ name: 'ABPS Group of schools' });
    }
    
    if (!program) {
      req.flash('error', programId ? 'Program not found.' : 'ABPS Group of schools program not found. Please create it first in the admin dashboard.');
      return res.redirect('/');
    }

    // Get all schools enrolled in this program
    const schoolPrograms = await SchoolProgram.find({ 
      program: program._id,
      isActive: true 
    }).populate('school');

    const schoolsData = [];
    const addedSchoolIds = new Set(); // Track added schools to prevent duplicates

    for (const schoolProgram of schoolPrograms) {
      const school = schoolProgram.school;
      if (!school) continue;
      
      // Skip if this school was already added (prevent duplicates)
      if (addedSchoolIds.has(school._id.toString())) {
        continue;
      }
      addedSchoolIds.add(school._id.toString());

      // Get all problem statements for this school in this program
      const problems = await Campground.find({
        'teamInfo.schoolName': school.name,
        'teamInfo.enrolledProgram': program._id
      });

      const problemCount = problems.length;
      const problemIds = problems.map(p => p._id);

      // Count problems with ideation done (10+ ideas)
      let ideationCount = 0;
      for (const problemId of problemIds) {
        const ideaCount = await Idea.countDocuments({ problemId: problemId });
        if (ideaCount >= 10) {
          ideationCount++;
        }
      }

      // Count problems with solutions registered
      const problemsWithSolutions = await Campground.find({
        _id: { $in: problemIds },
        solution: { $exists: true, $ne: null }
      });
      const solutionCount = problemsWithSolutions.length;

      // Calculate level
      const levelInfo = calculateLevel(problemCount, ideationCount, solutionCount);

      schoolsData.push({
        schoolId: school._id,
        schoolName: school.name,
        address: school.address || '',
        city: school.city || '',
        state: school.state || '',
        problemCount,
        ideationCount,
        solutionCount,
        level: levelInfo.level,
        levelColor: levelInfo.color,
        levelLabel: levelInfo.label,
        numberOfStudents: schoolProgram.numberOfStudents || 0
      });
    }

    // Sort by school name
    schoolsData.sort((a, b) => a.schoolName.localeCompare(b.schoolName));

    res.render('programAdministrator/dashboard', {
      currentUser: req.user,
      program: program,
      schools: schoolsData,
      totalSchools: schoolsData.length,
      level1Count: schoolsData.filter(s => s.level === 1).length,
      level2Count: schoolsData.filter(s => s.level === 2).length,
      level3Count: schoolsData.filter(s => s.level === 3).length
    });
  } catch (error) {
    console.error('Error loading program administrator dashboard:', error);
    req.flash('error', 'Error loading program administrator dashboard.');
    res.redirect('/dashboard');
  }
};

/**
 * Get all problem statements for a school
 */
module.exports.getSchoolProblems = async (req, res) => {
  try {
    const { schoolId } = req.params;
    
    // Find ABPS Group of schools program
    const program = await Program.findOne({ name: 'ABPS Group of schools' });
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    // Get school name
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    // Get all problem statements for this school in this program
    const problems = await Campground.find({
      'teamInfo.schoolName': school.name,
      'teamInfo.enrolledProgram': program._id
    })
    .populate('author', 'username email')
    .sort({ createdAt: -1 });

    res.json({
      schoolName: school.name,
      problems: problems.map(p => ({
        _id: p._id,
        title: p.title,
        description: p.description,
        location: p.location,
        createdAt: p.createdAt,
        author: p.author ? {
          username: p.author.username,
          email: p.author.email
        } : null,
        teamInfo: p.teamInfo || {}
      }))
    });
  } catch (error) {
    console.error('Error fetching school problems:', error);
    res.status(500).json({ error: 'Failed to fetch school problems' });
  }
};

/**
 * Get all solutions for a school
 */
module.exports.getSchoolSolutions = async (req, res) => {
  try {
    const { schoolId } = req.params;
    
    // Find ABPS Group of schools program
    const program = await Program.findOne({ name: 'ABPS Group of schools' });
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    // Get school name
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    // Get all problems for this school
    const problems = await Campground.find({
      'teamInfo.schoolName': school.name,
      'teamInfo.enrolledProgram': program._id,
      solution: { $exists: true, $ne: null }
    })
    .populate('solution')
    .populate('author', 'username email')
    .sort({ createdAt: -1 });

    const solutions = problems
      .filter(p => p.solution)
      .map(p => ({
        _id: p.solution._id,
        title: p.solution.title,
        detail: p.solution.detail,
        shouldDo: p.solution.shouldDo,
        shouldNotDo: p.solution.shouldNotDo,
        keyFeatures: p.solution.keyFeatures,
        implementationSteps: p.solution.implementationSteps,
        createdAt: p.solution.createdAt,
        problem: {
          _id: p._id,
          title: p.title,
          description: p.description
        },
        author: p.solution.user ? {
          username: p.solution.username
        } : null
      }));

    res.json({
      schoolName: school.name,
      solutions: solutions
    });
  } catch (error) {
    console.error('Error fetching school solutions:', error);
    res.status(500).json({ error: 'Failed to fetch school solutions' });
  }
};

