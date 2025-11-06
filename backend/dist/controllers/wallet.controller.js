"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletController = void 0;
const Transaction_1 = require("../models/Transaction");
const errorHandler_1 = require("../middleware/errorHandler");
class WalletController {
    constructor() {
        this.getWalletSummary = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const merchantId = req.query.merchantId;
            if (!merchantId) {
                res.status(400).json({ success: false, error: { message: 'merchantId é obrigatório' } });
                return;
            }
            const { User } = await Promise.resolve().then(() => __importStar(require('../models/User')));
            const owner = await User.findOne({ merchantKey: merchantId });
            const ownerId = owner?._id ? String(owner._id) : null;
            const matchRecebido = ownerId
                ? { status: 'APPROVED', $or: [{ merchantId }, { recipientUserId: ownerId }] }
                : { status: 'APPROVED', merchantId };
            const matchPendente = ownerId
                ? { status: 'PENDING', $or: [{ merchantId }, { recipientUserId: ownerId }] }
                : { status: 'PENDING', merchantId };
            const sumBaseWhenInstallments = {
                $sum: {
                    $cond: [
                        {
                            $and: [
                                { $eq: ['$paymentMethod', 'credit_card'] },
                                { $gt: ['$installments.quantity', 1] },
                                { $gt: ['$baseAmount', 0] }
                            ]
                        },
                        '$baseAmount',
                        '$amount'
                    ]
                }
            };
            const totalRecebido = await Transaction_1.Transaction.aggregate([
                { $match: matchRecebido },
                { $group: { _id: null, total: sumBaseWhenInstallments } }
            ]);
            const totalPendente = await Transaction_1.Transaction.aggregate([
                { $match: matchPendente },
                { $group: { _id: null, total: sumBaseWhenInstallments } }
            ]);
            res.json({
                success: true,
                data: {
                    totalRecebido: totalRecebido[0]?.total || 0,
                    totalPendente: totalPendente[0]?.total || 0
                }
            });
        });
        this.getUserWalletSummary = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const userId = req.user?._id;
            if (!userId) {
                res.status(401).json({ success: false, error: { message: 'Não autenticado' } });
                return;
            }
            const sumBaseWhenInstallments = {
                $sum: {
                    $cond: [
                        {
                            $and: [
                                { $eq: ['$paymentMethod', 'credit_card'] },
                                { $gt: ['$installments.quantity', 1] },
                                { $gt: ['$baseAmount', 0] }
                            ]
                        },
                        '$baseAmount',
                        '$amount'
                    ]
                }
            };
            const totalRecebido = await Transaction_1.Transaction.aggregate([
                { $match: { recipientUserId: String(userId), status: 'APPROVED' } },
                { $group: { _id: null, total: sumBaseWhenInstallments } }
            ]);
            const totalPendente = await Transaction_1.Transaction.aggregate([
                { $match: { recipientUserId: String(userId), status: 'PENDING' } },
                { $group: { _id: null, total: sumBaseWhenInstallments } }
            ]);
            console.log('[WalletController][User] userId:', userId);
            console.log('[WalletController][User] totalRecebido:', totalRecebido);
            console.log('[WalletController][User] totalPendente:', totalPendente);
            res.json({
                success: true,
                data: {
                    totalRecebido: totalRecebido[0]?.total || 0,
                    totalPendente: totalPendente[0]?.total || 0
                }
            });
        });
        this.getUserBalance = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const userId = req.user?._id;
            if (!userId) {
                res.status(401).json({ success: false, error: { message: 'Não autenticado' } });
                return;
            }
            const user = req.user;
            const recebidosMatch = { status: 'APPROVED', $or: [{ recipientUserId: String(userId) }] };
            if (user?.merchantKey) {
                recebidosMatch.$or.push({ merchantId: user.merchantKey });
            }
            const sumBaseWhenInstallments = {
                $sum: {
                    $cond: [
                        {
                            $and: [
                                { $eq: ['$paymentMethod', 'credit_card'] },
                                { $gt: ['$installments.quantity', 1] },
                                { $gt: ['$baseAmount', 0] }
                            ]
                        },
                        '$baseAmount',
                        '$amount'
                    ]
                }
            };
            const recebidosAgg = await Transaction_1.Transaction.aggregate([
                { $match: recebidosMatch },
                { $group: { _id: null, total: sumBaseWhenInstallments } }
            ]);
            const enviadosAgg = await Transaction_1.Transaction.aggregate([
                { $match: { userId: String(userId), status: 'APPROVED' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const recebidos = recebidosAgg[0]?.total || 0;
            const enviados = enviadosAgg[0]?.total || 0;
            const saldo = recebidos - enviados;
            res.json({ success: true, data: { saldo, recebidos, enviados } });
        });
    }
}
exports.walletController = new WalletController();
//# sourceMappingURL=wallet.controller.js.map