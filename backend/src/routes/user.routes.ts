import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { userController } from '../controllers/user.controller';

const router = Router();

// Listagem protegida de usuários para seleção de destinatários
router.use(authenticate);

router.get('/', userController.list);
router.get('/lookup', userController.lookupByEmail);

export default router;
