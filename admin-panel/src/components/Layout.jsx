import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { Container, Navbar, Button, Offcanvas } from 'react-bootstrap';
import { Menu } from 'lucide-react';

const Layout = ({ children }) => {
    const { user } = useAuth();
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);

    const handleClose = () => setShowMobileSidebar(false);
    const handleShow = () => setShowMobileSidebar(true);

  return (
    <div className="layout-root">
      {/* Desktop Sidebar */}
      <div className="sidebar-scroll-container">
          <Sidebar />
      </div>

      {/* Mobile Sidebar (Offcanvas) */}
      <Offcanvas show={showMobileSidebar} onHide={handleClose} responsive="lg" className="d-md-none bg-dark text-white" style={{ maxWidth: '280px' }}>
        <Offcanvas.Header closeButton closeVariant="white">
          <Offcanvas.Title>Menu</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0">
            <Sidebar 
                style={{ height: '100%', minHeight: '0' }} 
                onNavigate={handleClose} 
            />
        </Offcanvas.Body>
      </Offcanvas>

      <div className="flex-grow-1 d-flex flex-column h-100 overflow-hidden" style={{ minWidth: 0 }}>
        <Navbar className="navbar-custom px-3 px-md-4 justify-content-between">
            <div className="d-flex align-items-center">
                <Button 
                    variant="link" 
                    className="d-md-none p-0 me-3 text-dark" 
                    onClick={handleShow}
                >
                    <Menu size={24} />
                </Button>
                <Navbar.Brand className="fw-bold text-dark d-md-none">Ecommerce Ashoka</Navbar.Brand>
                <div className="d-none d-md-block">
                    <h4 className="m-0 fw-bold text-dark" style={{ letterSpacing: '-0.5px' }}>Admin Panel</h4>
                    <small className="text-muted">Manage your store efficiently</small>
                </div>
            </div>
            
            <div className="d-flex align-items-center">
                <div className="user-profile-badge d-flex align-items-center gap-3">
                    <div className="d-none d-sm-block text-end">
                        <div className="fw-bold text-dark" style={{ fontSize: '0.9rem' }}>{user?.name || 'Admin User'}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>Administrator</div>
                    </div>
                    <div className="avatar-circle shadow-sm">
                        {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                    </div>
                </div>
            </div>
        </Navbar>
        <div className="flex-grow-1 overflow-y-auto">
            <Container fluid className="p-3 p-md-4">
              {children}
            </Container>
        </div>
      </div>
    </div>
  );
};

export default Layout;
