"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCard = exports.updateCardSchema = exports.saveCardSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const paymentValidation_1 = require("./paymentValidation");
exports.saveCardSchema = joi_1.default.object({
    cardNumber: joi_1.default.string()
        .pattern(new RegExp('^\\d{13,19}$'))
        .required()
        .messages({
        'string.pattern.base': 'Número do cartão deve ter 13-19 dígitos',
        'any.required': 'Número do cartão é obrigatório'
    }),
    cardHolderName: joi_1.default.string()
        .trim()
        .min(2)
        .max(100)
        .pattern(new RegExp('^[A-Za-z\\s]+$'))
        .required()
        .messages({
        'string.min': 'Nome do titular deve ter no mínimo 2 caracteres',
        'string.max': 'Nome do titular não pode ter mais de 100 caracteres',
        'string.pattern.base': 'Nome do titular deve conter apenas letras e espaços',
        'any.required': 'Nome do titular é obrigatório'
    }),
    expirationMonth: joi_1.default.string()
        .pattern(new RegExp('^(0[1-9]|1[0-2])$'))
        .required()
        .messages({
        'string.pattern.base': 'Mês de expiração deve ser 01-12',
        'any.required': 'Mês de expiração é obrigatório'
    }),
    expirationYear: joi_1.default.string()
        .pattern(new RegExp('^\\d{4}$'))
        .custom((value, helpers) => {
        const year = parseInt(value);
        const currentYear = new Date().getFullYear();
        if (year < currentYear || year > currentYear + 20) {
            return helpers.error('any.invalid');
        }
        return value;
    })
        .required()
        .messages({
        'string.pattern.base': 'Ano de expiração deve ter 4 dígitos',
        'any.invalid': 'Ano de expiração inválido ou muito distante',
        'any.required': 'Ano de expiração é obrigatório'
    }),
    cvv: joi_1.default.string()
        .pattern(new RegExp('^\\d{3,4}$'))
        .required()
        .messages({
        'string.pattern.base': 'CVV deve ter 3 ou 4 dígitos',
        'any.required': 'CVV é obrigatório'
    }),
    isDefault: joi_1.default.boolean()
        .default(false)
        .messages({
        'boolean.base': 'Indicador de padrão deve ser true ou false'
    })
});
exports.updateCardSchema = joi_1.default.object({
    cardHolderName: joi_1.default.string()
        .trim()
        .min(2)
        .max(100)
        .pattern(new RegExp('^[A-Za-z\\s]+$'))
        .optional()
        .messages({
        'string.min': 'Nome do titular deve ter no mínimo 2 caracteres',
        'string.max': 'Nome do titular não pode ter mais de 100 caracteres',
        'string.pattern.base': 'Nome do titular deve conter apenas letras e espaços'
    }),
    isDefault: joi_1.default.boolean()
        .optional()
        .messages({
        'boolean.base': 'Indicador de padrão deve ser true ou false'
    })
});
const validateCard = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
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
        if (value.cardNumber) {
            if (!(0, paymentValidation_1.validateCreditCardNumber)(value.cardNumber)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Número de cartão inválido',
                        code: 'INVALID_CARD_NUMBER'
                    }
                });
            }
            if (!(0, paymentValidation_1.validateCardExpiration)(value.expirationMonth, value.expirationYear)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Cartão expirado',
                        code: 'CARD_EXPIRED'
                    }
                });
            }
            const brand = (0, paymentValidation_1.getCardBrand)(value.cardNumber);
            if (brand === 'unknown') {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Bandeira de cartão não suportada',
                        code: 'UNSUPPORTED_CARD_BRAND'
                    }
                });
            }
            value.cardBrand = brand;
        }
        req.body = value;
        next();
    };
};
exports.validateCard = validateCard;
//# sourceMappingURL=cardValidation.js.map