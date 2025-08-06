const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  addCommunication,
  addDeal,
  getAnalytics
} = require('../controllers/customerController');

// All routes require authentication
router.use(authMiddleware);

// Analytics route (must be before /:id)
router.get('/analytics', getAnalytics);

// CRUD routes
router.route('/')
  .get(getCustomers)
  .post(createCustomer);

router.route('/:id')
  .get(getCustomer)
  .put(updateCustomer)
  .delete(deleteCustomer);

// Sub-resource routes
router.post('/:id/communication', addCommunication);
router.post('/:id/deals', addDeal);

module.exports = router;