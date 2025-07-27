const mongoose = require('mongoose');

const supportRequestSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true },
    email:   { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

// This ensures we don’t overwrite an existing model if hot-reloading
module.exports =
  mongoose.models.SupportRequest ||
  mongoose.model('SupportRequest', supportRequestSchema);
