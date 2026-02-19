import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Plus, Edit, Trash2, X, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Container, Card, Table, Button, Modal, Form, Row, Col, Image, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import PaginationComponent from '../components/PaginationComponent';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [viewProductData, setViewProductData] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      status: true,
      sku: '',
      name: '',
      description: '',
      customer_price: '',
      wholesaler_price: '',
      category_id: ''
    }
  });

  const fetchProducts = async (query = '', page = 1) => {
    try {
      setLoading(true);
      const response = await api.get('/products', { params: { search: query, page, limit: 10 } });
      setProducts(response.data.products);
      setTotalPages(response.data.totalPages);
      setCurrentPage(response.data.currentPage);
    } catch (error) {
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(searchQuery, 1);
  }, [searchQuery]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const handlePageChange = (page) => {
    fetchProducts(searchQuery, page);
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await api.delete(`/products/${id}`);
        toast.success('Product deleted');
        fetchProducts(searchQuery, currentPage);
      } catch (error) {
        toast.error('Failed to delete product');
      }
    }
  };

  const handleEdit = (product) => {
    setIsEditing(true);
    setCurrentProduct(product);
    
    reset({
      category_id: product.category_id,
      name: product.name,
      sku: product.sku,
      description: product.description,
      customer_price: product.customer_price,
      wholesaler_price: product.wholesaler_price,
      status: product.status === 'active'
    });
    setShowModal(true);
  };

  const handleView = (product) => {
    setViewProductData(product);
    if (product.images && product.images.length > 0) {
        const primaryIndex = product.images.findIndex(img => img.is_primary);
        setActiveImageIndex(primaryIndex >= 0 ? primaryIndex : 0);
    } else {
        setActiveImageIndex(0);
    }
    setShowViewModal(true);
  };

  const onSubmit = async (data) => {
    const formData = new FormData();
    formData.append('category_id', data.category_id);
    formData.append('name', data.name);
    formData.append('sku', data.sku || '');
    formData.append('description', data.description || '');
    formData.append('customer_price', data.customer_price || 0);
    formData.append('wholesaler_price', data.wholesaler_price || 0);
    formData.append('status', data.status ? 'active' : 'inactive');

    if (data.main_image && data.main_image[0]) {
      formData.append('main_image', data.main_image[0]);
    }
    
    if (data.images && data.images.length > 0) {
      for (let i = 0; i < data.images.length; i++) {
        formData.append('images', data.images[i]);
      }
    }

    try {
      if (isEditing) {
        await api.put(`/products/${currentProduct.id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Product updated');
      } else {
        await api.post('/products', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Product created');
      }
      setShowModal(false);
      reset();
      setIsEditing(false);
      setCurrentProduct(null);
      fetchProducts(searchQuery, currentPage);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    reset({
      status: true,
      sku: '',
      name: '',
      description: '',
      customer_price: '',
      wholesaler_price: '',
      category_id: ''
    });
    setIsEditing(false);
    setCurrentProduct(null);
  };

  const handleDeleteImage = async (imageId) => {
    if (window.confirm('Delete this image?')) {
        try {
            await api.delete(`/products/images/${imageId}`);
            toast.success('Image deleted');
            
            // Update currentProduct state
            setCurrentProduct(prev => ({
                ...prev,
                images: prev.images.filter(img => img.id !== imageId)
            }));

            // Update products list
            setProducts(prev => prev.map(p => {
                if (p.id === currentProduct.id) {
                    return {
                        ...p,
                        images: p.images.filter(img => img.id !== imageId)
                    };
                }
                return p;
            }));
        } catch (error) {
            toast.error('Failed to delete image');
        }
    }
  };

  const buildImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (typeof imagePath !== 'string') return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const baseUrl = 'http://127.0.0.1:5000';
    const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    return `${baseUrl}${normalizedPath}`;
  };

  const getMainImage = (product) => {
    if (!product || !product.images) return null;
    const main = product.images.find(img => img.is_primary) || product.images[0];
    return main ? buildImageUrl(main.image_url) : null;
  };

  return (
    <Layout>
      <Container fluid className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="mb-0">Products</h2>
          <Button
            variant="primary"
            onClick={() => {
                setIsEditing(false);
                reset({
                  status: true,
                  sku: '',
                  name: '',
                  description: '',
                  customer_price: '',
                  wholesaler_price: '',
                  category_id: ''
                });
                setShowModal(true);
            }}
            className="d-flex align-items-center"
          >
            <Plus className="me-2" size={16} />
            Add Product
          </Button>
        </div>

        <Form className="mb-4">
            <Row>
                <Col md={8} lg={6}>
                    <div className="d-flex gap-2">
                        <Form.Control
                            type="text"
                            placeholder="Search by name, SKU..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </Col>
            </Row>
        </Form>

        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          <Card className="shadow-sm">
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th className="px-4 py-3">Sr No.</th>
                    <th className="px-4 py-3">Image</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Customer Price</th>
                    <th className="px-4 py-3 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, index) => {
                    const mainImage = getMainImage(product);
                    return (
                    <tr key={product.id}>
                      <td className="px-4 py-3">{(currentPage - 1) * 10 + index + 1}</td>
                      <td className="px-4 py-3">
                          {mainImage ? (
                              <Image src={mainImage} alt={product.name} rounded style={{ width: '40px', height: '40px', objectFit: 'cover' }} />
                          ) : (
                              <div className="bg-light rounded d-flex align-items-center justify-content-center text-muted" style={{ width: '40px', height: '40px', fontSize: '10px' }}>No Img</div>
                          )}
                      </td>
                      <td className="px-4 py-3 fw-medium align-middle">{product.name}</td>
                      <td className="px-4 py-3 text-muted align-middle">{product.sku || '-'}</td>
                      <td className="px-4 py-3 text-muted align-middle">
                          {categories.find(c => c.id === product.category_id)?.category_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-muted align-middle">
                          {product.customer_price ? `₹${product.customer_price}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-end align-middle">
                        <div className="d-flex justify-content-end gap-2">
                          <OverlayTrigger placement="top" overlay={<Tooltip>View Details</Tooltip>}>
                            <Button
                              variant="outline-info"
                              size="sm"
                              className="d-flex align-items-center justify-content-center"
                              style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                              onClick={() => handleView(product)}
                            >
                              <Eye size={16} />
                            </Button>
                          </OverlayTrigger>

                          <OverlayTrigger placement="top" overlay={<Tooltip>Edit Product</Tooltip>}>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="d-flex align-items-center justify-content-center"
                              style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                              onClick={() => handleEdit(product)}
                            >
                              <Edit size={16} />
                            </Button>
                          </OverlayTrigger>

                          <OverlayTrigger placement="top" overlay={<Tooltip>Delete Product</Tooltip>}>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              className="d-flex align-items-center justify-content-center"
                              style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                              onClick={() => handleDelete(product.id)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </OverlayTrigger>
                        </div>
                      </td>
                    </tr>
                  )})}
                   {products.length === 0 && (
                      <tr>
                          <td colSpan="8" className="text-center py-4 text-muted">No products found.</td>
                      </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        )}

        {totalPages > 1 && (
            <PaginationComponent 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={handlePageChange} 
            />
        )}

        <Modal show={showModal} onHide={handleCloseModal} size="lg" centered scrollable backdrop="static" className="modal-with-sidebar">
          <Modal.Header closeButton>
            <Modal.Title>{isEditing ? 'Edit Product' : 'Add Product'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form id="product-form" onSubmit={handleSubmit(onSubmit)}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Category</Form.Label>
                    <Form.Select {...register('category_id', { required: true })}>
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.category_name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Product Name</Form.Label>
                    <Form.Control {...register('name', { required: true })} />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                 <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>SKU</Form.Label>
                    <Form.Control {...register('sku')} />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control as="textarea" rows={3} {...register('description')} />
              </Form.Group>

              <Row>
                  <Col md={6}>
                      <Form.Group className="mb-3">
                          <Form.Label>Customer Price</Form.Label>
                          <Form.Control type="number" step="0.01" {...register('customer_price')} />
                      </Form.Group>
                  </Col>
                  <Col md={6}>
                      <Form.Group className="mb-3">
                          <Form.Label>Wholesaler Price</Form.Label>
                          <Form.Control type="number" step="0.01" {...register('wholesaler_price')} />
                      </Form.Group>
                  </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Main Image</Form.Label>
                {isEditing && currentProduct && getMainImage(currentProduct) && (
                    <div className="mb-2">
                        <Image src={getMainImage(currentProduct)} thumbnail style={{ height: '100px', objectFit: 'contain' }} />
                        <div className="form-text text-muted">Upload new image to replace current one.</div>
                    </div>
                )}
                <Form.Control type="file" {...register('main_image')} />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Additional Images</Form.Label>
                {isEditing && currentProduct?.images?.length > 0 && (
                    <div className="d-flex gap-2 flex-wrap mb-2">
                        {currentProduct.images.filter(img => !img.is_primary).map(img => (
                            <div key={img.id} className="position-relative">
                                <Image src={buildImageUrl(img.image_url)} thumbnail style={{ width: '80px', height: '80px', objectFit: 'cover' }} />
                                <Button 
                                    variant="danger" 
                                    size="sm" 
                                    className="position-absolute top-0 end-0 p-0 d-flex align-items-center justify-content-center"
                                    style={{ width: '20px', height: '20px', borderRadius: '50%', transform: 'translate(30%, -30%)' }}
                                    onClick={() => handleDeleteImage(img.id)}
                                >
                                    <X size={12} />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
                <Form.Control type="file" multiple {...register('images')} />
              </Form.Group>

              <Row>
                  <Col md={12}>
                      <Form.Group className="mb-3">
                        <Form.Check type="checkbox" label="Active Status" {...register('status')} />
                      </Form.Group>
                  </Col>
              </Row>

            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="product-form">
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* View Product Modal */}
        <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg" centered scrollable className="modal-with-sidebar">
            <Modal.Header closeButton className="border-bottom-0">
                <Modal.Title className="fw-bold">Product Details</Modal.Title>
            </Modal.Header>
            <Modal.Body className="pt-0">
                {viewProductData && (
                    <Container fluid className="p-0">
                        <Row className="g-4">
                            {/* Image Gallery Section */}
                            <Col xs={12} md={6} lg={5}>
                                <div className="border rounded p-2 mb-3 bg-white text-center position-relative shadow-sm" style={{ minHeight: '300px' }}>
                                    {viewProductData.images && viewProductData.images.length > 0 ? (
                                        <div className="position-relative" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Image 
                                                src={buildImageUrl(viewProductData.images[activeImageIndex]?.image_url)} 
                                                alt={viewProductData.name} 
                                                fluid 
                                                style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} 
                                            />
                                            
                                            {viewProductData.images.length > 1 && (
                                                <>
                                                    <Button 
                                                        variant="light" 
                                                        className="position-absolute start-0 top-50 translate-middle-y ms-2 rounded-circle shadow-sm p-0 d-flex align-items-center justify-content-center border"
                                                        style={{ width: '36px', height: '36px', zIndex: 10, opacity: 0.9 }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveImageIndex(prev => (prev === 0 ? viewProductData.images.length - 1 : prev - 1));
                                                        }}
                                                    >
                                                        <ChevronLeft size={20} />
                                                    </Button>
                                                    <Button 
                                                        variant="light" 
                                                        className="position-absolute end-0 top-50 translate-middle-y me-2 rounded-circle shadow-sm p-0 d-flex align-items-center justify-content-center border"
                                                        style={{ width: '36px', height: '36px', zIndex: 10, opacity: 0.9 }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveImageIndex(prev => (prev === viewProductData.images.length - 1 ? 0 : prev + 1));
                                                        }}
                                                    >
                                                        <ChevronRight size={20} />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="d-flex align-items-center justify-content-center text-muted" style={{ height: '300px' }}>
                                            No Images Available
                                        </div>
                                    )}
                                </div>

                                {/* Thumbnails */}
                                {viewProductData.images && viewProductData.images.length > 1 && (
                                    <div className="d-flex gap-2 overflow-auto py-2 justify-content-center">
                                        {viewProductData.images.map((img, idx) => (
                                            <div 
                                                key={img.id || idx}
                                                className={`border rounded p-1 bg-white ${idx === activeImageIndex ? 'border-primary shadow-sm' : 'border-light'}`}
                                                style={{ cursor: 'pointer', transition: 'all 0.2s', opacity: idx === activeImageIndex ? 1 : 0.6, minWidth: '60px' }}
                                                onClick={() => setActiveImageIndex(idx)}
                                            >
                                                <Image 
                                                    src={`http://localhost:5000/${img.image_url}`}
                                                    thumbnail
                                                    className="border-0 p-0"
                                                    style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Col>

                            {/* Product Details Section */}
                            <Col xs={12} md={6} lg={7}>
                                <div className="d-flex flex-column h-100">
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div>
                                            <h4 className="fw-bold mb-1 text-break">{viewProductData.name}</h4>
                                            <div className="text-muted small">
                                                <span className="me-2">ID: {viewProductData.id}</span>
                                                <span className="me-2">|</span>
                                                <span>SKU: {viewProductData.sku || 'N/A'}</span>
                                            </div>
                                        </div>
                                        <Badge bg={viewProductData.status === 'active' ? "success" : "danger"} className="px-3 py-2 rounded-pill">
                                            {viewProductData.status === 'active' ? "Active" : "Inactive"}
                                        </Badge>
                                    </div>

                                    <div className="mb-4">
                                        <Badge bg="info" className="text-dark border border-info bg-opacity-25 px-3 py-2 rounded-pill">
                                            {categories.find(c => c.id === viewProductData.category_id)?.category_name || 'Uncategorized'}
                                        </Badge>
                                    </div>

                                    <Card className="bg-light border-0 mb-4 shadow-sm">
                                        <Card.Body className="py-3">
                                            <Row className="g-0 text-center divide-x">
                                                <Col xs={6} className="border-end border-2">
                                                    <div className="text-muted small text-uppercase fw-bold mb-1">Customer Price</div>
                                                    <div className="text-success fw-bold fs-4">₹{viewProductData.customer_price}</div>
                                                </Col>
                                                <Col xs={6}>
                                                    <div className="text-muted small text-uppercase fw-bold mb-1">Wholesaler Price</div>
                                                    <div className="text-primary fw-bold fs-4">₹{viewProductData.wholesaler_price}</div>
                                                </Col>
                                            </Row>
                                        </Card.Body>
                                    </Card>

                                    <Row className="g-3 mb-4">
                                        <Col xs={6}>
                                            <div className="p-2 border rounded bg-white text-center h-100">
                                                <small className="text-muted d-block text-uppercase" style={{fontSize: '0.7rem'}}>Created</small>
                                                <span className="small fw-bold">{(viewProductData.createdAt || viewProductData.created_at) ? new Date(viewProductData.createdAt || viewProductData.created_at).toLocaleDateString() : '-'}</span>
                                            </div>
                                        </Col>
                                        <Col xs={6}>
                                            <div className="p-2 border rounded bg-white text-center h-100">
                                                <small className="text-muted d-block text-uppercase" style={{fontSize: '0.7rem'}}>Updated</small>
                                                <span className="small fw-bold">{(viewProductData.updatedAt || viewProductData.updated_at) ? new Date(viewProductData.updatedAt || viewProductData.updated_at).toLocaleDateString() : '-'}</span>
                                            </div>
                                        </Col>
                                    </Row>
                                    
                                    <div className="mt-auto">
                                        <strong className="d-block text-dark mb-2">Description</strong>
                                        <div className="bg-white p-3 rounded text-break border shadow-sm" style={{maxHeight: '150px', overflowY: 'auto'}}>
                                            {viewProductData.description || <span className="text-muted fst-italic">No description available.</span>}
                                        </div>
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    </Container>
                )}
            </Modal.Body>
        </Modal>
      </Container>
    </Layout>
  );
};

export default Products;
