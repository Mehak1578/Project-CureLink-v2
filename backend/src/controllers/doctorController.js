const Doctor = require('../models/Doctor');
const User = require('../models/User');
const { populateDoctorAvailableSlots } = require('../utils/slotHelper');

exports.createProfile = async (req, res) => {
  try{
    const { specialization, experience, fees, bio } = req.body;
    // ensure user exists
    const user = req.user;
    let doc = await Doctor.findOne({ user: user.id });
    if(doc) return res.status(400).json({ msg: 'Profile already exists' });
    doc = new Doctor({ user: user.id, specialization, experience, fees, bio });
    await doc.save();
    res.json(doc);
  }catch(err){ console.error(err); res.status(500).json({ msg: 'Server error' }); }
}

exports.getOwnProfile = async (req, res) => {
  const profile = await Doctor.findOne({ user: req.user.id }).populate('user', 'name email avatar phone').lean();
  if (profile) {
    const populated = await populateDoctorAvailableSlots(profile);
    return res.json(populated);
  }
  res.json({
    user: { _id: req.user.id, name: req.user.name, email: req.user.email, avatar: req.user.avatar, phone: req.user.phone || '' },
    userId: req.user.id,
    specialization: '', experience: '', fees: '', bio: '', qualification: '', registrationNumber: '',
    languages: [], clinic: '', consultationMode: '', workingHours: { days: [], start: '', end: '', breakStart: '', breakEnd: '', duration: 30 },
    availableSlots: [], verified: false,
  });
};

exports.updateOwnProfile = async (req, res) => {
  const allowed = ['specialization', 'experience', 'fees', 'bio', 'qualification', 'registrationNumber', 'languages', 'clinic', 'consultationMode', 'workingHours'];
  const profile = await Doctor.findOne({ user: req.user.id }) || new Doctor({ user: req.user.id });
  allowed.forEach(field => { if (Object.prototype.hasOwnProperty.call(req.body, field)) profile[field] = req.body[field]; });
  await profile.save();
  if (Object.prototype.hasOwnProperty.call(req.body, 'name') || Object.prototype.hasOwnProperty.call(req.body, 'phone')) {
    const userUpdates = {};
    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) userUpdates.name = String(req.body.name || '').trim();
    if (Object.prototype.hasOwnProperty.call(req.body, 'phone')) userUpdates.phone = String(req.body.phone || '').trim();
    await User.findByIdAndUpdate(req.user.id, userUpdates);
  }
  const updatedDoc = await Doctor.findById(profile.id).populate('user', 'name email avatar phone').lean();
  const populated = await populateDoctorAvailableSlots(updatedDoc);
  res.json(populated);
};

exports.getAll = async (req, res) => {
  try {
    const { search = '', specialization = '', minExperience, maxExperience, minFee, maxFee, availability = '', sort = 'availability' } = req.query;

    // Step 1: Find all users with role 'doctor' that are verified in User model
    const verifiedUsers = await User.find({
      role: 'doctor',
      $or: [{ verified: true }, { verificationStatus: 'verified' }]
    }).lean();

    const verifiedUserIds = verifiedUsers.map((u) => u._id);

    // Step 2: Ensure all verified doctor users have a Doctor profile document
    const existingProfiles = await Doctor.find({ user: { $in: verifiedUserIds } }).lean();
    const profiledUserIds = new Set(existingProfiles.map((p) => String(p.user)));

    for (const u of verifiedUsers) {
      if (!profiledUserIds.has(String(u._id))) {
        const newDoc = new Doctor({
          user: u._id,
          specialization: 'General Medicine',
          experience: 0,
          fees: 500,
          verified: true,
          bio: `Dr. ${u.name.replace(/^(Dr\.\s*)+/i, '')} - Verified Practitioner.`,
        });
        await newDoc.save();
      }
    }

    if (verifiedUserIds.length > 0) {
      await Doctor.updateMany({ user: { $in: verifiedUserIds } }, { verified: true });
    }

    // Step 3: Query Doctor profiles where verified is true OR user is in verifiedUserIds
    const query = {
      $or: [
        { verified: true },
        { user: { $in: verifiedUserIds } }
      ]
    };

    if (specialization) query.specialization = specialization;
    if (minExperience || maxExperience) query.experience = {};
    if (minExperience) query.experience.$gte = Number(minExperience);
    if (maxExperience) query.experience.$lte = Number(maxExperience);
    if (minFee || maxFee) query.fees = {};
    if (minFee) query.fees.$gte = Number(minFee);
    if (maxFee) query.fees.$lte = Number(maxFee);

    let docs = await Doctor.find(query).populate('user', 'name email avatar verified verificationStatus').lean();

    // Step 4: Filter out any doctor where user is pending or rejected
    docs = docs.filter((doc) => {
      if (!doc.user) return false;
      const uStatus = doc.user.verificationStatus || (doc.user.verified ? 'verified' : 'pending');
      const isUserVerified = doc.user.verified === true || uStatus === 'verified';
      const isDocVerified = doc.verified === true;
      if (uStatus === 'pending' || uStatus === 'rejected') {
        if (!isUserVerified) return false;
      }
      return isUserVerified || isDocVerified;
    });

    // Step 5: Deduplicate by doctor _id
    const uniqueDocsMap = new Map();
    for (const doc of docs) {
      const key = String(doc._id);
      if (!uniqueDocsMap.has(key)) {
        uniqueDocsMap.set(key, doc);
      }
    }
    docs = Array.from(uniqueDocsMap.values());

    // Dynamically populate availableSlots for each doctor in parallel
    docs = await Promise.all(docs.map(async (doc) => {
      return await populateDoctorAvailableSlots(doc);
    }));

    if (availability === 'available') {
      docs = docs.filter(doc => (doc.availableSlots || []).some(slot => new Date(slot.date) >= new Date()));
    }

    const normalizedSearch = search.trim().toLowerCase();
    if (normalizedSearch) {
      docs = docs.filter(doc => `${doc.user?.name || ''} ${doc.specialization || ''} ${doc.bio || ''}`.toLowerCase().includes(normalizedSearch));
    }

    const rating = doc => {
      const ratings = doc.ratings || [];
      return ratings.length ? ratings.reduce((total, item) => total + Number(item.score || 0), 0) / ratings.length : 0;
    };

    docs.sort((left, right) => {
      if (sort === 'rating') return rating(right) - rating(left);
      if (sort === 'experience') return (right.experience || 0) - (left.experience || 0);
      if (sort === 'fee-low') return (left.fees || 0) - (right.fees || 0);
      if (sort === 'fee-high') return (right.fees || 0) - (left.fees || 0);
      const leftAvailable = (left.availableSlots || []).some(slot => new Date(slot.date) >= new Date());
      const rightAvailable = (right.availableSlots || []).some(slot => new Date(slot.date) >= new Date());
      return Number(rightAvailable) - Number(leftAvailable);
    });

    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getById = async (req, res) => {
  try{
    const doc = await Doctor.findById(req.params.id).populate('user','name email avatar verified verificationStatus').lean();
    if(!doc) return res.status(404).json({ msg: 'Doctor not found' });
    
    // If not verified, only allow admin or the doctor themselves to view
    const isOwnerOrAdmin = req.user && (req.user.role === 'admin' || String(doc.user?._id || doc.user) === String(req.user.id));
    if (!doc.verified && !isOwnerOrAdmin) {
      return res.status(404).json({ msg: 'Doctor not found' });
    }
    
    const populated = await populateDoctorAvailableSlots(doc);
    res.json(populated);
  }catch(err){ console.error(err); res.status(500).json({ msg: 'Server error' }); }
}

exports.verify = async (req, res) => {
  try{
    const doc = await Doctor.findById(req.params.id);
    if(!doc) return res.status(404).json({ msg: 'Doctor not found' });
    doc.verified = true;
    await doc.save();
    // also update linked user
    await User.findByIdAndUpdate(doc.user, { verified: true, verificationStatus: 'verified' });
    res.json({ msg: 'Doctor verified' });
  }catch(err){ console.error(err); res.status(500).json({ msg: 'Server error' }); }
}

