const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  submitSupportRequest,
  getSupportRequests,
  getSupportRequest,
  updateSupportRequest,
} = require('../controllers/supportController');

// Public support form
router.post('/submit', submitSupportRequest);

// Get all support requests (should be protected in production)
router.get('/', getSupportRequests);

// Get single support request
router.get('/:id', authMiddleware, getSupportRequest);

// Update support request
router.put('/:id', authMiddleware, updateSupportRequest);

module.exports = router;