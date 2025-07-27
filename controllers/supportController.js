const asyncHandler = require('express-async-handler');
const SupportRequest = require('../models/SupportRequest');

// @desc    Submit a public support request
// @route   POST /api/support/submit
// @access  Public
const submitSupportRequest = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !subject || !message) {
    res.status(400);
    throw new Error('All fields are required');
  }

  // Now SupportRequest.create exists and works
  const request = await SupportRequest.create({ name, email, subject, message });
  res.status(201).json(request);
});

// @desc    Get all public support requests
// @route   GET /api/support
// @access  Public
const getSupportRequests = asyncHandler(async (req, res) => {
  const requests = await SupportRequest.find().sort({ createdAt: -1 });
  res.json(requests);
});

module.exports = {
  submitSupportRequest,
  getSupportRequests,
};
