const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const Profile = require('../models/Profile');
const Store = require('../models/Store');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, fullName, role, bio, contact, address } = req.body;

    const existing = await Profile.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const userRole = role || 'customer';
    const roles = Array.isArray(userRole) ? userRole : [userRole];

    const hashedPassword = await bcrypt.hash(password, 10);

    const profile = new Profile({
      email: email.toLowerCase(),
      password: hashedPassword,
      fullName,
      role: roles,
      bio: bio || '',
      contact: contact || '',
      address: address || {},
    });

    // If retailer, auto-create store
    if (roles.includes('retailer')) {
      let slug = generateSlug(fullName);
      let counter = 1;
      while (await Store.findOne({ slug })) {
        slug = `${generateSlug(fullName)}-${counter}`;
        counter++;
      }

      const store = new Store({
        ownedBy: profile._id,
        storeName: `${fullName}'s Store`,
        slug,
        contactEmail: email.toLowerCase(),
        contactPhone: contact || '',
      });

      await store.save();
      profile.store = store._id;
    }

    await profile.save();

    const token = generateToken(profile);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: profile._id,
        email: profile.email,
        fullName: profile.fullName,
        role: profile.role,
        store: profile.store,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const profile = await Profile.findOne({ email: email.toLowerCase() });
    if (!profile) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, profile.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(profile);

    res.status(200).json({
      token,
      user: {
        id: profile._id,
        email: profile.email,
        fullName: profile.fullName,
        role: profile.role,
        store: profile.store,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id)
      .select('-password')
      .populate('store');

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { fullName, bio, contact, address } = req.body;

    const updated = await Profile.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          ...(fullName && { fullName }),
          ...(bio !== undefined && { bio }),
          ...(contact !== undefined && { contact }),
          ...(address && { address }),
        },
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updated) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.status(200).json({ message: 'Profile updated', profile: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.upgradeToRetailer = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    if (profile.role.includes('retailer')) {
      return res.status(400).json({ error: 'Already a retailer' });
    }

    profile.role.push('retailer');

    let slug = generateSlug(profile.fullName);
    let counter = 1;
    while (await Store.findOne({ slug })) {
      slug = `${generateSlug(profile.fullName)}-${counter}`;
      counter++;
    }

    const store = new Store({
      ownedBy: profile._id,
      storeName: `${profile.fullName}'s Store`,
      slug,
      contactEmail: profile.email,
      contactPhone: profile.contact || '',
    });

    await store.save();
    profile.store = store._id;
    await profile.save();

    const token = generateToken(profile);

    res.status(200).json({
      message: 'Upgraded to retailer successfully',
      token,
      store,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
