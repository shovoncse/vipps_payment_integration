const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

class VippsService {
  constructor() {
    this.clientId = process.env.VIPPS_CLIENT_ID;
    this.clientSecret = process.env.VIPPS_CLIENT_SECRET;
    this.subscriptionKey = process.env.VIPPS_SUBSCRIPTION_KEY;
    this.merchantSerial = process.env.VIPPS_MERCHANT_SERIAL;
    this.baseUrl = process.env.VIPPS_BASE_API_URL;
    this.accessTokenUrl = process.env.VIPPS_ACCESS_TOKEN_URL;
    this.paymentApiUrl = process.env.VIPPS_PAYMENT_API_URL;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Helper method to get system info headers
  getSystemHeaders() {
    return {
      'Vipps-System-Name': 'acme',
      'Vipps-System-Version': '3.1.2',
      'Vipps-System-Plugin-Name': 'acme-webshop',
      'Vipps-System-Plugin-Version': '4.5.6'
    };
  }

  // Get access token
  async getAccessToken() {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/accesstoken/get`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'client_id': this.clientId,
            'client_secret': this.clientSecret,
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Merchant-Serial-Number': this.merchantSerial
          }
        }
      );

      if (!response.data || !response.data.access_token) {
        throw new Error('Invalid response from Vipps API');
      }

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (parseInt(response.data.expires_in) * 1000);
      return this.accessToken;
    } catch (error) {
      console.error('Error getting access token:', error.response?.data || error.message);
      throw new Error('Failed to get access token: ' + (error.response?.data?.message || error.message));
    }
  }

  // Initiate payment
  async initiatePayment(amount, phoneNumber, reference, returnUrl) {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.post(
        `${this.baseUrl}/epayment/v1/payments`,
        {
          amount: {
            currency: "NOK",
            value: parseInt(amount)
          },
          paymentMethod: {
            type: "WALLET"
          },
          customer: {
            phoneNumber: phoneNumber
          },
          reference: reference,
          returnUrl: returnUrl,
          userFlow: "WEB_REDIRECT",
          paymentDescription: "Payment for order"
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Merchant-Serial-Number': this.merchantSerial,
            'Idempotency-Key': uuidv4(),
            ...this.getSystemHeaders()
          }
        }
      );
      
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  }

  // Get payment status
  async getPaymentStatus(reference) {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.get(
        `${this.baseUrl}/epayment/v1/payments/${reference}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Merchant-Serial-Number': this.merchantSerial,
            ...this.getSystemHeaders()
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error getting payment status:', error.response?.data || error.message);
      throw new Error('Failed to get payment status: ' + (error.response?.data?.message || error.message));
    }
  }

  // Capture payment
  async capturePayment(reference, amount) {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.post(
        `${this.baseUrl}/epayment/v1/payments/${reference}/capture`,
        {
          modificationAmount: {
            currency: "NOK",
            value: amount
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Merchant-Serial-Number': this.merchantSerial,
            'Idempotency-Key': uuidv4(),
            ...this.getSystemHeaders()
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error capturing payment:', error.response?.data || error.message);
      throw new Error('Failed to capture payment: ' + (error.response?.data?.message || error.message));
    }
  }

  // Refund payment
  async refundPayment(reference, amount) {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.post(
        `${this.baseUrl}/epayment/v1/payments/${reference}/refund`,
        {
          modificationAmount: {
            currency: "NOK",
            value: amount
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Merchant-Serial-Number': this.merchantSerial,
            'Idempotency-Key': uuidv4(),
            ...this.getSystemHeaders()
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error refunding payment:', error.response?.data || error.message);
      throw new Error('Failed to refund payment: ' + (error.response?.data?.message || error.message));
    }
  }

  // Cancel payment
  async cancelPayment(reference) {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.post(
        `${this.baseUrl}/epayment/v1/payments/${reference}/cancel`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Merchant-Serial-Number': this.merchantSerial,
            ...this.getSystemHeaders()
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error canceling payment:', error.response?.data || error.message);
      throw new Error('Failed to cancel payment: ' + (error.response?.data?.message || error.message));
    }
  }
}

module.exports = new VippsService(); 