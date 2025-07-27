const express = require('express');
const router = express.Router();
const { submitSupportRequest } = require('../controllers/supportController');

// POST /api/support/submit
router.post('/submit', submitSupportRequest);

module.exports = router;
