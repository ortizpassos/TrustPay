const crypto = require('crypto');
const method = 'POST';
const path = '/api/merchant/v1/payment-intents';
const timestamp = 1760493059;
const rawBody = JSON.stringify({
  orderId: 'ORDER-1001',
  amount: 123.45,
  currency: 'BRL',
  paymentMethod: 'credit_card',
  customer: { name: 'Maria', email: 'maria@example.com' },
  returnUrl: 'https://sualoja.com/checkout/return',
  callbackUrl: 'https://sualoja.com/webhooks/trustpay',
  installments: { quantity: 1 }
});
const secret = 'secret1';
const payload = `${method}\n${path}\n${timestamp}\n${rawBody}`;
const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
console.log(signature);