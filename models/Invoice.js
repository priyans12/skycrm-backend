const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Item description is required'],
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.01, 'Quantity must be greater than 0']
  },
  rate: {
    type: Number,
    required: [true, 'Rate is required'],
    min: [0, 'Rate cannot be negative']
  },
  amount: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative'],
    max: [100, 'Tax cannot exceed 100%']
  }
});

const invoiceSchema = new mongoose.Schema({
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  invoiceNumber: {
    type: String,
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer is required']
  },
  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Viewed', 'Paid', 'Overdue', 'Cancelled'],
    default: 'Draft'
  },
  issueDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  items: [invoiceItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative']
  },
  taxRate: {
    type: Number,
    default: 0,
    min: [0, 'Tax rate cannot be negative'],
    max: [100, 'Tax rate cannot exceed 100%']
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: [0, 'Tax amount cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  total: {
    type: Number,
    required: true,
    min: [0, 'Total cannot be negative']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  terms: {
    type: String,
    maxlength: [500, 'Terms cannot exceed 500 characters']
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Check', 'Credit Card', 'Bank Transfer', 'PayPal', 'Other']
  },
  paymentDate: Date,
  paymentReference: String,
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  sentAt: Date,
  viewedAt: Date,
  remindersSent: [{
    sentAt: { type: Date, default: Date.now },
    method: { type: String, enum: ['Email', 'SMS'] }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
invoiceSchema.index({ tenant: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ tenant: 1, customer: 1 });
invoiceSchema.index({ tenant: 1, status: 1 });
invoiceSchema.index({ tenant: 1, dueDate: 1 });

// Generate invoice number
invoiceSchema.statics.generateInvoiceNumber = async function(tenantId) {
  const count = await this.countDocuments({ tenant: tenantId });
  const year = new Date().getFullYear();
  const number = String(count + 1).padStart(5, '0');
  return `INV-${year}-${number}`;
};

// Calculate totals before saving
invoiceSchema.pre('save', function(next) {
  // Calculate subtotal
  this.subtotal = this.items.reduce((sum, item) => {
    item.amount = item.quantity * item.rate;
    return sum + item.amount;
  }, 0);
  
  // Calculate tax
  this.taxAmount = (this.subtotal * this.taxRate) / 100;
  
  // Calculate total
  this.total = this.subtotal + this.taxAmount - this.discount;
  
  // Update status based on dates
  if (this.status !== 'Paid' && this.status !== 'Cancelled') {
    if (new Date() > this.dueDate) {
      this.status = 'Overdue';
    }
  }
  
  next();
});

// Check overdue invoices
invoiceSchema.statics.checkOverdue = async function() {
  const now = new Date();
  await this.updateMany(
    {
      status: { $in: ['Sent', 'Viewed'] },
      dueDate: { $lt: now }
    },
    { status: 'Overdue' }
  );
};

module.exports = mongoose.model('Invoice', invoiceSchema);