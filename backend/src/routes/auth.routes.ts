import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate, optionalAuth, requireEmailVerification } from '../middleware/auth';
import { validate } from '../utils/validation';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  verifyEmailSchema
} from '../utils/validation';

const router = Router();

// Rotas públicas
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);

// Rotas protegidas (exigem autenticação)
router.use(authenticate); // Todas as rotas abaixo exigem autenticação


// Gerar chaves merchant (apenas lojista autenticado)
router.post('/generate-merchant-keys', authController.generateMerchantKeys);

// Rotas que exigem verificação de email
router.post('/resend-verification', requireEmailVerification, authController.resendVerification);

export default router;