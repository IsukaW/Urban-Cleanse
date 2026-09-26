const express = require('express');
const {
  getCollectorRoute,
  scanBinCollection,
  manualBinCollection,
  reportCollectionIssue,
  getCollectionHistory
} = require('../controllers/collectionController');
const { protect, adminOrWorker } = require('../middleware/auth');

const router = express.Router();

// Worker routes - Allow all authenticated users to access collection routes
router.get('/collectors/:id/route', protect, getCollectorRoute);
router.post('/scan', protect, adminOrWorker, scanBinCollection);
router.post('/manual', protect, adminOrWorker, manualBinCollection);
router.post('/report-issue', protect, adminOrWorker, reportCollectionIssue);
router.get('/history', protect, getCollectionHistory);

module.exports = router;
