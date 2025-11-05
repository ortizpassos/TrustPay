"use strict";
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
            const totalRecebido = await Transaction_1.Transaction.aggregate([
                { $match: { merchantId, status: 'APPROVED' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            const totalPendente = await Transaction_1.Transaction.aggregate([
                { $match: { merchantId, status: 'PENDING' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);
            console.log('[WalletController] merchantId:', merchantId);
            console.log('[WalletController] totalRecebido:', totalRecebido);
            console.log('[WalletController] totalPendente:', totalPendente);
            res.json({
                success: true,
                data: {
                    totalRecebido: totalRecebido[0]?.total || 0,
                    totalPendente: totalPendente[0]?.total || 0
                }
            });
        });
    }
}
exports.walletController = new WalletController();
//# sourceMappingURL=wallet.controller.js.map