const { User } = require('../models');
const { Op } = require('sequelize');

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check uniqueness if changing email/phone
        if (email && email !== user.email) {
            const exists = await User.findOne({ where: { email } });
            if (exists) return res.status(400).json({ message: 'Email already in use' });
        }
        if (phone && phone !== user.phone) {
            const exists = await User.findOne({ where: { phone } });
            if (exists) return res.status(400).json({ message: 'Phone already in use' });
        }

        user.name = name || user.name;
        user.email = email || user.email;
        user.phone = phone || user.phone;
        
        await user.save();

        res.json({
            message: 'Profile updated successfully',
            user
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Admin: Get All Users
exports.getAllUsers = async (req, res) => {
    try {
        const { search, status, verified, from, to, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        const whereClause = {};

        if (search) {
            whereClause[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
                { phone: { [Op.like]: `%${search}%` } }
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

        const { count, rows } = await User.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['created_at', 'DESC']]
        });

        res.json({
            users: rows,
            total: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.exportUsersCsv = async (req, res) => {
    try {
        const { search, status, verified, from, to } = req.query;
        const whereClause = {};
        if (search) {
            whereClause[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
                { phone: { [Op.like]: `%${search}%` } }
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

        const rows = await User.findAll({ where: whereClause, order: [['created_at', 'DESC']] });
        const headers = ['id', 'name', 'email', 'phone', 'is_verified', 'status', 'created_at'];
        const csv = [
            headers.join(','),
            ...rows.map(u => [
                u.id,
                JSON.stringify(u.name || ''),
                JSON.stringify(u.email || ''),
                JSON.stringify(u.phone || ''),
                u.is_verified ? 'true' : 'false',
                u.status,
                u.created_at.toISOString()
            ].join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="users-export.csv"');
        res.status(200).send(csv);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
