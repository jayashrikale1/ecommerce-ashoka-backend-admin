import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Container, Card, Table, Button, Modal, Form, Row, Col, Badge } from 'react-bootstrap';
import { Plus, Edit, Trash2 } from 'lucide-react';
import PaginationComponent from '../components/PaginationComponent';

const Coupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    min_order_value: '',
    usage_limit: '',
    start_date: '',
    end_date: '',
    active: true
  });

  useEffect(() => {
    fetchCoupons();
  }, [page, searchQuery]);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        search: searchQuery || undefined
      };
      const res = await api.get('/coupons', { params });
      setCoupons(res.data.coupons || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast.error('Failed to fetch coupons');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: '',
      min_order_value: '',
      usage_limit: '',
      start_date: '',
      end_date: '',
      active: true
    });
    setShowModal(true);
  };

  const openEdit = (coupon) => {
    setIsEditing(true);
    setEditingId(coupon.id);
    setFormData({
      code: coupon.code || '',
      discount_type: coupon.discount_type || 'percentage',
      discount_value: coupon.discount_value ?? '',
      min_order_value: coupon.min_order_value ?? '',
      usage_limit: coupon.usage_limit ?? '',
      start_date: coupon.start_date ? new Date(coupon.start_date).toISOString().slice(0, 10) : '',
      end_date: coupon.end_date ? new Date(coupon.end_date).toISOString().slice(0, 10) : '',
      active: !!coupon.active
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this coupon?')) return;
    try {
      await api.delete(`/coupons/${id}`);
      toast.success('Coupon deleted');
      fetchCoupons();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete coupon');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        discount_value: formData.discount_value ? Number(formData.discount_value) : 0,
        min_order_value: formData.min_order_value ? Number(formData.min_order_value) : 0,
        usage_limit: formData.usage_limit ? Number(formData.usage_limit) : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null
      };
      if (isEditing && editingId) {
        await api.put(`/coupons/${editingId}`, payload);
        toast.success('Coupon updated');
      } else {
        await api.post('/coupons', payload);
        toast.success('Coupon created');
      }
      setShowModal(false);
      fetchCoupons();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save coupon');
    }
  };

  return (
    <Layout>
      <Container fluid className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="mb-0">Coupons</h2>
          <Button variant="primary" onClick={openCreate} className="d-flex align-items-center">
            <Plus className="me-2" size={16} />
            Add Coupon
          </Button>
        </div>

        <Form className="mb-4" onSubmit={(e) => { e.preventDefault(); setPage(1); fetchCoupons(); }}>
          <Row>
            <Col md={8} lg={6}>
              <div className="d-flex gap-2">
                <Form.Control
                  type="text"
                  placeholder="Search by code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button type="submit" variant="outline-primary">Search</Button>
              </div>
            </Col>
          </Row>
        </Form>

        <Card className="shadow-sm border-0">
          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle">
                <thead className="bg-light">
                  <tr>
                    <th className="border-0 py-3 ps-4">Sr No</th>
                    <th className="border-0 py-3">Code</th>
                    <th className="border-0 py-3">Type</th>
                    <th className="border-0 py-3">Value</th>
                    <th className="border-0 py-3">Min Order</th>
                    <th className="border-0 py-3">Usage</th>
                    <th className="border-0 py-3">Active</th>
                    <th className="border-0 py-3 pe-4 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="text-center py-5 text-muted">Loading...</td>
                    </tr>
                  ) : coupons && coupons.length > 0 ? (
                    coupons.map((c, idx) => (
                      <tr key={c.id}>
                        <td className="ps-4">{(page - 1) * 10 + idx + 1}</td>
                        <td className="fw-medium">{c.code}</td>
                        <td className="text-capitalize">{c.discount_type}</td>
                        <td>{c.discount_type === 'percentage' ? `${c.discount_value}%` : `₹${c.discount_value}`}</td>
                        <td>{c.min_order_value ? `₹${c.min_order_value}` : '-'}</td>
                        <td>{c.usage_limit ? `${c.used_count}/${c.usage_limit}` : `${c.used_count}`}</td>
                        <td>
                          <Badge bg={c.active ? 'success' : 'secondary'}>{c.active ? 'Active' : 'Disabled'}</Badge>
                        </td>
                        <td className="text-end pe-4">
                          <Button
                            variant="light"
                            size="sm"
                            className="me-2"
                            onClick={() => openEdit(c)}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="light"
                            size="sm"
                            className="text-danger"
                            onClick={() => handleDelete(c.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center py-5 text-muted">No coupons found.</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>

        {totalPages > 1 && (
          <div className="d-flex justify-content-center mt-3 mb-3">
            <PaginationComponent 
              currentPage={page} 
              totalPages={totalPages} 
              onPageChange={setPage} 
            />
          </div>
        )}
      </Container>

      {/* Create/Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="md" centered>
        <Modal.Header closeButton>
          <Modal.Title>{isEditing ? 'Edit Coupon' : 'Add Coupon'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Label>Code</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="SAVE10"
                  required
                />
              </Col>
              <Col md={6}>
                <Form.Label>Discount Type</Form.Label>
                <Form.Select
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed</option>
                </Form.Select>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Label>Discount Value</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  placeholder="10"
                  required
                />
              </Col>
              <Col md={6}>
                <Form.Label>Min Order Value</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.min_order_value}
                  onChange={(e) => setFormData({ ...formData, min_order_value: e.target.value })}
                  placeholder="500"
                />
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Label>Usage Limit</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                  placeholder="100"
                />
              </Col>
              <Col md={6}>
                <Form.Label>Active</Form.Label>
                <Form.Select
                  value={formData.active ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, active: e.target.value === 'true' })}
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </Form.Select>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </Col>
              <Col md={6}>
                <Form.Label>End Date</Form.Label>
                <Form.Control
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </Col>
            </Row>

            <div className="d-flex justify-content-end">
              <Button variant="secondary" className="me-2" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" variant="primary">{isEditing ? 'Update' : 'Create'}</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </Layout>
  );
};

export default Coupons;
