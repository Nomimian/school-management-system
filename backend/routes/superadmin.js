const express = require('express');
const router  = express.Router();
const sa      = require('../controllers/superAdminController');

// Auth
router.post('/login', sa.login);

// All routes below require superadmin token
router.use(sa.protect);

// Stats & Revenue
router.get('/stats',   sa.getStats);

// Schools
router.get   ('/schools',                     sa.getSchools);
router.post  ('/schools',                     sa.createSchool);
router.get   ('/schools/:id',                 sa.getSchool);
router.put   ('/schools/:id',                 sa.updateSchool);
router.patch ('/schools/:id/toggle',          sa.toggleSchool);
router.delete('/schools/:id',                 sa.deleteSchool);
router.post  ('/schools/:id/reset-password',  sa.resetPassword);
router.post  ('/schools/:id/impersonate',     sa.impersonate);

// Plans
router.get ('/plans',                         sa.getPlans);
router.post('/schools/:schoolId/assign-plan', sa.assignPlan);

// Activity
router.get('/activity',       sa.getActivity);

// Announcements
router.get ('/announcements', sa.getAnnouncements);
router.post('/announcements', sa.sendAnnouncement);

// Platform settings
router.get('/settings', sa.getSettings);
router.put('/settings', sa.updateSettings);

module.exports = router;
