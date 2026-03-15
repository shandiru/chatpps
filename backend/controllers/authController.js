const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
};

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: 'All fields required' });

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) return res.status(400).json({ message: 'Email or username already taken' });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await User.create({
      username, email, password, verificationToken, verificationExpiry
    });

    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}&id=${user._id}`;

    await transporter.sendMail({
      from: `"ChatApp" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify your ChatApp email',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:30px;background:#f9f9f9;border-radius:8px;">
          <h2 style="color:#1a1a1a;">Welcome to ChatApp, ${username}!</h2>
          <p style="color:#555;">Please verify your email address to get started.</p>
          <a href="${verifyUrl}" style="display:inline-block;margin-top:20px;padding:12px 28px;background:#1a1a1a;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Verify Email</a>
          <p style="color:#aaa;font-size:12px;margin-top:20px;">Link expires in 24 hours.</p>
        </div>
      `
    });

    res.status(201).json({ message: 'Registration successful. Please check your email to verify.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token, id } = req.query;
    const user = await User.findById(id);
    if (!user) return res.status(400).json({ message: 'Invalid link' });
    if (user.isVerified) return res.json({ message: 'Already verified' });
    if (user.verificationToken !== token) return res.status(400).json({ message: 'Invalid token' });
    if (user.verificationExpiry < Date.now()) return res.status(400).json({ message: 'Link expired' });

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpiry = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    if (!user.isVerified) return res.status(400).json({ message: 'Please verify your email first' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = generateToken(user._id);
    res.json({
      token,
      user: { _id: user._id, username: user.username, email: user.email, avatar: user.avatar }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMe = async (req, res) => {
  res.json(req.user);
};
