import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Trash2, Eye } from 'lucide-react';
import { Container, Row, Col, Card, Table, Button, Form, OverlayTrigger, Tooltip, Badge } from 'react-bootstrap';
import PaginationComponent from '../components/PaginationComponent';
import { useNavigate } from 'react-router-dom';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (query = '', page = 1) => {
    try {
      const response = await api.get('/users', { params: { search: query, page, limit: 10 } });
      setUsers(response.data.users);
      setTotalPages(response.data.totalPages);
      setCurrentPage(response.data.currentPage);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    fetchUsers(searchQuery, page);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(searchQuery, 1);
  };


  return (
    <Layout>
      <Container fluid className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="mb-0">Registered Users</h2>
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
             <Form onSubmit={handleSearch}>
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
                     <Col xs="auto">
                        <Button type="submit" variant="primary">Search</Button>
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
                    <th className="px-4 py-3 border-0">Status</th>
                    <th className="px-4 py-3 border-0 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody className="border-top-0">
                  {users.map((user, index) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3 text-muted">{(currentPage - 1) * 10 + index + 1}</td>
                      <td className="px-4 py-3 fw-bold text-dark">{user.name || '-'}</td>
                      <td className="px-4 py-3 text-secondary">{user.email || '-'}</td>
                      <td className="px-4 py-3 text-secondary">{user.phone || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge bg={user.status === 'active' ? 'success' : 'secondary'} pill className="px-3 py-2 fw-normal">
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
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center py-5 text-muted">
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
    </Layout>
  );
};

export default Users;
