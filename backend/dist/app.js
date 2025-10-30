"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverApp = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const database_1 = require("./utils/database");
const errorHandler_1 = require("./middleware/errorHandler");
const requestLogger_1 = require("./middleware/requestLogger");
const env_1 = require("./config/env");
const apiAuth_1 = require("./middleware/apiAuth");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const card_routes_1 = __importDefault(require("./routes/card.routes"));
const debug_routes_1 = __importDefault(require("./routes/debug.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const merchant_routes_1 = __importDefault(require("./routes/merchant.routes"));
class App {
    constructor() {
        this.app = (0, express_1.default)();
        this.port = env_1.env.port;
        this.validateEnvironment();
        this.initializeMiddlewares();
        this.initializeRoutes();
        this.initializeErrorHandling();
        if (env_1.env.nodeEnv !== 'test') {
            this.connectToDatabase();
        }
    }
    validateEnvironment() {
        const key = env_1.env.encryptionKey;
        if (!key) {
            console.error('❌ ENCRYPTION_KEY is not defined in environment variables');
            process.exit(1);
        }
        if (key.length !== 32) {
            console.error(`❌ ENCRYPTION_KEY must be exactly 32 characters long. Current length: ${key.length}`);
            process.exit(1);
        }
        if (!env_1.env.isProd) {
            console.log('🔐 ENCRYPTION_KEY loaded and valid (length 32)');
        }
    }
    initializeMiddlewares() {
        this.app.set('trust proxy', 1);
        this.app.use((0, helmet_1.default)());
        const rawOrigins = (env_1.env.frontendUrls && env_1.env.frontendUrls.length)
            ? env_1.env.frontendUrls
            : ['https://sistema-de-pagamentos.onrender.com', 'http://localhost:4200'];
        const allowedOrigins = rawOrigins
            .map(o => o.trim())
            .filter(Boolean)
            .map(o => o.replace(/\/$/, '').toLowerCase());
        this.app.use((0, cors_1.default)({
            origin: (origin, cb) => {
                if (!origin)
                    return cb(null, true);
                const clean = origin.replace(/\/$/, '').toLowerCase();
                if (allowedOrigins.includes(clean))
                    return cb(null, true);
                if (!env_1.env.isProd) {
                    console.warn('[CORS] Origin bloqueada:', origin, 'Permitidas:', allowedOrigins.join(', '));
                }
                return cb(null, false);
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'x-api-key', 'x-timestamp', 'x-signature']
        }));
        const limiter = (0, express_rate_limit_1.default)({
            windowMs: env_1.env.rateLimit.windowMs,
            max: env_1.env.rateLimit.max,
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
        this.app.use(express_1.default.json({ limit: '10mb', verify: apiAuth_1.rawBodySaver }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        this.app.use(requestLogger_1.requestLogger);
    }
    initializeRoutes() {
        this.app.get('/health', (req, res) => {
            res.status(200).json({
                success: true,
                message: 'Sistema de Pagamentos API is running',
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            });
        });
        this.app.use('/api/auth', auth_routes_1.default);
        this.app.use('/api/payments', payment_routes_1.default);
        this.app.use('/api/cards', card_routes_1.default);
        this.app.use('/api/users', user_routes_1.default);
        if (env_1.env.merchant.keys.length) {
            this.app.use('/api/merchant/v1', merchant_routes_1.default);
        }
        const ecommerceRoutes = require('./routes/ecommerce.routes').default;
        this.app.use('/api/ecommerce', ecommerceRoutes);
        if (!env_1.env.isProd) {
            this.app.use('/api/debug', debug_routes_1.default);
        }
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
    initializeErrorHandling() {
        this.app.use(errorHandler_1.errorHandler);
    }
    async connectToDatabase() {
        try {
            await (0, database_1.connectDatabase)();
            console.log('📦 Database connected successfully');
        }
        catch (error) {
            console.error('❌ Database connection failed:', error);
            process.exit(1);
        }
    }
    listen() {
        this.app.listen(this.port, () => {
            console.log(`🚀 Server running on port ${this.port}`);
            console.log(`🌍 Environment: ${env_1.env.nodeEnv}`);
            console.log(`📡 API base: http://localhost:${this.port}/api`);
            console.log(`❤️  Health: http://localhost:${this.port}/health`);
            if (env_1.env.frontendUrls.length) {
                console.log('🌐 Allowed CORS Origins:', env_1.env.frontendUrls.join(', '));
            }
        });
    }
}
const appInstance = new App();
if (env_1.env.nodeEnv !== 'test') {
    appInstance.listen();
}
exports.serverApp = appInstance.app;
exports.default = appInstance.app;
//# sourceMappingURL=app.js.map