import express from 'express';
const router = express.Router();

// Placeholder route - TODO: Implement reasoning endpoints
router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Reasoning endpoints - TODO' });
});

export default router;