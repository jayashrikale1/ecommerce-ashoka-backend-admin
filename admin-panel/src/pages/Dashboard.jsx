import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';
import { Container, Row, Col, Card, Spinner, Table, Badge } from 'react-bootstrap';
import { ShoppingBag, Users, Layers, TrendingUp, AlertCircle, ShoppingCart, Briefcase } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCategories: 0,
    totalUsers: 0,
    totalWholesalers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    lowStockCount: 0,
    recentOrders: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Layout>
        <Container fluid className="p-4 d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
            <Spinner animation="border" variant="primary" />
        </Container>
      </Layout>
    );
  }

  const StatCard = ({ title, value, icon: Icon, color, link, subValue }) => (
    <Card 
      className="shadow-sm h-100 border-0" 
      onClick={() => link && navigate(link)} 
      style={{ cursor: link ? 'pointer' : 'default' }}
    >
      <Card.Body className="d-flex align-items-center">
        <div className={`rounded-circle p-3 me-3 bg-${color} bg-opacity-10`}>
          <Icon size={24} className={`text-${color}`} />
        </div>
        <div>
          <Card.Subtitle className="mb-1 text-muted">{title}</Card.Subtitle>
          <Card.Title className="mb-0 fw-bold">{value}</Card.Title>
          {subValue && <small className="text-muted">{subValue}</small>}
        </div>
      </Card.Body>
    </Card>
  );

  return (
    <Layout>
      <Container fluid className="p-4">
        <h2 className="mb-4 fw-bold text-dark">Dashboard Overview</h2>
        
        {/* Stats Row 1 */}
        <Row className="g-4 mb-4">
          <Col md={3} sm={6}>
            <StatCard 
              title="Total Revenue" 
              value={`₹${stats.totalRevenue.toLocaleString()}`} 
              icon={TrendingUp} 
              color="success" 
            />
          </Col>
          <Col md={3} sm={6}>
            <StatCard 
              title="Total Orders" 
              value={stats.totalOrders} 
              icon={ShoppingCart} 
              color="primary" 
              link="/orders"
            />
          </Col>
          <Col md={3} sm={6}>
            <StatCard 
              title="Products" 
              value={stats.totalProducts} 
              icon={ShoppingBag} 
              color="info" 
              link="/products"
            />
          </Col>
           <Col md={3} sm={6}>
            <StatCard 
              title="Low Stock" 
              value={stats.lowStockCount} 
              icon={AlertCircle} 
              color="danger" 
              link="/products"
              subValue={stats.lowStockCount > 0 ? "Items need attention" : "Stock looks good"}
            />
          </Col>
        </Row>

        {/* Stats Row 2 */}
        <Row className="g-4 mb-5">
           <Col md={3} sm={6}>
            <StatCard 
              title="Categories" 
              value={stats.totalCategories} 
              icon={Layers} 
              color="secondary" 
              link="/categories"
            />
          </Col>
          <Col md={3} sm={6}>
            <StatCard 
              title="Customers" 
              value={stats.totalUsers} 
              icon={Users} 
              color="warning" 
              link="/users"
            />
          </Col>
          <Col md={3} sm={6}>
            <StatCard 
              title="Wholesalers" 
              value={stats.totalWholesalers} 
              icon={Briefcase} 
              color="dark" 
              link="/wholesalers"
            />
          </Col>
        </Row>

        {/* Recent Orders Section */}
        <div className="mt-5">
          <div className="d-flex justify-content-between align-items-center mb-4">
             <h3 className="fw-bold text-dark m-0">Recent Orders</h3>
             <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/orders')}>View All</button>
          </div>
          
          <Card className="shadow-sm border-0">
             <Card.Body className="p-0">
               <div className="table-responsive">
                 <Table hover className="mb-0 align-middle">
                   <thead className="bg-light">
                     <tr>
                       <th className="border-0 py-3 ps-4">Sr No</th>
                       <th className="border-0 py-3 ps-4">Order ID</th>
                       <th className="border-0 py-3">Customer</th>
                       <th className="border-0 py-3">Amount</th>
                       <th className="border-0 py-3">Status</th>
                       <th className="border-0 py-3">Payment</th>
                       <th className="border-0 py-3 pe-4">Date</th>
                     </tr>
                   </thead>
                   <tbody>
                     {stats.recentOrders && stats.recentOrders.length > 0 ? (
                       stats.recentOrders.map((order, index) => (
                         <tr key={order.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/orders')}>
                           <td className="ps-4 text-muted">{index + 1}</td>
                           <td className="ps-4 fw-medium">#{order.id}</td>
                           <td>
                             {order.customer ? order.customer.name : (order.wholesaler ? order.wholesaler.business_name : 'Unknown')}
                           </td>
                           <td className="fw-bold">₹{order.total_amount}</td>
                           <td>
                             <Badge bg={
                               order.status === 'delivered' ? 'success' : 
                               order.status === 'cancelled' ? 'danger' : 
                               order.status === 'shipped' ? 'info' : 'warning'
                             }>
                               {order.status}
                             </Badge>
                           </td>
                            <td>
                             <Badge bg={order.payment_status === 'paid' ? 'success' : 'secondary'} pill>
                               {order.payment_status}
                             </Badge>
                           </td>
                           <td className="text-muted pe-4">{new Date(order.created_at).toLocaleDateString()}</td>
                         </tr>
                       ))
                     ) : (
                       <tr>
                         <td colSpan="7" className="text-center py-5 text-muted">No recent orders found.</td>
                       </tr>
                     )}
                   </tbody>
                 </Table>
               </div>
             </Card.Body>
          </Card>
        </div>
      </Container>
    </Layout>
  );
};

export default Dashboard;
