const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  status: {
    type: String,
    enum: ['Todo', 'In Progress', 'Review', 'Completed', 'Cancelled'],
    default: 'Todo'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  type: {
    type: String,
    enum: ['Task', 'Bug', 'Feature', 'Meeting', 'Call', 'Email', 'Other'],
    default: 'Task'
  },
  dueDate: Date,
  startDate: Date,
  completedAt: Date,
  estimatedHours: {
    type: Number,
    min: [0, 'Estimated hours cannot be negative']
  },
  actualHours: {
    type: Number,
    min: [0, 'Actual hours cannot be negative']
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  watchers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  tags: [{
    type: String,
    trim: true
  }],
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  comments: [{
    text: {
      type: String,
      required: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  subtasks: [{
    title: String,
    completed: { type: Boolean, default: false },
    completedAt: Date
  }],
  dependencies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  blockedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  recurring: {
    enabled: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly']
    },
    nextDue: Date
  }
}, {
  timestamps: true
});

// Indexes
taskSchema.index({ tenant: 1, status: 1 });
taskSchema.index({ tenant: 1, assignedTo: 1 });
taskSchema.index({ tenant: 1, dueDate: 1 });
taskSchema.index({ tenant: 1, customer: 1 });

// Update status and completed date
taskSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'Completed' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== 'Completed') {
      this.completedAt = undefined;
    }
  }
  next();
});

// Virtual for progress percentage
taskSchema.virtual('progress').get(function() {
  if (this.subtasks && this.subtasks.length > 0) {
    const completed = this.subtasks.filter(st => st.completed).length;
    return Math.round((completed / this.subtasks.length) * 100);
  }
  return this.status === 'Completed' ? 100 : 0;
});

// Check overdue tasks
taskSchema.statics.checkOverdue = async function() {
  const now = new Date();
  const overdueTasks = await this.find({
    status: { $nin: ['Completed', 'Cancelled'] },
    dueDate: { $lt: now }
  });
  
  return overdueTasks;
};

// Get task statistics for a user
taskSchema.statics.getUserStats = async function(userId, tenantId) {
  return this.aggregate([
    {
      $match: {
        tenant: mongoose.Types.ObjectId(tenantId),
        assignedTo: mongoose.Types.ObjectId(userId)
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('Task', taskSchema);