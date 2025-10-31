"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.merchantAuthenticate = exports.rawBodySaver = void 0;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../config/env");
const errorHandler_1 = require("./errorHandler");
const rawBodySaver = (req, res, buf) => {
    req.rawBody = buf?.toString('utf8') || '';
};
exports.rawBodySaver = rawBodySaver;
const merchantAuthenticate = async (req, res, next) => {
    console.log('--- DEBUG REQ ---');
    console.log('req.method:', req.method);
    console.log('req.body:', req.body);
    console.log('req.rawBody:', req.rawBody);
    console.log('-----------------');
    const apiKey = String(req.header('x-api-key') || '');
    const timestamp = String(req.header('x-timestamp') || '');
    const signature = String(req.header('x-signature') || '');
    if (!apiKey || !timestamp || !signature) {
        return next(new errorHandler_1.AppError('Missing authentication headers', 401, 'MERCHANT_AUTH_MISSING'));
    }
    try {
        const { User } = require('../models/User');
        const user = await User.findOne({ merchantKey: apiKey }).select('+merchantSecret');
        if (!user || !user.merchantSecret) {
            return next(new errorHandler_1.AppError('Invalid API key', 401, 'MERCHANT_INVALID_KEY'));
        }
        const ts = parseInt(timestamp, 10);
        if (!Number.isFinite(ts)) {
            return next(new errorHandler_1.AppError('Invalid timestamp', 401, 'MERCHANT_INVALID_TIMESTAMP'));
        }
        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(now - ts) > env_1.env.merchant.signatureToleranceSec) {
            return next(new errorHandler_1.AppError('Timestamp outside allowed window', 401, 'MERCHANT_TIMESTAMP_OUT_OF_RANGE'));
        }
        const method = req.method.toUpperCase();
        const path = req.originalUrl.split('?')[0];
        let body = '';
        if (method === 'GET') {
            body = "";
        }
        else if (typeof req.rawBody === 'string') {
            body = req.rawBody;
        }
        else if (req.body && Object.keys(req.body).length > 0) {
            body = JSON.stringify(req.body);
        }
        else {
            body = "";
        }
        const payload = `${method}\n${path}\n${ts}\n${body}`;
        const expected = crypto_1.default.createHmac('sha256', user.merchantSecret).update(payload).digest('hex');
        console.log('--- HMAC DEBUG ---');
        console.log('Payload used for signature:');
        console.log(JSON.stringify({ method, path, ts, body }, null, 2));
        console.log('Raw payload string:');
        console.log(payload);
        console.log('Expected signature (backend):', expected);
        console.log('Received signature (client):', signature);
        console.log('-------------------');
        if (!timingSafeEqualHex(signature, expected)) {
            return next(new errorHandler_1.AppError('Invalid signature', 401, 'MERCHANT_INVALID_SIGNATURE'));
        }
        req.merchant = { merchantKey: apiKey };
        return next();
    }
    catch (err) {
        return next(err);
    }
};
exports.merchantAuthenticate = merchantAuthenticate;
function timingSafeEqualHex(a, b) {
    const ab = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    if (ab.length !== bb.length)
        return false;
    return crypto_1.default.timingSafeEqual(ab, bb);
}
//# sourceMappingURL=apiAuth.js.map