import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Container, Card, Form, Button, InputGroup, Spinner } from 'react-bootstrap';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import logo from '../assets/logo.png';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLink, setResetLink] = useState(null);
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);
    
    if (result.success) {
      toast.success(result.message);
      if (result.resetToken) {
        setResetLink(`${window.location.origin}/reset-password?token=${result.resetToken}`);
      }
    } else {
      toast.error(result.message);
    }
  };

  if (resetLink) {
    return (
      <div className="forgot-password-page vh-100 overflow-y-auto position-relative">
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
                <Card.Body className="p-5 text-center">
                  <div className="bg-success bg-opacity-10 text-success rounded-circle d-inline-flex align-items-center justify-content-center mb-3 p-3 shadow-sm" style={{ width: '80px', height: '80px' }}>
                    <Mail size={32} />
                  </div>
                  <h4 className="fw-bold text-dark mb-3">Check your Email</h4>
                  <p className="text-muted small mb-4">
                    (Mock Mode) Since email service is not configured, here is your reset link:
                  </p>
                  <div className="alert alert-secondary text-break user-select-all" role="alert">
                    <a href={resetLink} className="text-decoration-none">{resetLink}</a>
                  </div>
                  <Link to="/login" className="btn btn-primary w-100 py-2 mt-3">Back to Login</Link>
                </Card.Body>
              </Card>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="forgot-password-page vh-100 overflow-y-auto position-relative">
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
                  <h4 className="fw-bold text-dark mb-1">Forgot Password?</h4>
                  <p className="text-muted small">Enter your email to reset your password</p>
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
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="name@company.com"
                        className="border-start-0 ps-0 shadow-none"
                        style={{ height: '45px' }}
                      />
                    </InputGroup>
                  </Form.Group>

                  <Button 
                    variant="primary" 
                    type="submit" 
                    className="w-100 mb-3 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2"
                    style={{ borderRadius: '8px', background: 'linear-gradient(to right, #2563eb, #3b82f6)', border: 'none' }}
                    disabled={loading}
                  >
                    {loading ? <Spinner animation="border" size="sm" /> : <>Reset Password <ArrowRight size={18} /></>}
                  </Button>
                  
                  <div className="text-center">
                    <Link to="/login" className="text-decoration-none d-inline-flex align-items-center gap-1 text-muted small fw-semibold">
                      <ArrowLeft size={14} /> Back to Login
                    </Link>
                  </div>
                </Form>
              </Card.Body>
              <div className="card-footer bg-light border-0 text-center py-3">
                <small className="text-muted">&copy; {new Date().getFullYear()} Ecommerce Ashoka. All rights reserved.</small>
              </div>
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default ForgotPassword;
