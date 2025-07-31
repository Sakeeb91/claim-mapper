import express from 'express';
const router = express.Router();

// Placeholder route - TODO: Implement evidence endpoints
router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Evidence endpoints - TODO' });
});

export default router;