const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware');
const programAdministratorController = require('../controllers/programAdministrator');

// Program Administrator Dashboard
router.get('/program-administrator', isLoggedIn, programAdministratorController.getDashboard);

module.exports = router;

