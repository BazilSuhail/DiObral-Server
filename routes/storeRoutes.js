const express = require('express');
const router = express.Router();
const { getStore, createOrUpdateStore, updateStore } = require('../controllers/storeController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, getStore);
router.post('/', auth, createOrUpdateStore);
router.put('/', auth, updateStore);

module.exports = router;
