// woocommerce.js
import axios from "axios";
import 'dotenv/config';

const BASE_URL = process.env.MAKARI_URL;

export async function getOrders() {
  try {
    const response = await axios.get(`${BASE_URL}/wp-json/wc/v3/orders`, {
      params: {
        per_page: 10,
        consumer_key: process.env.MAKARI_CK,
        consumer_secret: process.env.MAKARI_CS
      }
    });

    return response.data.map(order => ({
      store: "Makari",
      order_id: order.id,
      order_number: order.number,
      customer_name: order.meta_data.find(md => md.key === "_billing_full_name")?.value || "Unknown",
      customer_phone: order.billing.phone,
      total: parseFloat(order.total),
      currency: order.currency,
      payment_method: order.payment_method_title,
      payment_status: order.date_paid ? "paid" : "unpaid",
      order_status: order.status,
      created_at: order.date_created,
      needs_processing: order.needs_processing,
      items: order.line_items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: parseFloat(item.price),
        total: parseFloat(item.total),
        image: item.image?.src || null
      })),
      shipping_address: order.shipping,
      payment_url: order.payment_url
    }));
  } catch (error) {
    console.error("WooCommerce API error:", error.response?.data || error.message);
    throw error;
  }
}