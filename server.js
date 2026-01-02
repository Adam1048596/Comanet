// server.js
import express from 'express';
import { getOrders } from './src/woocommerce.js'; // make sure woocommerce.js also uses export

const app = express();

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await getOrders();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => console.log('Server running on http://localhost:5000'));
