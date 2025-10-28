"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const merchant_controller_1 = require("../controllers/merchant.controller");
const apiAuth_1 = require("../middleware/apiAuth");
const validation_1 = require("../utils/validation");
const paymentValidation_1 = require("../utils/paymentValidation");
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
router.use(apiAuth_1.merchantAuthenticate);
router.post('/payment-intents', (0, validation_1.validate)(paymentValidation_1.merchantCreateIntentSchema), merchant_controller_1.merchantController.createPaymentIntent);
router.get('/payments/:id', merchant_controller_1.merchantController.getPayment);
const captureSchema = paymentValidation_1.creditCardPaymentSchema.keys({ transactionId: joi_1.default.any().strip() });
router.post('/payments/:id/capture', (0, validation_1.validate)(captureSchema), merchant_controller_1.merchantController.capturePayment);
const refundSchema = joi_1.default.object({ amount: joi_1.default.number().positive().precision(2).optional(), reason: joi_1.default.string().max(200).optional() });
router.post('/payments/:id/refund', (0, validation_1.validate)(refundSchema), merchant_controller_1.merchantController.refundPayment);
router.post('/webhooks/trustpay', merchant_controller_1.merchantController.receiveWebhook);
router.post('/payments/:id/pix', merchant_controller_1.merchantController.startPix);
router.get('/payments/:id/status', merchant_controller_1.merchantController.checkStatus);
exports.default = router;
//# sourceMappingURL=merchant.routes.js.map