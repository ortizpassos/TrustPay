import { Request, Response, NextFunction } from 'express';
export interface MerchantAuth {
    merchantKey: string;
}
declare global {
    namespace Express {
        interface Request {
            merchant?: MerchantAuth;
            rawBody?: string;
        }
    }
}
export declare const rawBodySaver: (req: Request, res: Response, buf: Buffer) => void;
export declare const merchantAuthenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=apiAuth.d.ts.map