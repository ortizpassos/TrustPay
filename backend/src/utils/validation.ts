import Joi from 'joi';

// Validação de Registro de Usuário
export const registerSchema = Joi.object({
  accountType: Joi.string()
    .valid('loja', 'pessoa_fisica')
    .required()
    .messages({
      'any.only': 'Tipo de conta deve ser "loja" ou "pessoa_fisica"',
      'any.required': 'Tipo de conta é obrigatório'
    }),
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
  'string.email': 'Informe um email válido',
  'any.required': 'Email é obrigatório'
    }),
  
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$'))
    .required()
    .messages({
  'string.min': 'A senha deve ter no mínimo 8 caracteres',
  'string.pattern.base': 'A senha deve conter ao menos uma letra maiúscula, uma minúscula, um número e um caractere especial',
  'any.required': 'Senha é obrigatória'
    }),
  
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
  'string.min': 'Nome deve ter no mínimo 2 caracteres',
  'string.max': 'Nome não pode ter mais de 50 caracteres',
  'any.required': 'Nome é obrigatório'
    }),
  
  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
  'string.min': 'Sobrenome deve ter no mínimo 2 caracteres',
  'string.max': 'Sobrenome não pode ter mais de 50 caracteres',
  'any.required': 'Sobrenome é obrigatório'
    }),
  
  phone: Joi.string()
    .pattern(new RegExp('^\\(\\d{2}\\)\\s\\d{4,5}-\\d{4}$'))
    .optional()
    .messages({
  'string.pattern.base': 'Telefone deve estar no formato (11) 99999-9999'
    }),
  
  document: Joi.string()
    .pattern(new RegExp('^(?:\\d{11}|\\d{14})$'))
    .optional()
    .messages({
  'string.pattern.base': 'Documento deve ser um CPF (11 dígitos) ou CNPJ (14 dígitos)'
    })
});

// Validação de Login de Usuário
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
  'string.email': 'Informe um email válido',
  'any.required': 'Email é obrigatório'
    }),
  
  password: Joi.string()
    .required()
    .messages({
  'any.required': 'Senha é obrigatória'
    })
});

// Validação de Refresh Token
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
  'any.required': 'Refresh token é obrigatório'
    })
});

// Validação de Esqueci a Senha
export const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
  'string.email': 'Informe um email válido',
  'any.required': 'Email é obrigatório'
    })
});

// Validação de Redefinição de Senha
export const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
  'any.required': 'Token de redefinição é obrigatório'
    }),
  
  newPassword: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$'))
    .required()
    .messages({
  'string.min': 'A nova senha deve ter no mínimo 8 caracteres',
  'string.pattern.base': 'A nova senha deve conter maiúscula, minúscula, número e caractere especial',
  'any.required': 'Nova senha é obrigatória'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
  'any.only': 'As senhas devem coincidir',
  'any.required': 'Confirmação de senha é obrigatória'
    })
});

// Validação de Alteração de Senha
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
  'any.required': 'Senha atual é obrigatória'
    }),
  
  newPassword: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$'))
    .required()
    .messages({
  'string.min': 'A senha deve ter no mínimo 8 caracteres',
  'string.pattern.base': 'A senha deve conter maiúscula, minúscula, número e caractere especial',
  'any.required': 'Nova senha é obrigatória'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
  'any.only': 'As senhas devem coincidir',
  'any.required': 'Confirmação de senha é obrigatória'
    })
});

// Validação de Atualização de Perfil
export const updateProfileSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .optional()
    .messages({
  'string.min': 'Nome deve ter no mínimo 2 caracteres',
  'string.max': 'Nome não pode ter mais de 50 caracteres'
    }),
  
  lastName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .optional()
    .messages({
  'string.min': 'Sobrenome deve ter no mínimo 2 caracteres',
  'string.max': 'Sobrenome não pode ter mais de 50 caracteres'
    }),
  
  phone: Joi.string()
    .pattern(new RegExp('^\\(\\d{2}\\)\\s\\d{4,5}-\\d{4}$'))
    .optional()
    .allow('')
    .messages({
  'string.pattern.base': 'Telefone deve estar no formato (11) 99999-9999'
    }),
  
  document: Joi.string()
    .pattern(new RegExp('^(?:\\d{11}|\\d{14})$'))
    .optional()
    .allow('')
    .messages({
  'string.pattern.base': 'Documento deve ser um CPF (11 dígitos) ou CNPJ (14 dígitos)'
    })
});

// Validação de Verificação de Email
export const verifyEmailSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
  'any.required': 'Token de verificação é obrigatório'
    })
});

// Middleware Genérico de Validação
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
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