const mongoose = require('mongoose');

const ideaSchema = new mongoose.Schema({
  content: { type: String, default: '' },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true }
});

const frameSchema = new mongoose.Schema({
  content: { type: String, default: '' },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true }
});

const problemStatementSchema = new mongoose.Schema({
  content: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campground' }
});

const connectionSchema = new mongoose.Schema({
  sourceId: { type: String, required: true },
  targetId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true }
});

const solutionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  detail: { type: String, required: true },
  shouldDo: { type: String, required: true },
  shouldNotDo: { type: String, required: true },
  keyFeatures: [{
    feature: { type: String, required: true },
    format: { type: String, required: true },
    usage: { type: String, required: true }
  }],
  implementationSteps: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true }
});

const Idea = mongoose.model('Idea', ideaSchema);
const Frame = mongoose.model('Frame', frameSchema);
const ProblemStatement = mongoose.model('ProblemStatement', problemStatementSchema);
const Connection = mongoose.model('Connection', connectionSchema);
const Solution = mongoose.model('Solution', solutionSchema);

module.exports = { Idea, Frame, ProblemStatement, Connection, Solution };