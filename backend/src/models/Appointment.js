const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  reason: { type: String },
  status: { type: String, enum: ['requested','confirmed','waiting','in_consultation','cancelled','completed'], default: 'requested' },
  consultationMode: { type: String, enum: ['', 'online', 'in-person'], default: '' },
  consultationNotes: { type: String, default: '' },
  diagnosis: { type: String, default: '' },
  treatmentPlan: { type: String, default: '' },
  followUpDate: { type: Date },
  followUpInstructions: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Appointment', AppointmentSchema);
