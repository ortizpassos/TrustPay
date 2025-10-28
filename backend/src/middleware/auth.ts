import { sign, verify, SignOptions, Secret, JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { User, IUser } from '../models/User';
import { AppError } from './errorHandler';

// Estende a interface Request para incluir o usuário autenticado
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

interface JWTPayload extends JwtPayload {
  id: string;
  email: string;
}

// Gera par de tokens (access + refresh) para o usuário
export const generateTokens = (userId: string, email: string) => {
  const accessSecret: Secret = (process.env.JWT_SECRET || 'dev_access_secret_please_change') as Secret;
  const refreshSecret: Secret = (process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_please_change') as Secret;

  const common: SignOptions = {
    issuer: 'sistema-pagamentos',
    audience: 'sistema-pagamentos-app'
  };

  const accessPayload: Record<string, any> = { id: userId, email };
  const refreshPayload: Record<string, any> = { id: userId, email, type: 'refresh' };
  const accessOptions: SignOptions = { ...common, expiresIn: (process.env.JWT_EXPIRES_IN || '1h') as any };
  const refreshOptions: SignOptions = { ...common, expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any };

  const accessToken = sign(accessPayload, accessSecret, accessOptions);
  const refreshToken = sign(refreshPayload, refreshSecret, refreshOptions);

  return { accessToken, refreshToken };
};

// Verifica e decodifica um token JWT
export const verifyToken = (token: string, secret: string): JWTPayload => {
  return verify(token, secret as Secret, {
    issuer: 'sistema-pagamentos',
    audience: 'sistema-pagamentos-app'
  }) as JWTPayload;
};

// Middleware principal de autenticação (exige token Bearer)
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
  // Obtém o token do cabeçalho Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Access token is required', 401, 'MISSING_TOKEN');
    }

  const token = authHeader.substring(7); // Remove prefixo 'Bearer '

  // Verifica token
    const decoded = verifyToken(token, process.env.JWT_SECRET as string);

  // Busca usuário no banco
    const user = await User.findById(decoded.id).select('+refreshTokens');
    
    if (!user) {
      throw new AppError('User not found', 401, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new AppError('User account is deactivated', 401, 'USER_DEACTIVATED');
    }

  // Anexa usuário ao request para uso posterior
    req.user = user;
    next();

  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401, 'INVALID_TOKEN'));
    }
    
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401, 'TOKEN_EXPIRED'));
    }

    next(error);
  }
};

// Autenticação opcional: se não houver token, segue adiante sem erro
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return next(); // Continua sem autenticar
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token, process.env.JWT_SECRET as string);
    const user = await User.findById(decoded.id);
    
    if (user && user.isActive) {
      req.user = user;
    }
    
    next();
  } catch (error) {
  // Ignora erros para autenticação opcional
    next();
  }
};

// Exige que o e-mail do usuário esteja verificado
export const requireEmailVerification = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
  }

  if (!req.user.isEmailVerified) {
    return next(new AppError('Email verification required', 403, 'EMAIL_NOT_VERIFIED'));
  }

  next();
};