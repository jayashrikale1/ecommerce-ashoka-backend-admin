import React, { useState, useEffect } from 'react';
import { Table, Button, Badge, Form, Modal, Tab, Tabs, Row, Col, Container, Card, OverlayTrigger, Tooltip } from 'react-bootstrap';
import Layout from '../components/Layout';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Eye, X, Truck, RotateCcw } from 'lucide-react';
import PaginationComponent from '../components/PaginationComponent';
import { useLocation, useNavigate } from 'react-router-dom';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [key, setKey] = useState('customer'); // 'customer' or 'wholesaler'
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  
  const [showDetails, setShowDetails] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [shipmentsLoading, setShipmentsLoading] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const getTimelineEvents = () => {
    if (!trackingData || !trackingData.last_event) return [];
    try {
      const obj = JSON.parse(trackingData.last_event);
      if (Array.isArray(obj)) return obj;
      const arr = obj.events || obj.scans || obj.history || obj.tracking_events || [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  };

  const [updatingStatus, setUpdatingStatus] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [wholesalerId, setWholesalerId] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const uId = params.get('userId');
    const wId = params.get('wholesalerId');
    const type = params.get('type');

    if (uId) setUserId(uId);
    if (wId) setWholesalerId(wId);
    if (type) setKey(type);
    
    // Clear IDs if not in URL (to handle back button or manual navigation)
    if (!uId) setUserId('');
    if (!wId) setWholesalerId('');

  }, [location.search]);

  useEffect(() => {
    fetchOrders();
  }, [key, page, statusFilter, userId, wholesalerId]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = {
        type: key,
        page,
        limit: 10,
        status: statusFilter || undefined
      };

      if (userId) params.userId = userId;
      if (wholesalerId) params.wholesalerId = wholesalerId;

      const response = await api.get('/orders/admin/all', { params });
      setOrders(response.data.orders);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShipment = async (orderId) => {
    try {
      const resp = await api.post(`/shipping/admin/${orderId}/create`);
      toast.success(`Shipment created: ${resp.data.tracking_number}`);
      fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: 'shipped' }));
        setShipmentsLoading(true);
        api.get(`/shipping/admin/by-order/${orderId}`).then(r => setShipments(r.data.shipments || [])).finally(() => setShipmentsLoading(false));
      }
    } catch (error) {
      console.error('Create shipment error:', error);
      toast.error(error.response?.data?.message || 'Failed to create shipment');
    }
  };

  const handleRefund = async (orderId) => {
    if (!window.confirm('Refund this payment?')) return;
    try {
      const resp = await api.post(`/payment/refund/${orderId}`);
      toast.success(`Refund processed: ${resp.data.refund_id}`);
      fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, payment_status: 'refunded' }));
      }
    } catch (error) {
      console.error('Refund error:', error);
      toast.error(error.response?.data?.message || 'Failed to refund payment');
    }
  };
  
  const openTracking = async (tracking) => {
    setShowTracking(true);
    setTrackingLoading(true);
    setTrackingData(null);
    try {
      const resp = await api.get(`/shipping/admin/track/${tracking}`);
      setTrackingData(resp.data);
    } catch {
      setTrackingData(null);
      toast.error('Failed to fetch tracking');
    } finally {
      setTrackingLoading(false);
    }
  };
  const openCarrier = (tracking, carrier) => {
    let url = '';
    if ((carrier || '').toUpperCase() === 'DTDC') {
      url = `https://tracking.dtdc.com/ctbs-tracking/customerInterface.tr?submitName=trackit&cnNo=${encodeURIComponent(tracking)}`;
    } else {
      url = `https://www.google.com/search?q=${encodeURIComponent((carrier || '') + ' tracking ' + tracking)}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  const clearFilters = () => {
    setUserId('');
    setWholesalerId('');
    navigate('/orders'); // Remove params from URL
  };
  const openInvoice = async (orderId) => {
    try {
      const base = api.defaults.baseURL || `${window.location.origin}/api`;
      const url = `${base}/orders/admin/${orderId}/invoice`;
      const resp = await api.get(url, { responseType: 'text' });
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow.document;
      doc.open('text/html');
      doc.write(resp.data);
      doc.close();
      iframe.onload = () => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to open invoice');
    }
  };
  const downloadInvoice = async (orderId) => {
    try {
      const base = api.defaults.baseURL || `${window.location.origin}/api`;
      const url = `${base}/orders/admin/${orderId}/invoice`;
      const resp = await api.get(url, { responseType: 'text' });
      const blob = new Blob([resp.data], { type: 'text/html' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `invoice-${orderId}.html`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(link.href);
        document.body.removeChild(link);
      }, 500);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to download invoice');
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdatingStatus(true);
    try {
      await api.put(`/orders/admin/${orderId}/status`, { status: newStatus });
      toast.success('Order status updated');
      fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'processing': return 'info';
      case 'shipped': return 'primary';
      case 'delivered': return 'success';
      case 'cancelled': return 'danger';
      default: return 'secondary';
    }
  };
  const getPaymentBadge = (ps) => {
    switch (ps) {
      case 'paid': return 'success';
      case 'failed': return 'danger';
      case 'refunded': return 'secondary';
      default: return 'warning';
    }
  };

  const openDetails = (order) => {
    setSelectedOrder(order);
    setShowDetails(true);
    setShipmentsLoading(true);
    setShipments([]);
    api.get(`/shipping/admin/by-order/${order.id}`)
      .then(resp => {
        setShipments(resp.data.shipments || []);
      })
      .catch(() => {
        setShipments([]);
      })
      .finally(() => setShipmentsLoading(false));
  };

  return (
    <Layout>
      <Container fluid className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="mb-0">Order Management</h2>
        </div>

        {(userId || wholesalerId) && (
            <div className="mb-4 d-flex align-items-center bg-info bg-opacity-10 p-3 rounded-3 border border-info border-opacity-25">
                <div className="d-flex align-items-center me-3">
                    <i className="bi bi-funnel-fill text-info me-2"></i>
                    <span className="fw-medium text-dark">
                        Filtered by {userId ? `User ID: ${userId}` : `Wholesaler ID: ${wholesalerId}`}
                    </span>
                </div>
                <Button variant="outline-danger" size="sm" onClick={clearFilters} className="d-flex align-items-center">
                    <X size={16} className="me-1" /> Clear Filter
                </Button>
            </div>
        )}

      <Card className="shadow-sm border-0 rounded-3">
          <Card.Header className="bg-white py-3 border-bottom-0">
             <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                <Tabs
                    id="order-tabs"
                    activeKey={key}
                    onSelect={(k) => { setKey(k); setPage(1); }}
                    className="mb-0 border-bottom-0"
                    variant="pills"
                >
                    <Tab eventKey="customer" title="User Orders" />
                    <Tab eventKey="wholesaler" title="Wholesaler Orders" />
                </Tabs>

                <Form.Select 
                    style={{ width: '200px' }} 
                    value={statusFilter} 
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="border-secondary-subtle"
                >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                </Form.Select>
             </div>
          </Card.Header>
          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle">
                <thead className="bg-light text-uppercase small text-muted">
                  <tr>
                    <th className="px-4 py-3 border-0">Sr No.</th>
                    <th className="px-4 py-3 border-0">Order ID</th>
                    <th className="px-4 py-3 border-0">{key === 'customer' ? 'Customer' : 'Wholesaler'}</th>
                    <th className="px-4 py-3 border-0">Total Amount</th>
                    <th className="px-4 py-3 border-0">Payment</th>
                    <th className="px-4 py-3 border-0">Status</th>
                    <th className="px-4 py-3 border-0">Date</th>
                    <th className="px-4 py-3 border-0">Actions</th>
                  </tr>
                </thead>
                <tbody className="border-top-0">
                {loading ? (
                    <tr>
                        <td colSpan="8" className="text-center py-5">
                             <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                             </div>
                        </td>
                    </tr>
                  ) : orders.length > 0 ? (
                    orders.map((order, index) => {
                      const primaryCustomer =
                        order.customer?.name || order.customer?.email || 'Customer';
                      const secondaryCustomer =
                        order.customer?.phone || order.customer?.email || '';

                      const hasBusinessName =
                        order.wholesaler?.business_name &&
                        order.wholesaler.business_name.trim().length > 0;
                      const primaryWholesaler = hasBusinessName
                        ? order.wholesaler.business_name
                        : (order.wholesaler?.name || order.wholesaler?.email || 'Wholesaler');

                      let secondaryWholesaler = '';
                      if (hasBusinessName) {
                        secondaryWholesaler =
                          order.wholesaler?.name ||
                          order.wholesaler?.phone ||
                          order.wholesaler?.email ||
                          '';
                      } else if (primaryWholesaler === order.wholesaler?.name) {
                        secondaryWholesaler =
                          order.wholesaler?.phone || order.wholesaler?.email || '';
                      } else {
                        secondaryWholesaler =
                          order.wholesaler?.phone ||
                          (order.wholesaler?.email !== primaryWholesaler
                            ? order.wholesaler?.email
                            : '') ||
                          '';
                      }

                      const publicId = order.display_order_id || order.public_id || order.id;

                      return (
                      <tr key={order.id}>
                        <td className="px-4 py-3 text-muted">{(page - 1) * 10 + index + 1}</td>
                        <td className="px-4 py-3 fw-bold text-dark">{publicId}</td>
                        <td className="px-4 py-3">
                          {key === 'customer' 
                            ? (
                                <div className="d-flex flex-column">
                                    <span className="fw-medium text-dark">
                                      {primaryCustomer}
                                    </span>
                                    {secondaryCustomer && (
                                      <small className="text-muted">
                                        {secondaryCustomer}
                                      </small>
                                    )}
                                </div>
                              )
                            : (
                                <div className="d-flex flex-column">
                                    <span className="fw-medium text-dark">
                                      {primaryWholesaler}
                                    </span>
                                    {secondaryWholesaler && (
                                      <small className="text-muted">
                                        {secondaryWholesaler}
                                      </small>
                                    )}
                                </div>
                              )
                          }
                        </td>
                        <td className="px-4 py-3 fw-bold text-success">₹{order.total_amount}</td>
                        <td className="px-4 py-3">
                          <Badge bg={getPaymentBadge(order.payment_status)} pill className="fw-normal">
                            {order.payment_method === 'cod' ? 'COD' : 'Online'} - {order.payment_status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge bg={getStatusBadge(order.status)} pill className="fw-normal text-uppercase">
                              {order.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-secondary">{new Date(order.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="d-flex align-items-center gap-2">
                            <OverlayTrigger placement="top" overlay={<Tooltip>View Details</Tooltip>}>
                              <Button 
                                variant="light" 
                                className="btn-icon text-primary rounded-circle border-0 shadow-sm"
                                size="sm" 
                                style={{ width: '32px', height: '32px' }}
                                onClick={() => openDetails(order)}
                              >
                                <Eye size={16} />
                              </Button>
                            </OverlayTrigger>
                            {(order.status !== 'delivered' && order.status !== 'cancelled' && order.status !== 'shipped') && (
                              <OverlayTrigger placement="top" overlay={<Tooltip>Create Shipment</Tooltip>}>
                                <Button 
                                  variant="light" 
                                  className="btn-icon text-success rounded-circle border-0 shadow-sm"
                                  size="sm" 
                                  style={{ width: '32px', height: '32px' }}
                                  onClick={() => handleCreateShipment(order.id)}
                                >
                                  <Truck size={16} />
                                </Button>
                              </OverlayTrigger>
                            )}
                            {(order.payment_status === 'paid' && order.payment_method === 'online') && (
                              <OverlayTrigger placement="top" overlay={<Tooltip>Refund Payment</Tooltip>}>
                                <Button 
                                  variant="light" 
                                  className="btn-icon text-danger rounded-circle border-0 shadow-sm"
                                  size="sm" 
                                  style={{ width: '32px', height: '32px' }}
                                  onClick={() => handleRefund(order.id)}
                                >
                                  <RotateCcw size={16} />
                                </Button>
                              </OverlayTrigger>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center py-5 text-muted">
                          <div className="d-flex flex-column align-items-center">
                              <i className="bi bi-box-seam fs-1 mb-3 opacity-50"></i>
                              <p className="mb-0">No orders found.</p>
                          </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </Card.Body>
      </Card>
      
      {totalPages > 1 && (
        <div className="mt-4 d-flex justify-content-center">
            <PaginationComponent 
              currentPage={page} 
              totalPages={totalPages} 
              onPageChange={setPage} 
            />
        </div>
      )}
      </Container>

      {/* Order Details Modal */}
      <Modal 
        show={showDetails} 
        onHide={() => setShowDetails(false)} 
        size="lg" 
        centered 
        className="modal-with-sidebar"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold ps-2">
            Order {(selectedOrder && (selectedOrder.display_order_id || selectedOrder.public_id)) || selectedOrder?.id} Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedOrder && (
            <div className="px-2">
              <Row className="mb-4">
                <Col md={6}>
                  <h6 className="mb-3 text-uppercase text-secondary small fw-bold">Order Status</h6>
                  <div className="p-3 bg-light rounded-3 border border-light-subtle d-flex align-items-center justify-content-between">
                    <span className="text-muted small">Current Status</span>
                    <Badge bg={getStatusBadge(selectedOrder.status)} className="px-3 py-2 rounded-pill text-uppercase">
                      {selectedOrder.status}
                    </Badge>
                  </div>
                </Col>
                <Col md={6}>
                  <h6 className="mb-3 text-uppercase text-secondary small fw-bold">Payment Info</h6>
                  <div className="p-3 bg-light rounded-3 border border-light-subtle">
                    <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted small">Method</span>
                        <span className="fw-bold text-uppercase text-dark">{selectedOrder.payment_method}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                        <span className="text-muted small">Status</span>
                        <Badge bg={getPaymentBadge(selectedOrder.payment_status)} className="px-3 py-2 rounded-pill">
                            {selectedOrder.payment_status}
                        </Badge>
                    </div>
                    {selectedOrder.razorpay_payment_id && (
                        <div className="d-flex justify-content-between mt-3 pt-2 border-top">
                            <span className="text-muted small">Transaction ID</span>
                            <small className="font-monospace text-dark">{selectedOrder.razorpay_payment_id}</small>
                        </div>
                    )}
                  </div>
                </Col>
              </Row>

              {(Number(selectedOrder?.discount_amount || 0) > 0 || selectedOrder?.coupon_code) && (
                <Row className="mb-4">
                  <Col md={12}>
                    <h6 className="mb-3 text-uppercase text-secondary small fw-bold">Coupon</h6>
                    <div className="p-3 bg-light rounded-3 border border-light-subtle d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center gap-2">
                        <span className="text-muted small">Code</span>
                        <Badge bg="secondary" className="px-3 py-2 rounded-pill">
                          {selectedOrder?.coupon_code || 'N/A'}
                        </Badge>
                      </div>
                      <div className="fw-bold text-success">
                        -₹{Number(selectedOrder?.discount_amount || 0).toFixed(2)}
                      </div>
                    </div>
                  </Col>
                </Row>
              )}

              <div className="border-top my-4"></div>

              <h6 className="mb-3 text-uppercase text-secondary small fw-bold">Shipping Address</h6>
              <div className="bg-light p-4 rounded-3 mb-4 border border-light-subtle">
                <p className="mb-0 text-dark fw-medium">
                  {selectedOrder.shipping_address}
                </p>
              </div>
              
              <h6 className="mb-3 text-uppercase text-secondary small fw-bold">Shipments</h6>
              <div className="bg-light p-3 rounded-3 mb-4 border border-light-subtle">
                {shipmentsLoading ? (
                  <div className="text-muted small">Loading shipments…</div>
                ) : shipments.length > 0 ? (
                  <div className="table-responsive">
                    <Table size="sm" className="mb-0">
                      <thead>
                        <tr>
                          <th className="py-2 ps-3">Tracking</th>
                          <th className="py-2">Carrier</th>
                          <th className="py-2">Status</th>
                          <th className="py-2">Created</th>
                          <th className="py-2 text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shipments.map(s => (
                          <tr key={s.id}>
                            <td className="py-2 ps-3">{s.tracking_number}</td>
                            <td className="py-2">{s.carrier}</td>
                            <td className="py-2">
                              <Badge bg={s.status === 'delivered' ? 'success' : s.status === 'cancelled' ? 'danger' : 'primary'}>
                                {s.status}
                              </Badge>
                            </td>
                            <td className="py-2">{new Date(s.created_at).toLocaleString()}</td>
                            <td className="py-2 text-end">
                              <Button variant="outline-primary" size="sm" onClick={() => openTracking(s.tracking_number)}>
                                Track
                              </Button>
                              <Button variant="outline-secondary" size="sm" className="ms-2" onClick={() => openCarrier(s.tracking_number, s.carrier)}>
                                Carrier
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-muted small">No shipments yet for this order.</div>
                )}
              </div>
              
              {selectedOrder.notes && (
                 <>
                   <h6 className="mb-3 text-uppercase text-secondary small fw-bold">Notes</h6>
                   <div className="bg-light p-4 rounded-3 mb-4 border border-light-subtle">
                      <p className="mb-0 text-dark">{selectedOrder.notes}</p>
                   </div>
                 </>
              )}

              <div className="border-top my-4"></div>

              <h6 className="mb-3 text-uppercase text-secondary small fw-bold">Order Items</h6>
              <div className="table-responsive border rounded-3 overflow-hidden">
                  <Table className="mb-0 align-middle">
                    <thead className="bg-light">
                      <tr>
                        <th className="border-0 py-3 ps-4 text-secondary small fw-bold">Product</th>
                        <th className="border-0 py-3 text-end text-secondary small fw-bold">Price</th>
                        <th className="border-0 py-3 text-center text-secondary small fw-bold">Qty</th>
                        <th className="border-0 py-3 pe-4 text-end text-secondary small fw-bold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="py-3 ps-4 border-bottom-0">
                              <div className="fw-medium text-dark">{item.product_name}</div>
                          </td>
                          <td className="text-end py-3 border-bottom-0">₹{item.price}</td>
                          <td className="text-center py-3 border-bottom-0">{item.quantity}</td>
                          <td className="text-end fw-bold py-3 pe-4 border-bottom-0">₹{item.price * item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-light">
                        <tr>
                            <td colSpan="3" className="text-end py-3 border-0 text-secondary">Subtotal</td>
                            <td className="text-end py-3 pe-4 border-0">
                              ₹{(Number(selectedOrder?.total_amount || 0) + Number(selectedOrder?.discount_amount || 0)).toFixed(2)}
                            </td>
                        </tr>
                        <tr>
                            <td colSpan="3" className="text-end py-3 border-0 text-secondary">Discount {selectedOrder?.coupon_code ? `(${selectedOrder?.coupon_code})` : ''}</td>
                            <td className="text-end py-3 pe-4 border-0 text-success">
                              -₹{Number(selectedOrder?.discount_amount || 0).toFixed(2)}
                            </td>
                        </tr>
                        <tr>
                            <td colSpan="3" className="text-end fw-bold py-3 border-0 text-secondary">Grand Total</td>
                            <td className="text-end fw-bold fs-5 py-3 pe-4 border-0 text-primary">
                              ₹{Number(selectedOrder?.total_amount || 0).toFixed(2)}
                            </td>
                        </tr>
                    </tfoot>
                  </Table>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0 pb-4 pe-4 d-flex justify-content-between">
          <div className="d-flex gap-2">
            {selectedOrder && (selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'shipped') && (
              <Button 
                variant="outline-success" 
                onClick={() => handleCreateShipment(selectedOrder.id)}
              >
                <Truck size={16} className="me-2" /> Create Shipment
              </Button>
            )}
            {selectedOrder && (selectedOrder.payment_status === 'paid' && selectedOrder.payment_method === 'online') && (
              <Button 
                variant="outline-danger" 
                onClick={() => handleRefund(selectedOrder.id)}
              >
                <RotateCcw size={16} className="me-2" /> Refund Payment
              </Button>
            )}
            {selectedOrder && selectedOrder.status === 'delivered' && (
              <Button 
                variant="outline-primary" 
                onClick={() => openInvoice(selectedOrder.id)}
              >
                Invoice
              </Button>
            )}
            {selectedOrder && selectedOrder.status === 'delivered' && (
              <Button 
                variant="outline-secondary" 
                onClick={() => downloadInvoice(selectedOrder.id)}
              >
                Download
              </Button>
            )}
          </div>
          <Button variant="secondary" onClick={() => setShowDetails(false)} className="px-4">
            Close
          </Button>
        </Modal.Footer>

        <Modal show={showTracking} onHide={() => setShowTracking(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Shipment Tracking</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {trackingLoading ? (
              <div className="text-center py-3">Loading...</div>
            ) : trackingData ? (
              <div className="d-flex flex-column gap-2">
                <div className="d-flex justify-content-between">
                  <span className="text-muted small">Tracking</span>
                  <span className="fw-bold">{trackingData.tracking_number}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted small">Carrier</span>
                  <span className="fw-bold">{trackingData.carrier}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted small">Status</span>
                  <Badge bg={trackingData.status === 'delivered' ? 'success' : trackingData.status === 'cancelled' ? 'danger' : 'primary'}>
                    {trackingData.status}
                  </Badge>
                </div>
                {trackingData.last_event && (
                  <div className="mt-2">
                    <div className="text-muted small mb-1">Last Event</div>
                    <pre className="bg-light p-2 rounded border border-light-subtle" style={{ whiteSpace: 'pre-wrap' }}>
                      {(() => { try { return JSON.stringify(JSON.parse(trackingData.last_event), null, 2); } catch { return trackingData.last_event; } })()}
                    </pre>
                  </div>
                )}
                {getTimelineEvents().length > 0 && (
                  <div className="mt-2">
                    <div className="text-muted small mb-1">Events</div>
                    <div className="bg-light p-2 rounded border border-light-subtle">
                      <Table size="sm" className="mb-0">
                        <thead>
                          <tr>
                            <th className="py-2">Time</th>
                            <th className="py-2">Location</th>
                            <th className="py-2">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getTimelineEvents().map((e, idx) => (
                            <tr key={idx}>
                              <td className="py-2">{e.time || e.timestamp || e.date || '-'}</td>
                              <td className="py-2">{e.location || e.city || e.place || '-'}</td>
                              <td className="py-2">{e.status || e.description || e.event || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted">No tracking data available</div>
            )}
          </Modal.Body>
          <Modal.Footer>
            {trackingData && (
              <Button variant="outline-primary" onClick={() => openTracking(trackingData.tracking_number)}>
                Refresh
              </Button>
            )}
            <Button variant="secondary" onClick={() => setShowTracking(false)}>Close</Button>
          </Modal.Footer>
        </Modal>
      </Modal>
    </Layout>
  );
};

export default Orders;
