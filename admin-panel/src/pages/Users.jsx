import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Trash2, Eye, Edit as EditIcon } from 'lucide-react';
import { Container, Row, Col, Card, Table, Button, Form, OverlayTrigger, Tooltip, Badge, Modal, InputGroup } from 'react-bootstrap';
import PaginationComponent from '../components/PaginationComponent';
import { useNavigate } from 'react-router-dom';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editStatus, setEditStatus] = useState('active');
  const navigate = useNavigate();

  const fetchUsers = async (query = '', page = 1) => {
    try {
      setLoading(true);
      const params = { search: query, page, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      if (verifiedFilter) params.verified = verifiedFilter;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const response = await api.get('/users', { params });
      setUsers(response.data.users);
      setTotalPages(response.data.totalPages);
      setCurrentPage(response.data.currentPage);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(searchQuery, 1);
  }, [searchQuery, statusFilter, verifiedFilter, fromDate, toDate]);

  const handlePageChange = (page) => {
    fetchUsers(searchQuery, page);
  };
  const handleExport = async () => {
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;
      if (verifiedFilter) params.verified = verifiedFilter;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const resp = await api.get('/users/admin/export', { params, responseType: 'blob' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(resp.data);
      link.href = url;
      link.download = 'users-export.csv';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(link);
      }, 500);
    } catch {
      toast.error('Failed to export users');
    }
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setEditPhone(user.phone || '');
    setEditStatus(user.status || 'active');
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingEdit(true);
    try {
      await api.put(`/users/admin/${editingUser.id}`, {
        name: editName || null,
        email: editEmail || null,
        phone: editPhone || null,
        status: editStatus || null
      });
      toast.success('User updated successfully');
      setShowEditModal(false);
      setEditingUser(null);
      fetchUsers(searchQuery, currentPage);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user');
    } finally {
      setSavingEdit(false);
    }
  };


  return (
    <Layout>
      <Container fluid className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="mb-0">Registered Users</h2>
          <div>
            <Button variant="outline-secondary" onClick={handleExport}>Export CSV</Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
          </div>
        ) : (
        <Card className="shadow-sm border-0 rounded-3">
          <Card.Header className="bg-white py-3 border-bottom-0">
            <Form>
                <Row className="g-2 align-items-center">
                    <Col xs={12} md={6} lg={4}>
                        <div className="position-relative">
                            <Form.Control
                                type="text"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="ps-4"
                            />
                             <div className="position-absolute top-50 start-0 translate-middle-y ms-2 text-muted">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-search" viewBox="0 0 16 16">
                                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                                </svg>
                            </div>
                        </div>
                    </Col>
                    <Col xs={12} md={3} lg={2}>
                      <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="blocked">Blocked</option>
                      </Form.Select>
                    </Col>
                    <Col xs={12} md={3} lg={2}>
                      <Form.Select value={verifiedFilter} onChange={(e) => setVerifiedFilter(e.target.value)}>
                        <option value="">Verified: Any</option>
                        <option value="true">Verified</option>
                        <option value="false">Unverified</option>
                      </Form.Select>
                    </Col>
                    <Col xs={6} md={3} lg={2}>
                      <Form.Control type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                    </Col>
                    <Col xs={6} md={3} lg={2}>
                      <Form.Control type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                    </Col>
                </Row>
            </Form>
          </Card.Header>
          <Card.Body className="p-0">
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle">
                <thead className="bg-light text-uppercase small text-muted">
                  <tr>
                    <th className="px-4 py-3 border-0">Sr No.</th>
                    <th className="px-4 py-3 border-0">Name</th>
                    <th className="px-4 py-3 border-0">Email</th>
                    <th className="px-4 py-3 border-0">Phone</th>
                    <th className="px-4 py-3 border-0">Joined</th>
                    <th className="px-4 py-3 border-0">Status</th>
                    <th className="px-4 py-3 border-0 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody className="border-top-0">
                  {users.map((user, index) => {
                    const joined = user.created_at || user.createdAt;
                    return (
                    <tr key={user.id}>
                      <td className="px-4 py-3 text-muted">{(currentPage - 1) * 10 + index + 1}</td>
                      <td className="px-4 py-3 fw-bold text-dark">{user.name || '-'}</td>
                      <td className="px-4 py-3 text-secondary">{user.email || '-'}</td>
                      <td className="px-4 py-3 text-secondary">{user.phone || '-'}</td>
                      <td className="px-4 py-3 text-secondary">
                        {joined ? new Date(joined).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge bg={user.status === 'active' ? 'success' : user.status === 'blocked' ? 'danger' : 'secondary'} pill className="px-3 py-2 fw-normal">
                            {user.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-end">
                        <div className="d-flex justify-content-end gap-2">
                          <OverlayTrigger placement="top" overlay={<Tooltip>View Orders</Tooltip>}>
                            <Button
                              variant="light"
                              className="btn-icon text-primary rounded-circle border-0 shadow-sm"
                              size="sm"
                              style={{ width: '32px', height: '32px' }}
                              onClick={() => navigate(`/orders?type=customer&userId=${user.id}`)}
                            >
                              <Eye size={16} />
                            </Button>
                          </OverlayTrigger>

                          <OverlayTrigger placement="top" overlay={<Tooltip>Edit User</Tooltip>}>
                            <Button
                              variant="light"
                              className="btn-icon text-success rounded-circle border-0 shadow-sm"
                              size="sm"
                              style={{ width: '32px', height: '32px' }}
                              onClick={() => openEdit(user)}
                            >
                              <EditIcon size={16} />
                            </Button>
                          </OverlayTrigger>
                          <OverlayTrigger placement="top" overlay={<Tooltip>Delete User</Tooltip>}>
                            <Button
                              variant="light"
                              className="btn-icon text-danger rounded-circle border-0 shadow-sm"
                              size="sm"
                              style={{ width: '32px', height: '32px' }}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </OverlayTrigger>
                        </div>
                      </td>
                    </tr>
                  )})}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-muted">
                        <div className="d-flex flex-column align-items-center">
                            <i className="bi bi-people fs-1 mb-3 opacity-50"></i>
                            <p className="mb-0">No users found.</p>
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
          <div className="d-flex justify-content-center mt-3 mb-3">
            <PaginationComponent 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={handlePageChange} 
            />
          </div>
        )}
      </Container>
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Form onSubmit={handleSaveEdit}>
          <Modal.Header closeButton>
            <Modal.Title>Edit User Details</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Name"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Email"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Phone</Form.Label>
              <Form.Control
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="Phone"
              />
            </Form.Group>
            <Form.Group className="mb-0">
              <Form.Label>Status</Form.Label>
              <Form.Select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blocked">Blocked</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={savingEdit}>
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Layout>
  );
};

export default Users;
