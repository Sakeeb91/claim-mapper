import express from 'express';
const router = express.Router();

// Placeholder route - TODO: Implement search endpoints
router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Search endpoints - TODO' });
});

export default router;