const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CorporateProblemSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    companyName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    problemStatement: {
        whoHasProblem: String,
        whatIsProblem: String,
        expectedBenefit: String
    },
    category: {
        type: String,
        default: 'General'
    },
    tags: [String],
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

CorporateProblemSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('CorporateProblem', CorporateProblemSchema);

