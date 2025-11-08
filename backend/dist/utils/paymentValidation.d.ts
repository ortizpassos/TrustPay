import Joi from 'joi';
export declare const initiatePaymentSchema: Joi.ObjectSchema<any>;
export declare const creditCardPaymentSchema: Joi.AlternativesSchema<any>;
export declare const pixPaymentSchema: Joi.ObjectSchema<any>;
export declare const merchantCreateIntentSchema: Joi.ObjectSchema<any>;
export declare const getTransactionSchema: Joi.ObjectSchema<any>;
export declare const pixStatusSchema: Joi.ObjectSchema<any>;
export declare const validateCardExpiration: (month: string, year: string) => boolean;
export declare const validateCreditCardNumber: (cardNumber: string) => boolean;
export declare const getCardBrand: (cardNumber: string) => string;
export declare const validatePaymentMethodCard: (paymentMethod: string, cardNumber: string) => boolean;
export declare const validatePayment: (schema: Joi.Schema) => (req: any, res: any, next: any) => any;
//# sourceMappingURL=paymentValidation.d.ts.map