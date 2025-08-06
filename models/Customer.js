const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  tenant: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Tenant', 
    required: true,
    index: true 
  },
  companyName: { 
    type: String, 
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  contactName: {
    type: String,
    trim: true,
    maxlength: [100, 'Contact name cannot exceed 100 characters']
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\d\s+()-]+$/, 'Please enter a valid phone number']
  },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zip: { type: String, trim: true },
    country: { type: String, trim: true, default: 'USA' }
  },
  website: {
    type: String,
    trim: true,
    match: [/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/, 'Please enter a valid URL']
  },
  industry: {
    type: String,
    enum: ['Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing', 'Education', 'Other'],
    default: 'Other'
  },
  status: {
    type: String,
    enum: ['Lead', 'Prospect', 'Customer', 'Inactive'],
    default: 'Lead'
  },
  value: {
    type: Number,
    default: 0,
    min: [0, 'Value cannot be negative']
  },
  leadSource: {
    type: String,
    enum: ['Website', 'Referral', 'Social Media', 'Email Campaign', 'Cold Call', 'Trade Show', 'Other'],
    default: 'Website'
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  tags: [{
    type: String,
    trim: true
  }],
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  socialMedia: {
    linkedin: { type: String, trim: true },
    twitter: { type: String, trim: true },
    facebook: { type: String, trim: true }
  },
  communication: [{
    type: {
      type: String,
      enum: ['Email', 'Call', 'Meeting', 'Note'],
      required: true
    },
    subject: String,
    description: String,
    date: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  deals: [{
    title: String,
    value: Number,
    stage: {
      type: String,
      enum: ['Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
      default: 'Qualification'
    },
    probability: { type: Number, min: 0, max: 100, default: 10 },
    expectedCloseDate: Date,
    createdAt: { type: Date, default: Date.now }
  }],
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  assignedTo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  lastContactDate: Date,
  nextFollowUp: Date
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
customerSchema.index({ tenant: 1, email: 1 }, { unique: true });
customerSchema.index({ tenant: 1, companyName: 'text', contactName: 'text' });
customerSchema.index({ tenant: 1, status: 1 });
customerSchema.index({ tenant: 1, createdAt: -1 });

// Virtual for total deal value
customerSchema.virtual('totalDealValue').get(function() {
  return this.deals.reduce((total, deal) => total + (deal.value || 0), 0);
});

// Virtual for open deals count
customerSchema.virtual('openDealsCount').get(function() {
  return this.deals.filter(deal => !['Closed Won', 'Closed Lost'].includes(deal.stage)).length;
});

// Pre-save middleware
customerSchema.pre('save', function(next) {
  // Update lastContactDate if communication is added
  if (this.isModified('communication') && this.communication.length > 0) {
    this.lastContactDate = new Date();
  }
  next();
});

// Static methods
customerSchema.statics.getStatusCounts = async function(tenantId) {
  return this.aggregate([
    { $match: { tenant: mongoose.Types.ObjectId(tenantId) } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
};

customerSchema.statics.getTopCustomers = async function(tenantId, limit = 10) {
  return this.find({ tenant: tenantId })
    .sort({ value: -1 })
    .limit(limit)
    .select('companyName email value status');
};

module.exports = mongoose.model('Customer', customerSchema);