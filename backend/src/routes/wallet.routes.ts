import { Router } from 'express';
import { walletController } from '../controllers/wallet.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /wallet/summary?merchantId=xxx
router.get('/summary', walletController.getWalletSummary);

// GET /wallet/user-summary (autenticado)
router.get('/user-summary', walletController.getUserWalletSummary);

// GET /wallet/balance (autenticado)
router.get('/balance', walletController.getUserBalance);

export default router;
