import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Layers, LogOut, KeyRound, Settings, User, Users, Briefcase, ChevronDown, ChevronRight, MessageSquare, ShoppingCart, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Nav, Collapse } from 'react-bootstrap';
import logo from '../assets/logo.png';

const Sidebar = ({ className = '', style = {}, onNavigate }) => {
  const { logout } = useAuth();
  const location = useLocation();
  
  // Check if current path is a setting path to auto-open
  const isSettingsActive = location.pathname === '/profile' || location.pathname === '/change-password';
  const [openSettings, setOpenSettings] = useState(isSettingsActive);

  const isActive = (path) => location.pathname === path;

  const toggleSettings = () => setOpenSettings(!openSettings);

  return (
    <div 
      className={`d-flex flex-column flex-shrink-0 p-4 text-white sidebar-wrapper ${className}`} 
      style={{ minHeight: '100%', ...style }}
    >
      <Link to="/" className="d-flex align-items-center justify-content-center mb-5 text-white text-decoration-none w-100">
        <div className="bg-white p-2 rounded-circle shadow-lg d-flex align-items-center justify-content-center" style={{ width: '110px', height: '110px' }}>
          <img 
            src={logo} 
            alt="Ecommerce Ashoka" 
            style={{ width: '90px', height: '90px', objectFit: 'contain' }}
          />
        </div>
      </Link>
      
      <Nav variant="pills" className="flex-column mb-auto gap-2">
        <Nav.Item>
          <Link
            to="/dashboard"
            className={`nav-link-custom ${isActive('/dashboard') ? 'active' : ''} text-decoration-none`}
            onClick={onNavigate}
          >
            <LayoutDashboard className="me-3" size={20} />
            <span>Dashboard</span>
          </Link>
        </Nav.Item>

        <Nav.Item>
          <Link
            to="/categories"
            className={`nav-link-custom ${isActive('/categories') ? 'active' : ''} text-decoration-none`}
            onClick={onNavigate}
          >
            <Layers className="me-3" size={20} />
            <span>Categories</span>
          </Link>
        </Nav.Item>

        <Nav.Item>
          <Link
            to="/products"
            className={`nav-link-custom ${isActive('/products') ? 'active' : ''} text-decoration-none`}
            onClick={onNavigate}
          >
            <ShoppingBag className="me-3" size={20} />
            <span>Products</span>
          </Link>
        </Nav.Item>

        <Nav.Item>
          <Link
            to="/orders"
            className={`nav-link-custom ${isActive('/orders') ? 'active' : ''} text-decoration-none`}
            onClick={onNavigate}
          >
            <ShoppingCart className="me-3" size={20} />
            <span>Orders</span>
          </Link>
        </Nav.Item>

        <Nav.Item>
          <Link
            to="/coupons"
            className={`nav-link-custom ${isActive('/coupons') ? 'active' : ''} text-decoration-none`}
            onClick={onNavigate}
          >
            <Tag className="me-3" size={20} />
            <span>Coupons</span>
          </Link>
        </Nav.Item>
        
        <Nav.Item>
          <Link
            to="/reviews"
            className={`nav-link-custom ${isActive('/reviews') ? 'active' : ''} text-decoration-none`}
            onClick={onNavigate}
          >
            <MessageSquare className="me-3" size={20} />
            <span>Reviews</span>
          </Link>
        </Nav.Item>

        <Nav.Item>
          <Link
            to="/users"
            className={`nav-link-custom ${isActive('/users') ? 'active' : ''} text-decoration-none`}
            onClick={onNavigate}
          >
            <Users className="me-3" size={20} />
            <span>Users</span>
          </Link>
        </Nav.Item>

        <Nav.Item>
          <Link
            to="/wholesalers"
            className={`nav-link-custom ${isActive('/wholesalers') ? 'active' : ''} text-decoration-none`}
            onClick={onNavigate}
          >
            <Briefcase className="me-3" size={20} />
            <span>Wholesalers</span>
          </Link>
        </Nav.Item>

        {/* Settings Dropdown */}
        <Nav.Item>
          <div className="nav-item-wrapper">
            <div 
              className={`nav-link-custom ${openSettings ? 'active' : ''} d-flex justify-content-between align-items-center`}
              onClick={toggleSettings}
              style={{ cursor: 'pointer' }}
            >
              <div className="d-flex align-items-center">
                <Settings className="me-3" size={20} />
                <span>Settings</span>
              </div>
              {openSettings ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>
            
            <Collapse in={openSettings}>
              <div className="mt-2 ms-4 ps-2">
                <Link
                    to="/profile"
                    className={`nav-link-custom py-2 mb-1 ${isActive('/profile') ? 'active' : ''} text-decoration-none`}
                    style={{ fontSize: '0.95rem' }}
                    onClick={onNavigate}
                >
                    <User className="me-3" size={18} />
                    <span>Profile Update</span>
                </Link>
                <Link
                    to="/change-password"
                    className={`nav-link-custom py-2 ${isActive('/change-password') ? 'active' : ''} text-decoration-none`}
                    style={{ fontSize: '0.95rem' }}
                    onClick={onNavigate}
                >
                    <KeyRound className="me-3" size={18} />
                    <span>Change Password</span>
                </Link>
              </div>
            </Collapse>
          </div>
        </Nav.Item>
      </Nav>
      
      <div className="mt-5 pt-3 border-top border-secondary border-opacity-25">
        <button
          onClick={logout}
          className="btn w-100 d-flex align-items-center justify-content-center logout-btn"
        >
          <LogOut className="me-2" size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
