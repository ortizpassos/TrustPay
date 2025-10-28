// Configure env before importing app
const apiKey = 'test_key_123';
const secret = 'test_secret_456';
process.env.TRUSTPAY_MERCHANT_KEYS = `${apiKey}:${secret}`;

import request from 'supertest';
import app from '../../src/app';
import crypto from 'crypto';

// Helper to sign requests
function sign(method: string, path: string, body: any, apiKey: string, secret: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = `${method.toUpperCase()}\n${path}\n${timestamp}\n${JSON.stringify(body || {})}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return { timestamp, signature, apiKey };
}

describe('Merchant API', () => {

  it('should create a payment intent and get it', async () => {
    const body = {
      orderId: 'ORDER-1001',
      amount: 123.45,
      currency: 'BRL',
      paymentMethod: 'pix',
      customer: { name: 'Maria', email: 'maria@example.com' },
      returnUrl: 'https://merchant.test/return',
      callbackUrl: 'https://merchant.test/callback'
    };
    const path = '/api/merchant/v1/payment-intents';
    const { timestamp, signature } = sign('POST', path, body, apiKey, secret);

    const createRes = await request(app)
      .post(path)
      .set('x-api-key', apiKey)
      .set('x-timestamp', timestamp)
      .set('x-signature', signature)
      .send(body)
      .expect(201);

    expect(createRes.body.success).toBe(true);
    const id = createRes.body.data.id;

    // Fetch it
    const getPath = `/api/merchant/v1/payments/${id}`;
    const { timestamp: ts2, signature: sig2 } = sign('GET', getPath, undefined, apiKey, secret);
    const getRes = await request(app)
      .get(getPath)
      .set('x-api-key', apiKey)
      .set('x-timestamp', ts2)
      .set('x-signature', sig2)
      .expect(200);

    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.id).toBe(id);
  });
});
