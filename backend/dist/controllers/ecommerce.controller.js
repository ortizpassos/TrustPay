"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ecommerceController = void 0;
const Transaction_1 = require("../models/Transaction");
const paymentGateway_service_1 = require("../services/paymentGateway.service");
const errorHandler_1 = require("../middleware/errorHandler");
const paymentValidation_1 = require("../utils/paymentValidation");
exports.ecommerceController = {
    pay: (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const { orderId, amount, currency, customer, returnUrl, callbackUrl, cardNumber, cardHolderName, expirationMonth, expirationYear, cvv } = req.body;
        const intentPayload = { orderId, amount, currency, paymentMethod: 'credit_card', customer, returnUrl, callbackUrl };
        const { error: intentError } = paymentValidation_1.merchantCreateIntentSchema.validate(intentPayload);
        if (intentError)
            throw new errorHandler_1.AppError(intentError.message, 400, 'VALIDATION_ERROR');
        const tx = await Transaction_1.Transaction.create({
            ...intentPayload,
            merchantId: req.merchant?.merchantKey,
            status: 'PENDING'
        });
        const capturePayload = { cardNumber, cardHolderName, expirationMonth, expirationYear, cvv, amount };
        const { error: cardError } = paymentValidation_1.creditCardPaymentSchema.validate({ transactionId: tx._id, ...capturePayload });
        if (cardError)
            throw new errorHandler_1.AppError(cardError.message, 400, 'VALIDATION_ERROR');
        const gatewayResult = await paymentGateway_service_1.paymentGatewayService.processCreditCard({
            cardNumber,
            cardHolderName,
            expirationMonth,
            expirationYear,
            cvv
        }, amount);
        tx.status = gatewayResult.success ? 'APPROVED' : 'DECLINED';
        tx.gatewayResponse = gatewayResult;
        await tx.save();
        res.json({ success: gatewayResult.success, transaction: tx.toJSON(), gateway: gatewayResult });
    })
};
//# sourceMappingURL=ecommerce.controller.js.map