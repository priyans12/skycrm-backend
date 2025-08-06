const Customer = require('../models/Customer');
const asyncHandler = require('express-async-handler');

// @desc    Create new customer
// @route   POST /api/customers
// @access  Private
exports.createCustomer = asyncHandler(async (req, res) => {
  const customerData = {
    ...req.body,
    tenant: req.user.tenantId,
    createdBy: req.user.userId
  };

  const customer = await Customer.create(customerData);
  
  // Populate references
  await customer.populate('createdBy', 'name email');
  await customer.populate('assignedTo', 'name email');
  
  res.status(201).json({
    success: true,
    data: customer
  });
});

// @desc    Get all customers with filtering, sorting, and pagination
// @route   GET /api/customers
// @access  Private
exports.getCustomers = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    search, 
    status, 
    industry,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    assignedTo,
    tags
  } = req.query;
  
  // Build query
  const query = { tenant: req.user.tenantId };
  
  // Search functionality
  if (search) {
    query.$or = [
      { companyName: { $regex: search, $options: 'i' } },
      { contactName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }
  
  // Filters
  if (status) query.status = status;
  if (industry) query.industry = industry;
  if (assignedTo) query.assignedTo = assignedTo;
  if (tags) query.tags = { $in: tags.split(',') };
  
  // Execute query with pagination
  const customers = await Customer.find(query)
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 });
    
  // Get total count for pagination
  const total = await Customer.countDocuments(query);
  
  // Get aggregate stats
  const stats = await Customer.aggregate([
    { $match: { tenant: req.user.tenantId } },
    {
      $group: {
        _id: null,
        totalValue: { $sum: '$value' },
        avgValue: { $avg: '$value' },
        totalCustomers: { $sum: 1 }
      }
    }
  ]);
  
  res.json({
    success: true,
    data: customers,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: parseInt(limit)
    },
    stats: stats[0] || { totalValue: 0, avgValue: 0, totalCustomers: 0 }
  });
});

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
exports.getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({
    _id: req.params.id,
    tenant: req.user.tenantId
  })
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email')
    .populate('communication.createdBy', 'name email');
  
  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }
  
  res.json({
    success: true,
    data: customer
  });
});

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
exports.updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, tenant: req.user.tenantId },
    req.body,
    { new: true, runValidators: true }
  )
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name email');
  
  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }
  
  res.json({
    success: true,
    data: customer
  });
});

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private
exports.deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOneAndDelete({
    _id: req.params.id,
    tenant: req.user.tenantId
  });
  
  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }
  
  res.json({
    success: true,
    message: 'Customer deleted successfully'
  });
});

// @desc    Add communication log
// @route   POST /api/customers/:id/communication
// @access  Private
exports.addCommunication = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({
    _id: req.params.id,
    tenant: req.user.tenantId
  });
  
  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }
  
  customer.communication.push({
    ...req.body,
    createdBy: req.user.userId
  });
  
  await customer.save();
  
  res.json({
    success: true,
    data: customer
  });
});

// @desc    Add deal
// @route   POST /api/customers/:id/deals
// @access  Private
exports.addDeal = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({
    _id: req.params.id,
    tenant: req.user.tenantId
  });
  
  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }
  
  customer.deals.push(req.body);
  await customer.save();
  
  res.json({
    success: true,
    data: customer
  });
});

// @desc    Get customer analytics
// @route   GET /api/customers/analytics
// @access  Private
exports.getAnalytics = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  
  // Status distribution
  const statusCounts = await Customer.getStatusCounts(tenantId);
  
  // Top customers by value
  const topCustomers = await Customer.getTopCustomers(tenantId);
  
  // Industry distribution
  const industryDistribution = await Customer.aggregate([
    { $match: { tenant: mongoose.Types.ObjectId(tenantId) } },
    { $group: { _id: '$industry', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  // Monthly growth
  const monthlyGrowth = await Customer.aggregate([
    { $match: { tenant: mongoose.Types.ObjectId(tenantId) } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } },
    { $limit: 12 }
  ]);
  
  res.json({
    success: true,
    data: {
      statusCounts,
      topCustomers,
      industryDistribution,
      monthlyGrowth
    }
  });
});