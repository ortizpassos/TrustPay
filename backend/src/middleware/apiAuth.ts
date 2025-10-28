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
export const merchantAuthenticate = (req: Request, res: Response, next: NextFunction) => {
  // Debug: logar método, body e rawBody recebidos
  console.log('--- DEBUG REQ ---');
  console.log('req.method:', req.method);
  console.log('req.body:', req.body);
  console.log('req.rawBody:', (req as any).rawBody);
  console.log('-----------------');
  try {
    const apiKey = String(req.header('x-api-key') || '');
    const timestamp = String(req.header('x-timestamp') || '');
    const signature = String(req.header('x-signature') || '');

    if (!apiKey || !timestamp || !signature) {
      throw new AppError('Missing authentication headers', 401, 'MERCHANT_AUTH_MISSING');
    }

    let secret = env.merchant.secrets[apiKey];
    if (!secret) {
      // Buscar no banco de dados caso não esteja nas variáveis de ambiente
      const { User } = require('../models/User');
      User.findOne({ merchantKey: apiKey }).select('+merchantSecret').then((user: any) => {
        if (!user || !user.merchantSecret) {
          throw new AppError('Invalid API key', 401, 'MERCHANT_INVALID_KEY');
        }
        secret = user.merchantSecret;
        continueAuth(secret);
      }).catch((err: any) => next(err));
      return;
    } else {
      continueAuth(secret);
      return;
    }

    function continueAuth(secret: string) {
      const ts = parseInt(timestamp, 10);
      if (!Number.isFinite(ts)) {
        throw new AppError('Invalid timestamp', 401, 'MERCHANT_INVALID_TIMESTAMP');
      }
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - ts) > env.merchant.signatureToleranceSec) {
        throw new AppError('Timestamp outside allowed window', 401, 'MERCHANT_TIMESTAMP_OUT_OF_RANGE');
      }

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
        body ="";
      }
      const payload = `${method}\n${path}\n${ts}\n${body}`;
      const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      // Debug logs for signature troubleshooting
      console.log('--- HMAC DEBUG ---');
      console.log('Payload used for signature:');
      console.log(JSON.stringify({ method, path, ts, body }, null, 2));
      console.log('Raw payload string:');
      console.log(payload);
      console.log('Expected signature (backend):', expected);
      console.log('Received signature (client):', signature);
      console.log('-------------------');

      if (!timingSafeEqualHex(signature, expected)) {
        throw new AppError('Invalid signature', 401, 'MERCHANT_INVALID_SIGNATURE');
      }

      req.merchant = { merchantKey: apiKey };
      return next();
    }

    const ts = parseInt(timestamp, 10);
    if (!Number.isFinite(ts)) {
      throw new AppError('Invalid timestamp', 401, 'MERCHANT_INVALID_TIMESTAMP');
    }
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > env.merchant.signatureToleranceSec) {
      throw new AppError('Timestamp outside allowed window', 401, 'MERCHANT_TIMESTAMP_OUT_OF_RANGE');
    }

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
      body ="";
    }
    const payload = `${method}\n${path}\n${ts}\n${body}`;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    // Debug logs for signature troubleshooting
    console.log('--- HMAC DEBUG ---');
    console.log('Payload used for signature:');
    console.log(JSON.stringify({ method, path, ts, body }, null, 2));
    console.log('Raw payload string:');
    console.log(payload);
    console.log('Expected signature (backend):', expected);
    console.log('Received signature (client):', signature);
    console.log('-------------------');

    if (!timingSafeEqualHex(signature, expected)) {
      throw new AppError('Invalid signature', 401, 'MERCHANT_INVALID_SIGNATURE');
    }

    req.merchant = { merchantKey: apiKey };
    return next();
  } catch (err) {
    return next(err);
  }
};

function timingSafeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
