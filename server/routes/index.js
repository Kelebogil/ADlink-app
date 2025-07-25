const express = require('express');
const router = express.Router();

// Import individual route modules
const authRoutes = require('./auth');
const userRoutes = require('./users');
const adminRoutes = require('./admin');
const apiRoutes = require('./api');
const { router: activityRoutes } = require('./activity');

// Mount routes with their respective paths
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/activity', activityRoutes);
router.use('/', apiRoutes);

module.exports = router;
