import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  // Log da requisição
  console.log(`📥 ${req.method} ${req.originalUrl} - ${req.ip}`);
  
  // Exibe body em desenvolvimento (removendo dados sensíveis)
  if (process.env.NODE_ENV === 'development' && req.body) {
    const sanitizedBody = { ...req.body };
    
  // Remove campos sensíveis
    delete sanitizedBody.password;
    delete sanitizedBody.cardNumber;
    delete sanitizedBody.cvv;
    delete sanitizedBody.token;
    
    if (Object.keys(sanitizedBody).length > 0) {
      console.log('📋 Request body:', sanitizedBody);
    }
  }

  // Captura tempo de resposta e imprime ao finalizar
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? '❌' : '✅';
    
    console.log(`📤 ${statusColor} ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });

  next();
};