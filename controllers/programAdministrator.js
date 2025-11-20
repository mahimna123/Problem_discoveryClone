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
 */
module.exports.getDashboard = async (req, res) => {
  try {
    // Find ABPS Group of schools program
    const program = await Program.findOne({ name: 'ABPS Group of schools' });
    
    if (!program) {
      req.flash('error', 'ABPS Group of schools program not found. Please create it first in the admin dashboard.');
      return res.redirect('/admin/dashboard');
    }

    // Get all schools enrolled in ABPS Schools program
    const schoolPrograms = await SchoolProgram.find({ 
      program: program._id,
      isActive: true 
    }).populate('school');

    const schoolsData = [];

    for (const schoolProgram of schoolPrograms) {
      const school = schoolProgram.school;
      if (!school) continue;

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

