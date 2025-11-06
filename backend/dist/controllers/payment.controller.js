"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentController = void 0;
const Transaction_1 = require("../models/Transaction");
const User_1 = require("../models/User");
const SavedCard_1 = require("../models/SavedCard");
const encryption_service_1 = require("../services/encryption.service");
const paymentGateway_service_1 = require("../services/paymentGateway.service");
const errorHandler_1 = require("../middleware/errorHandler");
class PaymentController {
    constructor() {
        this.recentTransactions = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const user = req.user;
            const limit = Math.min(parseInt(req.query.limit || '5', 10), 20);
            const merchantId = req.query.merchantId;
            const flowRaw = String(req.query.flow || 'all').toLowerCase();
            const flow = ['in', 'out', 'all'].includes(flowRaw) ? flowRaw : 'all';
            const uid = String(user._id);
            let filter = {};
            if (merchantId) {
                if (flow === 'in')
                    filter = { $or: [{ merchantId }, { recipientUserId: uid }] };
                else if (flow === 'out')
                    filter = { userId: uid };
                else
                    filter = { $or: [{ merchantId }, { userId: uid }, { recipientUserId: uid }] };
            }
            else {
                if (flow === 'in')
                    filter = { recipientUserId: uid };
                else if (flow === 'out')
                    filter = { userId: uid };
                else
                    filter = { $or: [{ userId: uid }, { recipientUserId: uid }] };
            }
            const transactions = await Transaction_1.Transaction.find(filter)
                .sort({ createdAt: -1 })
                .limit(limit)
                .select('orderId amount currency paymentMethod status createdAt updatedAt recipientUserId recipientPixKey installments merchantId');
            res.json({
                success: true,
                data: {
                    transactions: transactions.map(t => t.toJSON()),
                    limit
                }
            });
        });
        this.initiatePayment = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const { orderId, amount, currency, paymentMethod, customer, returnUrl, callbackUrl, recipientUserId, recipientPixKey, installments, from, to, cardId } = req.body;
            const user = req.user;
            const existingTransaction = await Transaction_1.Transaction.findOne({
                orderId,
                userId: user._id,
                status: { $in: ['PENDING', 'PROCESSING', 'APPROVED'] }
            });
            if (existingTransaction) {
                throw new errorHandler_1.AppError('Order ID already exists with active transaction', 400, 'DUPLICATE_ORDER_ID');
            }
            if (paymentMethod === 'internal_transfer' || paymentMethod === 'saldo') {
                if (!from?.email || !to?.email) {
                    throw new errorHandler_1.AppError('Dados do remetente ou destinatário ausentes', 400, 'MISSING_TRANSFER_DATA');
                }
                if (from.email === to.email) {
                    throw new errorHandler_1.AppError('Não é possível transferir para si mesmo', 400, 'TRANSFER_TO_SELF');
                }
                const remetente = await User_1.User.findOne({ email: from.email.toLowerCase() });
                const destinatario = await User_1.User.findOne({ email: to.email.toLowerCase() });
                if (!remetente || !destinatario) {
                    throw new errorHandler_1.AppError('Usuário remetente ou destinatário não encontrado', 404, 'USER_NOT_FOUND');
                }
                const recebidosMatch = { status: 'APPROVED', $or: [{ recipientUserId: remetente._id.toString() }] };
                if (remetente.merchantKey) {
                    recebidosMatch.$or.push({ merchantId: remetente.merchantKey });
                }
                const recebidos = await Transaction_1.Transaction.aggregate([
                    { $match: recebidosMatch },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ]);
                const enviados = await Transaction_1.Transaction.aggregate([
                    { $match: { userId: remetente._id.toString(), status: 'APPROVED' } },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ]);
                const saldo = (recebidos[0]?.total || 0) - (enviados[0]?.total || 0);
                if (process.env.NODE_ENV !== 'production') {
                    console.log('[SALDO][CHECK]', {
                        user: remetente.email,
                        recebidos: recebidos[0]?.total || 0,
                        enviados: enviados[0]?.total || 0,
                        saldo,
                        merchantKey: remetente.merchantKey || null
                    });
                }
                if (saldo < amount) {
                    throw new errorHandler_1.AppError('Saldo insuficiente para transferência', 400, 'INSUFFICIENT_FUNDS');
                }
                const transaction = new Transaction_1.Transaction({
                    orderId,
                    userId: remetente._id,
                    recipientUserId: destinatario._id,
                    amount,
                    currency: currency || 'BRL',
                    paymentMethod: 'internal_transfer',
                    status: 'APPROVED',
                    customer: {
                        name: remetente.firstName + ' ' + remetente.lastName,
                        email: remetente.email,
                        document: remetente.document
                    },
                    returnUrl: returnUrl || '',
                    callbackUrl: callbackUrl || ''
                });
                await transaction.save();
                const response = {
                    success: true,
                    data: transaction.toJSON()
                };
                res.status(201).json(response);
                return;
            }
            if (recipientUserId && recipientPixKey) {
                throw new errorHandler_1.AppError('Only one recipient type allowed (user or pix key)', 400, 'RECIPIENT_CONFLICT');
            }
            if (recipientPixKey && !/^[\w@+_.:-]{3,120}$/.test(recipientPixKey)) {
                throw new errorHandler_1.AppError('Invalid PIX key format', 400, 'INVALID_PIX_KEY');
            }
            let finalAmount = amount;
            let installmentsData = undefined;
            if (paymentMethod === 'credit_card') {
                const qty = installments?.quantity ? parseInt(installments.quantity, 10) : 1;
                if (qty < 1 || qty > 24) {
                    throw new errorHandler_1.AppError('Installments quantity must be between 1 and 24', 400, 'INVALID_INSTALLMENTS');
                }
                if (qty === 1) {
                    installmentsData = {
                        quantity: 1,
                        interestMonthly: 0,
                        totalWithInterest: amount,
                        installmentValue: amount,
                        mode: 'AVISTA'
                    };
                }
                else {
                    const interestMonthly = 0.03;
                    const totalWithInterest = parseFloat((amount * Math.pow(1 + interestMonthly, qty)).toFixed(2));
                    const installmentValue = parseFloat((totalWithInterest / qty).toFixed(2));
                    finalAmount = totalWithInterest;
                    installmentsData = {
                        quantity: qty,
                        interestMonthly,
                        totalWithInterest,
                        installmentValue,
                        mode: 'PARCELADO'
                    };
                }
            }
            else if (installments?.quantity) {
                throw new errorHandler_1.AppError('Installments only supported for credit card', 400, 'INSTALLMENTS_NOT_ALLOWED');
            }
            let resolvedRecipientUserId = undefined;
            if (paymentMethod === 'credit_card' && to?.email) {
                const dest = await User_1.User.findOne({ email: String(to.email).toLowerCase() });
                if (dest) {
                    resolvedRecipientUserId = dest._id;
                }
            }
            const transaction = new Transaction_1.Transaction({
                orderId,
                userId: user._id,
                recipientUserId: recipientUserId || resolvedRecipientUserId || undefined,
                recipientPixKey: recipientPixKey || undefined,
                amount: finalAmount,
                baseAmount: paymentMethod === 'credit_card' ? amount : undefined,
                currency: currency || 'BRL',
                paymentMethod,
                status: 'PENDING',
                customer,
                returnUrl,
                callbackUrl,
                installments: installmentsData,
                savedCardId: cardId || undefined
            });
            await transaction.save();
            const response = {
                success: true,
                data: transaction.toJSON()
            };
            res.status(201).json(response);
        });
        this.processCreditCardPayment = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const { transactionId, savedCardId, cardNumber: rawCardNumber, cardHolderName: rawHolder, expirationMonth: rawExpM, expirationYear: rawExpY, cvv: rawCvv, saveCard } = req.body;
            const user = req.user;
            const transaction = await Transaction_1.Transaction.findById(transactionId);
            if (!transaction) {
                throw new errorHandler_1.AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
            }
            const isOwner = transaction.userId && String(transaction.userId) === String(user._id);
            if (!isOwner) {
                throw new errorHandler_1.AppError('Unauthorized access to transaction', 403, 'UNAUTHORIZED_TRANSACTION');
            }
            if (transaction.status !== 'PENDING') {
                throw new errorHandler_1.AppError('Transaction cannot be processed in current status', 400, 'INVALID_TRANSACTION_STATUS');
            }
            if (transaction.paymentMethod !== 'credit_card') {
                throw new errorHandler_1.AppError('Invalid payment method for this transaction', 400, 'INVALID_PAYMENT_METHOD');
            }
            try {
                transaction.status = 'PROCESSING';
                await transaction.save();
                let cardNumber = rawCardNumber;
                let cardHolderName = rawHolder;
                let expirationMonth = rawExpM;
                let expirationYear = rawExpY;
                let cvv = rawCvv;
                let effectiveSavedCardId = savedCardId || transaction.savedCardId;
                if (effectiveSavedCardId && !cardNumber) {
                    const saved = await SavedCard_1.SavedCard.findOne({ _id: effectiveSavedCardId, userId: user._id });
                    if (!saved) {
                        throw new errorHandler_1.AppError('Cartão salvo não encontrado', 404, 'SAVED_CARD_NOT_FOUND');
                    }
                    try {
                        const data = encryption_service_1.encryptionService.detokenizeCard(saved.encryptedData);
                        cardNumber = data.cardNumber;
                        cardHolderName = data.cardHolderName;
                        expirationMonth = data.expirationMonth;
                        expirationYear = data.expirationYear;
                    }
                    catch (e) {
                        throw new errorHandler_1.AppError('Falha ao recuperar dados do cartão', 500, 'CARD_DECRYPT_ERROR');
                    }
                }
                const axios = require('axios');
                const merchantEnvUrl = process.env.EXTERNAL_PURCHASE_API_URL;
                if (!merchantEnvUrl) {
                    throw new errorHandler_1.AppError('External purchase API URL not configured', 500, 'MISSING_EXTERNAL_API_URL');
                }
                let merchantName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'TrustPay P2P';
                if (transaction.recipientUserId) {
                    try {
                        const dest = await User_1.User.findById(transaction.recipientUserId);
                        if (dest) {
                            merchantName = `${dest.firstName || ''} ${dest.lastName || ''}`.trim() || merchantName;
                        }
                    }
                    catch (_) {
                    }
                }
                const externalPayload = {
                    typePayment: 'CREDIT',
                    amount: transaction.amount,
                    currency: transaction.currency,
                    merchantName,
                    cardNumber,
                    installmentsTotal: transaction.installments?.quantity || 1,
                    mcc: '5732',
                    category: 'ELETRONICOS',
                    createdAt: transaction.createdAt.toISOString()
                };
                if (process.env.EXTERNAL_CARD_API_DEBUG === 'true') {
                    const safeLog = { ...externalPayload, cardNumber: `****${String(cardNumber).slice(-4)}` };
                    console.log('[P2P][CARD][EXTERNAL_PURCHASE_PAYLOAD]', safeLog);
                }
                let externalResp;
                try {
                    externalResp = await axios.post(merchantEnvUrl, externalPayload, { headers: {} });
                }
                catch (e) {
                    const err = e;
                    const status = err?.response?.status;
                    if (err.response && [400, 422, 500].includes(status)) {
                        transaction.status = 'DECLINED';
                        transaction.gatewayResponse = err.response.data;
                        await transaction.save();
                        res.status(status).json(err.response.data);
                        return;
                    }
                    transaction.status = 'FAILED';
                    transaction.gatewayResponse = { error: 'EXTERNAL_API_ERROR' };
                    await transaction.save();
                    res.status(502).json({ success: false, error: { message: 'Erro ao processar pagamento externo', code: 'EXTERNAL_API_ERROR' } });
                    return;
                }
                if (!externalResp) {
                    transaction.status = 'FAILED';
                    transaction.gatewayResponse = { error: 'NO_EXTERNAL_RESPONSE' };
                    await transaction.save();
                    res.status(502).json({ success: false, error: { message: 'Sem resposta da API externa', code: 'NO_EXTERNAL_RESPONSE' } });
                    return;
                }
                const extData = externalResp.data;
                if (extData?.status === 'AUTHORIZED') {
                    transaction.status = 'APPROVED';
                }
                else {
                    transaction.status = 'DECLINED';
                }
                transaction.bankTransactionId = extData?.transactionId;
                transaction.gatewayResponse = extData;
                await transaction.save();
                if (saveCard && transaction.status === 'APPROVED') {
                    console.log('[P2P][CARD] Solicitação para salvar cartão (a ser implementado)');
                }
                const response = {
                    success: extData?.status === 'AUTHORIZED',
                    data: {
                        transaction: transaction.toJSON(),
                        status: transaction.status,
                        message: extData?.message || (transaction.status === 'APPROVED' ? 'Pagamento autorizado' : 'Pagamento recusado'),
                        external: extData
                    }
                };
                if (transaction.status !== 'APPROVED') {
                    response.error = { message: 'Pagamento recusado pela operadora', code: 'PAYMENT_DECLINED' };
                }
                res.status(externalResp.status || 200).json(response);
            }
            catch (error) {
                transaction.status = 'FAILED';
                transaction.gatewayResponse = { error: error.message };
                await transaction.save();
                throw new errorHandler_1.AppError('Payment processing failed', 500, 'PAYMENT_PROCESSING_ERROR');
            }
        });
        this.processPixPayment = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const { transactionId } = req.body;
            const user = req.user;
            const transaction = await Transaction_1.Transaction.findById(transactionId);
            if (!transaction) {
                throw new errorHandler_1.AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
            }
            const isOwner = transaction.userId && String(transaction.userId) === String(user._id);
            const isRecipient = transaction.recipientUserId && String(transaction.recipientUserId) === String(user._id);
            if (!isOwner && !isRecipient) {
                throw new errorHandler_1.AppError('Unauthorized access to transaction', 403, 'UNAUTHORIZED_TRANSACTION');
            }
            if (transaction.status !== 'PENDING') {
                throw new errorHandler_1.AppError('Transaction cannot be processed in current status', 400, 'INVALID_TRANSACTION_STATUS');
            }
            if (transaction.paymentMethod !== 'pix') {
                throw new errorHandler_1.AppError('Invalid payment method for this transaction', 400, 'INVALID_PAYMENT_METHOD');
            }
            try {
                const gatewayResponse = await paymentGateway_service_1.paymentGatewayService.processPixPayment({
                    amount: transaction.amount,
                    description: `Order ${transaction.orderId}`,
                    customerEmail: transaction.customer.email
                });
                transaction.bankPixId = gatewayResponse.gatewayTransactionId;
                transaction.pixCode = gatewayResponse.pixCode;
                transaction.qrCodeImage = gatewayResponse.qrCodeImage;
                transaction.expiresAt = gatewayResponse.expiresAt;
                transaction.gatewayResponse = gatewayResponse.details;
                await transaction.save();
                const response = {
                    success: gatewayResponse.success,
                    data: {
                        transaction: transaction.toJSON(),
                        pixCode: gatewayResponse.pixCode,
                        qrCodeImage: gatewayResponse.qrCodeImage,
                        expiresAt: gatewayResponse.expiresAt,
                        message: gatewayResponse.message
                    }
                };
                res.json(response);
            }
            catch (error) {
                transaction.status = 'FAILED';
                transaction.gatewayResponse = { error: error.message };
                await transaction.save();
                throw new errorHandler_1.AppError('PIX payment processing failed', 500, 'PIX_PROCESSING_ERROR');
            }
        });
        this.checkPixStatus = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const { transactionId } = req.params;
            const user = req.user;
            const transaction = await Transaction_1.Transaction.findById(transactionId);
            if (!transaction) {
                throw new errorHandler_1.AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
            }
            if (transaction.userId && transaction.userId !== user._id) {
                throw new errorHandler_1.AppError('Unauthorized access to transaction', 403, 'UNAUTHORIZED_TRANSACTION');
            }
            if (transaction.paymentMethod !== 'pix') {
                throw new errorHandler_1.AppError('Invalid payment method for status check', 400, 'INVALID_PAYMENT_METHOD');
            }
            if (!transaction.bankPixId) {
                throw new errorHandler_1.AppError('PIX payment not yet initiated', 400, 'PIX_NOT_INITIATED');
            }
            try {
                const gatewayResponse = await paymentGateway_service_1.paymentGatewayService.checkPixStatus(transaction.bankPixId);
                const oldStatus = transaction.status;
                transaction.status = gatewayResponse.status;
                transaction.gatewayResponse = {
                    ...transaction.gatewayResponse,
                    statusCheck: gatewayResponse.details
                };
                await transaction.save();
                if (oldStatus !== gatewayResponse.status) {
                }
                const response = {
                    success: gatewayResponse.success,
                    data: {
                        transaction: transaction.toJSON(),
                        status: gatewayResponse.status,
                        message: gatewayResponse.message,
                        paidAt: gatewayResponse.details?.paidAt
                    }
                };
                res.json(response);
            }
            catch (error) {
                throw new errorHandler_1.AppError('Failed to check PIX status', 500, 'PIX_STATUS_CHECK_ERROR');
            }
        });
        this.getTransaction = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const { transactionId } = req.params;
            const user = req.user;
            const transaction = await Transaction_1.Transaction.findById(transactionId);
            if (!transaction) {
                throw new errorHandler_1.AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
            }
            const isOwner = transaction.userId && String(transaction.userId) === String(user._id);
            const isRecipient = transaction.recipientUserId && String(transaction.recipientUserId) === String(user._id);
            if (!isOwner && !isRecipient) {
                throw new errorHandler_1.AppError('Unauthorized access to transaction', 403, 'UNAUTHORIZED_TRANSACTION');
            }
            const response = {
                success: true,
                data: {
                    transaction: transaction.toJSON()
                }
            };
            res.json(response);
        });
        this.getTransactionHistory = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const user = req.user;
            const { page = 1, limit = 10, status, paymentMethod, sort = 'createdAt', direction = 'desc' } = req.query;
            const pageNumber = parseInt(page);
            const limitNumber = parseInt(limit);
            const skip = (pageNumber - 1) * limitNumber;
            const merchantId = req.query.merchantId;
            const flowRaw = String(req.query.flow || 'all').toLowerCase();
            const flow = ['in', 'out', 'all'].includes(flowRaw) ? flowRaw : 'all';
            const uid = String(user._id);
            let query;
            if (merchantId) {
                if (flow === 'in')
                    query = { $or: [{ merchantId }, { recipientUserId: uid }] };
                else if (flow === 'out')
                    query = { userId: uid };
                else
                    query = { $or: [{ merchantId }, { userId: uid }, { recipientUserId: uid }] };
            }
            else {
                if (flow === 'in')
                    query = { recipientUserId: uid };
                else if (flow === 'out')
                    query = { userId: uid };
                else
                    query = { $or: [{ userId: uid }, { recipientUserId: uid }] };
            }
            if (status) {
                query.status = status;
            }
            if (paymentMethod) {
                query.paymentMethod = paymentMethod;
            }
            const allowedSort = new Set(['createdAt', 'amount', 'status', 'paymentMethod']);
            const sortField = allowedSort.has(String(sort)) ? String(sort) : 'createdAt';
            const sortDir = String(direction).toLowerCase() === 'asc' ? 1 : -1;
            const [transactions, total] = await Promise.all([
                Transaction_1.Transaction.find(query)
                    .sort({ [sortField]: sortDir })
                    .skip(skip)
                    .limit(limitNumber),
                Transaction_1.Transaction.countDocuments(query)
            ]);
            const response = {
                success: true,
                data: {
                    transactions: transactions.map(t => t.toJSON()),
                    pagination: {
                        page: pageNumber,
                        limit: limitNumber,
                        total,
                        pages: Math.ceil(total / limitNumber)
                    },
                    sort: sortField,
                    direction: sortDir === 1 ? 'asc' : 'desc'
                }
            };
            res.json(response);
        });
        this.cancelTransaction = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const { transactionId } = req.params;
            const user = req.user;
            const transaction = await Transaction_1.Transaction.findById(transactionId);
            if (!transaction) {
                throw new errorHandler_1.AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
            }
            if (transaction.userId !== user._id) {
                throw new errorHandler_1.AppError('Unauthorized access to transaction', 403, 'UNAUTHORIZED_TRANSACTION');
            }
            if (!['PENDING', 'PROCESSING'].includes(transaction.status)) {
                throw new errorHandler_1.AppError('Transaction cannot be cancelled in current status', 400, 'CANNOT_CANCEL_TRANSACTION');
            }
            transaction.status = 'FAILED';
            transaction.gatewayResponse = {
                ...transaction.gatewayResponse,
                cancellation: {
                    cancelledAt: new Date(),
                    cancelledBy: user._id,
                    reason: 'USER_CANCELLATION'
                }
            };
            await transaction.save();
            const response = {
                success: true,
                data: {
                    transaction: transaction.toJSON(),
                    message: 'Transaction cancelled successfully'
                }
            };
            res.json(response);
        });
        this.getPaymentStats = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const user = req.user;
            const { period = '30d' } = req.query;
            let dateFilter;
            switch (period) {
                case '7d':
                    dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30d':
                    dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                    break;
                case '90d':
                    dateFilter = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            }
            const stats = await Transaction_1.Transaction.aggregate([
                {
                    $match: {
                        userId: user._id,
                        createdAt: { $gte: dateFilter }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalTransactions: { $sum: 1 },
                        totalAmount: { $sum: '$amount' },
                        approvedCount: {
                            $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] }
                        },
                        approvedAmount: {
                            $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, '$amount', 0] }
                        },
                        declinedCount: {
                            $sum: { $cond: [{ $eq: ['$status', 'DECLINED'] }, 1, 0] }
                        },
                        pendingCount: {
                            $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] }
                        },
                        creditCardCount: {
                            $sum: { $cond: [{ $eq: ['$paymentMethod', 'credit_card'] }, 1, 0] }
                        },
                        pixCount: {
                            $sum: { $cond: [{ $eq: ['$paymentMethod', 'pix'] }, 1, 0] }
                        }
                    }
                }
            ]);
            const result = stats[0] || {
                totalTransactions: 0,
                totalAmount: 0,
                approvedCount: 0,
                approvedAmount: 0,
                declinedCount: 0,
                pendingCount: 0,
                creditCardCount: 0,
                pixCount: 0
            };
            const response = {
                success: true,
                data: {
                    period,
                    stats: {
                        ...result,
                        approvalRate: result.totalTransactions > 0
                            ? (result.approvedCount / result.totalTransactions * 100).toFixed(2)
                            : '0.00'
                    }
                }
            };
            res.json(response);
        });
        this.getTestCards = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const testCards = paymentGateway_service_1.paymentGatewayService.getTestCards();
            res.json({
                success: true,
                data: {
                    testCards,
                    note: 'Esses cartões de teste podem ser usados para simular pagamentos em modo de desenvolvimento'
                }
            });
        });
    }
}
exports.paymentController = new PaymentController();
//# sourceMappingURL=payment.controller.js.map