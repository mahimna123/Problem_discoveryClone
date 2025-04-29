// models/brainstorm.js
const { Idea, Frame } = require('./schemas');

class Brainstorm {
  constructor() {
    this.totalPoints = 0;
  }

  async addIdea(content, x, y) {
    const idea = new Idea({ content, x, y });
    await idea.save();
    this.totalPoints++;
    return idea._id;
  }

  async getIdeas() {
    return await Idea.find();
  }

  async removeIdea(ideaId) {
    const result = await Idea.deleteOne({ _id: ideaId });
    if (result.deletedCount > 0) this.totalPoints--;
  }

  async addFrame(content, x, y) {
    const frame = new Frame({ content, x, y });
    await frame.save();
    return frame._id;
  }

  async getFrames() {
    return await Frame.find();
  }

  async removeFrame(frameId) {
    const result = await Frame.deleteOne({ _id: frameId });
    if (result.deletedCount > 0) this.totalPoints--;
  }
}

module.exports = new Brainstorm();