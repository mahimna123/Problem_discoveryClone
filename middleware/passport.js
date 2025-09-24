const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');

// Only set up Google OAuth if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const absoluteCallback = process.env.GOOGLE_CALLBACK_URL || (
        (process.env.BASE_URL || 'http://localhost:3000') + '/auth/google/callback'
    );
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: absoluteCallback
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user already exists with this Google ID
            let existingUser = await User.findOne({ googleId: profile.id });
            
            if (existingUser) {
                return done(null, existingUser);
            }
            
            // Check if user exists with same email
            let user = await User.findOne({ email: profile.emails[0].value });
            
            if (user) {
                // Link Google account to existing user
                user.googleId = profile.id;
                user.displayName = profile.displayName;
                user.firstName = profile.name.givenName;
                user.lastName = profile.name.familyName;
                user.profilePicture = profile.photos[0].value;
                user.isEmailVerified = true;
                await user.save();
                return done(null, user);
            }
            
            // Create new user
            // Generate username from email (part before @) or display name
            let username = profile.emails[0].value.split('@')[0];
            
            // Check if username already exists, if so add a number
            let originalUsername = username;
            let counter = 1;
            while (await User.findOne({ username: username })) {
                username = `${originalUsername}${counter}`;
                counter++;
            }
            
            user = new User({
                username: username,
                googleId: profile.id,
                email: profile.emails[0].value,
                displayName: profile.displayName,
                firstName: profile.name.givenName,
                lastName: profile.name.familyName,
                profilePicture: profile.photos[0].value,
                isEmailVerified: true
            });
            
            await user.save();
            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    }));
} else {
    console.log('⚠️  Google OAuth credentials not found. Google login will be disabled.');
}

module.exports = passport;
