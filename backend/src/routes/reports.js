const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('../utils/cloudinary');
const Report = require('../models/Report');
const Activity = require('../models/Activity');
const auth = require('../middleware/auth');

const router = express.Router();

// Create uploads directory for local fallback
const uploadsDir = path.join(__dirname, '../../uploads/reports');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Use memory storage for Cloudinary upload (with local fallback)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(file.originalname.toLowerCase().split('.').pop());
    const mimetype = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF and image files (JPG, PNG) are allowed'));
    }
  }
});

// POST /api/reports/upload - multipart/form-data file field 'report'
router.post('/upload', auth, upload.single('report'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file provided' });
    }

    let fileUrl;
    let uploadMethod = 'cloudinary';

    // Try Cloudinary first, fallback to local storage
    try {
      // Upload to Cloudinary using stream
      const streamifier = require('streamifier');
      
      // Determine resource type based on file type
      const resourceType = req.file.mimetype === 'application/pdf' ? 'raw' : 'image';
      
      const uploadPromise = new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { 
            folder: 'curelink/reports',
            resource_type: resourceType, // 'raw' for PDFs, 'image' for images
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
        
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });

      const cloudinaryResult = await uploadPromise;
      fileUrl = cloudinaryResult.secure_url;
      console.log('✅ File uploaded to Cloudinary:', fileUrl);
    } catch (cloudinaryError) {
      // Cloudinary failed, use local storage as fallback
      console.warn('⚠️ Cloudinary upload failed, using local storage:', cloudinaryError.message);
      uploadMethod = 'local';
      
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const fileName = uniqueSuffix + path.extname(req.file.originalname);
      const filePath = path.join(uploadsDir, fileName);
      
      // Save file to local disk
      fs.writeFileSync(filePath, req.file.buffer);
      fileUrl = `/uploads/reports/${fileName}`;
      console.log('✅ File saved locally:', fileUrl);
    }

    // Handle patient ID for doctors vs patients
    const patientId = (req.body.patientId && req.user.role === 'doctor') ? req.body.patientId : req.user.id;
    
    // Create report document with proper fields
    const report = new Report({ 
      patient: patientId, 
      caseId: req.body.caseId || null,
      fileName: req.file.originalname,
      filename: req.file.originalname, // backward compatibility
      url: fileUrl, // Cloudinary URL or local path
      fileType: req.file.mimetype,
      contentType: req.file.mimetype, // backward compatibility
      size: req.file.size,
      uploadedAt: new Date()
    });
    
    await report.save();

    // Track activity if associated with a Care Case
    if (report.caseId) {
      await Activity.create({
        caseId: report.caseId,
        user: req.user.id,
        userRole: req.user.role,
        userName: req.user.name,
        action: "DOCUMENT_UPLOADED",
        description: `${req.user.role === 'doctor' ? 'Dr. ' : ''}${req.user.name} uploaded ${report.fileName}`
      });
    }

    // Return formatted response
    res.json({
      _id: report._id,
      url: report.url,
      fileName: report.fileName,
      fileType: report.fileType,
      size: report.size,
      uploadedAt: report.uploadedAt,
      analysis: report.analysis,
      createdAt: report.createdAt,
      uploadMethod: uploadMethod // For debugging
    });
  } catch (err) {
    console.error('❌ Upload error:', err);
    
    res.status(500).json({ 
      msg: 'Failed to upload report. Please try again.',
      error: err.message 
    });
  }
});

// GET /api/reports/my - list user's reports
router.get('/my', auth, async (req, res) => {
  try {
    const reports = await Report.find({ patient: req.user.id }).sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    console.error('Get reports error:', err);
    res.status(500).json({ msg: 'Failed to fetch reports', error: err.message });
  }
});

// GET /api/reports/:id - get single report details
router.get('/:id', auth, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ msg: 'Report not found' });
    }
    
    // Verify ownership
    if (report.patient.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    
    res.json(report);
  } catch (err) {
    console.error('Get report error:', err);
    res.status(500).json({ msg: 'Failed to fetch report', error: err.message });
  }
});

module.exports = router;
