const axios = require('axios');
const crypto = require('crypto');

/**
 * Generate M-Pesa access token
 */
async function getAccessToken() {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  try {
    const response = await axios.get(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      {
        headers: { Authorization: `Basic ${auth}` }
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('Failed to get M-Pesa token:', error.response?.data || error.message);
    throw new Error('Could not authenticate with M-Pesa');
  }
}

/**
 * Initiate STK Push
 */
async function initiateSTKPush(phoneNumber, amount, accountRef, description) {
  const token = await getAccessToken();
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
  const passkey = process.env.MPESA_PASSKEY;
  const shortcode = process.env.MPESA_SHORTCODE;
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

  // Format phone number: 254712345678 (remove leading 0 or +254)
  let formattedPhone = phoneNumber.replace(/^0/, '254').replace(/^\+/, '');

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(amount),
    PartyA: formattedPhone,
    PartyB: shortcode,
    PhoneNumber: formattedPhone,
    CallBackURL: `${process.env.BASE_URL}/api/payments/mpesa-callback`,
    AccountReference: accountRef,
    TransactionDesc: description
  };

  try {
    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    console.error('STK Push error:', error.response?.data || error.message);
    throw new Error('Failed to initiate STK Push');
  }
}

module.exports = { initiateSTKPush };