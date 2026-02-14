import React, { useState, useEffect } from 'react';
import { Table, Button, Badge, Form, Modal, Tab, Tabs, Row, Col, Container, Card, OverlayTrigger, Tooltip } from 'react-bootstrap';
import Layout from '../components/Layout';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Eye, X } from 'lucide-react';
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

  const clearFilters = () => {
    setUserId('');
    setWholesalerId('');
    navigate('/orders'); // Remove params from URL
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

  const openDetails = (order) => {
    setSelectedOrder(order);
    setShowDetails(true);
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
                        <td colSpan="7" className="text-center py-5">
                             <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                             </div>
                        </td>
                    </tr>
                  ) : orders.length > 0 ? (
                    orders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-4 py-3 fw-bold text-dark">#{order.id}</td>
                        <td className="px-4 py-3">
                          {key === 'customer' 
                            ? (
                                <div className="d-flex flex-column">
                                    <span className="fw-medium text-dark">{order.customer?.name || 'Unknown'}</span>
                                    <small className="text-muted">{order.customer?.phone}</small>
                                </div>
                              )
                            : (
                                <div className="d-flex flex-column">
                                    <span className="fw-medium text-dark">{order.wholesaler?.business_name || 'Unknown'}</span>
                                    <small className="text-muted">{order.wholesaler?.name}</small>
                                </div>
                              )
                          }
                        </td>
                        <td className="px-4 py-3 fw-bold text-success">₹{order.total_amount}</td>
                        <td className="px-4 py-3">
                          <Badge bg={order.payment_status === 'paid' ? 'success' : 'warning'} pill className="fw-normal">
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
                          <Button 
                            variant="light" 
                            className="btn-icon text-primary rounded-circle border-0 shadow-sm"
                            size="sm" 
                            style={{ width: '32px', height: '32px' }}
                            onClick={() => openDetails(order)}
                          >
                            <Eye size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-muted">
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
      <Modal show={showDetails} onHide={() => setShowDetails(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Order #{selectedOrder?.id} Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrder && (
            <>
              <Row className="mb-3">
                <Col md={6}>
                  <h5>Status Update</h5>
                  <Form.Select 
                    value={selectedOrder.status} 
                    onChange={(e) => handleStatusUpdate(selectedOrder.id, e.target.value)}
                    disabled={updatingStatus}
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </Form.Select>
                </Col>
                <Col md={6}>
                  <h5>Payment Info</h5>
                  <p>Method: {selectedOrder.payment_method}</p>
                  <p>Status: <Badge bg={selectedOrder.payment_status === 'paid' ? 'success' : 'warning'}>{selectedOrder.payment_status}</Badge></p>
                  {selectedOrder.razorpay_payment_id && <p>Txn ID: {selectedOrder.razorpay_payment_id}</p>}
                </Col>
              </Row>

              <hr />

              <h5>Shipping Address</h5>
              <p className="bg-light p-2 rounded">{selectedOrder.shipping_address}</p>
              {selectedOrder.notes && (
                 <>
                   <h5>Notes</h5>
                   <p className="bg-light p-2 rounded">{selectedOrder.notes}</p>
                 </>
              )}

              <hr />

              <h5>Items</h5>
              <Table size="sm">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Qty</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items?.map((item) => (
                    <tr key={item.id}>
                      <td>{item.product_name}</td>
                      <td>₹{item.price}</td>
                      <td>{item.quantity}</td>
                      <td>₹{item.price * item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan="3" className="text-end fw-bold">Grand Total:</td>
                        <td className="fw-bold">₹{selectedOrder.total_amount}</td>
                    </tr>
                </tfoot>
              </Table>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetails(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Layout>
  );
};

export default Orders;
