import { Router } from 'express';
import { cardController } from '../controllers/card.controller';
import { authenticate } from '../middleware/auth';
import { validateCard } from '../utils/cardValidation';
import { saveCardSchema, updateCardSchema } from '../utils/cardValidation';

const router = Router();

// Todas as rotas exigem autenticação
router.use(authenticate);

// Operações CRUD de cartão
router.get('/', cardController.getUserCards);
router.post('/', validateCard(saveCardSchema), cardController.saveCard);
router.get('/:cardId', cardController.getCard);
router.put('/:cardId', validateCard(updateCardSchema), cardController.updateCard);
router.delete('/:cardId', cardController.deleteCard);

// Gestão de cartão
router.patch('/:cardId/set-default', cardController.setDefaultCard);

// Utilidades e estatísticas de cartão
router.get('/check/expiration', cardController.checkCardExpiration);
router.get('/stats/overview', cardController.getCardStats);
router.delete('/expired/cleanup', cardController.deleteExpiredCards);

export default router;