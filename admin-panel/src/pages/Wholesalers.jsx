import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Check, X, Search, Eye, FileText } from 'lucide-react';
import { Container, Row, Col, Card, Table, Button, Form, Badge, Modal, OverlayTrigger, Tooltip } from 'react-bootstrap';
import PaginationComponent from '../components/PaginationComponent';
import { useNavigate } from 'react-router-dom';

const Wholesalers = () => {
  const [wholesalers, setWholesalers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [currentWholesaler, setCurrentWholesaler] = useState(null);
  const navigate = useNavigate();

  const fetchWholesalers = async (query = '', status = '', page = 1) => {
    try {
      setLoading(true);
      const params = { search: query, page, limit: 10 };
      if (status) params.status = status;
      if (verifiedFilter) params.verified = verifiedFilter;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      
      const response = await api.get('/wholesalers', { params });
      setWholesalers(response.data.wholesalers);
      setTotalPages(response.data.totalPages);
      setCurrentPage(response.data.currentPage);
    } catch (error) {
      toast.error('Failed to fetch wholesalers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWholesalers(searchQuery, statusFilter, 1);
  }, [searchQuery, statusFilter, verifiedFilter, fromDate, toDate]);

  const handlePageChange = (page) => {
    fetchWholesalers(searchQuery, statusFilter, page);
  };

  const handleFilterChange = (e) => {
    const value = e.target.value;
    setStatusFilter(value);
  };
  const handleExport = async () => {
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;
      if (verifiedFilter) params.verified = verifiedFilter;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const resp = await api.get('/wholesalers/admin/export', { params, responseType: 'blob' });
      const blobUrl = URL.createObjectURL(resp.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'wholesalers-export.csv';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        document.body.removeChild(link);
      }, 500);
    } catch {
      toast.error('Failed to export wholesalers');
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await api.put(`/wholesalers/${id}/status`, { status: newStatus });
      toast.success(`Wholesaler ${newStatus} successfully`);
      fetchWholesalers(searchQuery, statusFilter, currentPage);
      if (showModal) setShowModal(false);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleViewDetails = (wholesaler) => {
    setCurrentWholesaler(wholesaler);
    setShowModal(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'danger';
      case 'blocked': return 'dark';
      default: return 'warning';
    }
  };

  return (
    <Layout>
      <Container fluid className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <h2 className="mb-0">Wholesaler Management</h2>
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={handleExport}>Export CSV</Button>
          </div>
        </div>

        <Card className="shadow-sm border-0 rounded-3 mb-4">
            <Card.Header className="bg-white py-3 border-bottom-0">
                <Form>
                    <Row className="g-2 align-items-center">
                        <Col xs={12} md={5}>
                             <div className="position-relative">
                                <Form.Control
                                    type="text"
                                    placeholder="Search wholesalers..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="ps-4"
                                />
                                <div className="position-absolute top-50 start-0 translate-middle-y ms-2 text-muted">
                                    <Search size={16} />
                                </div>
                            </div>
                        </Col>
                        <Col xs={12} md={3}>
                            <Form.Select value={statusFilter} onChange={handleFilterChange} className="border-secondary-subtle">
                                <option value="">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                                <option value="blocked">Unapproved</option>
                            </Form.Select>
                        </Col>
                        <Col xs={12} md={3}>
                            <Form.Select value={verifiedFilter} onChange={(e) => setVerifiedFilter(e.target.value)} className="border-secondary-subtle">
                                <option value="">Verified: Any</option>
                                <option value="true">Verified</option>
                                <option value="false">Unverified</option>
                            </Form.Select>
                        </Col>
                        <Col xs={6} md={3}>
                            <Form.Control type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                        </Col>
                        <Col xs={6} md={3}>
                            <Form.Control type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                        </Col>
                        <Col xs={12} md={2}></Col>
                    </Row>
                </Form>
            </Card.Header>
        </Card>

        {loading ? (
          <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
          </div>
        ) : (
          <Card className="shadow-sm border-0 rounded-3">
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="mb-0 align-middle">
                    <thead className="bg-light text-uppercase small text-muted">
                    <tr>
                        <th className="px-4 py-3 border-0">Sr No.</th>
                        <th className="px-4 py-3 border-0">Business Name</th>
                        <th className="px-4 py-3 border-0">Contact Person</th>
        <th className="px-4 py-3 border-0">Email/Phone</th>
        <th className="px-4 py-3 border-0">Status</th>
        <th className="px-4 py-3 border-0">Date</th>
        <th className="px-4 py-3 border-0 text-end">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="border-top-0">
                    {wholesalers.map((wholesaler, index) => (
                        <tr key={wholesaler.id}>
                        <td className="px-4 py-3 text-muted">{(currentPage - 1) * 10 + index + 1}</td>
                        <td className="px-4 py-3 fw-bold text-dark">{wholesaler.business_name || '-'}</td>
                        <td className="px-4 py-3 text-secondary">{wholesaler.name || '-'}</td>
                        <td className="px-4 py-3">
                            <div className="text-dark">{wholesaler.email}</div>
                            <small className="text-muted">{wholesaler.phone}</small>
                        </td>
                        <td className="px-4 py-3">
                            <Badge bg={getStatusBadge(wholesaler.status)} pill className="px-3 py-2 fw-normal text-uppercase">
                                {wholesaler.status === 'blocked' ? 'Unapproved' : wholesaler.status}
                            </Badge>
                        </td>
                        <td className="px-4 py-3 text-secondary">
                            {wholesaler.created_at ? new Date(wholesaler.created_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-end">
                            <div className="d-flex justify-content-end gap-2">
                                <OverlayTrigger placement="top" overlay={<Tooltip>View Orders</Tooltip>}>
                                    <Button 
                                        variant="light" 
                                        className="btn-icon text-primary rounded-circle border-0 shadow-sm"
                                        size="sm" 
                                        style={{ width: '32px', height: '32px' }}
                                        onClick={() => navigate(`/orders?type=wholesaler&wholesalerId=${wholesaler.id}`)}
                                    >
                                        <Eye size={16} />
                                    </Button>
                                </OverlayTrigger>

                                <OverlayTrigger placement="top" overlay={<Tooltip>View Details</Tooltip>}>
                                    <Button 
                                        variant="light" 
                                        className="btn-icon text-info rounded-circle border-0 shadow-sm"
                                        size="sm" 
                                        style={{ width: '32px', height: '32px' }}
                                        onClick={() => handleViewDetails(wholesaler)}
                                    >
                                        <FileText size={16} />
                                    </Button>
                                </OverlayTrigger>

                                {wholesaler.status === 'pending' && (
                                    <>
                                        <OverlayTrigger placement="top" overlay={<Tooltip>Approve</Tooltip>}>
                                            <Button 
                                                variant="light" 
                                                className="btn-icon text-success rounded-circle border-0 shadow-sm"
                                                size="sm" 
                                                style={{ width: '32px', height: '32px' }}
                                                onClick={() => handleStatusUpdate(wholesaler.id, 'approved')}
                                            >
                                                <Check size={16} />
                                            </Button>
                                        </OverlayTrigger>
                                        <OverlayTrigger placement="top" overlay={<Tooltip>Reject</Tooltip>}>
                                            <Button 
                                                variant="light" 
                                                className="btn-icon text-danger rounded-circle border-0 shadow-sm"
                                                size="sm" 
                                                style={{ width: '32px', height: '32px' }}
                                                onClick={() => handleStatusUpdate(wholesaler.id, 'rejected')}
                                            >
                                                <X size={16} />
                                            </Button>
                                        </OverlayTrigger>
                                    </>
                                )}
                                {wholesaler.status === 'approved' && (
                                    <Button variant="outline-dark" size="sm" onClick={() => handleStatusUpdate(wholesaler.id, 'blocked')}>
                                        Unapprove
                                    </Button>
                                )}
                                {wholesaler.status === 'blocked' && (
                                    <Button variant="outline-success" size="sm" onClick={() => handleStatusUpdate(wholesaler.id, 'approved')}>
                                        Approve
                                    </Button>
                                )}
                            </div>
                        </td>
                        </tr>
                    ))}
                    {wholesalers.length === 0 && (
                        <tr>
                            <td colSpan="7" className="text-center py-5 text-muted">
                                <div className="d-flex flex-column align-items-center">
                                    <i className="bi bi-shop fs-1 mb-3 opacity-50"></i>
                                    <p className="mb-0">No wholesalers found.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                    </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        )}

        {totalPages > 1 && (
            <PaginationComponent 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={handlePageChange} 
            />
        )}

        {/* Details Modal */}
        <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Wholesaler Details</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {currentWholesaler && (
                    <Row>
                        <Col md={6}>
                            <p><strong>Business Name:</strong> {currentWholesaler.business_name}</p>
                            <p><strong>Contact Name:</strong> {currentWholesaler.name}</p>
                            <p><strong>Email:</strong> {currentWholesaler.email}</p>
                            <p><strong>Phone:</strong> {currentWholesaler.phone}</p>
                            <p><strong>GST Number:</strong> {currentWholesaler.gst_number || 'N/A'}</p>
                            <p><strong>Verified:</strong> {currentWholesaler.is_verified ? 'Yes' : 'No'}</p>
                        </Col>
                        <Col md={6}>
                            <p><strong>Address:</strong> {currentWholesaler.address || 'N/A'}</p>
                            <p><strong>City:</strong> {currentWholesaler.city || 'N/A'}</p>
                            <p><strong>State:</strong> {currentWholesaler.state || 'N/A'}</p>
                            <p><strong>Pincode:</strong> {currentWholesaler.pincode || 'N/A'}</p>
                            <p><strong>Status:</strong> <Badge bg={getStatusBadge(currentWholesaler.status)}>{currentWholesaler.status}</Badge></p>
                            <p><strong>Documents:</strong> N/A</p>
                        </Col>
                    </Row>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                {currentWholesaler?.status === 'pending' && (
                    <>
                        <Button variant="danger" onClick={() => handleStatusUpdate(currentWholesaler.id, 'rejected')}>Reject</Button>
                        <Button variant="success" onClick={() => handleStatusUpdate(currentWholesaler.id, 'approved')}>Approve</Button>
                    </>
                )}
            </Modal.Footer>
        </Modal>
      </Container>
    </Layout>
  );
};

export default Wholesalers;
