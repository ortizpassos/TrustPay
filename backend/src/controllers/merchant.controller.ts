import { Request, Response } from 'express';
import { Transaction } from '../models/Transaction';
import { paymentGatewayService } from '../services/paymentGateway.service';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { externalCardValidationService } from '../services/externalCardValidation.service';

export const merchantController = {
  // POST /payment-intents
  createPaymentIntent: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const merchantKey = req.merchant!.merchantKey;
    const { orderId, amount, currency = 'BRL', paymentMethod, customer, returnUrl, callbackUrl, installments } = req.body;

    // Ensure idempotency by orderId + merchantId
    const existing = await Transaction.findOne({ orderId, merchantId: merchantKey, status: { $in: ['PENDING','PROCESSING','APPROVED'] } });
    if (existing) {
      res.status(200).json({ success: true, data: existing.toJSON(), idempotent: true });
      return;
    }

    const tx = await Transaction.create({
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

  // GET /payments/:id
  getPayment: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const merchantKey = req.merchant!.merchantKey;
    const { id } = req.params;
    const tx = await Transaction.findOne({ _id: id, merchantId: merchantKey });
    if (!tx) throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
    res.json({ success: true, data: tx.toJSON() });
  }),

  // POST /payments/:id/capture (for credit card)
  capturePayment: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const merchantKey = req.merchant!.merchantKey;
    const { id } = req.params;
    const { cardNumber, cardHolderName, expirationMonth, expirationYear, cvv } = req.body || {};

    const tx = await Transaction.findOne({ _id: id, merchantId: merchantKey });
    if (!tx) throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
    if (tx.paymentMethod !== 'credit_card') throw new AppError('Invalid payment method', 400, 'INVALID_PAYMENT_METHOD');
    if (tx.status !== 'PENDING') throw new AppError('Transaction not capturable', 400, 'INVALID_STATUS');

    // Buscar nome do usuário pelo merchantId
    const { User } = require('../models/User');
    let merchantName = tx.merchantId || 'E-Commerce';
    const user = await User.findOne({ merchantKey: tx.merchantId });
    if (user) {
      merchantName = `${user.firstName} ${user.lastName}`;
    }
    // Monta payload para API externa de compra
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
    // Log do payload enviado para API externa
    console.log('Payload para EXTERNAL_PURCHASE_API_URL:', JSON.stringify(externalPayload, null, 2));
    // Chama API externa de compra
    const axios = require('axios');
    let externalResp;
    try {
      externalResp = await axios.post(process.env.EXTERNAL_PURCHASE_API_URL, externalPayload, {
        headers: {}
      });
    } catch (e) {
      res.status(502).json({ success: false, error: { message: 'Erro ao processar pagamento externo', code: 'EXTERNAL_API_ERROR' } });
    }
    if (!externalResp) {
      // Se não houve resposta externa, não continue
      return;
    }
    const extData = externalResp?.data;
    if (extData?.success && extData?.status === 'AUTHORIZED') {
      // Pagamento aprovado
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
    } else {
      // Pagamento recusado
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

  // POST /payments/:id/refund
  refundPayment: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const merchantKey = req.merchant!.merchantKey;
    const { id } = req.params;
    const { amount, reason } = req.body || {};
    const tx = await Transaction.findOne({ _id: id, merchantId: merchantKey });
    if (!tx) throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
    if (tx.status !== 'APPROVED') throw new AppError('Only approved transactions can be refunded', 400, 'REFUND_NOT_ALLOWED');
    const refundAmount = amount ?? tx.amount;
    if (refundAmount <= 0 || refundAmount > tx.amount) throw new AppError('Invalid refund amount', 400, 'INVALID_REFUND_AMOUNT');

    // Mock refund: just mark refunded, attach metadata
    tx.status = 'REFUNDED' as any;
    tx.refund = { amount: refundAmount, reason, refundedAt: new Date() } as any;
    tx.gatewayResponse = { ...(tx.gatewayResponse || {}), refund: { amount: refundAmount, reason } };
    await tx.save();

    res.json({ success: true, data: tx.toJSON() });
  }),

  // POST /payments/:id/pix -> generate PIX QR code for this intent
  startPix: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const merchantKey = req.merchant!.merchantKey;
    const { id } = req.params;
    const tx = await Transaction.findOne({ _id: id, merchantId: merchantKey });
    if (!tx) throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
    if (tx.paymentMethod !== 'pix') throw new AppError('Invalid payment method', 400, 'INVALID_PAYMENT_METHOD');
    if (tx.status !== 'PENDING') throw new AppError('Transaction not processable', 400, 'INVALID_STATUS');

    const resp = await paymentGatewayService.processPixPayment({ amount: tx.amount, description: `Order ${tx.orderId}`, customerEmail: tx.customer?.email });
    tx.bankPixId = resp.gatewayTransactionId;
    tx.pixCode = resp.pixCode;
    tx.qrCodeImage = resp.qrCodeImage;
    tx.expiresAt = resp.expiresAt || undefined;
    tx.gatewayResponse = { ...(tx.gatewayResponse || {}), pix: resp.details };
    await tx.save();

    res.json({ success: true, data: { transaction: tx.toJSON(), pixCode: tx.pixCode, qrCodeImage: tx.qrCodeImage, expiresAt: tx.expiresAt } });
  }),

  // GET /payments/:id/status -> returns current status; for PIX, may trigger provider status check
  checkStatus: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const merchantKey = req.merchant!.merchantKey;
    const { id } = req.params;
    const tx = await Transaction.findOne({ _id: id, merchantId: merchantKey });
    if (!tx) throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');

    if (tx.paymentMethod === 'pix' && tx.bankPixId) {
      const gw = await paymentGatewayService.checkPixStatus(tx.bankPixId);
      const prev = tx.status;
      tx.status = gw.status as any;
      tx.gatewayResponse = { ...(tx.gatewayResponse || {}), statusCheck: gw.details };
      await tx.save();
      res.json({ success: true, data: { transaction: tx.toJSON(), updated: prev !== tx.status } });
      return;
    }

    res.json({ success: true, data: { transaction: tx.toJSON() } });
  }),

  // POST /webhooks/trustpay
  receiveWebhook: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // In a real integration, we would verify TrustPay signature and update transaction
    // For now, accept event and echo
    const event = req.body;
    res.status(202).json({ received: true, eventType: event?.type || 'unknown' });
  })
};
