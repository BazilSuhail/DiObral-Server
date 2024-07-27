const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String, default: '' },
    bio: { type: String, default: '' },
    cartState: { type: Object, default: {} },
    orders: { type: [Object], default: [] },
    address: {
        city: { type: String, default: '' },
        street: { type: String, default: '' },
        country: { type: String, default: '' }
    },
    contact: { type: String, default: '' }
});

module.exports = mongoose.model('Profile', ProfileSchema);
