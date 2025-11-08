import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDatabase } from './utils/database';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { env } from './config/env';
import { rawBodySaver } from './middleware/apiAuth';

// Rotas
import authRoutes from './routes/auth.routes';
import paymentRoutes from './routes/payment.routes';
import cardRoutes from './routes/card.routes';
import debugRoutes from './routes/debug.routes';
import userRoutes from './routes/user.routes';
import merchantRoutes from './routes/merchant.routes';

class App {
  public app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
  this.port = env.port;
  this.validateEnvironment();

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
    // Skip automatic DB connection when running tests; tests manage connection
    if (env.nodeEnv !== 'test') {
      this.connectToDatabase();
    }
  }

  private validateEnvironment(): void {
    const key = env.encryptionKey;
    if (!key) {
      console.error('❌ ENCRYPTION_KEY is not defined in environment variables');
      process.exit(1);
    }
    if (key.length !== 32) {
      console.error(`❌ ENCRYPTION_KEY must be exactly 32 characters long. Current length: ${key.length}`);
      process.exit(1);
    }
    if (!env.isProd) {
      console.log('🔐 ENCRYPTION_KEY loaded and valid (length 32)');
    }
  }

  private initializeMiddlewares(): void {
    // Confiar em proxy (Render / proxies)
    this.app.set('trust proxy', 1);

    // Middleware de segurança
    this.app.use(helmet());

    // CORS dinâmico (multi-origem com normalização e fallback)
    const rawOrigins = (env.frontendUrls && env.frontendUrls.length)
      ? env.frontendUrls
      : ['https://sistema-de-pagamentos.onrender.com', 'http://localhost:4200'];

    const allowedOrigins = rawOrigins
      .map(o => o.trim())
      .filter(Boolean)
      .map(o => o.replace(/\/$/, '').toLowerCase());

    this.app.use(cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true); // curl / server-to-server
        const clean = origin.replace(/\/$/, '').toLowerCase();
        if (allowedOrigins.includes(clean)) return cb(null, true);
        if (!env.isProd) {
          console.warn('[CORS] Origin bloqueada:', origin, 'Permitidas:', allowedOrigins.join(', '));
        }
        return cb(null, false); // responde sem headers CORS (browser bloqueia)
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'x-api-key', 'x-timestamp', 'x-signature']
    }));

    // Limitação de requisições (controlada por variáveis de ambiente)
    const limiter = rateLimit({
      windowMs: env.rateLimit.windowMs,
      max: env.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          message: 'Too many requests from this IP, please try again later',
          code: 'RATE_LIMIT_EXCEEDED'
        }
      }
    });
    this.app.use('/api', limiter);

  // Middleware de parsing de corpo (JSON / URL-encoded)
  // Include a verify to capture raw body for HMAC signature validation
  this.app.use(express.json({ limit: '10mb', verify: rawBodySaver as any }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Registro de requisições
    this.app.use(requestLogger);
  }

  private initializeRoutes(): void {
    // Verificação de saúde
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Sistema de Pagamentos API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // Rotas da API
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/payments', paymentRoutes);
    this.app.use('/api/cards', cardRoutes);
    this.app.use('/api/users', userRoutes);
    // Carteira
    this.app.use('/api/wallet', require('./routes/wallet.routes').default);
    // Mantém as rotas merchant sempre ativas
    this.app.use('/api/merchant/v1', merchantRoutes);
    console.log('🔑 Rotas merchant sempre ativas.');
    if (!env.isProd) {
      this.app.use('/api/debug', debugRoutes);
    }

    // Handler 404 (rota não encontrada)
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          message: `Route ${req.method} ${req.baseUrl} not found`,
          code: 'ROUTE_NOT_FOUND'
        }
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  private async connectToDatabase(): Promise<void> {
    try {
      await connectDatabase();
      console.log('📦 Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      process.exit(1);
    }
  }

  public listen(): void {
    this.app.listen(this.port, () => {
      console.log(`🚀 Server running on port ${this.port}`);
      console.log(`🌍 Environment: ${env.nodeEnv}`);
      console.log(`📡 API base: http://localhost:${this.port}/api`);
      console.log(`❤️  Health: http://localhost:${this.port}/health`);
      if (env.frontendUrls.length) {
        console.log('🌐 Allowed CORS Origins:', env.frontendUrls.join(', '));
      }
    });
  }
}

// Create app instance. Only start server outside tests.
const appInstance = new App();
if (env.nodeEnv !== 'test') {
  appInstance.listen();
}

// Export the Express application for testing
export const serverApp = appInstance.app;
export default appInstance.app;