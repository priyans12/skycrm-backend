const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const SupportRequest = require('../models/SupportRequest');
const Task = require('../models/Task');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

  // Get customer stats
  const totalCustomers = await Customer.countDocuments({ tenant: tenantId });
  const newCustomersThisMonth = await Customer.countDocuments({
    tenant: tenantId,
    createdAt: { $gte: startOfMonth }
  });
  const newCustomersLastMonth = await Customer.countDocuments({
    tenant: tenantId,
    createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
  });

  // Calculate growth rate
  const customerGrowthRate = newCustomersLastMonth > 0 
    ? ((newCustomersThisMonth - newCustomersLastMonth) / newCustomersLastMonth * 100).toFixed(1)
    : 100;

  // Get revenue stats
  const monthlyRevenue = await Invoice.aggregate([
    {
      $match: {
        tenant: mongoose.Types.ObjectId(tenantId),
        status: 'Paid',
        paymentDate: { $gte: startOfMonth }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$total' }
      }
    }
  ]);

  const lastMonthRevenue = await Invoice.aggregate([
    {
      $match: {
        tenant: mongoose.Types.ObjectId(tenantId),
        status: 'Paid',
        paymentDate: { $gte: startOfLastMonth, $lte: endOfLastMonth }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$total' }
      }
    }
  ]);

  const currentMonthRevenue = monthlyRevenue[0]?.total || 0;
  const previousMonthRevenue = lastMonthRevenue[0]?.total || 0;
  
  const revenueGrowthRate = previousMonthRevenue > 0
    ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue * 100).toFixed(1)
    : 100;

  // Get support ticket stats
  const activeTickets = await SupportRequest.countDocuments({
    tenant: tenantId,
    status: { $in: ['Open', 'In Progress'] }
  });

  // Get task stats
  const pendingTasks = await Task.countDocuments({
    tenant: tenantId,
    status: { $ne: 'Completed' }
  });

  // Get revenue trend for the last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const revenueData = await Invoice.aggregate([
    {
      $match: {
        tenant: mongoose.Types.ObjectId(tenantId),
        status: 'Paid',
        paymentDate: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$paymentDate' },
          month: { $month: '$paymentDate' }
        },
        revenue: { $sum: '$total' }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    },
    {
      $project: {
        month: {
          $dateToString: {
            format: '%b %Y',
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month'
              }
            }
          }
        },
        revenue: 1,
        _id: 0
      }
    }
  ]);

  // Get customer growth data
  const customerData = await Customer.aggregate([
    {
      $match: {
        tenant: mongoose.Types.ObjectId(tenantId),
        createdAt: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        customers: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    },
    {
      $project: {
        month: {
          $dateToString: {
            format: '%b %Y',
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month'
              }
            }
          }
        },
        revenue: 1,
        _id: 0
      }
    }
  ]);

  // Get customer growth data
  const customerData = await Customer.aggregate([
    {
      $match: {
        tenant: mongoose.Types.ObjectId(tenantId),
        createdAt: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        customers: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    },
    {
      $project: {
        month: {
          $dateToString: {
            format: '%b %Y',
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month'
              }
            }
          }
        },
        customers: 1,
        _id: 0
      }
    }
  ]);

  // Get top performing customers
  const topCustomers = await Customer.find({ tenant: tenantId })
    .sort({ value: -1 })
    .limit(5)
    .select('companyName value');

  // Get recent activities
  const recentActivities = await Promise.all([
    Customer.find({ tenant: tenantId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('companyName createdAt')
      .lean()
      .then(customers => customers.map(c => ({
        ...c,
        type: 'New Customer',
        description: `${c.companyName} added as new customer`
      }))),
    
    Invoice.find({ tenant: tenantId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('customer', 'companyName')
      .select('invoiceNumber total createdAt customer')
      .lean()
      .then(invoices => invoices.map(i => ({
        ...i,
        type: 'New Invoice',
        description: `Invoice ${i.invoiceNumber} created for ${i.customer?.companyName}`
      })))
  ]);

  // Flatten and sort activities
  const activities = recentActivities
    .flat()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 10);

  res.json({
    success: true,
    data: {
      stats: {
        totalCustomers,
        monthlyRevenue: currentMonthRevenue,
        activeTickets,
        pendingTasks,
        customerGrowthRate: parseFloat(customerGrowthRate),
        revenueGrowthRate: parseFloat(revenueGrowthRate)
      },
      charts: {
        revenueData,
        customerData
      },
      topCustomers,
      recentActivities: activities
    }
  });
});

// @desc    Get revenue analytics
// @route   GET /api/dashboard/revenue
// @access  Private
exports.getRevenueAnalytics = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const { period = 'monthly' } = req.query;
  
  const today = new Date();
  let startDate;
  
  switch (period) {
    case 'weekly':
      startDate = new Date(today.setDate(today.getDate() - 7 * 12)); // 12 weeks
      break;
    case 'monthly':
      startDate = new Date(today.setMonth(today.getMonth() - 12)); // 12 months
      break;
    case 'yearly':
      startDate = new Date(today.setFullYear(today.getFullYear() - 5)); // 5 years
      break;
    default:
      startDate = new Date(today.setMonth(today.getMonth() - 12));
  }

  // Revenue by status
  const revenueByStatus = await Invoice.aggregate([
    {
      $match: {
        tenant: mongoose.Types.ObjectId(tenantId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$status',
        total: { $sum: '$total' },
        count: { $sum: 1 }
      }
    }
  ]);

  // Revenue by customer
  const revenueByCustomer = await Invoice.aggregate([
    {
      $match: {
        tenant: mongoose.Types.ObjectId(tenantId),
        status: 'Paid',
        paymentDate: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$customer',
        total: { $sum: '$total' },
        count: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'customers',
        localField: '_id',
        foreignField: '_id',
        as: 'customerInfo'
      }
    },
    {
      $unwind: '$customerInfo'
    },
    {
      $project: {
        customerName: '$customerInfo.companyName',
        total: 1,
        count: 1
      }
    },
    {
      $sort: { total: -1 }
    },
    {
      $limit: 10
    }
  ]);

  // Outstanding invoices
  const outstandingInvoices = await Invoice.find({
    tenant: tenantId,
    status: { $in: ['Sent', 'Viewed', 'Overdue'] }
  })
    .populate('customer', 'companyName')
    .select('invoiceNumber customer total dueDate status')
    .sort({ dueDate: 1 })
    .limit(10);

  res.json({
    success: true,
    data: {
      revenueByStatus,
      revenueByCustomer,
      outstandingInvoices
    }
  });
});

// @desc    Get growth metrics
// @route   GET /api/dashboard/growth
// @access  Private
exports.getGrowthMetrics = asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const { metric = 'customers', period = '12' } = req.query;
  
  const monthsAgo = parseInt(period);
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsAgo);

  let Model, groupField;
  
  switch (metric) {
    case 'customers':
      Model = Customer;
      groupField = 'createdAt';
      break;
    case 'revenue':
      Model = Invoice;
      groupField = 'paymentDate';
      break;
    case 'tickets':
      Model = SupportRequest;
      groupField = 'createdAt';
      break;
    default:
      Model = Customer;
      groupField = 'createdAt';
  }

  const data = await Model.aggregate([
    {
      $match: {
        tenant: mongoose.Types.ObjectId(tenantId),
        [groupField]: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: `$${groupField}` },
          month: { $month: `$${groupField}` }
        },
        count: { $sum: 1 },
        ...(metric === 'revenue' && { total: { $sum: '$total' } })
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    },
    {
      $project: {
        date: {
          $dateToString: {
            format: '%Y-%m',
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month'
              }
            }
          }
        },
        count: 1,
        ...(metric === 'revenue' && { total: 1 }),
        _id: 0
      }
    }
  ]);

  // Calculate growth rate
  const growthRate = data.length >= 2
    ? ((data[data.length - 1].count - data[0].count) / data[0].count * 100).toFixed(1)
    : 0;

  res.json({
    success: true,
    data: {
      metric,
      period: monthsAgo,
      data,
      growthRate: parseFloat(growthRate)
    }
  });
});