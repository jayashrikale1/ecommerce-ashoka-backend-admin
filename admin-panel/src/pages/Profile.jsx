import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Container, Card, Form, Button, Row, Col } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Save } from 'lucide-react';

const Profile = () => {
  const { user, login, updateUser } = useAuth(); // login is used to update context if needed
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      setFormData({
        name: response.data.name || '',
        email: response.data.email || '',
        phone: response.data.phone || ''
      });
    } catch (error) {
      toast.error('Failed to fetch profile');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.put('/auth/profile', formData);
      toast.success(response.data.message);
      
      // Update local storage and context immediately
      const updatedUser = { ...user, ...formData };
      updateUser(updatedUser);
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Container fluid className="p-4">
        
        <Row className="justify-content-center">
          <Col md={8} lg={6}>
            <Card className="shadow-sm border-0">
              <Card.Body className="p-4">
                <div className="text-center mb-4">
                  <div className="avatar-circle mx-auto mb-3" style={{ width: '80px', height: '80px', fontSize: '32px' }}>
                    {formData.name ? formData.name.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <h4 className="mb-1">{formData.name}</h4>
                  <p className="text-muted">Administrator</p>
                </div>

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Full Name</Form.Label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">
                        <User size={18} className="text-muted" />
                      </span>
                      <Form.Control
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="border-start-0 ps-0"
                        required
                      />
                    </div>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Email Address</Form.Label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">
                        <Mail size={18} className="text-muted" />
                      </span>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="border-start-0 ps-0"
                        required
                      />
                    </div>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>Phone Number</Form.Label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">
                        <Phone size={18} className="text-muted" />
                      </span>
                      <Form.Control
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="border-start-0 ps-0"
                      />
                    </div>
                  </Form.Group>

                  <Button 
                    variant="primary" 
                    type="submit" 
                    className="w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </Layout>
  );
};

export default Profile;
