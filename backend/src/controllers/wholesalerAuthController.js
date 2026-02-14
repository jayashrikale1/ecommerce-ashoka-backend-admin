const { Wholesaler } = require('../models');
const jwt = require('jsonwebtoken');

// Helper to send OTP (Mock implementation)
const sendOtpToWholesaler = async (identifier, type, otp) => {
  console.log(`[MOCK OTP] Sending OTP ${otp} to ${type}: ${identifier}`);
  // In production, integrate with SMS/Email provider
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
    const otp_expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Check if wholesaler exists, if not create new (registration)
    let wholesaler = await Wholesaler.findOne({ where: { [type]: identifier } });

    if (!wholesaler) {
      // Create new wholesaler record
      wholesaler = await Wholesaler.create({
        [type]: identifier,
        otp,
        otp_expiry,
        is_verified: false,
        status: 'pending' // Default status is pending for wholesalers
      });
    } else {
      // Update existing wholesaler OTP
      wholesaler.otp = otp;
      wholesaler.otp_expiry = otp_expiry;
      await wholesaler.save();
    }

    // Send OTP
    await sendOtpToWholesaler(identifier, type, otp);

    res.json({ 
      success: true, 
      message: `OTP sent successfully to ${identifier}`,
      // In dev mode, return OTP for easy testing
      otp: process.env.NODE_ENV !== 'production' ? otp : undefined
    });

  } catch (error) {
    console.error('Send OTP error:', error);
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

    const wholesaler = await Wholesaler.findOne({ where: { [type]: identifier } });

    if (!wholesaler) {
      return res.status(404).json({ message: 'Wholesaler not found' });
    }

    // Check if OTP matches and is not expired
    if (wholesaler.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (new Date() > wholesaler.otp_expiry) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Mark as verified
    wholesaler.is_verified = true;
    wholesaler.otp = null; // Clear OTP
    wholesaler.otp_expiry = null;
    await wholesaler.save();

    // Generate JWT Token
    const token = jwt.sign(
      { id: wholesaler.id, role: 'wholesaler' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      wholesaler: {
        id: wholesaler.id,
        name: wholesaler.name,
        email: wholesaler.email,
        phone: wholesaler.phone,
        business_name: wholesaler.business_name,
        status: wholesaler.status
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
