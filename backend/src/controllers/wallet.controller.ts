import { Request, Response } from 'express';
import { Transaction } from '../models/Transaction';
import { asyncHandler } from '../middleware/errorHandler';

class WalletController {
  // Retorna saldo total recebido e valores a receber para merchantId
  getWalletSummary = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const merchantId = req.query.merchantId as string | undefined;
    if (!merchantId) {
      res.status(400).json({ success: false, error: { message: 'merchantId é obrigatório' } });
      return;
    }
    // Total recebido (aprovado)
    const totalRecebido = await Transaction.aggregate([
      { $match: { merchantId, status: 'APPROVED' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    // Total a receber (pendente)
    const totalPendente = await Transaction.aggregate([
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

export const walletController = new WalletController();
