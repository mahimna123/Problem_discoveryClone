const express = require('express');
const router = express.Router();
const { Idea, Frame } = require('../models/schemas');
const Brainstorm = require('../models/brainstorm');

router.get('/ideation', (req, res) => {
  res.render('brainstorm');
});

router.get('/api/ideas', async (req, res) => {
  try {
    const ideas = await Brainstorm.getIdeas();
    res.json(ideas);
  } catch (error) {
    console.error('Error fetching ideas:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/api/frames', async (req, res) => {
  try {
    const frames = await Brainstorm.getFrames();
    res.json(frames);
  } catch (error) {
    console.error('Error fetching frames:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/api/ideas', async (req, res) => {
  try {
    const { content, x, y } = req.body;
    const newIdea = await Brainstorm.addIdea(content, x, y);
    res.status(201).json({ id: newIdea._id, totalPoints: Brainstorm.totalPoints });
  } catch (error) {
    console.error('Error adding idea:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/api/frames', async (req, res) => {
  try {
    const { content, x, y } = req.body;
    const newFrame = await Brainstorm.addFrame(content, x, y);
    res.status(201).json({ id: newFrame._id, totalPoints: Brainstorm.totalPoints });
  } catch (error) {
    console.error('Error adding frame:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/api/ideas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { x, y } = req.body;
    await Brainstorm.updateIdeaPosition(id, x, y);
    res.status(200).json({ message: 'Position updated' });
  } catch (error) {
    console.error('Error updating idea position:', error.message, error.stack);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.put('/api/frames/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { x, y } = req.body;
    await Brainstorm.updateFramePosition(id, x, y);
    res.status(200).json({ message: 'Position updated' });
  } catch (error) {
    console.error('Error updating frame position:', error.message, error.stack);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.delete('/api/ideas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Brainstorm.deleteIdea(id);
    res.status(200).json({ totalPoints: Brainstorm.totalPoints });
  } catch (error) {
    console.error('Error deleting idea:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/api/frames/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Brainstorm.deleteFrame(id);
    res.status(200).json({ totalPoints: Brainstorm.totalPoints });
  } catch (error) {
    console.error('Error deleting frame:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;