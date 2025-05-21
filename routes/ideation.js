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
  
  const renderData = { 
    currentUser: req.user,
    problem: null,
    problemStatement: null
  };
  
  console.log('4. Data being passed to view:', renderData);
  res.render('brainstorm', renderData);
});

// View user's ideas and frames - This needs to come BEFORE the /:problemId route
router.get('/ideation/my-brainstorms', isLoggedIn, async (req, res) => {
  console.log('=== HITTING MY-BRAINSTORMS ROUTE ===');
  console.log('1. Request path:', req.path);
  console.log('2. Request method:', req.method);
  console.log('1. Request details:', {
    path: req.path,
    method: req.method,
    user: req.user ? {
      id: req.user._id,
      username: req.user.username,
      isAuthenticated: req.isAuthenticated()
    } : 'No user found'
  });

  console.log('2. Attempting to fetch ideas...');
  const ideas = await Brainstorm.getIdeas(req.user._id);
  console.log('Ideas fetched:', {
    count: ideas.length,
    firstIdea: ideas[0] || 'No ideas found'
  });

  console.log('3. Attempting to fetch frames...');
  const frames = await Brainstorm.getFrames(req.user._id);
  console.log('Frames fetched:', {
    count: frames.length,
    firstFrame: frames[0] || 'No frames found'
  });

  console.log('4. Attempting to fetch problem statements...');
  const problemStatements = await ProblemStatement.find({ user: req.user._id })
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

  console.log('5. Attempting to fetch connections...');
  const connections = await Brainstorm.getConnections(req.user._id);
  console.log('Connections fetched:', {
    count: connections.length,
    firstConnection: connections[0] || 'No connections found'
  });

  console.log('6. Rendering template with data...');
  res.render('myBrainstorms', { 
    ideas, 
    frames, 
    problemStatements: uniqueProblemStatements, 
    connections, 
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

// Get all ideas for the logged-in user
router.get('/api/ideas', isLoggedIn, async (req, res) => {
  try {
    const ideas = await Brainstorm.getIdeas(req.user._id);
    console.log('Fetched ideas for user:', { id: req.user._id, ideas });
    res.json(ideas);
  } catch (error) {
    console.error('Error fetching ideas:', error.message, error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all frames for the logged-in user
router.get('/api/frames', isLoggedIn, async (req, res) => {
  try {
    const frames = await Brainstorm.getFrames(req.user._id);
    console.log('Fetched frames for user:', { id: req.user._id, frames });
    res.json(frames);
  } catch (error) {
    console.error('Error fetching frames:', error.message, error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new idea
router.post('/api/ideas', isLoggedIn, async (req, res) => {
  try {
    console.log('Creating idea for user:', { id: req.user._id, username: req.user.username });
    const { content, x, y } = req.body;
    const newIdea = await Brainstorm.addIdea(content, x, y, req.user);
    console.log('Added idea:', { id: req.user._id, idea: newIdea });
    res.status(201).json({
      id: newIdea._id,
      totalPoints: await Brainstorm.totalPoints(req.user._id),
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
    const { content, x, y } = req.body;
    const newFrame = await Brainstorm.addFrame(content, x, y, req.user);
    console.log('Added frame:', { id: req.user._id, frame: newFrame });
    res.status(201).json({
      id: newFrame._id,
      totalPoints: await Brainstorm.totalPoints(req.user._id),
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
    console.log('Saving data for user:', { id: req.user._id, username: req.user.username });
    console.log('Received data:', req.body);
    const { ideas = [], frames = [], problemStatement = {}, connections = [], username } = req.body;

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

    // Log user ID before deletion
    console.log('User ID for deletion:', req.user._id);

    // Save ideas
    const savedIdeas = [];
    for (const idea of ideas) {
      console.log('Attempting to save idea:', { content: idea.content, x: idea.x, y: idea.y, user: req.user._id });
      try {
        const savedIdea = await Brainstorm.addIdea(
          idea.content || '',
          idea.x || 0,
          idea.y || 0,
          req.user
        );
        savedIdeas.push(savedIdea);
        console.log('Saved idea:', { _id: savedIdea._id, user: savedIdea.user });
      } catch (err) {
        console.error('Failed to save idea:', { content: idea.content, error: err.message, stack: err.stack });
        throw err;
      }
    }

    // Save frames
    const savedFrames = [];
    for (const frame of frames) {
      console.log('Attempting to save frame:', { content: frame.content, x: frame.x, y: frame.y, user: req.user._id });
      try {
        const savedFrame = await Brainstorm.addFrame(
          frame.content || '',
          frame.x || 0,
          frame.y || 0,
          req.user
        );
        savedFrames.push(savedFrame);
        console.log('Saved frame:', { _id: savedFrame._id, user: savedFrame.user });
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

    // Save connections
    const savedConnections = [];
    for (const conn of connections) {
      if (conn.sourceId && conn.targetId) {
        console.log('Attempting to save connection:', { sourceId: conn.sourceId, targetId: conn.targetId, user: req.user._id });
        try {
          const savedConnection = await Brainstorm.addConnection(conn.sourceId, conn.targetId, req.user);
          savedConnections.push(savedConnection);
          console.log('Saved connection:', { _id: savedConnection._id, user: savedConnection.user });
        } catch (err) {
          console.error('Failed to save connection:', { sourceId: conn.sourceId, targetId: conn.targetId, error: err.message, stack: err.stack });
          throw err;
        }
      }
    }

    const totalPoints = await Brainstorm.totalPoints(req.user._id);
    console.log('Total points after save:', totalPoints);

    res.status(200).json({ message: 'Board saved', totalPoints });
  } catch (error) {
    console.error('Error saving board:', error.message, error.stack);
    res.status(500).json({ error: error.message || 'Internal server error' });
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
router.get('/define-solution', isLoggedIn, (req, res) => {
  const { campgroundId } = req.query;
  res.render('defineSolution', { currentUser: req.user, campgroundId });
});

// POST route to save solution data
router.post('/api/solutions', isLoggedIn, solutionsController.saveSolution);

// POST route to send solution data to AI API
router.post('/api/deepseek', isLoggedIn, async (req, res) => {
  try {
    const { title, shouldDo, shouldNotDo, keyFeatures, implementationSteps, campgroundId } = req.body;
    console.log('Received request data:', { title, shouldDo, shouldNotDo, keyFeatures, implementationSteps, campgroundId }); // Debug log

    const hfToken = process.env.HUGGINGFACE_API_KEY;
    const Campground = require('../models/campgrounds');
    const { Solution } = require('../models/schemas');

    if (!hfToken) {
      return res.status(500).json({ error: 'API configuration error: Missing access token' });
    }

    const client = new InferenceClient(hfToken);

    // Format key features table for the prompt
    const formattedFeatures = keyFeatures.map(feature => 
      `- Feature: ${feature.feature}\n  Format: ${feature.format}\n  Usage: ${feature.usage}`
    ).join('\n');

    // Compose the user message
    const userMessage = `
      Please analyze this solution and provide technical specifications:
      
      Title: ${title}
      
      Required Behaviors:
      ${shouldDo}
      
      Prohibited Behaviors:
      ${shouldNotDo}
      
      Key Features:
      ${formattedFeatures}
      
      Implementation Steps:
      ${implementationSteps}
      
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
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    // Save the solution to the database
    const solution = new Solution({
      title,
      detail: chatCompletion.choices[0].message.content,
      shouldDo,
      shouldNotDo,
      keyFeatures,
      implementationSteps,
      user: req.user._id,
      username: req.user.username
    });
    await solution.save();

    // Associate the solution with the campground
    if (campgroundId) {
      await Campground.findByIdAndUpdate(campgroundId, { solution: solution._id });
    }

    // Prepare response data
    const responseData = {
      title,
      detail: chatCompletion.choices[0].message.content,
      shouldDo,
      shouldNotDo,
      keyFeatures,
      implementationSteps
    };
    console.log('Sending response data:', responseData); // Debug log

    // Return the AI's response
    res.json(responseData);

  } catch (error) {
    console.error('Error in DeepSeek V2 API call:', error);
    res.status(500).json({
      error: 'Failed to generate technical specifications',
      details: error.message
    });
  }
});

router.get('/solution-details', isLoggedIn, (req, res) => {
  const { title, detail, shouldDo, shouldNotDo, keyFeatures, implementationSteps, campgroundId } = req.query;
  
  console.log('Solution details route - Query parameters:', {
    title,
    detail,
    shouldDo,
    shouldNotDo,
    keyFeatures,
    implementationSteps,
    campgroundId
  });

  // Decode URL parameters and ensure keyFeatures is properly formatted
  const decodedData = {
    title: decodeURIComponent(title || ''),
    detail: decodeURIComponent(detail || ''),
    shouldDo: decodeURIComponent(shouldDo || ''),
    shouldNotDo: decodeURIComponent(shouldNotDo || ''),
    keyFeatures: keyFeatures ? JSON.stringify(JSON.parse(decodeURIComponent(keyFeatures))) : '[]',
    implementationSteps: decodeURIComponent(implementationSteps || ''),
    campgroundId: decodeURIComponent(campgroundId || '')
  };

  console.log('Solution details route - Decoded data:', decodedData);

  res.render('solutionDetails', {
    ...decodedData,
    currentUser: req.user
  });
});

module.exports = router;