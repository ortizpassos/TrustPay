const crypto = require('crypto');

const method = 'POST';
const path = '/api/merchant/v1/payment-intents';
const timestamp = Math.floor(Date.now() / 1000);
const body = JSON.stringify({
  orderId: "ORDER-1001",
  amount: 123.45,
  currency: "BRL",
  paymentMethod: "credit_card",
  customer: { name: "Maria", email: "maria@example.com" },
  returnUrl: "https://sualoja.com/return",
  callbackUrl: "https://sualoja.com/callback"
});
const secret = 'supersecretmerchant1'; // seu merchantSecret

const payload = `${method}\n${path}\n${timestamp}\n${body}`;
const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

console.log({
  'x-api-key': 'merchant1',
  'x-timestamp': timestamp,
  'x-signature': signature
});