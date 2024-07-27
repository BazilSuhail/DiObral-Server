const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Profile = require('../models/profile');

// Register a new user
exports.register = async (req, res) => {
    const { email, password, fullName, bio, address, contact } = req.body;

    try {
        const existingUser = await Profile.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new Profile({
            email,
            password: hashedPassword,
            fullName,
            bio,
            address,
            contact
        });
        await newUser.save();
        res.status(201).json({ message: 'User created successfully!' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Login user
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if the user exists
        const user = await Profile.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        // Check if the password matches
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        // Create and send a token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        console.error('Login error:', error);  // Log the error for debugging
        res.status(500).json({ error: 'Server error' });
    }
};

// Get user profile
exports.getProfile = async (req, res) => {
    try {
        const user = await Profile.findById(req.user.id);
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// Update profile
exports.updateProfile = async (req, res) => {
    const { email, fullName, bio, address, contact } = req.body;
    const userId = req.user.id;

    try {
        const updatedProfile = await Profile.findByIdAndUpdate(
            userId,
            {
                $set: {
                    email,
                    fullName,
                    bio,
                    address,
                    contact
                }
            },
            { new: true }
        );

        if (!updatedProfile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        res.json({ message: 'Profile updated successfully', profile: updatedProfile });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};