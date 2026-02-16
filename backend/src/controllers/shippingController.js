const { Shipment, Order } = require('../models');

exports.createShipment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot create shipment for cancelled order' });
    }
    const tracking = `DTDC${orderId}${Date.now()}`;
    const shipment = await Shipment.create({
      order_id: order.id,
      tracking_number: tracking,
      carrier: 'DTDC',
      status: 'created'
    });
    order.status = 'shipped';
    await order.save();
    res.status(201).json({ tracking_number: shipment.tracking_number, status: shipment.status });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getShipment = async (req, res) => {
  try {
    const { tracking } = req.params;
    const shipment = await Shipment.findOne({ where: { tracking_number: tracking } });
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }
    res.status(200).json(shipment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.listByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const shipments = await Shipment.findAll({
      where: { order_id: orderId },
      order: [['created_at', 'DESC']]
    });
    res.status(200).json({ shipments });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.webhook = async (req, res) => {
  try {
    const { tracking_number, status, event } = req.body;
    if (!tracking_number || !status) {
      return res.status(400).json({ message: 'tracking_number and status are required' });
    }
    const shipment = await Shipment.findOne({ where: { tracking_number } });
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }
    shipment.status = status;
    shipment.last_event = event ? JSON.stringify(event) : null;
    await shipment.save();
    const order = await Order.findByPk(shipment.order_id);
    if (order) {
      if (status === 'delivered') order.status = 'delivered';
      else if (status === 'cancelled') order.status = 'cancelled';
      else order.status = 'shipped';
      await order.save();
    }
    res.status(200).json({ message: 'Webhook processed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
