import { Router } from 'express';
import { walletController } from '../controllers/wallet.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /wallet/summary?merchantId=xxx
router.get('/summary', walletController.getWalletSummary);

export default router;
