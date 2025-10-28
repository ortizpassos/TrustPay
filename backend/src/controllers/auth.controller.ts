import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { User, IUser } from '../models/User';
import { generateTokens, verifyToken } from '../middleware/auth';
import { env } from '../config/env';
import { emailService } from '../services/email.service';
import { AppError, asyncHandler } from '../middleware/errorHandler';

interface AuthResponse {
  success: boolean;
  data?: {
    user: any;
    token: string;
    refreshToken: string;
    expiresIn: number;
  };
  error?: {
    message: string;
    code?: string;
  };
}

class AuthController {
  // Gerar chaves merchant para lojista
  generateMerchantKeys = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as IUser;
    if (!user || user.accountType !== 'loja') {
      throw new AppError('Apenas lojistas podem gerar chaves merchant.', 403, 'NOT_MERCHANT');
    }
    if (user.merchantKey && user.merchantSecret) {
      throw new AppError('Chaves já foram geradas para este lojista.', 400, 'MERCHANT_KEYS_EXISTS');
    }
    // Gera chave pública única
    const merchantKey = 'merchant-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
    // Gera chave secreta forte
    const merchantSecret = crypto.randomBytes(32).toString('hex');
    user.merchantKey = merchantKey;
    user.merchantSecret = merchantSecret;
    await user.save();
    res.json({
      success: true,
      data: {
        merchantKey,
        merchantSecret
      }
    });
  });
  // Registrar novo usuário
  register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password, firstName, lastName, phone, document, accountType } = req.body;

    // Geração automática de chaves merchant para lojistas
    let merchantKey: string | undefined = undefined;
    let merchantSecret: string | undefined = undefined;
    if (accountType === 'loja') {
      // Gera chave pública única (ex: merchant-<timestamp>-<rand>)
      merchantKey = 'merchant-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
      // Gera chave secreta forte
      merchantSecret = crypto.randomBytes(32).toString('hex');
    }

  // Verifica se o e-mail já está cadastrado
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('Email already registered', 400, 'EMAIL_EXISTS');
    }

  // Verifica se o documento (CPF/CNPJ) já está cadastrado (se fornecido)
    if (document) {
      const existingDocument = await User.findOne({ document });
      if (existingDocument) {
        throw new AppError('Document already registered', 400, 'DOCUMENT_EXISTS');
      }
    }

    // Cria o usuário
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      phone,
      document,
      accountType,
      merchantKey,
      merchantSecret
    });

    await user.save();

  // Gera token de verificação de e-mail
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

  // Envia e-mail de verificação de forma não bloqueante (não falha o fluxo se der erro)
    (async () => {
      try {
        await emailService.sendVerificationEmail(email, verificationToken, firstName);
        if (!env.isProd) console.log('[register] verification email queued/sent');
      } catch (error) {
        console.error('[register] Failed to send verification email (non-blocking):', error);
      }
    })();

  // Feature flag: auto login após registro
    if (env.features.autoLoginAfterRegister) {
      const { accessToken, refreshToken } = generateTokens(user._id, user.email);
      // Persist refresh token
      const freshUser = await User.findById(user._id).select('+refreshTokens');
      if (freshUser) {
        freshUser.refreshTokens.push(refreshToken);
        await freshUser.save();
      }
      // Inclui as chaves merchant na resposta se for lojista
      const userData = user.toJSON();
      if (user.accountType === 'loja') {
        userData.merchantKey = user.merchantKey;
        userData.merchantSecret = user.merchantSecret;
      }
      const response: AuthResponse = {
        success: true,
        data: {
          user: userData,
          token: accessToken,
          refreshToken,
          expiresIn: 3600
        }
      };
      res.status(201).json(response);
      return;
    }

    // Gera tokens (caminho padrão sem auto login explícito já tratado)
    const { accessToken, refreshToken } = generateTokens(user._id, user.email);
    // Persistir refresh token
    user.refreshTokens.push(refreshToken);
    await user.save();

    // Inclui as chaves merchant na resposta se for lojista
    const userData = user.toJSON();
    if (user.accountType === 'loja') {
      userData.merchantKey = user.merchantKey;
      userData.merchantSecret = user.merchantSecret;
    }
    const response: AuthResponse = {
      success: true,
      data: {
        user: userData,
        token: accessToken,
        refreshToken,
        expiresIn: 3600 // 1h em segundos
      }
    };
    res.status(201).json(response);
    if (!env.isProd) console.log('[register] user created and response sent:', user.email);
  });

  // Login do usuário
  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

  // Busca usuário e inclui campo de senha para comparação
    const user = await User.findOne({ email }).select('+password +refreshTokens');
    
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 401, 'ACCOUNT_DEACTIVATED');
    }

  // Gera tokens JWT
  const { accessToken, refreshToken } = generateTokens(user._id, user.email);

  // Armazena refresh token no documento do usuário
    user.refreshTokens.push(refreshToken);
    await user.save();

    const response: AuthResponse = {
      success: true,
      data: {
        user: user.toJSON(),
        token: accessToken,
        refreshToken,
        expiresIn: 3600 // 1 hour
      }
    };

    res.json(response);
  });

  // Logout do usuário (invalida refresh token específico se passado)
  logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as IUser;
    const refreshToken = req.body.refreshToken;

    if (refreshToken) {
  // Remove o refresh token informado do array persistido
      const userDoc = await User.findById(user._id).select('+refreshTokens');
      if (userDoc) {
        userDoc.refreshTokens = userDoc.refreshTokens.filter(token => token !== refreshToken);
        await userDoc.save();
      }
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });

  // Rotaciona refresh token e emite novo access token
  refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400, 'MISSING_REFRESH_TOKEN');
    }

    try {
  // Verifica a assinatura e validade do refresh token
      const decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET as string) as any;

  // Verifica se o refresh token ainda está associado ao usuário
      const user = await User.findById(decoded.id).select('+refreshTokens');
      
      if (!user || !user.refreshTokens.includes(refreshToken)) {
        throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
      }

      if (!user.isActive) {
        throw new AppError('Account is deactivated', 401, 'ACCOUNT_DEACTIVATED');
      }

  // Gera novos tokens (rotaciona o refresh token)
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id, user.email);

  // Substitui o refresh token antigo pelo novo
      const tokenIndex = user.refreshTokens.indexOf(refreshToken);
      user.refreshTokens[tokenIndex] = newRefreshToken;
      await user.save();

      const response: AuthResponse = {
        success: true,
        data: {
          user: user.toJSON(),
          token: accessToken,
          refreshToken: newRefreshToken,
          expiresIn: 3600
        }
      };

      res.json(response);

    } catch (error: any) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
      }
      throw error;
    }
  });

  // Retorna perfil do usuário autenticado
  getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as IUser;

    res.json({
      success: true,
      data: {
        user: user.toJSON()
      }
    });
  });

  // Atualiza dados do perfil do usuário
  updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as IUser;
    const { firstName, lastName, phone, document } = req.body;

  // Verifica se o documento informado já pertence a outro usuário
    if (document && document !== user.document) {
      const existingUser = await User.findOne({ 
        document, 
        _id: { $ne: user._id } 
      });
      
      if (existingUser) {
        throw new AppError('Document already registered by another user', 400, 'DOCUMENT_EXISTS');
      }
    }

  // Executa atualização (findByIdAndUpdate com validação)
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { firstName, lastName, phone, document },
      { new: true, runValidators: true }
    );

    const response: AuthResponse = {
      success: true,
      data: {
        user: updatedUser?.toJSON(),
        token: '',
        refreshToken: '',
        expiresIn: 0
      }
    };

    res.json(response);
  });

  // Alteração de senha do usuário
  changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as IUser;
    const { currentPassword, newPassword } = req.body;

  // Busca usuário com campo de senha para validar a senha atual
    const userWithPassword = await User.findById(user._id).select('+password +refreshTokens');
    
    if (!userWithPassword || !(await userWithPassword.comparePassword(currentPassword))) {
      throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
    }

  // Atualiza a senha no documento
    userWithPassword.password = newPassword;
    
  // Limpa todos os refresh tokens para forçar novo login em todos os dispositivos
    userWithPassword.refreshTokens = [];
    
    await userWithPassword.save();

    res.json({
      success: true,
      message: 'Password changed successfully. Please login again.'
    });
  });

  // Fluxo de "esqueci a senha"
  forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
  // Não revela se o e-mail existe (evita enumeração de usuários)
      res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent.'
      });
      return;
    }

  // Gera token temporário de redefinição
    const resetToken = user.generatePasswordResetToken();
    await user.save();

  // Envia e-mail com link de redefinição
    try {
      await emailService.sendPasswordResetEmail(email, resetToken, user.firstName);
      
      res.json({
        success: true,
        message: 'Password reset link sent to your email.'
      });
    } catch (error) {
  // Limpa token de redefinição se envio falhar
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      throw new AppError('Failed to send reset email. Please try again.', 500, 'EMAIL_SEND_FAILED');
    }
  });

  // Conclui redefinição de senha
  resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token, newPassword } = req.body;

  // Faz hash do token recebido e busca usuário correspondente
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    }).select('+refreshTokens');

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
    }

  // Atualiza senha e limpa campos de reset
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    
  // Limpa todos os refresh tokens existentes
    user.refreshTokens = [];
    
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully. Please login with your new password.'
    });
  });

  // Verifica e-mail do usuário (confirma endereço)
  verifyEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token } = req.body;

  // Gera hash do token fornecido e localiza usuário
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new AppError('Invalid or expired verification token', 400, 'INVALID_VERIFICATION_TOKEN');
    }

  // Marca usuário como verificado e remove tokens de verificação
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    
    await user.save();

  // Envia e-mail de boas-vindas (não bloqueante)
    try {
      await emailService.sendWelcomeEmail(user.email, user.firstName);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }

    res.json({
      success: true,
      message: 'Email verified successfully!'
    });
  });

  // Reenvia e-mail de verificação de conta
  resendVerification = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as IUser;

    if (user.isEmailVerified) {
      throw new AppError('Email is already verified', 400, 'EMAIL_ALREADY_VERIFIED');
    }

  // Gera novo token de verificação
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

  // Envia novamente e-mail de verificação
    try {
      await emailService.sendVerificationEmail(user.email, verificationToken, user.firstName);
      
      res.json({
        success: true,
        message: 'Verification email sent successfully.'
      });
    } catch (error) {
      throw new AppError('Failed to send verification email. Please try again.', 500, 'EMAIL_SEND_FAILED');
    }
  });
}

export const authController = new AuthController();