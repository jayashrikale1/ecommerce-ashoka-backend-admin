const { CommunicationLog } = require('../models');
const { Op } = require('sequelize');

exports.getAdminLogs = async (req, res) => {
  try {
    const { entityType, entityId, channel, status, from, to, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const where = {};
    if (entityType) where.entity_type = entityType;
    if (entityId) where.entity_id = entityId;
    if (channel) where.channel = channel;
    if (status) where.status = status;
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at[Op.gte] = new Date(from);
      if (to) where.created_at[Op.lte] = new Date(to);
    }

    const { count, rows } = await CommunicationLog.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      logs: rows,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createAdminLog = async (req, res) => {
  try {
    const { entity_type, entity_id, channel, subject, message, status, meta } = req.body;
    if (!entity_type || !entity_id || !channel) {
      return res.status(400).json({ message: 'entity_type, entity_id, channel are required' });
    }
    const log = await CommunicationLog.create({
      entity_type,
      entity_id,
      channel,
      subject: subject || null,
      message: message || null,
      status: status || 'sent',
      meta: meta || null
    });
    res.status(201).json({ message: 'Log created', log });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
