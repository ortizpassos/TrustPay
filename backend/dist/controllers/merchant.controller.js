"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.merchantController = void 0;
const Transaction_1 = require("../models/Transaction");
const paymentGateway_service_1 = require("../services/paymentGateway.service");
const errorHandler_1 = require("../middleware/errorHandler");
exports.merchantController = {
    createPaymentIntent: (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const merchantKey = req.merchant.merchantKey;
        const { orderId, amount, currency = 'BRL', paymentMethod, customer, returnUrl, callbackUrl, installments } = req.body;
        const existing = await Transaction_1.Transaction.findOne({ orderId, merchantId: merchantKey, status: { $in: ['PENDING', 'PROCESSING', 'APPROVED'] } });
        if (existing) {
            res.status(200).json({ success: true, data: existing.toJSON(), idempotent: true });
            return;
        }
        const tx = await Transaction_1.Transaction.create({
            orderId,
            merchantId: merchantKey,
            amount,
            currency,
            paymentMethod,
            status: 'PENDING',
            customer,
            returnUrl,
            callbackUrl,
            installments
        });
        res.status(201).json({ success: true, data: tx.toJSON() });
    }),
    getPayment: (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const merchantKey = req.merchant.merchantKey;
        const { id } = req.params;
        const tx = await Transaction_1.Transaction.findOne({ _id: id, merchantId: merchantKey });
        if (!tx)
            throw new errorHandler_1.AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
        res.json({ success: true, data: tx.toJSON() });
    }),
    capturePayment: (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const merchantKey = req.merchant.merchantKey;
        const { id } = req.params;
        const { cardNumber, cardHolderName, expirationMonth, expirationYear, cvv } = req.body || {};
        const tx = await Transaction_1.Transaction.findOne({ _id: id, merchantId: merchantKey });
        if (!tx)
            throw new errorHandler_1.AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
        if (tx.paymentMethod !== 'credit_card')
            throw new errorHandler_1.AppError('Invalid payment method', 400, 'INVALID_PAYMENT_METHOD');
        if (tx.status !== 'PENDING')
            throw new errorHandler_1.AppError('Transaction not capturable', 400, 'INVALID_STATUS');
        const { User } = require('../models/User');
        let merchantName = tx.merchantId || 'E-Commerce';
        const user = await User.findOne({ merchantKey: tx.merchantId });
        if (user) {
            merchantName = `${user.firstName} ${user.lastName}`;
        }
        const externalPayload = {
            typePayment: 'CREDIT',
            amount: tx.amount,
            currency: tx.currency,
            merchantName,
            cardNumber,
            installmentsTotal: tx.installments?.quantity || 1,
            mcc: '5732',
            category: 'ELETRONICOS',
            createdAt: tx.createdAt.toISOString()
        };
        console.log('Payload para EXTERNAL_PURCHASE_API_URL:', JSON.stringify(externalPayload, null, 2));
        const axios = require('axios');
        let externalResp;
        try {
            externalResp = await axios.post(process.env.EXTERNAL_PURCHASE_API_URL, externalPayload, {
                headers: {}
            });
        }
        catch (e) {
            res.status(502).json({ success: false, error: { message: 'Erro ao processar pagamento externo', code: 'EXTERNAL_API_ERROR' } });
        }
        if (!externalResp) {
            return;
        }
        const extData = externalResp?.data;
        if (extData?.success && extData?.status === 'AUTHORIZED') {
            tx.status = 'APPROVED';
            tx.bankTransactionId = `txn_${Math.random().toString(36).slice(2)}`;
            tx.gatewayResponse = {
                authCode: '0AFF3C',
                cardBrand: 'visa',
                lastFourDigits: String(cardNumber).slice(-4)
            };
            await tx.save();
            res.json({
                success: true,
                data: {
                    transaction: {
                        ...tx.toJSON(),
                        status: 'APPROVED',
                        bankTransactionId: tx.bankTransactionId,
                        gatewayResponse: tx.gatewayResponse
                    },
                    status: 'APPROVED',
                    message: 'Transação aprovada'
                }
            });
        }
        else {
            tx.status = 'DECLINED';
            await tx.save();
            res.status(422).json({
                success: false,
                error: {
                    message: 'Pagamento recusado pelo emissor do cartão',
                    code: 'PAYMENT_DECLINED'
                }
            });
        }
    }),
    refundPayment: (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const merchantKey = req.merchant.merchantKey;
        const { id } = req.params;
        const { amount, reason } = req.body || {};
        const tx = await Transaction_1.Transaction.findOne({ _id: id, merchantId: merchantKey });
        if (!tx)
            throw new errorHandler_1.AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
        if (tx.status !== 'APPROVED')
            throw new errorHandler_1.AppError('Only approved transactions can be refunded', 400, 'REFUND_NOT_ALLOWED');
        const refundAmount = amount ?? tx.amount;
        if (refundAmount <= 0 || refundAmount > tx.amount)
            throw new errorHandler_1.AppError('Invalid refund amount', 400, 'INVALID_REFUND_AMOUNT');
        tx.status = 'REFUNDED';
        tx.refund = { amount: refundAmount, reason, refundedAt: new Date() };
        tx.gatewayResponse = { ...(tx.gatewayResponse || {}), refund: { amount: refundAmount, reason } };
        await tx.save();
        res.json({ success: true, data: tx.toJSON() });
    }),
    startPix: (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const merchantKey = req.merchant.merchantKey;
        const { id } = req.params;
        const tx = await Transaction_1.Transaction.findOne({ _id: id, merchantId: merchantKey });
        if (!tx)
            throw new errorHandler_1.AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
        if (tx.paymentMethod !== 'pix')
            throw new errorHandler_1.AppError('Invalid payment method', 400, 'INVALID_PAYMENT_METHOD');
        if (tx.status !== 'PENDING')
            throw new errorHandler_1.AppError('Transaction not processable', 400, 'INVALID_STATUS');
        const resp = await paymentGateway_service_1.paymentGatewayService.processPixPayment({ amount: tx.amount, description: `Order ${tx.orderId}`, customerEmail: tx.customer?.email });
        tx.bankPixId = resp.gatewayTransactionId;
        tx.pixCode = resp.pixCode;
        tx.qrCodeImage = resp.qrCodeImage;
        tx.expiresAt = resp.expiresAt || undefined;
        tx.gatewayResponse = { ...(tx.gatewayResponse || {}), pix: resp.details };
        await tx.save();
        res.json({ success: true, data: { transaction: tx.toJSON(), pixCode: tx.pixCode, qrCodeImage: tx.qrCodeImage, expiresAt: tx.expiresAt } });
    }),
    checkStatus: (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const merchantKey = req.merchant.merchantKey;
        const { id } = req.params;
        const tx = await Transaction_1.Transaction.findOne({ _id: id, merchantId: merchantKey });
        if (!tx)
            throw new errorHandler_1.AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
        if (tx.paymentMethod === 'pix' && tx.bankPixId) {
            const gw = await paymentGateway_service_1.paymentGatewayService.checkPixStatus(tx.bankPixId);
            const prev = tx.status;
            tx.status = gw.status;
            tx.gatewayResponse = { ...(tx.gatewayResponse || {}), statusCheck: gw.details };
            await tx.save();
            res.json({ success: true, data: { transaction: tx.toJSON(), updated: prev !== tx.status } });
            return;
        }
        res.json({ success: true, data: { transaction: tx.toJSON() } });
    }),
    receiveWebhook: (0, errorHandler_1.asyncHandler)(async (req, res) => {
        const event = req.body;
        res.status(202).json({ received: true, eventType: event?.type || 'unknown' });
    })
};
//# sourceMappingURL=merchant.controller.js.map