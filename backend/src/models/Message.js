const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true },
  read: { type: Boolean, default: false },
  senderRole: { type: String, enum: ['patient', 'doctor'], default: 'patient' },
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
