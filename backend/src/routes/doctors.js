const express = require('express');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const controller = require('../controllers/doctorController');

const router = express.Router();

// Doctor-owned profile routes must precede the dynamic /:id route.
router.get('/me/profile', auth, roles('doctor'), controller.getOwnProfile);
router.put('/me/profile', auth, roles('doctor'), controller.updateOwnProfile);
router.post('/profile', auth, roles('doctor'), controller.createProfile);

// GET /api/doctors - public list
router.get('/', controller.getAll);

// GET /api/doctors/:id - get doctor
router.get('/:id', controller.getById);

// POST /api/doctors/verify/:id - admin only
router.post('/verify/:id', auth, roles('admin'), controller.verify);

module.exports = router;
