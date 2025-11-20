const express = require('express');
const router = express.Router();
const { Idea, Frame, ProblemStatement, Connection, Solution } = require('../models/schemas');
const Brainstorm = require('../models/brainstorm');
const { isLoggedIn } = require('../middleware');
const Campground = require('../models/campgrounds');
const solutionsController = require('../controllers/solutions');
const { InferenceClient } = require("@huggingface/inference");

// Render ideation tool (protected)
router.get('/ideation', isLoggedIn, (req, res) => {
  console.log('=== HITTING BASE IDEATION ROUTE ===');
  console.log('1. Request path:', req.path);
  console.log('2. Request method:', req.method);
  console.log('3. User details:', {
    id: req.user._id,
    username: req.user.username
  });
  
  // Redirect to dashboard if no problemId is provided
  req.flash('error', 'Please select a problem to start ideating');
  res.redirect('/dashboard');
});

// View user's ideas and frames - This needs to come BEFORE the /:problemId route
router.get('/ideation/my-brainstorms', isLoggedIn, async (req, res) => {
  console.log('=== HITTING MY-BRAINSTORMS ROUTE ===');
  console.log('1. Request path:', req.path);
  console.log('2. Request method:', req.method);
  console.log('3. Query params:', req.query);
  const { problemId: requestedProblemId } = req.query;
  console.log('4. Requested problemId:', requestedProblemId);
  
  console.log('1. Request details:', {
    path: req.path,
    method: req.method,
    requestedProblemId: requestedProblemId,
    user: req.user ? {
      id: req.user._id,
      username: req.user.username,
      isAuthenticated: req.isAuthenticated()
    } : 'No user found'
  });

  console.log('2. Attempting to fetch problem statements...');
  
  // If a specific problemId is requested, filter by it
  let problemStatementsQuery = { user: req.user._id };
  if (requestedProblemId) {
    problemStatementsQuery.problemId = requestedProblemId;
  }
  
  const problemStatements = await ProblemStatement.find(problemStatementsQuery)
    .populate({
      path: 'problemId',
      select: 'title description _id'
    })
    .sort({ createdAt: -1 }); // Sort by newest first

  // Filter to only show unique problem statements (one per problem)
  const uniqueProblemStatements = problemStatements.reduce((acc, current) => {
    const exists = acc.find(item => item.problemId?._id.toString() === current.problemId?._id.toString());
    if (!exists) {
      acc.push(current);
    }
    return acc;
  }, []);

  console.log('Problem statements fetched:', {
    count: uniqueProblemStatements.length,
    firstStatement: uniqueProblemStatements[0] || 'No problem statements found'
  });

  // Group ideas and frames by problemId
  const brainstormsByProblem = {};
  
  // Initialize structure for each problem
  uniqueProblemStatements.forEach(statement => {
    if (statement.problemId && statement.problemId._id) {
      const problemId = statement.problemId._id.toString();
      brainstormsByProblem[problemId] = {
        problem: statement.problemId,
        problemStatement: statement,
        ideas: [],
        frames: [],
        connections: []
      };
    }
  });
  
  // If a specific problemId is requested, only include that problem
  if (requestedProblemId) {
    const requestedId = requestedProblemId.toString();
    if (!brainstormsByProblem[requestedId]) {
      // Problem not found in statements, try to get it from Campground
      const problem = await Campground.findById(requestedProblemId);
      if (problem) {
        brainstormsByProblem[requestedId] = {
          problem: problem,
          problemStatement: null,
          ideas: [],
          frames: [],
          connections: []
        };
      }
    }
  }

  console.log('3. Attempting to fetch ideas...');
  // Get ideas for the user, filtered by requested problemId if provided
  let ideasQuery = { user: req.user._id };
  if (requestedProblemId) {
    ideasQuery.problemId = requestedProblemId;
  } else {
    ideasQuery.problemId = { $exists: true, $ne: null };
  }
  
  const allIdeas = await Idea.find(ideasQuery).populate('problemId');
  
  // Group ideas by problemId
  allIdeas.forEach(idea => {
    if (idea.problemId && idea.problemId._id) {
      const problemId = idea.problemId._id.toString();
      if (brainstormsByProblem[problemId]) {
        brainstormsByProblem[problemId].ideas.push(idea);
      }
    }
  });
  
  console.log('Ideas fetched and grouped:', {
    total: allIdeas.length,
    byProblem: Object.keys(brainstormsByProblem).map(id => ({
      problemId: id,
      count: brainstormsByProblem[id].ideas.length
    }))
  });

  console.log('4. Attempting to fetch frames...');
  // Get frames for the user, filtered by requested problemId if provided
  let framesQuery = { user: req.user._id };
  if (requestedProblemId) {
    framesQuery.problemId = requestedProblemId;
  } else {
    framesQuery.problemId = { $exists: true, $ne: null };
  }
  
  const allFrames = await Frame.find(framesQuery).populate('problemId');
  
  // Group frames by problemId
  allFrames.forEach(frame => {
    if (frame.problemId && frame.problemId._id) {
      const problemId = frame.problemId._id.toString();
      if (brainstormsByProblem[problemId]) {
        brainstormsByProblem[problemId].frames.push(frame);
      }
    }
  });
  
  console.log('Frames fetched and grouped:', {
    total: allFrames.length,
    byProblem: Object.keys(brainstormsByProblem).map(id => ({
      problemId: id,
      count: brainstormsByProblem[id].frames.length
    }))
  });

  console.log('5. Attempting to fetch connections...');
  // Get connections for the user, filtered by requested problemId if provided
  let connectionsQuery = { user: req.user._id };
  if (requestedProblemId) {
    connectionsQuery.problemId = requestedProblemId;
  } else {
    connectionsQuery.problemId = { $exists: true, $ne: null };
  }
  
  const allConnections = await Connection.find(connectionsQuery).populate('problemId');
  
  // Group connections by problemId
  allConnections.forEach(conn => {
    if (conn.problemId && conn.problemId._id) {
      const problemId = conn.problemId._id.toString();
      if (brainstormsByProblem[problemId]) {
        brainstormsByProblem[problemId].connections.push(conn);
      }
    }
  });
  
  console.log('Connections fetched and grouped:', {
    total: allConnections.length,
    byProblem: Object.keys(brainstormsByProblem).map(id => ({
      problemId: id,
      count: brainstormsByProblem[id].connections.length
    }))
  });

  // Convert to array for easier rendering
  const brainstorms = Object.values(brainstormsByProblem);

  console.log('6. Rendering template with data...');
  res.render('myBrainstorms', { 
    brainstorms: brainstorms,
    problemStatements: uniqueProblemStatements, 
    currentUser: req.user 
  });
  console.log('=== END MY BRAINSTORMS ROUTE DEBUG ===');
});

// Render ideation tool with problem ID (protected) - This comes AFTER the specific route
router.get('/ideation/:problemId', isLoggedIn, async (req, res) => {
  console.log('=== HITTING PROBLEM-SPECIFIC IDEATION ROUTE ===');
  console.log('1. Request path:', req.path);
  console.log('2. Request method:', req.method);
  console.log('3. Problem ID from params:', req.params.problemId);
  
  try {
    const { problemId } = req.params;
    const problem = await Campground.findById(problemId);
    console.log('4. Problem found:', problem ? {
      id: problem._id,
      title: problem.title,
      description: problem.description
    } : 'No problem found');

    if (!problem) {
      req.flash('error', 'Problem statement not found');
      return res.redirect('/campgrounds');
    }

    // Always get the latest problem statement
    let problemStatement = await ProblemStatement.findOne({ 
      user: req.user._id,
      problemId: problem._id 
    }).sort({ createdAt: -1 }); // Get the most recent one

    console.log('5. Existing problem statement:', problemStatement ? {
      id: problemStatement._id,
      content: problemStatement.content,
      problemId: problemStatement.problemId
    } : 'No problem statement found');

    // If no problem statement exists, create one
    if (!problemStatement) {
      console.log('6. Creating new problem statement');
      problemStatement = await Brainstorm.addProblemStatement(problem.description, req.user, problem._id);
      console.log('7. New problem statement created:', {
        id: problemStatement._id,
        content: problemStatement.content,
        problemId: problemStatement.problemId
      });
    }

    const renderData = { 
      currentUser: req.user,
      problem: problem,
      problemStatement: problemStatement
    };

    console.log('8. Final data being passed to view:', {
      currentUser: renderData.currentUser ? {
        id: renderData.currentUser._id,
        username: renderData.currentUser.username
      } : 'No user',
      problem: renderData.problem ? {
        id: renderData.problem._id,
        title: renderData.problem.title
      } : 'No problem',
      problemStatement: renderData.problemStatement ? {
        id: renderData.problemStatement._id,
        content: renderData.problemStatement.content
      } : 'No problem statement'
    });

    res.render('brainstorm', renderData);
  } catch (error) {
    console.error('=== ERROR IN PROBLEM-SPECIFIC IDEATION ROUTE ===');
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    req.flash('error', 'Failed to load ideation tool');
    res.redirect('/campgrounds');
  }
});

// Get all ideas for the logged-in user and specific problem
router.get('/api/ideas', isLoggedIn, async (req, res) => {
  try {
    const { problemId } = req.query;
    if (!problemId) {
      return res.status(400).json({ error: 'Problem ID is required' });
    }
    console.log('Fetching ideas for problemId:', problemId, 'type:', typeof problemId);
    const ideas = await Brainstorm.getIdeas(req.user._id, problemId);
    console.log('Fetched ideas for user:', { 
      userId: req.user._id, 
      problemId: problemId, 
      count: ideas.length,
      ideaProblemIds: ideas.map(i => i.problemId?.toString())
    });
    res.json(ideas);
  } catch (error) {
    console.error('Error fetching ideas:', error.message, error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all frames for the logged-in user and specific problem
router.get('/api/frames', isLoggedIn, async (req, res) => {
  try {
    const { problemId } = req.query;
    if (!problemId) {
      return res.status(400).json({ error: 'Problem ID is required' });
    }
    console.log('Fetching frames for problemId:', problemId, 'type:', typeof problemId);
    const frames = await Brainstorm.getFrames(req.user._id, problemId);
    console.log('Fetched frames for user:', { 
      userId: req.user._id, 
      problemId: problemId, 
      count: frames.length,
      frameProblemIds: frames.map(f => f.problemId?.toString())
    });
    res.json(frames);
  } catch (error) {
    console.error('Error fetching frames:', error.message, error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all connections for the logged-in user and specific problem
router.get('/api/connections', isLoggedIn, async (req, res) => {
  try {
    const { problemId } = req.query;
    if (!problemId) {
      return res.status(400).json({ error: 'Problem ID is required' });
    }
    const connections = await Brainstorm.getConnections(req.user._id, problemId);
    console.log('Fetched connections for user:', { id: req.user._id, problemId, connections });
    res.json(connections);
  } catch (error) {
    console.error('Error fetching connections:', error.message, error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new idea
router.post('/api/ideas', isLoggedIn, async (req, res) => {
  try {
    console.log('Creating idea for user:', { id: req.user._id, username: req.user.username });
    const { content, x, y, problemId } = req.body;
    if (!problemId) {
      return res.status(400).json({ error: 'Problem ID is required' });
    }
    const newIdea = await Brainstorm.addIdea(content, x, y, req.user, problemId);
    console.log('Added idea:', { id: req.user._id, problemId, idea: newIdea });
    res.status(201).json({
      id: newIdea._id,
      totalPoints: await Brainstorm.totalPoints(req.user._id, problemId),
    });
  } catch (error) {
    console.error('Error adding idea:', error.message, error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new frame
router.post('/api/frames', isLoggedIn, async (req, res) => {
  try {
    console.log('Creating frame for user:', { id: req.user._id, username: req.user.username });
    const { content, x, y, problemId } = req.body;
    if (!problemId) {
      return res.status(400).json({ error: 'Problem ID is required' });
    }
    const newFrame = await Brainstorm.addFrame(content, x, y, req.user, problemId);
    console.log('Added frame:', { id: req.user._id, problemId, frame: newFrame });
    res.status(201).json({
      id: newFrame._id,
      totalPoints: await Brainstorm.totalPoints(req.user._id, problemId),
    });
  } catch (error) {
    console.error('Error adding frame:', error.message, error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update idea position
router.put('/api/ideas/:id', isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    const { x, y } = req.body;
    await Brainstorm.updateIdeaPosition(id, x, y, req.user._id);
    res.status(200).json({ message: 'Position updated' });
  } catch (error) {
    console.error('Error updating idea position:', error.message, error.stack);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Update frame position
router.put('/api/frames/:id', isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    const { x, y } = req.body;
    await Brainstorm.updateFramePosition(id, x, y, req.user._id);
    res.status(200).json({ message: 'Position updated' });
  } catch (error) {
    console.error('Error updating frame position:', error.message, error.stack);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Delete an idea
router.delete('/api/ideas/:id', isLoggedIn, async (req, res) => {
    try {
        const { id } = req.params;
        await Brainstorm.deleteIdea(id, req.user._id);
        res.status(200).json({ message: 'Idea deleted successfully' });
    } catch (error) {
        console.error('Error deleting idea:', error);
        res.status(500).json({ error: 'Failed to delete idea' });
    }
});

// Delete a frame
router.delete('/api/frames/:id', isLoggedIn, async (req, res) => {
    try {
        const { id } = req.params;
        await Brainstorm.deleteFrame(id, req.user._id);
        res.status(200).json({ message: 'Frame deleted successfully' });
    } catch (error) {
        console.error('Error deleting frame:', error);
        res.status(500).json({ error: 'Failed to delete frame' });
    }
});

// Save all board data
router.post('/api/save', isLoggedIn, async (req, res) => {
  try {
    console.log('=== SAVE ROUTE DEBUG ===');
    console.log('User authenticated:', req.isAuthenticated());
    console.log('User object:', req.user);
    console.log('Session ID:', req.sessionID);
    console.log('Saving data for user:', { id: req.user._id, username: req.user.username });
    console.log('Received data:', req.body);
    const { ideas = [], frames = [], problemStatement = {}, connections = [], username } = req.body;
    
    console.log('=== DETAILED DEBUG INFO ===');
    console.log('Ideas count:', ideas.length);
    console.log('Frames count:', frames.length);
    console.log('Problem statement:', problemStatement);
    console.log('Problem statement problemId:', problemStatement.problemId);
    console.log('Problem statement type:', typeof problemStatement.problemId);

    // Validate inputs
    if (!Array.isArray(ideas)) {
      console.error('Validation error: Ideas is not an array', { ideas });
      return res.status(400).json({ error: 'Ideas must be an array' });
    }
    if (!Array.isArray(frames)) {
      console.error('Validation error: Frames is not an array', { frames });
      return res.status(400).json({ error: 'Frames must be an array' });
    }
    if (!Array.isArray(connections)) {
      console.error('Validation error: Connections is not an array', { connections });
      return res.status(400).json({ error: 'Connections must be an array' });
    }
    if (typeof problemStatement !== 'object' || problemStatement === null) {
      console.error('Validation error: Problem statement is not an object', { problemStatement });
      return res.status(400).json({ error: 'Problem statement must be an object' });
    }
    if (username && username !== req.user.username) {
      console.warn('Client username mismatch:', { client: username, server: req.user.username });
    }

    // Validate that problemId is available
    if (!problemStatement.problemId) {
      console.error('Validation error: Problem ID is missing from problem statement', { problemStatement });
      return res.status(400).json({ error: 'Problem ID is required to save ideas and frames' });
    }

    const problemId = problemStatement.problemId;
    console.log('Problem ID for this save session:', problemId);
    console.log('User ID:', req.user._id);

    // Save/update ideas - update if ID exists, create new if not
    const savedIdeas = [];
    for (const idea of ideas) {
      console.log('Attempting to save/update idea:', { id: idea.id, content: idea.content, x: idea.x, y: idea.y, user: req.user._id });
      try {
        let savedIdea;
        // Check if idea with this ID already exists
        if (idea.id && idea.id !== 'undefined' && idea.id.startsWith('idea-')) {
          // Extract MongoDB ID if it's a full ID, or use as-is
          const ideaId = idea.id.replace('idea-', '');
          try {
            // Try to find and update existing idea
            savedIdea = await Idea.findOneAndUpdate(
              { _id: ideaId, user: req.user._id, problemId: problemId },
              { 
                content: idea.content || '',
                x: idea.x || 0,
                y: idea.y || 0
              },
              { new: true, upsert: false }
            );
            if (savedIdea) {
              console.log('Updated existing idea:', { _id: savedIdea._id });
            }
          } catch (updateErr) {
            // If update fails (ID doesn't exist), create new
            console.log('Idea not found for update, creating new one');
            savedIdea = null;
          }
        }
        
        // If no existing idea found, create new one
        if (!savedIdea) {
          savedIdea = await Brainstorm.addIdea(
            idea.content || '',
            idea.x || 0,
            idea.y || 0,
            req.user,
            problemId
          );
          console.log('Created new idea:', { _id: savedIdea._id });
        }
        
        savedIdeas.push(savedIdea);
      } catch (err) {
        console.error('Failed to save idea:', { content: idea.content, error: err.message, stack: err.stack });
        throw err;
      }
    }

    // Save/update frames - update if ID exists, create new if not
    const savedFrames = [];
    for (const frame of frames) {
      console.log('Attempting to save/update frame:', { id: frame.id, content: frame.content, x: frame.x, y: frame.y, user: req.user._id });
      try {
        let savedFrame;
        // Check if frame with this ID already exists
        if (frame.id && frame.id !== 'undefined' && frame.id.startsWith('frame-')) {
          // Extract MongoDB ID if it's a full ID, or use as-is
          const frameId = frame.id.replace('frame-', '');
          try {
            // Try to find and update existing frame
            savedFrame = await Frame.findOneAndUpdate(
              { _id: frameId, user: req.user._id, problemId: problemId },
              { 
                content: frame.content || '',
                x: frame.x || 0,
                y: frame.y || 0
              },
              { new: true, upsert: false }
            );
            if (savedFrame) {
              console.log('Updated existing frame:', { _id: savedFrame._id });
            }
          } catch (updateErr) {
            // If update fails (ID doesn't exist), create new
            console.log('Frame not found for update, creating new one');
            savedFrame = null;
          }
        }
        
        // If no existing frame found, create new one
        if (!savedFrame) {
          savedFrame = await Brainstorm.addFrame(
            frame.content || '',
            frame.x || 0,
            frame.y || 0,
            req.user,
            problemId
          );
          console.log('Created new frame:', { _id: savedFrame._id });
        }
        
        savedFrames.push(savedFrame);
      } catch (err) {
        console.error('Failed to save frame:', { content: frame.content, error: err.message, stack: err.stack });
        throw err;
      }
    }

    // Save problem statement
    let savedProblemStatement = null;
    if (problemStatement.content) {
      console.log('Attempting to save problem statement:', { content: problemStatement.content, user: req.user._id });
      try {
        // Check if a problem statement already exists for this user and problem
        const existingProblemStatement = await ProblemStatement.findOne({
          user: req.user._id,
          problemId: problemStatement.problemId
        });

        if (!existingProblemStatement) {
          // Only create a new problem statement if one doesn't exist
          savedProblemStatement = await Brainstorm.addProblemStatement(problemStatement.content, req.user, problemStatement.problemId);
          console.log('Saved new problem statement:', { _id: savedProblemStatement._id, user: savedProblemStatement.user });

          // Update the campground with the ideation session reference
          if (problemStatement.problemId) {
            await Campground.findByIdAndUpdate(problemStatement.problemId, {
              ideationSession: savedProblemStatement._id
            });
          }
        } else {
          console.log('Problem statement already exists, skipping creation');
          savedProblemStatement = existingProblemStatement;
        }
      } catch (err) {
        console.error('Failed to save problem statement:', { content: problemStatement.content, error: err.message, stack: err.stack });
        throw err;
      }
    }

    // Save/update connections - check if connection already exists before creating
    const savedConnections = [];
    for (const conn of connections) {
      if (conn.sourceId && conn.targetId) {
        console.log('Attempting to save connection:', { sourceId: conn.sourceId, targetId: conn.targetId, user: req.user._id, problemId: problemId });
        try {
          // Check if this connection already exists
          const existingConnection = await Connection.findOne({
            user: req.user._id,
            problemId: problemId,
            sourceId: conn.sourceId,
            targetId: conn.targetId
          });
          
          if (existingConnection) {
            console.log('Connection already exists, skipping:', { _id: existingConnection._id });
            savedConnections.push(existingConnection);
          } else {
            const savedConnection = await Brainstorm.addConnection(conn.sourceId, conn.targetId, req.user, problemId);
            savedConnections.push(savedConnection);
            console.log('Created new connection:', { _id: savedConnection._id, user: savedConnection.user, problemId: savedConnection.problemId });
          }
        } catch (err) {
          console.error('Failed to save connection:', { sourceId: conn.sourceId, targetId: conn.targetId, error: err.message, stack: err.stack });
          throw err;
        }
      }
    }

    const totalPoints = await Brainstorm.totalPoints(req.user._id, problemStatement.problemId);
    console.log('Total points after save:', totalPoints);

    res.status(200).json({ message: 'Board saved', totalPoints });
  } catch (error) {
    console.error('=== ERROR IN SAVE ROUTE ===');
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    console.error('Request body:', req.body);
    console.error('User:', req.user ? { id: req.user._id, username: req.user.username } : 'No user');
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Debug route to query all data
router.get('/api/debug/data', isLoggedIn, async (req, res) => {
  try {
    const ideas = await Idea.find({ user: req.user._id });
    const frames = await Frame.find({ user: req.user._id });
    const problemStatements = await ProblemStatement.find({ user: req.user._id });
    const connections = await Connection.find({ user: req.user._id });
    console.log('Debug data fetched for user:', { id: req.user._id, username: req.user.username });
    res.json({
      user: { id: req.user._id, username: req.user.username },
      ideas,
      frames,
      problemStatements,
      connections
    });
  } catch (error) {
    console.error('Error fetching debug data:', error.message, error.stack);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Delete problem statement
router.delete('/delete-problem-statement/:id', isLoggedIn, async (req, res) => {
    try {
        const { id } = req.params;
        const brainstorm = await Brainstorm.findOne({ 'problemStatements._id': id });
        if (!brainstorm) {
            req.flash('error', 'Problem statement not found');
            return res.redirect('/ideation/my-brainstorms');
        }
        brainstorm.problemStatements = brainstorm.problemStatements.filter(ps => ps._id.toString() !== id);
        await brainstorm.save();
        req.flash('success', 'Problem statement deleted successfully');
        res.redirect('/ideation/my-brainstorms');
    } catch (error) {
        console.error('Error deleting problem statement:', error);
        req.flash('error', 'Failed to delete problem statement');
        res.redirect('/ideation/my-brainstorms');
    }
});

// Delete idea
router.delete('/delete-idea/:id', isLoggedIn, async (req, res) => {
    try {
        const { id } = req.params;
        const brainstorm = await Brainstorm.findOne({ 'ideas._id': id });
        if (!brainstorm) {
            req.flash('error', 'Idea not found');
            return res.redirect('/ideation/my-brainstorms');
        }
        brainstorm.ideas = brainstorm.ideas.filter(idea => idea._id.toString() !== id);
        await brainstorm.save();
        req.flash('success', 'Idea deleted successfully');
        res.redirect('/ideation/my-brainstorms');
    } catch (error) {
        console.error('Error deleting idea:', error);
        req.flash('error', 'Failed to delete idea');
        res.redirect('/ideation/my-brainstorms');
    }
});

// Delete frame
router.delete('/delete-frame/:id', isLoggedIn, async (req, res) => {
    try {
        const { id } = req.params;
        const brainstorm = await Brainstorm.findOne({ 'frames._id': id });
        if (!brainstorm) {
            req.flash('error', 'Frame not found');
            return res.redirect('/ideation/my-brainstorms');
        }
        brainstorm.frames = brainstorm.frames.filter(frame => frame._id.toString() !== id);
        await brainstorm.save();
        req.flash('success', 'Frame deleted successfully');
        res.redirect('/ideation/my-brainstorms');
    } catch (error) {
        console.error('Error deleting frame:', error);
        req.flash('error', 'Failed to delete frame');
        res.redirect('/ideation/my-brainstorms');
    }
});

// Delete problem statement
router.delete('/api/problem-statements/:id', isLoggedIn, async (req, res) => {
    try {
        const { id } = req.params;
        await ProblemStatement.findByIdAndDelete(id);
        res.status(200).json({ message: 'Problem statement deleted successfully' });
    } catch (error) {
        console.error('Error deleting problem statement:', error);
        res.status(500).json({ error: 'Failed to delete problem statement' });
    }
});

// GET route to render defineSolution.ejs
router.get('/define-solution', isLoggedIn, async (req, res) => {
  const { campgroundId } = req.query;
  
  let existingSolution = null;
  if (campgroundId) {
    try {
      const Campground = require('../models/campgrounds');
      const { Solution } = require('../models/schemas');
      
      const campground = await Campground.findById(campgroundId);
      if (campground && campground.solution) {
        existingSolution = await Solution.findById(campground.solution);
        // Verify it belongs to the user
        if (existingSolution && existingSolution.user.toString() !== req.user._id.toString()) {
          existingSolution = null;
        }
      }
    } catch (error) {
      console.error('Error loading existing solution:', error);
    }
  }
  
  res.render('defineSolution', { 
    currentUser: req.user, 
    campgroundId,
    existingSolution: existingSolution
  });
});

// POST route to save solution data
router.post('/api/solutions', isLoggedIn, solutionsController.saveSolution);

// POST route to send solution data to AI API (updates existing solution)
router.post('/api/deepseek', isLoggedIn, async (req, res) => {
  console.log('--- HITTING /api/deepseek ROUTE ---');
  console.log('User authenticated:', req.isAuthenticated());
  console.log('User object:', req.user ? { id: req.user._id, username: req.user.username } : 'Not available');

  try {
    const { campgroundId } = req.body;
    console.log('Received request data:', { campgroundId });

    const hfToken = process.env.HUGGINGFACE_API_KEY;
    console.log('Hugging Face API Key status:', hfToken ? 'Present' : 'Missing');

    const Campground = require('../models/campgrounds');
    const { Solution } = require('../models/schemas');

    if (!hfToken) {
      console.error('API configuration error: Missing Hugging Face API key');
      return res.status(500).json({ 
        error: 'API configuration error', 
        details: 'Missing Hugging Face API key. Please check your environment configuration.' 
      });
    }

    // Get the existing solution
    if (!campgroundId) {
      return res.status(400).json({ error: 'Campground ID is required' });
    }

    const campground = await Campground.findById(campgroundId);
    if (!campground || !campground.solution) {
      return res.status(404).json({ error: 'Solution not found. Please save the solution first.' });
    }

    const solution = await Solution.findById(campground.solution);
    if (!solution) {
      return res.status(404).json({ error: 'Solution not found. Please save the solution first.' });
    }

    // Verify the solution belongs to the user
    if (solution.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized access to this solution' });
    }

    const client = new InferenceClient(hfToken);

    // Format key features table for the prompt
    const formattedFeatures = (solution.keyFeatures || []).map(feature => 
      `- Feature: ${feature.feature}\n  Format: ${feature.format}\n  Usage: ${feature.usage}`
    ).join('\n');

    // Compose the user message
    const userMessage = `
      Please analyze this solution and provide technical specifications:
      
      Title: ${solution.title}
      
      Required Behaviors:
      ${solution.shouldDo || ''}
      
      Prohibited Behaviors:
      ${solution.shouldNotDo || ''}
      
      Key Features:
      ${formattedFeatures}
      
      Implementation Steps:
      ${solution.implementationSteps || ''}
      
      Please provide a comprehensive analysis considering:
      1. Technical Components needed (ensuring they support required behaviors and avoid prohibited ones)
      2. Recommended Tech Stack (compatible with the specified formats and usage patterns)
      3. Detailed Implementation Steps (aligned with the provided requirements)
      4. Required Technical Learning
      5. Budget Calculation:
         - Hardware Costs (servers, networking equipment, etc.)
         - Software Costs (licenses, subscriptions, APIs)
         - Maintenance Costs (first year)
         Please provide a detailed breakdown of each cost category and total estimated budget.
    `;

    // Call the DeepSeek V2 model via Hugging Face Inference Providers
    const chatCompletion = await client.chatCompletion({
      provider: "novita",
      model: "deepseek-ai/DeepSeek-Prover-V2-671B",
      messages: [
        { role: "user", content: userMessage },
      ],
    });

    // Update the solution with AI response
    solution.detail = chatCompletion.choices[0].message.content;
    await solution.save();

    // Prepare response data
    const responseData = {
      title: solution.title,
      detail: solution.detail,
      shouldDo: solution.shouldDo,
      shouldNotDo: solution.shouldNotDo,
      keyFeatures: solution.keyFeatures,
      implementationSteps: solution.implementationSteps,
      campgroundId
    };
    console.log('Sending JSON response with status:', 200);
    res.status(200).json(responseData);

  } catch (error) {
    console.error('Error in DeepSeek V2 API call or solution updating:', error);
    console.log('Sending error response with status:', 500);
    res.status(500).json({
      error: 'Failed to generate technical specifications',
      details: error.message
    });
  }
});

router.get('/solution-details', isLoggedIn, async (req, res) => {
  const { campgroundId } = req.query;
  
  if (!campgroundId) {
    req.flash('error', 'Problem ID is required');
    return res.redirect('/dashboard');
  }

  try {
    const Campground = require('../models/campgrounds');
    const { Solution } = require('../models/schemas');
    
    const campground = await Campground.findById(campgroundId);
    if (!campground) {
      req.flash('error', 'Problem not found');
      return res.redirect('/dashboard');
    }

    if (!campground.solution) {
      req.flash('error', 'Solution not found. Please save a solution first.');
      return res.redirect(`/define-solution?campgroundId=${campgroundId}`);
    }

    const solution = await Solution.findById(campground.solution);
    if (!solution) {
      req.flash('error', 'Solution not found');
      return res.redirect('/dashboard');
    }

    // Verify the solution belongs to the user
    if (solution.user.toString() !== req.user._id.toString()) {
      req.flash('error', 'Unauthorized access');
      return res.redirect('/dashboard');
    }

    res.render('solutionDetails', {
      title: solution.title,
      detail: solution.detail || '',
      shouldDo: solution.shouldDo || '',
      shouldNotDo: solution.shouldNotDo || '',
      keyFeatures: solution.keyFeatures || [],
      implementationSteps: solution.implementationSteps || '',
      campgroundId: campgroundId,
      currentUser: req.user,
      hasAIDetail: !!solution.detail
    });
  } catch (error) {
    console.error('Error fetching solution details:', error);
    req.flash('error', 'Error loading solution details');
    res.redirect('/dashboard');
  }
});

module.exports = router;