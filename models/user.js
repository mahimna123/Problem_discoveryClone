const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const UserSchema = new Schema({
    email: {
        type: String, 
        required: true,
        unique: true
    },
    googleId: {
        type: String,
        sparse: true,
        unique: true
    },
    displayName: {
        type: String
    },
    firstName: {
        type: String
    },
    lastName: {
        type: String
    },
    profilePicture: {
        type: String
    },
    resetPasswordToken: {
        type: String
    },
    resetPasswordExpires: {
        type: Date
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    }
});

UserSchema.plugin(passportLocalMongoose, {
    usernameUnique: true
});

module.exports = mongoose.model('User', UserSchema);
