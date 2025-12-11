const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware');
const programAdministratorController = require('../controllers/programAdministrator');

// Program Administrator Dashboard (with program ID)
router.get('/program/:programId', isLoggedIn, programAdministratorController.getDashboard);

// Program Administrator Dashboard (backward compatibility - default to ABPS)
router.get('/program-administrator', isLoggedIn, programAdministratorController.getDashboard);

// API: Get all problems for a school
router.get('/program-administrator/api/school/:schoolId/problems', isLoggedIn, programAdministratorController.getSchoolProblems);

// API: Get all solutions for a school
router.get('/program-administrator/api/school/:schoolId/solutions', isLoggedIn, programAdministratorController.getSchoolSolutions);

module.exports = router;

