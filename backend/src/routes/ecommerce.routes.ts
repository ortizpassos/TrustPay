import { Router } from 'express';
import { ecommerceController } from '../controllers/ecommerce.controller';
import { merchantAuthenticate } from '../middleware/apiAuth';

const router = Router();

// Todas as rotas exigem autenticação do lojista
router.use(merchantAuthenticate);

// Pagamento simplificado via e-commerce
router.post('/pay', ecommerceController.pay);

export default router;
