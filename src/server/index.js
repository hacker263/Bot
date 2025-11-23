/**
 * Express API Server for Dashboard Backend
 * Runs parallel to Vite dev server
 * Handles bot API requests and syncs data with dashboard
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.API_PORT || 5174;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Data storage file path
const DATA_DIR = path.join(__dirname, '../../data');
const ensureDataDir = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
};

// Helper functions for file-based storage
const readData = (filename) => {
  ensureDataDir();
  const filepath = path.join(DATA_DIR, `${filename}.json`);
  try {
    if (fs.existsSync(filepath)) {
      const data = fs.readFileSync(filepath, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return [];
  }
};

const writeData = (filename, data) => {
  ensureDataDir();
  const filepath = path.join(DATA_DIR, `${filename}.json`);
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing ${filename}:`, error);
    return false;
  }
};

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

app.post('/api/auth/register', (req, res) => {
  try {
    const { phone_number, name, role = 'customer', email } = req.body;

    if (!phone_number || !name) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    let users = readData('users');
    
    // Check if user already exists
    const existingUser = users.find(u => u.phone_number === phone_number);
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User already registered' });
    }

    const newUser = {
      id: `user-${Date.now()}`,
      phone_number,
      name,
      role,
      email: email || '',
      verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    users.push(newUser);
    writeData('users', users);

    res.json({
      success: true,
      message: 'User registered successfully',
      user: newUser
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { phone_number } = req.body;

    if (!phone_number) {
      return res.status(400).json({ success: false, error: 'Phone number required' });
    }

    const users = readData('users');
    const user = users.find(u => u.phone_number === phone_number);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Update last login
    user.last_login = new Date().toISOString();
    writeData('users', users);

    res.json({
      success: true,
      message: 'Login successful',
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/users/:phone', (req, res) => {
  try {
    const { phone } = req.params;
    const users = readData('users');
    const user = users.find(u => u.phone_number === phone);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// MERCHANT ENDPOINTS
// ============================================

app.post('/api/merchants', (req, res) => {
  try {
    const { phone_number, store_name, category, description, location } = req.body;

    if (!phone_number || !store_name) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    let merchants = readData('merchants');
    
    const newMerchant = {
      id: `merchant-${Date.now()}`,
      phone_number,
      store_name,
      category: category || 'General',
      description: description || '',
      location: location || '',
      status: 'pending', // pending, approved, suspended, rejected
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    merchants.push(newMerchant);
    writeData('merchants', merchants);

    // Also create a merchant entry in users if they registered as merchant
    let users = readData('users');
    const userIndex = users.findIndex(u => u.phone_number === phone_number);
    if (userIndex >= 0) {
      users[userIndex].role = 'merchant';
      users[userIndex].merchant_id = newMerchant.id;
      writeData('users', users);
    }

    res.json({
      success: true,
      message: 'Merchant created successfully',
      merchant: newMerchant
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/merchants', (req, res) => {
  try {
    const merchants = readData('merchants');
    res.json({ success: true, merchants });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/merchants/:id', (req, res) => {
  try {
    const { id } = req.params;
    const merchants = readData('merchants');
    const merchant = merchants.find(m => m.id === id);

    if (!merchant) {
      return res.status(404).json({ success: false, error: 'Merchant not found' });
    }

    res.json({ success: true, merchant });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/merchants/:id', (req, res) => {
  try {
    const { id } = req.params;
    let merchants = readData('merchants');
    
    const merchantIndex = merchants.findIndex(m => m.id === id);
    if (merchantIndex === -1) {
      return res.status(404).json({ success: false, error: 'Merchant not found' });
    }

    merchants[merchantIndex] = {
      ...merchants[merchantIndex],
      ...req.body,
      updated_at: new Date().toISOString()
    };

    writeData('merchants', merchants);
    res.json({ success: true, merchant: merchants[merchantIndex] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/merchants/pending', (req, res) => {
  try {
    const merchants = readData('merchants');
    const pending = merchants.filter(m => m.status === 'pending');
    res.json({ success: true, merchants: pending });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/merchants/:id/approve', (req, res) => {
  try {
    const { id } = req.params;
    let merchants = readData('merchants');
    
    const merchantIndex = merchants.findIndex(m => m.id === id);
    if (merchantIndex === -1) {
      return res.status(404).json({ success: false, error: 'Merchant not found' });
    }

    merchants[merchantIndex].status = 'approved';
    merchants[merchantIndex].updated_at = new Date().toISOString();

    writeData('merchants', merchants);
    res.json({ success: true, message: 'Merchant approved', merchant: merchants[merchantIndex] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/merchants/:id/reject', (req, res) => {
  try {
    const { id } = req.params;
    let merchants = readData('merchants');
    
    const merchantIndex = merchants.findIndex(m => m.id === id);
    if (merchantIndex === -1) {
      return res.status(404).json({ success: false, error: 'Merchant not found' });
    }

    merchants[merchantIndex].status = 'rejected';
    merchants[merchantIndex].updated_at = new Date().toISOString();

    writeData('merchants', merchants);
    res.json({ success: true, message: 'Merchant rejected', merchant: merchants[merchantIndex] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// PRODUCT ENDPOINTS
// ============================================

app.post('/api/merchants/:merchantId/products', (req, res) => {
  try {
    const { merchantId } = req.params;
    const { name, description, price, category, stock, imageUrl } = req.body;

    if (!name || !price) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    let products = readData('products');

    const newProduct = {
      id: `prod-${Date.now()}`,
      merchant_id: merchantId,
      name,
      description: description || '',
      price: parseFloat(price),
      category: category || 'General',
      stock: parseInt(stock) || 0,
      image_url: imageUrl || '',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    products.push(newProduct);
    writeData('products', products);

    res.json({
      success: true,
      message: 'Product created successfully',
      product: newProduct
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/merchants/:merchantId/products', (req, res) => {
  try {
    const { merchantId } = req.params;
    const products = readData('products');
    const merchantProducts = products.filter(p => p.merchant_id === merchantId);
    res.json({ success: true, products: merchantProducts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const products = readData('products');
    const product = products.find(p => p.id === id);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    let products = readData('products');
    
    const productIndex = products.findIndex(p => p.id === id);
    if (productIndex === -1) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    products[productIndex] = {
      ...products[productIndex],
      ...req.body,
      updated_at: new Date().toISOString()
    };

    writeData('products', products);
    res.json({ success: true, product: products[productIndex] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    let products = readData('products');
    
    const productIndex = products.findIndex(p => p.id === id);
    if (productIndex === -1) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const deleted = products.splice(productIndex, 1);
    writeData('products', products);
    res.json({ success: true, message: 'Product deleted', product: deleted[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/products/search', (req, res) => {
  try {
    const { q, category } = req.query;
    let products = readData('products');

    if (q) {
      products = products.filter(p => 
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.description.toLowerCase().includes(q.toLowerCase())
      );
    }

    if (category) {
      products = products.filter(p => p.category === category);
    }

    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ORDER ENDPOINTS
// ============================================

app.post('/api/orders', (req, res) => {
  try {
    const { merchant_id, customer_phone, customer_name, items, total, payment_method } = req.body;

    if (!merchant_id || !customer_phone || !items || !total) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    let orders = readData('orders');

    const newOrder = {
      id: `order-${Date.now()}`,
      merchant_id,
      customer_phone,
      customer_name: customer_name || 'Guest',
      items,
      total: parseFloat(total),
      payment_method: payment_method || 'cash',
      status: 'pending', // pending, confirmed, preparing, ready, delivered
      payment_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    orders.push(newOrder);
    writeData('orders', orders);

    res.json({
      success: true,
      message: 'Order created successfully',
      order: newOrder
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const orders = readData('orders');
    const order = orders.find(o => o.id === id);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    let orders = readData('orders');
    
    const orderIndex = orders.findIndex(o => o.id === id);
    if (orderIndex === -1) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    orders[orderIndex] = {
      ...orders[orderIndex],
      ...req.body,
      updated_at: new Date().toISOString()
    };

    writeData('orders', orders);
    res.json({ success: true, order: orders[orderIndex] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/customers/:phone/orders', (req, res) => {
  try {
    const { phone } = req.params;
    const orders = readData('orders');
    const customerOrders = orders.filter(o => o.customer_phone === phone);
    res.json({ success: true, orders: customerOrders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/merchants/:merchantId/orders', (req, res) => {
  try {
    const { merchantId } = req.params;
    const orders = readData('orders');
    const merchantOrders = orders.filter(o => o.merchant_id === merchantId);
    res.json({ success: true, orders: merchantOrders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// CART ENDPOINTS
// ============================================

app.post('/api/carts/sync', (req, res) => {
  try {
    const { phone_number, items } = req.body;

    if (!phone_number) {
      return res.status(400).json({ success: false, error: 'Phone number required' });
    }

    let carts = readData('carts');
    let cartIndex = carts.findIndex(c => c.phone_number === phone_number);

    if (cartIndex === -1) {
      carts.push({
        phone_number,
        items: items || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } else {
      carts[cartIndex].items = items || [];
      carts[cartIndex].updated_at = new Date().toISOString();
    }

    writeData('carts', carts);
    res.json({ success: true, message: 'Cart synced' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/carts/:phone', (req, res) => {
  try {
    const { phone } = req.params;
    const carts = readData('carts');
    const cart = carts.find(c => c.phone_number === phone);

    if (!cart) {
      return res.json({ success: true, cart: { items: [] } });
    }

    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/carts/:phone', (req, res) => {
  try {
    const { phone } = req.params;
    let carts = readData('carts');
    carts = carts.filter(c => c.phone_number !== phone);
    writeData('carts', carts);
    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// FAVORITES ENDPOINTS
// ============================================

app.post('/api/favorites/:phone/:productId', (req, res) => {
  try {
    const { phone, productId } = req.params;
    let favorites = readData('favorites');

    const newFavorite = {
      id: `fav-${Date.now()}`,
      phone_number: phone,
      product_id: productId,
      created_at: new Date().toISOString()
    };

    // Check if already favorited
    const exists = favorites.find(f => f.phone_number === phone && f.product_id === productId);
    if (!exists) {
      favorites.push(newFavorite);
      writeData('favorites', favorites);
    }

    res.json({ success: true, message: 'Added to favorites' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/favorites/:phone/:productId', (req, res) => {
  try {
    const { phone, productId } = req.params;
    let favorites = readData('favorites');
    favorites = favorites.filter(f => !(f.phone_number === phone && f.product_id === productId));
    writeData('favorites', favorites);
    res.json({ success: true, message: 'Removed from favorites' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/favorites/:phone', (req, res) => {
  try {
    const { phone } = req.params;
    let favorites = readData('favorites');
    const products = readData('products');

    const userFavorites = favorites.filter(f => f.phone_number === phone);
    const favoriteProducts = userFavorites.map(f => 
      products.find(p => p.id === f.product_id)
    ).filter(Boolean);

    res.json({ success: true, products: favoriteProducts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Dashboard API server running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`\n✅ Dashboard API Server running on http://localhost:${PORT}`);
  console.log(`📊 Connected to dashboard on http://localhost:5173`);
  console.log(`💾 Data stored in: ${DATA_DIR}\n`);
});
