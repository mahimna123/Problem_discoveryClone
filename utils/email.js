const nodemailer = require('nodemailer');

// Build a transporter with priority: SendGrid -> Mailtrap -> Gmail -> Ethereal (dev)
const createTransporter = async () => {
    // SendGrid (good for production)
    if (process.env.SENDGRID_API_KEY) {
        return nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false,
            auth: {
                user: 'apikey',
                pass: process.env.SENDGRID_API_KEY
            }
        });
    }

    // Mailtrap (recommended for dev)
    if (process.env.MAILTRAP_HOST && process.env.MAILTRAP_PORT && process.env.MAILTRAP_USER && process.env.MAILTRAP_PASS) {
        return nodemailer.createTransport({
            host: process.env.MAILTRAP_HOST,
            port: Number(process.env.MAILTRAP_PORT),
            auth: {
                user: process.env.MAILTRAP_USER,
                pass: process.env.MAILTRAP_PASS
            }
        });
    }

    // Gmail
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }

    // Ethereal fallback (no config needed)
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass
        }
    });
};

// baseUrl should be provided by the caller to avoid BASE_URL misconfig
const sendPasswordResetEmail = async (email, resetToken, baseUrl) => {
    const transporter = await createTransporter();
    const resetURL = `${(baseUrl || process.env.BASE_URL || 'http://localhost:3000')}/reset-password/${resetToken}`;
    
    const mailOptions = {
        from: process.env.EMAIL_USER || 'no-reply@example.com',
        to: email,
        subject: 'Password Reset - Problem Discovery Platform',
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
                <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #2c3e50; margin: 0; font-size: 28px;">🔐 Password Reset</h1>
                        <p style="color: #7f8c8d; margin: 10px 0 0 0;">Problem Discovery Platform</p>
                    </div>
                    <div style="margin-bottom: 25px;">
                        <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                            We received a request to reset your password.
                        </p>
                        <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 0;">
                            Click the button below to create a new password:
                        </p>
                    </div>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetURL}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                            🔑 Reset My Password
                        </a>
                    </div>
                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 25px 0;">
                        <p style="color: #856404; margin: 0; font-size: 14px;">
                            <strong>⏰ Important:</strong> This link will expire in 1 hour.
                        </p>
                    </div>
                </div>
            </div>
        `
    };
    
    try {
        const info = await transporter.sendMail(mailOptions);
        const previewUrl = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null;
        return { success: true, previewUrl };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendPasswordResetEmail
};
