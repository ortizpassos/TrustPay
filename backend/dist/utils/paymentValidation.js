"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePayment = exports.validatePaymentMethodCard = exports.getCardBrand = exports.validateCreditCardNumber = exports.validateCardExpiration = exports.pixStatusSchema = exports.getTransactionSchema = exports.merchantCreateIntentSchema = exports.pixPaymentSchema = exports.creditCardPaymentSchema = exports.initiatePaymentSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.initiatePaymentSchema = joi_1.default.object({
    orderId: joi_1.default.string()
        .trim()
        .min(1)
        .max(50)
        .required()
        .messages({
        'string.min': 'Order ID não pode ser vazio',
        'string.max': 'Order ID não pode ter mais de 50 caracteres',
        'any.required': 'Order ID é obrigatório'
    }),
    amount: joi_1.default.number()
        .positive()
        .precision(2)
        .min(0.01)
        .max(999999.99)
        .required()
        .messages({
        'number.positive': 'Valor deve ser positivo',
        'number.min': 'Valor mínimo é 0,01',
        'number.max': 'Valor não pode exceder 999.999,99',
        'any.required': 'Valor é obrigatório'
    }),
    currency: joi_1.default.string()
        .valid('BRL', 'USD', 'EUR')
        .default('BRL')
        .messages({
        'any.only': 'Moeda deve ser BRL, USD ou EUR'
    }),
    paymentMethod: joi_1.default.string()
        .valid('credit_card', 'pix', 'internal_transfer', 'saldo')
        .required()
        .messages({
        'any.only': 'Método de pagamento deve ser credit_card, pix, internal_transfer ou saldo',
        'any.required': 'Método de pagamento é obrigatório'
    }),
    cardId: joi_1.default.alternatives().conditional('paymentMethod', {
        is: joi_1.default.valid('credit_card'),
        then: joi_1.default.string().optional(),
        otherwise: joi_1.default.any().strip()
    }),
    from: joi_1.default.object({
        email: joi_1.default.string().email().required(),
        name: joi_1.default.string().min(2).max(100).optional(),
        document: joi_1.default.string().optional()
    }).optional(),
    to: joi_1.default.object({
        email: joi_1.default.string().email().required()
    }).optional(),
    customer: joi_1.default.alternatives().conditional('paymentMethod', {
        is: joi_1.default.valid('internal_transfer', 'saldo'),
        then: joi_1.default.object({
            name: joi_1.default.string().trim().min(2).max(100).optional(),
            email: joi_1.default.string().email().lowercase().trim().optional(),
            document: joi_1.default.string().pattern(new RegExp('^(?:\\d{11}|\\d{14})$')).optional()
        }).optional(),
        otherwise: joi_1.default.object({
            name: joi_1.default.string().trim().min(2).max(100).required().messages({
                'string.min': 'Nome do cliente deve ter no mínimo 2 caracteres',
                'string.max': 'Nome do cliente não pode ter mais de 100 caracteres',
                'any.required': 'Nome do cliente é obrigatório'
            }),
            email: joi_1.default.string().email().lowercase().trim().required().messages({
                'string.email': 'Informe um email válido do cliente',
                'any.required': 'Email do cliente é obrigatório'
            }),
            document: joi_1.default.string().pattern(new RegExp('^\\d{11}$')).optional().messages({
                'string.pattern.base': 'Documento do cliente deve ser um CPF válido (11 dígitos)'
            })
        }).required()
    }),
    returnUrl: joi_1.default.alternatives().conditional('paymentMethod', {
        is: joi_1.default.valid('internal_transfer', 'saldo'),
        then: joi_1.default.string().uri().optional(),
        otherwise: joi_1.default.string().uri().required().messages({
            'string.uri': 'Return URL deve ser uma URL válida',
            'any.required': 'Return URL é obrigatória'
        })
    }),
    callbackUrl: joi_1.default.alternatives().conditional('paymentMethod', {
        is: joi_1.default.valid('internal_transfer', 'saldo'),
        then: joi_1.default.string().uri().optional(),
        otherwise: joi_1.default.string().uri().required().messages({
            'string.uri': 'Callback URL deve ser uma URL válida',
            'any.required': 'Callback URL é obrigatória'
        })
    }),
    installments: joi_1.default.alternatives().conditional('paymentMethod', {
        is: joi_1.default.valid('credit_card'),
        then: joi_1.default.object({
            quantity: joi_1.default.number().integer().min(1).max(24).optional()
        }).optional(),
        otherwise: joi_1.default.any().strip()
    })
});
exports.creditCardPaymentSchema = joi_1.default.alternatives().try(joi_1.default.object({
    transactionId: joi_1.default.string().required(),
    savedCardId: joi_1.default.string().required(),
    saveCard: joi_1.default.boolean().default(false)
}), joi_1.default.object({
    transactionId: joi_1.default.string().required(),
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
    saveCard: joi_1.default.boolean().default(false)
}));
exports.pixPaymentSchema = joi_1.default.object({
    transactionId: joi_1.default.string()
        .required()
        .messages({
        'any.required': 'Transaction ID é obrigatório'
    })
});
exports.merchantCreateIntentSchema = joi_1.default.object({
    orderId: joi_1.default.string().trim().min(1).max(50).required(),
    amount: joi_1.default.number().positive().precision(2).min(0.01).max(999999.99).required(),
    currency: joi_1.default.string().valid('BRL', 'USD', 'EUR').default('BRL'),
    paymentMethod: joi_1.default.string().valid('credit_card', 'pix').required(),
    customer: joi_1.default.object({
        name: joi_1.default.string().trim().min(2).max(100).required(),
        email: joi_1.default.string().email().lowercase().trim().required(),
        document: joi_1.default.string().pattern(new RegExp('^\\\d{11}$')).optional()
    }).required(),
    returnUrl: joi_1.default.string().uri().required(),
    callbackUrl: joi_1.default.string().uri().required(),
    installments: joi_1.default.object({
        quantity: joi_1.default.number().integer().min(1).max(24).optional()
    }).optional()
});
exports.getTransactionSchema = joi_1.default.object({
    transactionId: joi_1.default.string()
        .required()
        .messages({
        'any.required': 'Transaction ID é obrigatório'
    })
});
exports.pixStatusSchema = joi_1.default.object({
    transactionId: joi_1.default.string()
        .required()
        .messages({
        'any.required': 'Transaction ID é obrigatório'
    })
});
const validateCardExpiration = (month, year) => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const expMonth = parseInt(month, 10);
    const expYear = parseInt(year, 10);
    if (expYear > currentYear) {
        return true;
    }
    if (expYear === currentYear) {
        return expMonth >= currentMonth;
    }
    return false;
};
exports.validateCardExpiration = validateCardExpiration;
const validateCreditCardNumber = (cardNumber) => {
    const cleaned = cardNumber.replace(/\D/g, '');
    if (cleaned.length < 13 || cleaned.length > 19) {
        return false;
    }
    let sum = 0;
    let shouldDouble = false;
    for (let i = cleaned.length - 1; i >= 0; i--) {
        let digit = parseInt(cleaned.charAt(i), 10);
        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }
        sum += digit;
        shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
};
exports.validateCreditCardNumber = validateCreditCardNumber;
const getCardBrand = (cardNumber) => {
    const cleaned = cardNumber.replace(/\D/g, '');
    if (/^4/.test(cleaned)) {
        return 'visa';
    }
    if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) {
        return 'mastercard';
    }
    if (/^3[47]/.test(cleaned)) {
        return 'amex';
    }
    if (/^(4011|4312|4389|4514|4573|6277|6362|6363|6504|6505|6516|6550)/.test(cleaned)) {
        return 'elo';
    }
    return 'unknown';
};
exports.getCardBrand = getCardBrand;
const validatePaymentMethodCard = (paymentMethod, cardNumber) => {
    if (paymentMethod !== 'credit_card') {
        return true;
    }
    const brand = (0, exports.getCardBrand)(cardNumber);
    return brand !== 'unknown';
};
exports.validatePaymentMethodCard = validatePaymentMethodCard;
const validatePayment = (schema) => {
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
                    message: 'Falha de validação de pagamento',
                    code: 'PAYMENT_VALIDATION_ERROR',
                    details: errors
                }
            });
        }
        if (value.cardNumber) {
            if (!(0, exports.validateCreditCardNumber)(value.cardNumber)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Número de cartão inválido',
                        code: 'INVALID_CARD_NUMBER'
                    }
                });
            }
            if (!(0, exports.validateCardExpiration)(value.expirationMonth, value.expirationYear)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Cartão expirado',
                        code: 'CARD_EXPIRED'
                    }
                });
            }
            const brand = (0, exports.getCardBrand)(value.cardNumber);
            if (brand === 'unknown') {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Bandeira de cartão não suportada',
                        code: 'UNSUPPORTED_CARD_BRAND'
                    }
                });
            }
        }
        req.body = value;
        next();
    };
};
exports.validatePayment = validatePayment;
//# sourceMappingURL=paymentValidation.js.map