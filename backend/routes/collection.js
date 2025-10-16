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
router.post('/scan', protect, scanBinCollection);
router.post('/manual', protect, manualBinCollection);
router.post('/report-issue', protect, reportCollectionIssue);
router.get('/history', protect, getCollectionHistory);

module.exports = router;
