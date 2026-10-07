const express = require('express');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const controller = require('../controllers/appointmentController');

const router = express.Router();

// POST /api/appointments/ - create appointment (protected)
router.post('/', auth, controller.create);

// GET /api/appointments/available - get unbooked time slots for a doctor/date
router.get('/available', auth, controller.getAvailableSlots);

// GET /api/appointments/my - get user's appointments
router.get('/my', auth, controller.getMy);

// PATCH /api/appointments/doctor/:id/status - update an appointment assigned to the doctor
router.patch('/doctor/:id/status', auth, roles('doctor'), controller.updateDoctorStatus);

// PUT /api/appointments/reschedule/:id - reschedule
router.put('/reschedule/:id', auth, controller.reschedule);

// POST /api/appointments/cancel/:id - cancel
router.post('/cancel/:id', auth, controller.cancel);

// PATCH /api/appointments/payment/:id - update payment status
router.patch('/payment/:id', auth, controller.updatePayment);

module.exports = router;
