import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { encryptionService } from '../services/encryption.service';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';

const router = Router();

// Todas as rotas de debug exigem autenticação (evita exposição indevida)
router.use(authenticate);

router.get('/encryption', (req, res, next): void => {
  try {
    const sample = 'debug-test-string';
    let encrypted: string;
    let decrypted: string | null = null;
    try {
      encrypted = encryptionService.encrypt(sample);
      decrypted = encryptionService.decrypt(encrypted);
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Encryption test failed',
          code: err?.message?.includes('ENCRYPTION_KEY') ? 'ENCRYPTION_KEY_INVALID' : 'ENCRYPTION_RUNTIME_ERROR',
          details: process.env.NODE_ENV !== 'production' ? err?.message : undefined
        }
      });
      return;
    }

    res.json({
      success: true,
      data: {
        keyLength: process.env.ENCRYPTION_KEY ? process.env.ENCRYPTION_KEY.length : 0,
        encryptedPreview: encrypted.substring(0, 32) + '...',
        roundTripOk: decrypted === sample
      }
    });
  } catch (e) {
    next(e);
  }
});

export default router;
// DEV-ONLY: adicionar crédito de teste ao saldo do usuário autenticado
router.post('/topup', async (req, res) => {
  try {
    const userId = (req as any).user?._id as string | undefined;
    if (!userId) {
      res.status(401).json({ success: false, error: { message: 'Não autenticado' } });
      return;
    }
    const amount = Number(req.body?.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ success: false, error: { message: 'Valor inválido' } });
      return;
    }
    const user = await User.findById(userId);
    const orderId = 'TOPUP-' + Date.now();
    const tx = await Transaction.create({
      orderId,
      // userId indefinido para não contabilizar como envio do próprio usuário e anular o crédito
      userId: undefined,
      recipientUserId: userId,
      amount,
      currency: 'BRL',
      paymentMethod: 'internal_transfer',
      status: 'APPROVED',
      customer: {
        name: `${user?.firstName || 'Dev'} ${user?.lastName || 'User'}`.trim(),
        email: user?.email || 'dev@example.com'
      },
      returnUrl: 'http://localhost/dev',
      callbackUrl: 'http://localhost/dev'
    });
    res.status(201).json({ success: true, data: tx.toJSON() });
  } catch (e: any) {
    res.status(500).json({ success: false, error: { message: e.message || 'Falha no topup' } });
  }
});
