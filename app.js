const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const vippsService = require('./services/vippsService');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initiate payment
app.post('/api/payment/initiate', async (req, res) => {
  try {
    const { amount, phoneNumber } = req.body;
    
    if (!amount || !phoneNumber) {
      return res.status(400).json({ error: 'Amount and phone number are required' });
    }
    
    // Generate a unique reference for the payment
    const reference = uuidv4();
    
    const result = await vippsService.initiatePayment(
      reference,
      amount,
      phoneNumber
    );
    
    res.json(result);
  } catch (error) {
    // Return the actual Vipps API error response
    res.status(error.response?.status || 500).json(error.response?.data || error.message);
  }
});

// Payment return handler
app.get('/payment-return', async (req, res) => {
  const { reference } = req.query;
  
  if (!reference) {
    return res.status(400).send('Missing payment reference');
  }
  
  try {
    // Redirect to the status page with the reference
    res.redirect(`/status.html?reference=${reference}`);
  } catch (error) {
    console.error('Error handling payment return:', error);
    res.status(500).send('Error handling payment return');
  }
});

// Get payment status
app.get('/api/payment/:reference/status', async (req, res) => {
  try {
    const { reference } = req.params;
    const result = await vippsService.getPaymentStatus(reference);
    
    // Update payment store
    const payment = paymentStore.get(reference);
    if (payment) {
      payment.state = result.state;
      payment.events.push({
        type: result.state,
        timestamp: new Date().toISOString(),
        description: `Payment status updated to ${result.state}`
      });
    }
    
    res.json(result);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Get payment events
app.get('/api/payment/:reference/events', (req, res) => {
  try {
    const { reference } = req.params;
    const payment = paymentStore.get(reference);
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Ensure events array exists and is properly formatted
    const events = payment.events || [];
    
    // Sort events by timestamp
    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json(events);
  } catch (error) {
    console.error('Error in events endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Capture payment
app.post('/api/payment/:reference/capture', async (req, res) => {
  try {
    const { reference } = req.params;
    const { amount } = req.body;
    const result = await vippsService.capturePayment(reference, amount);
    res.json(result);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || error.message);
  }
});

// Refund payment
app.post('/api/payment/:reference/refund', async (req, res) => {
  try {
    const { reference } = req.params;
    const { amount } = req.body;
    const result = await vippsService.refundPayment(reference, amount);
    res.json(result);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || error.message);
  }
});

// Cancel payment
app.post('/api/payment/:reference/cancel', async (req, res) => {
  try {
    const { reference } = req.params;
    const result = await vippsService.cancelPayment(reference);
    res.json(result);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || error.message);
  }
});

// Get all stored payment references (for testing)
app.get('/api/payments', (req, res) => {
  const payments = {};
  paymentStore.forEach((payment, reference) => {
    payments[reference] = payment;
  });
  res.json(payments);
});

// Add this route after the existing routes
app.get('/details', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'details.html'));
});

// Add these routes for payment details and events
app.get('/api/payment/:reference', (req, res) => {
  const { reference } = req.params;
  const payment = paymentStore.get(reference);
  
  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }

  res.json(payment);
});

// Add test page route
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Open http://localhost:${port} in your browser to test Vipps payments`);
}); 