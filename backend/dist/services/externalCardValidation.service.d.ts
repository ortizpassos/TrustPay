export interface ExternalCardValidationRequest {
    cardNumber: string;
    cardHolderName: string;
    expirationMonth: string;
    expirationYear: string;
    cvv: string;
    user: {
        email: string;
        firstName?: string;
        lastName?: string;
        document?: string;
    };
}
export interface ExternalCardValidationResponse {
    valid: boolean;
    reason?: string;
    riskScore?: number;
    networkLatencyMs?: number;
    provider?: string;
}
declare class ExternalCardValidationService {
    private enabled;
    validate(data: ExternalCardValidationRequest): Promise<ExternalCardValidationResponse>;
}
export declare const externalCardValidationService: ExternalCardValidationService;
export {};
//# sourceMappingURL=externalCardValidation.service.d.ts.map