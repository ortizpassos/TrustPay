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
    // Também considerar recebimentos P2P do usuário dono do merchantId
    const { User } = await import('../models/User');
    const owner = await User.findOne({ merchantKey: merchantId });
    const ownerId = owner?._id ? String(owner._id) : null;

    const matchRecebido: any = ownerId
      ? { status: 'APPROVED', $or: [ { merchantId }, { recipientUserId: ownerId } ] }
      : { status: 'APPROVED', merchantId };
    const matchPendente: any = ownerId
      ? { status: 'PENDING', $or: [ { merchantId }, { recipientUserId: ownerId } ] }
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
    } as any;

    const totalRecebido = await Transaction.aggregate([
      { $match: matchRecebido },
      { $group: { _id: null, total: sumBaseWhenInstallments } }
    ]);
    const totalPendente = await Transaction.aggregate([
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

  // Retorna saldo total recebido e valores a receber para o usuário autenticado (recebimentos P2P)
  getUserWalletSummary = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?._id as string | undefined;
    if (!userId) {
      res.status(401).json({ success: false, error: { message: 'Não autenticado' } });
      return;
    }

    // Total recebido (transações com recipientUserId = usuário) e aprovadas
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
    } as any;
    const totalRecebido = await Transaction.aggregate([
      { $match: { recipientUserId: String(userId), status: 'APPROVED' } },
      { $group: { _id: null, total: sumBaseWhenInstallments } }
    ]);

    // Total a receber (pendente para o usuário)
    const totalPendente = await Transaction.aggregate([
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

  // Retorna saldo disponível (recebido aprovado - enviado aprovado) para o usuário autenticado
  getUserBalance = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?._id as string | undefined;
    if (!userId) {
      res.status(401).json({ success: false, error: { message: 'Não autenticado' } });
      return;
    }

    // Recebidos: somar P2P (recipientUserId) e, se o usuário for lojista, também vendas (merchantId)
    const user = (req as any).user as any;
    const recebidosMatch: any = { status: 'APPROVED', $or: [ { recipientUserId: String(userId) } ] };
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
    } as any;
    const recebidosAgg = await Transaction.aggregate([
      { $match: recebidosMatch },
      { $group: { _id: null, total: sumBaseWhenInstallments } }
    ]);
    // Débitos impactam o saldo apenas para transferências internas (saldo)
    const enviadosAgg = await Transaction.aggregate([
      { $match: { userId: String(userId), status: 'APPROVED', paymentMethod: 'internal_transfer' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const recebidos = recebidosAgg[0]?.total || 0;
    const enviados = enviadosAgg[0]?.total || 0;
    const saldo = recebidos - enviados;
    res.json({ success: true, data: { saldo, recebidos, enviados } });
  });
}

export const walletController = new WalletController();
