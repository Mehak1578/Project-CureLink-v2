const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient' },
  avatar: { type: String },
  phone: { type: String, default: '' },
  dateOfBirth: { type: String, default: '' },
  gender: { type: String, default: '' },
  address: { type: String, default: '' },
  bloodGroup: { type: String, default: '' },
  allergies: { type: String, default: '' },
  existingConditions: { type: String, default: '' },
  emergencyContactName: { type: String, default: '' },
  emergencyContactNumber: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  notificationPreferences: {
    appointmentReminders: { type: Boolean, default: true },
    appointmentUpdates: { type: Boolean, default: true },
    reportUpdates: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true },
  },
  healthcarePreferences: {
    consultationType: { type: String, enum: ['', 'in-person', 'video'], default: '' },
    language: { type: String, default: '' },
    communicationMethod: { type: String, enum: ['', 'email', 'sms'], default: '' },
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'changes_requested'],
    default: function defaultVerificationStatus() {
      return this.role === 'doctor' ? 'pending' : 'verified';
    },
  },
  verified: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
