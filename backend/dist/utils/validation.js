"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = exports.verifyEmailSchema = exports.updateProfileSchema = exports.changePasswordSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.refreshTokenSchema = exports.loginSchema = exports.registerSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.registerSchema = joi_1.default.object({
    accountType: joi_1.default.string()
        .valid('loja', 'pessoa_fisica')
        .default('pessoa_fisica')
        .messages({
        'any.only': 'Tipo de conta deve ser "loja" ou "pessoa_fisica"'
    }),
    email: joi_1.default.string()
        .email()
        .lowercase()
        .trim()
        .required()
        .messages({
        'string.email': 'Informe um email válido',
        'any.required': 'Email é obrigatório'
    }),
    password: joi_1.default.string()
        .min(8)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$'))
        .required()
        .messages({
        'string.min': 'A senha deve ter no mínimo 8 caracteres',
        'string.pattern.base': 'A senha deve conter ao menos uma letra maiúscula, uma minúscula, um número e um caractere especial',
        'any.required': 'Senha é obrigatória'
    }),
    firstName: joi_1.default.string()
        .trim()
        .min(2)
        .max(50)
        .required()
        .messages({
        'string.min': 'Nome deve ter no mínimo 2 caracteres',
        'string.max': 'Nome não pode ter mais de 50 caracteres',
        'any.required': 'Nome é obrigatório'
    }),
    lastName: joi_1.default.string()
        .trim()
        .min(2)
        .max(50)
        .required()
        .messages({
        'string.min': 'Sobrenome deve ter no mínimo 2 caracteres',
        'string.max': 'Sobrenome não pode ter mais de 50 caracteres',
        'any.required': 'Sobrenome é obrigatório'
    }),
    phone: joi_1.default.string()
        .pattern(new RegExp('^\\(\\d{2}\\)\\s\\d{4,5}-\\d{4}$'))
        .optional()
        .messages({
        'string.pattern.base': 'Telefone deve estar no formato (11) 99999-9999'
    }),
    document: joi_1.default.string()
        .pattern(new RegExp('^(?:\\d{11}|\\d{14})$'))
        .optional()
        .messages({
        'string.pattern.base': 'Documento deve ser um CPF (11 dígitos) ou CNPJ (14 dígitos)'
    })
});
exports.loginSchema = joi_1.default.object({
    email: joi_1.default.string()
        .email()
        .lowercase()
        .trim()
        .required()
        .messages({
        'string.email': 'Informe um email válido',
        'any.required': 'Email é obrigatório'
    }),
    password: joi_1.default.string()
        .required()
        .messages({
        'any.required': 'Senha é obrigatória'
    })
});
exports.refreshTokenSchema = joi_1.default.object({
    refreshToken: joi_1.default.string()
        .required()
        .messages({
        'any.required': 'Refresh token é obrigatório'
    })
});
exports.forgotPasswordSchema = joi_1.default.object({
    email: joi_1.default.string()
        .email()
        .lowercase()
        .trim()
        .required()
        .messages({
        'string.email': 'Informe um email válido',
        'any.required': 'Email é obrigatório'
    })
});
exports.resetPasswordSchema = joi_1.default.object({
    token: joi_1.default.string()
        .required()
        .messages({
        'any.required': 'Token de redefinição é obrigatório'
    }),
    newPassword: joi_1.default.string()
        .min(8)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$'))
        .required()
        .messages({
        'string.min': 'A nova senha deve ter no mínimo 8 caracteres',
        'string.pattern.base': 'A nova senha deve conter maiúscula, minúscula, número e caractere especial',
        'any.required': 'Nova senha é obrigatória'
    }),
    confirmPassword: joi_1.default.string()
        .valid(joi_1.default.ref('newPassword'))
        .required()
        .messages({
        'any.only': 'As senhas devem coincidir',
        'any.required': 'Confirmação de senha é obrigatória'
    })
});
exports.changePasswordSchema = joi_1.default.object({
    currentPassword: joi_1.default.string()
        .required()
        .messages({
        'any.required': 'Senha atual é obrigatória'
    }),
    newPassword: joi_1.default.string()
        .min(8)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$'))
        .required()
        .messages({
        'string.min': 'A senha deve ter no mínimo 8 caracteres',
        'string.pattern.base': 'A senha deve conter maiúscula, minúscula, número e caractere especial',
        'any.required': 'Nova senha é obrigatória'
    }),
    confirmPassword: joi_1.default.string()
        .valid(joi_1.default.ref('newPassword'))
        .required()
        .messages({
        'any.only': 'As senhas devem coincidir',
        'any.required': 'Confirmação de senha é obrigatória'
    })
});
exports.updateProfileSchema = joi_1.default.object({
    firstName: joi_1.default.string()
        .trim()
        .min(2)
        .max(50)
        .optional()
        .messages({
        'string.min': 'Nome deve ter no mínimo 2 caracteres',
        'string.max': 'Nome não pode ter mais de 50 caracteres'
    }),
    lastName: joi_1.default.string()
        .trim()
        .min(2)
        .max(50)
        .optional()
        .messages({
        'string.min': 'Sobrenome deve ter no mínimo 2 caracteres',
        'string.max': 'Sobrenome não pode ter mais de 50 caracteres'
    }),
    phone: joi_1.default.string()
        .pattern(new RegExp('^\\(\\d{2}\\)\\s\\d{4,5}-\\d{4}$'))
        .optional()
        .allow('')
        .messages({
        'string.pattern.base': 'Telefone deve estar no formato (11) 99999-9999'
    }),
    document: joi_1.default.string()
        .pattern(new RegExp('^(?:\\d{11}|\\d{14})$'))
        .optional()
        .allow('')
        .messages({
        'string.pattern.base': 'Documento deve ser um CPF (11 dígitos) ou CNPJ (14 dígitos)'
    })
});
exports.verifyEmailSchema = joi_1.default.object({
    token: joi_1.default.string()
        .required()
        .messages({
        'any.required': 'Token de verificação é obrigatório'
    })
});
const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });
        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Falha de validação',
                    code: 'VALIDATION_ERROR',
                    details: errors
                }
            });
        }
        req.body = value;
        next();
    };
};
exports.validate = validate;
//# sourceMappingURL=validation.js.map