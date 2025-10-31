import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { AppError } from './errorHandler';

export interface MerchantAuth {
  merchantKey: string;
}
declare global {
  namespace Express {
    interface Request {
      merchant?: MerchantAuth;
      rawBody?: string;
    }
  }
}

// Capture raw body for signature verification
export const rawBodySaver = (req: Request, res: Response, buf: Buffer) => {
  (req as any).rawBody = buf?.toString('utf8') || '';
};

/**
 * Merchant API auth via HMAC signature
 * Required headers:
 *  - x-api-key: merchant public key
 *  - x-timestamp: unix epoch seconds
 *  - x-signature: hex HMAC-SHA256 of `${method}\n${path}\n${timestamp}\n${body}` using merchant secret
 */
export const merchantAuthenticate = async (req: Request, res: Response, next: NextFunction) => {
  // Debug: logar método, body e rawBody recebidos
  console.log('--- DEBUG REQ ---');
  console.log('req.method:', req.method);
  console.log('req.body:', req.body);
  console.log('req.rawBody:', (req as any).rawBody);
  console.log('-----------------');
  const apiKey = String(req.header('x-api-key') || '');
  const timestamp = String(req.header('x-timestamp') || '');
  const signature = String(req.header('x-signature') || '');

  if (!apiKey || !timestamp || !signature) {
    return next(new AppError('Missing authentication headers', 401, 'MERCHANT_AUTH_MISSING'));
  }

  try {
    const { User } = require('../models/User');
    const user = await User.findOne({ merchantKey: apiKey }).select('+merchantSecret');
    if (!user || !user.merchantSecret) {
      return next(new AppError('Invalid API key', 401, 'MERCHANT_INVALID_KEY'));
    }
    // Validação de timestamp
    const ts = parseInt(timestamp, 10);
    if (!Number.isFinite(ts)) {
      return next(new AppError('Invalid timestamp', 401, 'MERCHANT_INVALID_TIMESTAMP'));
    }
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > env.merchant.signatureToleranceSec) {
      return next(new AppError('Timestamp outside allowed window', 401, 'MERCHANT_TIMESTAMP_OUT_OF_RANGE'));
    }
    // Monta payload
    const method = req.method.toUpperCase();
    const path = req.originalUrl.split('?')[0];
    let body = '';
    if (method === 'GET') {
      body = "";
    } else if (typeof (req as any).rawBody === 'string') {
      body = (req as any).rawBody;
    } else if (req.body && Object.keys(req.body).length > 0) {
      body = JSON.stringify(req.body);
    } else {
      body = "";
    }
    const payload = `${method}\n${path}\n${ts}\n${body}`;
    const expected = crypto.createHmac('sha256', user.merchantSecret).update(payload).digest('hex');
    // Debug logs para troubleshooting
    console.log('--- HMAC DEBUG ---');
    console.log('Payload used for signature:');
    console.log(JSON.stringify({ method, path, ts, body }, null, 2));
    console.log('Raw payload string:');
    console.log(payload);
    console.log('Expected signature (backend):', expected);
    console.log('Received signature (client):', signature);
    console.log('-------------------');
    if (!timingSafeEqualHex(signature, expected)) {
      return next(new AppError('Invalid signature', 401, 'MERCHANT_INVALID_SIGNATURE'));
    }
    req.merchant = { merchantKey: apiKey };
    return next();
  } catch (err) {
    return next(err);
  }
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
