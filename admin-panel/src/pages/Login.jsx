import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Container, Card, Form, Button, InputGroup, Spinner } from 'react-bootstrap';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import logo from '../assets/logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    
    if (result.success) {
      toast.success('Welcome back!');
      navigate('/dashboard');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="login-page vh-100 overflow-y-auto position-relative">
      {/* Background with overlay */}
      <div className="position-fixed top-0 start-0 w-100 h-100" 
           style={{ 
             background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
             zIndex: -1 
           }}>
        <div className="position-absolute top-0 start-0 w-100 h-100" 
             style={{ 
               backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(56, 189, 248, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)',
             }}>
        </div>
      </div>

      <Container className="min-vh-100 d-flex flex-column justify-content-center py-4">
        <div className="row justify-content-center">
          <div className="col-md-5 col-lg-4">
            <Card className="border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden', backdropFilter: 'blur(10px)', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
              <Card.Body className="p-5">
                <div className="text-center mb-4">
                  <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3 p-3 shadow-sm" style={{ width: '80px', height: '80px' }}>
                    <img src={logo} alt="Logo" className="img-fluid" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                  </div>
                  <h4 className="fw-bold text-dark mb-1">Welcome Back</h4>
                  <p className="text-muted small">Sign in to continue to Admin Panel</p>
                </div>

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-4">
                    <Form.Label className="text-muted small fw-semibold">EMAIL ADDRESS</Form.Label>
                    <InputGroup>
                      <InputGroup.Text className="bg-white border-end-0 text-muted">
                        <Mail size={18} />
                      </InputGroup.Text>
                      <Form.Control
                        type="email"
                        placeholder="name@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="border-start-0 ps-0 shadow-none"
                        style={{ height: '45px' }}
                      />
                    </InputGroup>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <div className="d-flex justify-content-between align-items-center">
                      <Form.Label className="text-muted small fw-semibold">PASSWORD</Form.Label>
                      <Link to="/forgot-password" style={{ fontSize: '12px', textDecoration: 'none' }}>Forgot?</Link>
                    </div>
                    <InputGroup>
                      <InputGroup.Text className="bg-white border-end-0 text-muted">
                        <Lock size={18} />
                      </InputGroup.Text>
                      <Form.Control
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="border-start-0 border-end-0 ps-0 shadow-none"
                        style={{ height: '45px' }}
                      />
                      <InputGroup.Text 
                        className="bg-white border-start-0 text-muted" 
                        style={{ cursor: 'pointer' }}
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </InputGroup.Text>
                    </InputGroup>
                  </Form.Group>

                  <Button 
                    variant="primary" 
                    type="submit" 
                    className="w-100 mb-3 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2"
                    style={{ borderRadius: '8px', background: 'linear-gradient(to right, #2563eb, #3b82f6)', border: 'none' }}
                    disabled={loading}
                  >
                    {loading ? <Spinner animation="border" size="sm" /> : <>Sign In <ArrowRight size={18} /></>}
                  </Button>
                  
                  <div className="text-center">
                    <p className="text-muted small mb-0">Don't have an account? <Link to="/register" className="fw-semibold text-decoration-none">Create account</Link></p>
                  </div>
                </Form>
              </Card.Body>
              <div className="card-footer bg-light border-0 text-center py-3">
                <small className="text-muted">&copy; {new Date().getFullYear()} Nirvikar Ayurveda. All rights reserved.</small>
              </div>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default Login;
