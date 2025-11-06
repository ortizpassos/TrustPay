import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validatePayment } from '../utils/paymentValidation';
import {
  initiatePaymentSchema,
  creditCardPaymentSchema,
  pixPaymentSchema
} from '../utils/paymentValidation';

const router = Router();

// Rotas protegidas (exigem autenticação)
router.use(authenticate);

// Iniciação de pagamento
router.post('/initiate', validatePayment(initiatePaymentSchema), paymentController.initiatePayment);

// Transações recentes (deve vir antes de /:transactionId)
router.get('/recent', paymentController.recentTransactions);

// Processamento de pagamento
router.post('/credit-card', validatePayment(creditCardPaymentSchema), paymentController.processCreditCardPayment);
router.post('/pix', validatePayment(pixPaymentSchema), paymentController.processPixPayment);

// Relatório (tem que vir antes de /:transactionId para não conflitar)
router.get('/report', paymentController.getReport);

// Status e gerenciamento de pagamento
router.get('/pix/:transactionId/status', paymentController.checkPixStatus);
router.get('/:transactionId', paymentController.getTransaction);
router.patch('/:transactionId/cancel', paymentController.cancelTransaction);

// Gerenciamento de transações do usuário
router.get('/', paymentController.getTransactionHistory);
router.get('/stats/overview', paymentController.getPaymentStats);

// Helpers de desenvolvimento
router.get('/test/cards', paymentController.getTestCards);

export default router;