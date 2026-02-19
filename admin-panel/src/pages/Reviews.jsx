import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Container, Card, Table, Button, Form, Row, Col, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import PaginationComponent from '../components/PaginationComponent';
import { Trash2 } from 'lucide-react';

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('pending');
  const [productId, setProductId] = useState('');

  useEffect(() => {
    fetchReviews();
  }, [page, status, productId]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (status) params.status = status;
      if (productId) params.productId = productId;
      const resp = await api.get('/reviews/admin', { params });
      setReviews(resp.data.reviews);
      setTotalPages(resp.data.totalPages);
    } catch (error) {
      toast.error('Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await api.put(`/reviews/admin/${id}/status`, { status: newStatus });
      toast.success(`Review ${newStatus}`);
      fetchReviews();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update review');
    }
  };

  const deleteReview = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await api.delete(`/reviews/admin/${id}`);
      toast.success('Review deleted');
      fetchReviews();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete review');
    }
  };

  return (
    <Layout>
      <Container fluid className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <h2 className="mb-0">Reviews Moderation</h2>
        </div>

        <Form className="mb-4">
          <Row className="g-3">
            <Col md={4} lg={3}>
              <Form.Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </Form.Select>
            </Col>
            <Col md={4} lg={3}>
              <Form.Control 
                type="number" 
                placeholder="Filter by Product ID"
                value={productId}
                onChange={(e) => { setProductId(e.target.value); setPage(1); }}
              />
            </Col>
          </Row>
        </Form>

        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          <Card className="shadow-sm border-0">
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="mb-0 align-middle">
                  <thead className="bg-light">
                    <tr>
                      <th className="px-4 py-3">Sr No</th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">By</th>
                      <th className="px-4 py-3">Rating</th>
                      <th className="px-4 py-3">Comment</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map((r, index) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 text-muted">{(page - 1) * 10 + index + 1}</td>
                        <td className="px-4 py-3 fw-medium">{r.product?.name || `#${r.product_id}`}</td>
                        <td className="px-4 py-3">
                          {r.customer ? (
                            <Badge bg="secondary">User</Badge>
                          ) : (
                            <Badge bg="dark">Wholesaler</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">{r.rating}</td>
                        <td className="px-4 py-3 text-muted">{r.comment || '-'}</td>
                        <td className="px-4 py-3">
                          <Badge bg={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : 'warning'}>
                            {r.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-end">
                          <div className="d-flex justify-content-end gap-2">
                            <OverlayTrigger placement="top" overlay={<Tooltip>Delete</Tooltip>}>
                              <Button variant="outline-secondary" size="sm" onClick={() => deleteReview(r.id)}>
                                <Trash2 size={16} />
                              </Button>
                            </OverlayTrigger>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {reviews.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center py-4 text-muted">No reviews found.</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        )}

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
    </Layout>
  );
};

export default Reviews;
