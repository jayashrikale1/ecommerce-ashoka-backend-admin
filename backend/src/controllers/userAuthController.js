const { User } = require('../models');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const nodemailer = require('nodemailer');

const createEmailTransport = () => {
    const host = process.env.SMTP_HOST || process.env.MAIL_HOST;
    const port = parseInt(process.env.SMTP_PORT || process.env.MAIL_PORT || '0', 10);
    const user = process.env.SMTP_USER || process.env.MAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.MAIL_PASS;

    if (host && port && user && pass) {
        return nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass }
        });
    }

    return nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true
    });
};

const sendOtpToUser = async (identifier, type, otp) => {
    if (type === 'email') {
        const transport = createEmailTransport();
        const from = process.env.FROM_EMAIL || process.env.ADMIN_EMAIL || 'no-reply@ecommerce-ashoka.local';
        const subject = 'Your Ashoka verification code';
        const text = `Your Ashoka verification code is ${otp}. It will expire in 10 minutes.`;
        const html = `
            <p>Your Ashoka verification code is <strong>${otp}</strong>.</p>
            <p>This code will expire in 10 minutes.</p>
        `;
        await transport.sendMail({
            from,
            to: identifier,
            subject,
            text,
            html
        });
        return true;
    }

    console.log(`[MOCK OTP] Sending ${otp} to phone: ${identifier}`);
    return true;
};

exports.sendOtp = async (req, res) => {
    try {
        const { email, phone } = req.body;

        if (!email && !phone) {
            return res.status(400).json({ message: 'Email or Phone is required' });
        }

        const identifier = email || phone;
        const type = email ? 'email' : 'phone';

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otp_expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Check if user exists
        let user = await User.findOne({ 
            where: { 
                [type]: identifier 
            } 
        });

        if (!user) {
            // Create new user if not exists (Registration initiated)
            // We create a record with just the identifier and OTP
            user = await User.create({
                [type]: identifier,
                otp,
                otp_expiry,
                is_verified: false
            });
        } else {
            // Update existing user with new OTP
            user.otp = otp;
            user.otp_expiry = otp_expiry;
            await user.save();
        }

        await sendOtpToUser(identifier, type, otp);

        res.json({ 
            success: true, 
            message: `OTP sent successfully to ${identifier}`,
            // For development/testing purposes, returning OTP in response
            // Remove this in production!
            otp: otp 
        });

    } catch (error) {
        console.error('Send OTP Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.verifyOtp = async (req, res) => {
    try {
        const { email, phone, otp } = req.body;

        if ((!email && !phone) || !otp) {
            return res.status(400).json({ message: 'Email/Phone and OTP are required' });
        }

        const identifier = email || phone;
        const type = email ? 'email' : 'phone';

        const user = await User.findOne({
            where: {
                [type]: identifier,
                otp: otp,
                otp_expiry: { [Op.gt]: new Date() }
            }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        // OTP verified
        user.otp = null;
        user.otp_expiry = null;
        user.is_verified = true;
        await user.save();

        // Generate Token
        const token = jwt.sign(
            { id: user.id, role: 'user' },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                status: user.status
            }
        });

    } catch (error) {
        console.error('Verify OTP Error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
