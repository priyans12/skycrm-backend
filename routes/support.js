// backend/routes/support.js
const express = require('express');
const router = express.Router();
const {
  submitSupportRequest,
  getSupportRequests,
} = require('../controllers/supportController');

// Public support form
router.post('/submit', submitSupportRequest);
router.get('/', getSupportRequests);

module.exports = router;
