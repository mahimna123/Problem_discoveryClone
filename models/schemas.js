// models/schemas.js
const mongoose = require('mongoose');

const ideaSchema = new mongoose.Schema({
  content: { type: String, default: '' },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const frameSchema = new mongoose.Schema({
  content: { type: String, default: '' },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Idea = mongoose.model('Idea', ideaSchema);
const Frame = mongoose.model('Frame', frameSchema);

module.exports = { Idea, Frame };