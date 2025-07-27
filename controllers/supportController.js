const asyncHandler = require('express-async-handler');

// @desc    Handle support form submission
// @route   POST /api/support/submit
// @access  Public
const submitSupportRequest = asyncHandler(async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    res.status(400);
    throw new Error('All fields are required');
  }

  // Example logic: Log the data or save to DB (add DB logic here)
  console.log('Support Request:', { name, email, message });

  res.status(200).json({ message: 'Support request submitted successfully' });
});

module.exports = {
  submitSupportRequest,
};
