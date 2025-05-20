const { Idea, Frame, ProblemStatement, Connection } = require('./schemas');

class Brainstorm {
  async addIdea(content, x, y, user) {
    const idea = new Idea({
      content,
      x,
      y,
      user: user._id,
      username: user.username,
    });
    await idea.save();
    return idea;
  }

  async getIdeas(userId) {
    try {
      return await Idea.find({ user: userId });
    } catch (error) {
      console.error('Error getting ideas:', error);
      throw new Error('Failed to retrieve ideas');
    }
  }

  async deleteIdea(ideaId, userId) {
    const result = await Idea.deleteOne({ _id: ideaId, user: userId });
    if (result.deletedCount === 0) {
      throw new Error('Idea not found or not authorized');
    }
  }

  async addFrame(content, x, y, user) {
    const frame = new Frame({
      content,
      x,
      y,
      user: user._id,
      username: user.username,
    });
    await frame.save();
    return frame;
  }

  async getFrames(userId) {
    try {
      return await Frame.find({ user: userId });
    } catch (error) {
      console.error('Error getting frames:', error);
      throw new Error('Failed to retrieve frames');
    }
  }

  async deleteFrame(frameId, userId) {
    const result = await Frame.deleteOne({ _id: frameId, user: userId });
    if (result.deletedCount === 0) {
      throw new Error('Frame not found or not authorized');
    }
  }

  async updateIdeaPosition(ideaId, x, y, userId) {
    const idea = await Idea.findOneAndUpdate(
      { _id: ideaId, user: userId },
      { x, y },
      { new: true }
    );
    if (!idea) {
      throw new Error('Idea not found or not authorized');
    }
    return idea;
  }

  async updateFramePosition(frameId, x, y, userId) {
    const frame = await Frame.findOneAndUpdate(
      { _id: frameId, user: userId },
      { x, y },
      { new: true }
    );
    if (!frame) {
      throw new Error('Frame not found or not authorized');
    }
    return frame;
  }

  async addProblemStatement(content, user, problemId) {
    const problemStatement = new ProblemStatement({
      content,
      user: user._id,
      username: user.username,
      problemId
    });
    await problemStatement.save();
    return problemStatement;
  }

  async getProblemStatements(userId) {
    try {
      return await ProblemStatement.find({ user: userId });
    } catch (error) {
      console.error('Error getting problem statements:', error);
      throw new Error('Failed to retrieve problem statements');
    }
  }

  async addConnection(sourceId, targetId, user) {
    const connection = new Connection({
      sourceId,
      targetId,
      user: user._id,
      username: user.username,
    });
    await connection.save();
    return connection;
  }

  async getConnections(userId) {
    try {
      return await Connection.find({ user: userId });
    } catch (error) {
      console.error('Error getting connections:', error);
      throw new Error('Failed to retrieve connections');
    }
  }

  async totalPoints(userId) {
    const ideaCount = await Idea.countDocuments({ user: userId });
    const frameCount = await Frame.countDocuments({ user: userId });
    return ideaCount + frameCount;
  }
}

module.exports = new Brainstorm();