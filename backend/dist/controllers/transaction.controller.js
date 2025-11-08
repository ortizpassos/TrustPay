"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentTransactions = void 0;
const Transaction_1 = __importDefault(require("../models/Transaction"));
const getRecentTransactions = async (req, res) => {
    try {
        const userId = req.user?._id;
        const transactions = await Transaction_1.default.find({
            $or: [
                { user: userId },
                { merchant: userId },
            ],
        })
            .sort({ createdAt: -1 })
            .limit(10);
        res.json(transactions);
    }
    catch (err) {
        res.status(500).json({ error: 'Erro ao buscar transações recentes.' });
    }
};
exports.getRecentTransactions = getRecentTransactions;
//# sourceMappingURL=transaction.controller.js.map