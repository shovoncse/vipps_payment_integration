const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const vippsService = require('./services/vippsService');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Store references to payments for testing
const paymentStore = {};

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
    
    // Generate a unique reference for this payment
    const reference = `test-payment-${uuidv4()}`;
    
    // The URL that Vipps will redirect to after payment
    const returnUrl = `${req.protocol}://${req.get('host')}/payment-return?reference=${reference}`;
    
    const result = await vippsService.initiatePayment(
      parseInt(amount, 10),
      phoneNumber,
      reference,
      returnUrl
    );
    
    // Store payment reference for later lookups
    paymentStore[reference] = {
      amount,
      phoneNumber,
      created: new Date().toISOString(),
      status: 'INITIATED'
    };
    
    res.json({
      success: true,
      reference,
      redirectUrl: result.redirectUrl,
      message: 'Payment initiated. Click the redirectUrl to proceed to Vipps.'
    });
  } catch (error) {
    console.error('Error initiating payment:', error);
    res.status(500).json({ 
      error: 'Failed to initiate payment',
      details: error.response?.data || error.message
    });
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
    
    // Update our store
    if (paymentStore[reference]) {
      paymentStore[reference].status = result.state;
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({ 
      error: 'Failed to get payment status',
      details: error.response?.data || error.message
    });
  }
});

// Get payment events
app.get('/api/payment/:reference/events', async (req, res) => {
  try {
    const { reference } = req.params;
    const result = await vippsService.getPaymentEvents(reference);
    res.json(result);
  } catch (error) {
    console.error('Error getting payment events:', error);
    res.status(500).json({ 
      error: 'Failed to get payment events',
      details: error.response?.data || error.message
    });
  }
});

// Capture payment
app.post('/api/payment/:reference/capture', async (req, res) => {
  try {
    const { reference } = req.params;
    const { amount } = req.body;
    
    if (!amount) {
      return res.status(400).json({ error: 'Amount is required for capture' });
    }
    
    const result = await vippsService.capturePayment(reference, parseInt(amount, 10));
    res.json(result);
  } catch (error) {
    console.error('Error capturing payment:', error);
    res.status(500).json({ 
      error: 'Failed to capture payment',
      details: error.response?.data || error.message
    });
  }
});

// Refund payment
app.post('/api/payment/:reference/refund', async (req, res) => {
  try {
    const { reference } = req.params;
    const { amount } = req.body;
    
    if (!amount) {
      return res.status(400).json({ error: 'Amount is required for refund' });
    }
    
    const result = await vippsService.refundPayment(reference, parseInt(amount, 10));
    res.json(result);
  } catch (error) {
    console.error('Error refunding payment:', error);
    res.status(500).json({ 
      error: 'Failed to refund payment',
      details: error.response?.data || error.message
    });
  }
});

// Cancel payment
app.post('/api/payment/:reference/cancel', async (req, res) => {
  try {
    const { reference } = req.params;
    const result = await vippsService.cancelPayment(reference);
    res.json(result);
  } catch (error) {
    console.error('Error canceling payment:', error);
    res.status(500).json({ 
      error: 'Failed to cancel payment',
      details: error.response?.data || error.message
    });
  }
});

// Get all stored payment references (for testing)
app.get('/api/payments', (req, res) => {
  res.json(paymentStore);
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Open http://localhost:${port} in your browser to test Vipps payments`);
}); 