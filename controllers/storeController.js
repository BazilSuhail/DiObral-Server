const Store = require('../models/Store');
const Profile = require('../models/Profile');

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

exports.getStore = async (req, res) => {
  try {
    const store = await Store.findOne({ ownedBy: req.user.id }).populate('ownedBy', 'fullName email');

    if (!store) {
      return res.status(404).json({ error: 'Store not found. Register as a retailer first.' });
    }

    res.status(200).json(store);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createOrUpdateStore = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id);
    if (!profile || !profile.role.includes('retailer')) {
      return res.status(403).json({ error: 'Only retailers can create a store' });
    }

    const {
      storeName,
      description,
      contactEmail,
      contactPhone,
      address,
      returnPolicy,
      shippingInfo,
      socialLinks,
    } = req.body;

    if (!storeName || storeName.trim().length < 2) {
      return res.status(400).json({ error: 'Store name must be at least 2 characters' });
    }
    if (!contactEmail) {
      return res.status(400).json({ error: 'Contact email is required' });
    }
    if (!contactPhone) {
      return res.status(400).json({ error: 'Contact phone is required' });
    }

    let store = await Store.findOne({ ownedBy: req.user.id });

    const updateData = {
      storeName: storeName.trim(),
      description: description || '',
      contactEmail,
      contactPhone,
      address: address || {},
      returnPolicy: returnPolicy || '',
      shippingInfo: shippingInfo || '',
      socialLinks: socialLinks || {},
    };

    if (store) {
      store = await Store.findByIdAndUpdate(store._id, { $set: updateData }, { new: true, runValidators: true });
      return res.status(200).json({ message: 'Store updated', store });
    }

    let slug = generateSlug(storeName);
    let counter = 1;
    while (await Store.findOne({ slug, _id: { $ne: store?._id } })) {
      slug = `${generateSlug(storeName)}-${counter}`;
      counter++;
    }
    updateData.slug = slug;
    updateData.ownedBy = req.user.id;

    store = new Store(updateData);
    await store.save();

    profile.store = store._id;
    await profile.save();

    res.status(201).json({ message: 'Store created', store });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateStore = async (req, res) => {
  try {
    const profile = await Profile.findById(req.user.id);
    if (!profile || !profile.role.includes('retailer')) {
      return res.status(403).json({ error: 'Only retailers can update a store' });
    }

    const existing = await Store.findOne({ ownedBy: req.user.id });
    if (!existing) {
      return res.status(404).json({ error: 'Store not found. Create one first.' });
    }

    const {
      storeName,
      description,
      contactEmail,
      contactPhone,
      address,
      returnPolicy,
      shippingInfo,
      socialLinks,
    } = req.body;

    if (storeName !== undefined && storeName.trim().length < 2) {
      return res.status(400).json({ error: 'Store name must be at least 2 characters' });
    }

    const updateData = {};
    if (storeName !== undefined) updateData.storeName = storeName.trim();
    if (description !== undefined) updateData.description = description;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    if (address !== undefined) updateData.address = address;
    if (returnPolicy !== undefined) updateData.returnPolicy = returnPolicy;
    if (shippingInfo !== undefined) updateData.shippingInfo = shippingInfo;
    if (socialLinks !== undefined) updateData.socialLinks = socialLinks;

    if (storeName !== undefined) {
      let slug = generateSlug(storeName);
      let counter = 1;
      while (await Store.findOne({ slug, _id: { $ne: existing._id } })) {
        slug = `${generateSlug(storeName)}-${counter}`;
        counter++;
      }
      updateData.slug = slug;
    }

    const store = await Store.findByIdAndUpdate(existing._id, { $set: updateData }, { new: true, runValidators: true });

    res.status(200).json({ message: 'Store updated', store });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
