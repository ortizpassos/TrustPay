import { Request, Response } from 'express';
declare class WalletController {
    getWalletSummary: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getUserWalletSummary: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getUserBalance: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
export declare const walletController: WalletController;
export {};
//# sourceMappingURL=wallet.controller.d.ts.map