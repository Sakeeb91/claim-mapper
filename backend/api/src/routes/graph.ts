import express from 'express';
const router = express.Router();

// GET /api/graph - Get graph data
router.get('/', async (req, res) => {
  try {
    // TODO: Generate graph data from claims and relationships
    const graphData = {
      nodes: [],
      links: []
    };
    
    res.json({
      success: true,
      data: graphData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve graph data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;