// First install: npm install express-async-handler
const asyncHandler = require('express-async-handler');
const SupportRequest = require('../models/SupportRequest');

// Submit support request
const submitSupportRequest = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;
  
  if (!name || !email || !subject || !message) {
    res.status(400);
    throw new Error('All fields are required');
  }

  try {
    const request = await SupportRequest.create({ 
      name: name.trim(), 
      email: email.toLowerCase().trim(), 
      subject: subject.trim(), 
      message: message.trim() 
    });
    
    console.log('✅ Support request created:', request._id);
    res.status(201).json({ 
      success: true,
      message: 'Support request submitted successfully',
      id: request._id 
    });
  } catch (error) {
    console.error('❌ Error creating support request:', error);
    res.status(500);
    throw new Error('Failed to submit support request');
  }
});

// Get all support requests
const getSupportRequests = asyncHandler(async (req, res) => {
  try {
    const requests = await SupportRequest.find()
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(requests);
  } catch (error) {
    console.error('❌ Error fetching support requests:', error);
    res.status(500);
    throw new Error('Failed to fetch support requests');
  }
});

// Get single support request
const getSupportRequest = asyncHandler(async (req, res) => {
  try {
    const request = await SupportRequest.findById(req.params.id);
    
    if (!request) {
      res.status(404);
      throw new Error('Support request not found');
    }

    res.json(request);
  } catch (error) {
    console.error('❌ Error fetching support request:', error);
    if (error.name === 'CastError') {
      res.status(404);
      throw new Error('Support request not found');
    }
    res.status(500);
    throw new Error('Failed to fetch support request');
  }
});

// Update support request
const updateSupportRequest = asyncHandler(async (req, res) => {
  try {
    const { status } = req.body;
    
    const request = await SupportRequest.findById(req.params.id);
    
    if (!request) {
      res.status(404);
      throw new Error('Support request not found');
    }

    if (status) request.status = status;
    request.updatedAt = Date.now();
    
    const updatedRequest = await request.save();
    
    res.json(updatedRequest);
  } catch (error) {
    console.error('❌ Error updating support request:', error);
    res.status(500);
    throw new Error('Failed to update support request');
  }
});

module.exports = {
  submitSupportRequest,
  getSupportRequests,
  getSupportRequest,
  updateSupportRequest,
};