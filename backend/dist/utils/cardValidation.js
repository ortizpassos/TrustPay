"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCard = exports.saveCardSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const paymentValidation_1 = require("./paymentValidation");
exports.saveCardSchema = joi_1.default.object({
    cardNumber: joi_1.default.string()
        .pattern(new RegExp('^\\d{13,19}$'))
        .required(),
    cardHolderName: joi_1.default.string().min(3).max(50).required(),
    cardHolderCpf: joi_1.default.string().pattern(new RegExp('^\\d{11}$')).required(),
    expirationMonth: joi_1.default.string().pattern(new RegExp('^(0[1-9]|1[0-2])$')).required(),
    expirationYear: joi_1.default.string().pattern(new RegExp('^\\d{4}$')).required(),
    cvv: joi_1.default.string().pattern(new RegExp('^\\d{3,4}$')).required(),
    isDefault: joi_1.default.boolean().optional()
});
const validateCard = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false
        });
        if (error) {
            const errors = error.details.map((detail) => ({
                field: detail.path.join('.'),
                message: detail.message
            }));
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Falha de validação de cartão',
                    code: 'CARD_VALIDATION_ERROR',
                    details: errors
                }
            });
        }
        req.body = { ...value, ...req.body };
        if (req.body.cardNumber) {
            if (!(0, paymentValidation_1.validateCreditCardNumber)(req.body.cardNumber)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Número de cartão inválido',
                        code: 'INVALID_CARD_NUMBER'
                    }
                });
            }
            if (!(0, paymentValidation_1.validateCardExpiration)(req.body.expirationMonth, req.body.expirationYear)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Cartão expirado',
                        code: 'CARD_EXPIRED'
                    }
                });
            }
            const brand = (0, paymentValidation_1.getCardBrand)(req.body.cardNumber);
            if (brand === 'unknown') {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Bandeira de cartão não suportada',
                        code: 'UNSUPPORTED_CARD_BRAND'
                    }
                });
            }
            req.body.cardBrand = brand;
        }
        next();
    };
};
exports.validateCard = validateCard;
//# sourceMappingURL=cardValidation.js.map