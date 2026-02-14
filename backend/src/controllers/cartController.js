const { Cart, CartItem, Product, ProductImage } = require('../models');

exports.addToCart = async (req, res) => {
  try {
    const { product_id, quantity } = req.body;
    const userId = req.user.id;
    const userType = req.userType; // 'customer' or 'wholesaler'

    if (!product_id || !quantity) {
      return res.status(400).json({ message: 'Product ID and quantity are required' });
    }

    const product = await Product.findByPk(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Determine price based on user type
    let price = 0;
    if (userType === 'wholesaler') {
      price = product.wholesaler_price;
    } else {
      price = product.customer_price;
    }

    // Find or create cart
    let cartWhere = {};
    if (userType === 'wholesaler') {
      cartWhere = { wholesaler_id: userId };
    } else {
      cartWhere = { customer_id: userId };
    }

    let cart = await Cart.findOne({ where: cartWhere });
    if (!cart) {
      cart = await Cart.create(cartWhere);
    }

    // Check if item exists in cart
    let cartItem = await CartItem.findOne({
      where: {
        cart_id: cart.id,
        product_id: product_id
      }
    });

    let newQuantity = parseInt(quantity);
    if (cartItem) {
        newQuantity += cartItem.quantity;
    }

    if (product.stock < newQuantity) {
      return res.status(400).json({ message: 'Insufficient stock. Available: ' + product.stock });
    }

    if (cartItem) {
      // Update quantity
      cartItem.quantity = newQuantity;
      cartItem.price = price; // Update price to current
      await cartItem.save();
    } else {
      // Create new item
      cartItem = await CartItem.create({
        cart_id: cart.id,
        product_id: product_id,
        quantity: newQuantity,
        price: price
      });
    }

    res.status(200).json({ message: 'Item added to cart', cartItem });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.userType;

    let cartWhere = {};
    if (userType === 'wholesaler') {
      cartWhere = { wholesaler_id: userId };
    } else {
      cartWhere = { customer_id: userId };
    }

    const cart = await Cart.findOne({
      where: cartWhere,
      include: [
        {
          model: CartItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              include: [{ model: ProductImage, as: 'images' }]
            }
          ]
        }
      ]
    });

    if (!cart) {
      return res.status(200).json({ items: [], total: 0 });
    }

    // Calculate total
    let total = 0;
    const items = cart.items.map(item => {
      const itemTotal = parseFloat(item.price) * item.quantity;
      total += itemTotal;
      return {
        ...item.toJSON(),
        itemTotal: itemTotal.toFixed(2)
      };
    });

    res.status(200).json({
      id: cart.id,
      items: items,
      total: total.toFixed(2)
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;
    const { itemId } = req.params; // Using cart item ID? Or Product ID? Usually easier with Product ID or Item ID.
    // Assuming itemId is CartItem ID or Product ID. Let's stick to Product ID for cleaner API, or CartItem ID.
    // User said "Update item quantity". Usually PUT /cart/update implies body has product_id and quantity.
    // Let's assume body has { product_id, quantity }
    
    // Wait, typical REST is PUT /cart/items/:id or PUT /cart with body.
    // User prompt: "PUT /update – Update item quantity."
    // I'll implement it as PUT /update with body { product_id, quantity }
    
    const { product_id } = req.body;
    const userId = req.user.id;
    const userType = req.userType;

    if (!product_id || quantity === undefined) {
       return res.status(400).json({ message: 'Product ID and quantity are required' });
    }

    let cartWhere = {};
    if (userType === 'wholesaler') {
      cartWhere = { wholesaler_id: userId };
    } else {
      cartWhere = { customer_id: userId };
    }

    const cart = await Cart.findOne({ where: cartWhere });
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const cartItem = await CartItem.findOne({
      where: {
        cart_id: cart.id,
        product_id: product_id
      }
    });

    if (!cartItem) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    if (quantity <= 0) {
      await cartItem.destroy();
      return res.status(200).json({ message: 'Item removed from cart' });
    }

    cartItem.quantity = quantity;
    await cartItem.save();

    res.status(200).json({ message: 'Cart updated', cartItem });

  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const { product_id } = req.body; // Or query param? DELETE usually has no body in some clients, but standard allows.
    // User prompt: "DELETE /remove – Remove a specific item."
    // I'll support body or query param. Let's use body for consistency, or path param /remove/:productId.
    // Prompt implies /remove endpoint. I'll use body { product_id }.
    
    const userId = req.user.id;
    const userType = req.userType;

    let cartWhere = {};
    if (userType === 'wholesaler') {
      cartWhere = { wholesaler_id: userId };
    } else {
      cartWhere = { customer_id: userId };
    }

    const cart = await Cart.findOne({ where: cartWhere });
    if (!cart) {
        return res.status(404).json({ message: 'Cart not found' });
    }
    
    const deleted = await CartItem.destroy({
        where: {
            cart_id: cart.id,
            product_id: product_id
        }
    });

    if (deleted) {
        res.status(200).json({ message: 'Item removed from cart' });
    } else {
        res.status(404).json({ message: 'Item not found in cart' });
    }

  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.userType;

    let cartWhere = {};
    if (userType === 'wholesaler') {
      cartWhere = { wholesaler_id: userId };
    } else {
      cartWhere = { customer_id: userId };
    }

    const cart = await Cart.findOne({ where: cartWhere });
    if (cart) {
        await CartItem.destroy({
            where: { cart_id: cart.id }
        });
    }

    res.status(200).json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
