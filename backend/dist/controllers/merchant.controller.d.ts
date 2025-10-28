import { Request, Response } from 'express';
export declare const merchantController: {
    createPaymentIntent: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getPayment: (req: Request, res: Response, next: import("express").NextFunction) => void;
    capturePayment: (req: Request, res: Response, next: import("express").NextFunction) => void;
    refundPayment: (req: Request, res: Response, next: import("express").NextFunction) => void;
    startPix: (req: Request, res: Response, next: import("express").NextFunction) => void;
    checkStatus: (req: Request, res: Response, next: import("express").NextFunction) => void;
    receiveWebhook: (req: Request, res: Response, next: import("express").NextFunction) => void;
};
//# sourceMappingURL=merchant.controller.d.ts.map