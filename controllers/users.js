const User = require('../models/user');
const Campground = require('../models/campgrounds');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../utils/email');

module.exports.renderRegister = (req, res) => {
    res.render('users/register');
}

module.exports.renderDashboard = async (req, res) => {
    try {
        console.log('Rendering dashboard for user:', req.user._id);
        const campgrounds = await Campground.find({ author: req.user._id })
            .populate('author')
            .populate('reviews');
        console.log('Found campgrounds:', campgrounds.length);
        res.render('users/dashboard', { campgrounds });
    } catch (error) {
        console.error('Error rendering dashboard:', error);
        req.flash('error', 'Error loading dashboard');
        res.redirect('/campgrounds');
    }
}

module.exports.register = async(req, res) => {
    try{
        const {email, username, password} = req.body;
        const user = new User ({email, username});
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, err => {
            if(err) return next(err);
            req.flash('success','Welcome to Problem Discovery Platform');
            res.redirect('/dashboard');
        })
    }catch(e){
        req.flash('error', e.message);
        res.redirect('register');
    }
}

module.exports.renderLogin = (req, res) =>{
    res.render('users/login');
}

module.exports.login = (req, res) => {
    req.flash('success', 'Welcome back!');
    const redirectUrl = res.locals.returnTo || '/dashboard';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
}

module.exports.logout = (req, res, next) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        req.flash('success', 'Goodbye!');
        res.redirect('/problems');
    });
}

// Google OAuth callback
module.exports.googleCallback = (req, res) => {
    req.flash('success', 'Welcome! You have successfully logged in with Google.');
    const redirectUrl = res.locals.returnTo || '/dashboard';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
}

// Forgot password - render form
module.exports.renderForgotPassword = (req, res) => {
    res.render('users/forgot-password');
}

// Forgot password - send reset email
module.exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) {
            req.flash('error', 'No account with that email address exists.');
            return res.redirect('/forgot-password');
        }
        
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();
        
        // Send email (build base URL from the current request to avoid BASE_URL issues)
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const result = await sendPasswordResetEmail(user.email, resetToken, baseUrl);
        
        if (result && result.success) {
            let message = 'Password reset email sent! Check your inbox.';
            if (result.previewUrl) {
                message += ` Preview: ${result.previewUrl}`;
                console.log('Password reset email preview URL:', result.previewUrl);
            }
            req.flash('success', message);
        } else {
            // As a dev convenience, show the direct link if email couldn't be sent
            const fallbackUrl = `${baseUrl}/reset-password/${resetToken}`;
            console.error('Password reset email error:', result && result.error);
            req.flash('error', `Email could not be sent. Use this link to reset now: ${fallbackUrl}`);
        }
        
        res.redirect('/forgot-password');
    } catch (error) {
        console.error('Forgot password error:', error);
        req.flash('error', 'Something went wrong. Please try again.');
        res.redirect('/forgot-password');
    }
}

// Reset password - render form
module.exports.renderResetPassword = async (req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgot-password');
        }
        
        res.render('users/reset-password', { token: req.params.token });
    } catch (error) {
        req.flash('error', 'Something went wrong. Please try again.');
        res.redirect('/forgot-password');
    }
}

// Reset password - update password
module.exports.resetPassword = async (req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgot-password');
        }
        
        if (req.body.password !== req.body.confirmPassword) {
            req.flash('error', 'Passwords do not match.');
            return res.redirect(`/reset-password/${req.params.token}`);
        }
        
        await user.setPassword(req.body.password);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        
        req.flash('success', 'Password has been reset successfully!');
        res.redirect('/login');
    } catch (error) {
        req.flash('error', 'Something went wrong. Please try again.');
        res.redirect('/forgot-password');
    }
}
