const mongoose = require('mongoose');

const RatingSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  score: { type: Number },
  comment: { type: String }
}, { timestamps: true });

const DoctorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  specialization: { type: String },
  experience: { type: Number },
  fees: { type: Number },
  availableSlots: [{ date: Date }],
  verified: { type: Boolean, default: false },
  ratings: [RatingSchema],
  bio: { type: String }
  ,qualification: { type: String, default: '' }
  ,registrationNumber: { type: String, default: '' }
  ,languages: [{ type: String }]
  ,clinic: { type: String, default: '' }
  ,consultationMode: { type: String, enum: ['', 'online', 'in-person', 'both'], default: '' }
  ,workingHours: {
    days: [{ type: String }],
    start: { type: String, default: '' },
    end: { type: String, default: '' },
    breakStart: { type: String, default: '' },
    breakEnd: { type: String, default: '' },
    duration: { type: Number, default: 30 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Doctor', DoctorSchema);
