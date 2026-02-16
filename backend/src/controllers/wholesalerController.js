const { Wholesaler } = require('../models');
const { Op } = require('sequelize');

// --- Wholesaler Side APIs ---

exports.getProfile = async (req, res) => {
  try {
    const wholesaler = await Wholesaler.findByPk(req.user.id);
    if (!wholesaler) {
      return res.status(404).json({ message: 'Wholesaler not found' });
    }
    res.json(wholesaler);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, email, phone, business_name, gst_number, address, city, state, pincode } = req.body;
    
    const wholesaler = await Wholesaler.findByPk(req.user.id);
    if (!wholesaler) {
      return res.status(404).json({ message: 'Wholesaler not found' });
    }

    // Check if email/phone is being changed to something that already exists
    if (email && email !== wholesaler.email) {
      const exists = await Wholesaler.findOne({ where: { email } });
      if (exists) return res.status(400).json({ message: 'Email already in use' });
    }
    if (phone && phone !== wholesaler.phone) {
        const exists = await Wholesaler.findOne({ where: { phone } });
        if (exists) return res.status(400).json({ message: 'Phone already in use' });
    }

    wholesaler.name = name || wholesaler.name;
    wholesaler.email = email || wholesaler.email;
    wholesaler.phone = phone || wholesaler.phone;
    wholesaler.business_name = business_name || wholesaler.business_name;
    wholesaler.gst_number = gst_number || wholesaler.gst_number;
    wholesaler.address = address || wholesaler.address;
    wholesaler.city = city || wholesaler.city;
    wholesaler.state = state || wholesaler.state;
    wholesaler.pincode = pincode || wholesaler.pincode;

    await wholesaler.save();

    res.json({ message: 'Profile updated successfully', wholesaler });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// --- Admin Side APIs ---

exports.getAllWholesalers = async (req, res) => {
  try {
    const { search, status, verified, from, to, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { business_name: { [Op.like]: `%${search}%` } }
      ];
    }

    if (status) whereClause.status = status;
    if (verified === 'true') whereClause.is_verified = true;
    if (verified === 'false') whereClause.is_verified = false;

    if (from || to) {
      whereClause.created_at = {};
      if (from) whereClause.created_at[Op.gte] = new Date(from);
      if (to) whereClause.created_at[Op.lte] = new Date(to);
    }

    const { count, rows } = await Wholesaler.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      wholesalers: rows,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.exportWholesalersCsv = async (req, res) => {
  try {
    const { search, status, verified, from, to } = req.query;
    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { business_name: { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) whereClause.status = status;
    if (verified === 'true') whereClause.is_verified = true;
    if (verified === 'false') whereClause.is_verified = false;
    if (from || to) {
      whereClause.created_at = {};
      if (from) whereClause.created_at[Op.gte] = new Date(from);
      if (to) whereClause.created_at[Op.lte] = new Date(to);
    }

    const rows = await Wholesaler.findAll({ where: whereClause, order: [['created_at', 'DESC']] });
    const headers = ['id', 'business_name', 'name', 'email', 'phone', 'gst_number', 'is_verified', 'status', 'created_at'];
    const csv = [
      headers.join(','),
      ...rows.map(w => [
        w.id,
        JSON.stringify(w.business_name || ''),
        JSON.stringify(w.name || ''),
        JSON.stringify(w.email || ''),
        JSON.stringify(w.phone || ''),
        JSON.stringify(w.gst_number || ''),
        w.is_verified ? 'true' : 'false',
        w.status,
        w.created_at.toISOString()
      ].join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="wholesalers-export.csv"');
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateWholesalerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved', 'rejected', 'blocked', 'pending'

    if (!['pending', 'approved', 'rejected', 'blocked'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const wholesaler = await Wholesaler.findByPk(id);
    if (!wholesaler) {
      return res.status(404).json({ message: 'Wholesaler not found' });
    }

    wholesaler.status = status;
    await wholesaler.save();

    res.json({ message: `Wholesaler status updated to ${status}`, wholesaler });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
