import { Router } from 'express';
import { merchantController } from '../controllers/merchant.controller';
import { merchantAuthenticate } from '../middleware/apiAuth';
import { validate } from '../utils/validation';
import { merchantCreateIntentSchema, creditCardPaymentSchema } from '../utils/paymentValidation';
import Joi from 'joi';

const router = Router();

// All merchant routes require HMAC auth
router.use(merchantAuthenticate);

// Payment intents and operations
router.post('/payment-intents', validate(merchantCreateIntentSchema), merchantController.createPaymentIntent);
router.get('/payments/:id', merchantController.getPayment);
// capture schema uses card fields from creditCardPaymentSchema without transactionId
const captureSchema = creditCardPaymentSchema.keys({ transactionId: Joi.any().strip() });
router.post('/payments/:id/capture', validate(captureSchema), merchantController.capturePayment);

// refund schema
const refundSchema = Joi.object({ amount: Joi.number().positive().precision(2).optional(), reason: Joi.string().max(200).optional() });
router.post('/payments/:id/refund', validate(refundSchema), merchantController.refundPayment);

// Webhook endpoint (note: merchants typically host their own webhook; here it's TrustPay -> merchant)
router.post('/webhooks/trustpay', merchantController.receiveWebhook);

// PIX initiation and status polling
router.post('/payments/:id/pix', merchantController.startPix);
router.get('/payments/:id/status', merchantController.checkStatus);

export default router;
