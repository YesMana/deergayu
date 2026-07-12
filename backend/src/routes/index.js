const express = require('express');
const healthRoutes = require('./health.routes');
const publicRoutes = require('./public.routes');
const adminRoutes = require('./admin.routes');
const vendorRoutes = require('./vendor.routes');
const userRoutes = require('./user.routes');

const router = express.Router();

router.use(healthRoutes);
router.use(publicRoutes);
router.use(adminRoutes);
router.use(vendorRoutes);
router.use(userRoutes);

module.exports = router;
