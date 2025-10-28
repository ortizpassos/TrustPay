import 'dotenv/config';
export declare const env: {
    nodeEnv: string;
    isProd: boolean;
    port: number;
    mongoUri: string;
    jwt: {
        accessSecret: string;
        refreshSecret: string;
        accessExpiresIn: string;
        refreshExpiresIn: string;
    };
    encryptionKey: string;
    rateLimit: {
        windowMs: number;
        max: number;
    };
    pixExpirationMinutes: number;
    frontendUrls: string[];
    email: {
        host: string | undefined;
        port: number;
        user: string | undefined;
        pass: string | undefined;
        from: string | undefined;
    };
    features: {
        autoLoginAfterRegister: boolean;
        passwordlessRegister: boolean;
    };
    merchant: {
        keys: string[];
        secrets: Record<string, string>;
        signatureToleranceSec: number;
    };
    externalCardApi: {
        url: string;
        key: string;
        timeoutMs: number;
        enabled: boolean;
        debug: boolean;
    };
    logLevel: string;
};
//# sourceMappingURL=env.d.ts.map