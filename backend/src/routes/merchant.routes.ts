import { Router } from 'express';
import { merchantController } from '../controllers/merchant.controller';
import { merchantAuthenticate } from '../middleware/apiAuth';
import { validate } from '../utils/validation';
import { merchantCreateIntentSchema } from '../utils/paymentValidation';
import Joi from 'joi';

const router = Router();

// All merchant routes require HMAC auth
router.use(merchantAuthenticate);

// Payment intents and operations
router.post('/payment-intents', validate(merchantCreateIntentSchema), merchantController.createPaymentIntent);
router.get('/payments/:id', merchantController.getPayment);
// Schema de captura para merchant (dados completos do cartão obrigatórios)
const captureSchema = Joi.object({
	cardNumber: Joi.string().pattern(new RegExp('^\\d{13,19}$')).required(),
	cardHolderName: Joi.string().trim().min(2).max(100).pattern(new RegExp('^[A-Za-z\\s]+$')).required(),
	expirationMonth: Joi.string().pattern(new RegExp('^(0[1-9]|1[0-2])$')).required(),
	expirationYear: Joi.string().pattern(new RegExp('^\\d{4}$')).required(),
	cvv: Joi.string().pattern(new RegExp('^\\d{3,4}$')).required()
});
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
