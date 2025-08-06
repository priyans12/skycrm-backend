const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getDashboardStats,
  getRevenueAnalytics,
  getGrowthMetrics
} = require('../controllers/dashboardController');

// All routes require authentication
router.use(authMiddleware);

// Dashboard routes
router.get('/stats', getDashboardStats);
router.get('/revenue', getRevenueAnalytics);
router.get('/growth', getGrowthMetrics);

module.exports = router;