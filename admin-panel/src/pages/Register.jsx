import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Container, Card, Form, Button, InputGroup, Spinner } from 'react-bootstrap';
import { Mail, Lock, User, Phone, ArrowRight, Eye, EyeOff } from 'lucide-react';
import logo from '../assets/logo.png';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'admin' // Default
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
      setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting registration form:", formData);
    
    // Basic client-side validation
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const result = await register(formData);
      console.log("Registration result:", result);
      
      if (result.success) {
        toast.success('Registration successful. Please login.');
        navigate('/login');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page vh-100 overflow-y-auto position-relative">
      {/* Background with overlay */}
      <div className="position-fixed top-0 start-0 w-100 h-100" 
           style={{ 
             background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
             zIndex: 0
           }}>
        <div className="position-absolute top-0 start-0 w-100 h-100" 
             style={{ 
               backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(56, 189, 248, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)',
             }}>
        </div>
      </div>

      <Container className="min-vh-100 d-flex flex-column justify-content-center py-4 position-relative px-3 px-sm-4" style={{ zIndex: 1 }}>
        <div className="row justify-content-center">
          <div className="col-12 col-sm-10 col-md-8 col-lg-6 col-xl-5">
            <Card className="border-0 shadow-lg" 
                  style={{ 
                    borderRadius: '12px', 
                    overflow: 'hidden', 
                    backdropFilter: 'blur(10px)', 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)' 
                  }}>
              <Card.Body className="p-3 p-sm-4 p-md-5">
                <div className="text-center mb-3 mb-sm-4">
                  <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-2 mb-sm-3 p-2 p-sm-3 shadow-sm" 
                       style={{ 
                         width: '60px', 
                         height: '60px',
                         '@media (min-width: 576px)': {
                           width: '80px',
                           height: '80px'
                         }
                       }}>
                    <img src={logo} alt="Logo" className="img-fluid" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                  </div>
                  <h4 className="fw-bold text-dark mb-1 fs-5 fs-sm-4">Create Account</h4>
                  <p className="text-muted small mb-0" style={{ fontSize: '0.85rem' }}>Join Ecommerce Ashoka Admin Panel</p>
                </div>

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-2 mb-sm-3">
                    <Form.Label className="text-muted small fw-semibold mb-1" style={{ fontSize: '0.75rem' }}>FULL NAME</Form.Label>
                    <InputGroup>
                      <InputGroup.Text className="bg-white border-end-0 text-muted d-none d-sm-flex">
                        <User size={18} />
                      </InputGroup.Text>
                      <InputGroup.Text className="bg-white border-end-0 text-muted d-flex d-sm-none">
                        <User size={16} />
                      </InputGroup.Text>
                      <Form.Control
                        type="text"
                        name="name"
                        placeholder="john Doe"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="border-start-0 ps-0 shadow-none"
                        style={{ height: '40px' }}
                      />
                    </InputGroup>
                  </Form.Group>

                  <Form.Group className="mb-2 mb-sm-3">
                    <Form.Label className="text-muted small fw-semibold mb-1" style={{ fontSize: '0.75rem' }}>EMAIL ADDRESS</Form.Label>
                    <InputGroup>
                      <InputGroup.Text className="bg-white border-end-0 text-muted d-none d-sm-flex">
                        <Mail size={18} />
                      </InputGroup.Text>
                      <InputGroup.Text className="bg-white border-end-0 text-muted d-flex d-sm-none">
                        <Mail size={16} />
                      </InputGroup.Text>
                      <Form.Control
                        type="email"
                        name="email"
                        placeholder="name@company.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="border-start-0 ps-0 shadow-none"
                        style={{ height: '40px' }}
                      />
                    </InputGroup>
                  </Form.Group>

                  <Form.Group className="mb-2 mb-sm-3">
                    <Form.Label className="text-muted small fw-semibold mb-1" style={{ fontSize: '0.75rem' }}>PHONE NUMBER</Form.Label>
                    <InputGroup>
                      <InputGroup.Text className="bg-white border-end-0 text-muted d-none d-sm-flex">
                        <Phone size={18} />
                      </InputGroup.Text>
                      <InputGroup.Text className="bg-white border-end-0 text-muted d-flex d-sm-none">
                        <Phone size={16} />
                      </InputGroup.Text>
                      <Form.Control
                        type="text"
                        name="phone"
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={handleChange}
                        className="border-start-0 ps-0 shadow-none"
                        style={{ height: '40px' }}
                      />
                    </InputGroup>
                  </Form.Group>

                  <Form.Group className="mb-3 mb-sm-4">
                    <Form.Label className="text-muted small fw-semibold mb-1" style={{ fontSize: '0.75rem' }}>PASSWORD</Form.Label>
                    <InputGroup>
                      <InputGroup.Text className="bg-white border-end-0 text-muted d-none d-sm-flex">
                        <Lock size={18} />
                      </InputGroup.Text>
                      <InputGroup.Text className="bg-white border-end-0 text-muted d-flex d-sm-none">
                        <Lock size={16} />
                      </InputGroup.Text>
                      <Form.Control
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="Create a strong password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        className="border-start-0 border-end-0 ps-0 shadow-none"
                        style={{ height: '40px' }}
                      />
                      <InputGroup.Text 
                        className="bg-white border-start-0 text-muted" 
                        style={{ cursor: 'pointer' }}
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <>
                            <EyeOff size={18} className="d-none d-sm-inline" />
                            <EyeOff size={16} className="d-inline d-sm-none" />
                          </>
                        ) : (
                          <>
                            <Eye size={18} className="d-none d-sm-inline" />
                            <Eye size={16} className="d-inline d-sm-none" />
                          </>
                        )}
                      </InputGroup.Text>
                    </InputGroup>
                  </Form.Group>

                  <Button 
                    variant="primary" 
                    type="submit" 
                    className="w-100 mb-2 mb-sm-3 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2"
                    style={{ 
                      borderRadius: '8px', 
                      background: 'linear-gradient(to right, #2563eb, #3b82f6)', 
                      border: 'none',
                      fontSize: '0.95rem',
                      minHeight: '44px'
                    }}
                    disabled={loading}
                  >
                    {loading ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      <>
                        <span className="d-none d-sm-inline">Create Account</span>
                        <span className="d-inline d-sm-none">Register</span>
                        <ArrowRight size={18} className="d-none d-sm-inline" />
                        <ArrowRight size={16} className="d-inline d-sm-none" />
                      </>
                    )}
                  </Button>
                  
                  <div className="text-center">
                    <p className="text-muted small mb-0" style={{ fontSize: '0.85rem' }}>
                      Already have an account?{' '}
                      <Link to="/login" className="fw-semibold text-decoration-none">Sign in</Link>
                    </p>
                  </div>
                </Form>
              </Card.Body>
              <div className="card-footer bg-light border-0 text-center py-2 py-sm-3">
                <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                  &copy; {new Date().getFullYear()} Nirvikar Ayurveda. All rights reserved.
                </small>
              </div>
            </Card>
          </div>
        </div>
      </Container>

      {/* Additional CSS for better mobile experience */}
      <style jsx>{`
        @media (max-width: 575.98px) {
          .card {
            border-radius: 12px !important;
          }
          
          input::placeholder {
            font-size: 0.85rem;
          }
          
          .form-control {
            font-size: 0.9rem;
          }
        }
        
        @media (max-width: 375px) {
          .card-body {
            padding: 1.25rem !important;
          }
          
          input::placeholder {
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Register;