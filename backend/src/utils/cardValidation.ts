import Joi from 'joi';
import { validateCreditCardNumber, validateCardExpiration, getCardBrand } from './paymentValidation';

// Validação de Salvamento de Cartão
export const saveCardSchema = Joi.object({
  cardNumber: Joi.string()
    .pattern(new RegExp('^\\d{13,19}$'))
    .required()
    .messages({
  'string.pattern.base': 'Número do cartão deve ter 13-19 dígitos',
  'any.required': 'Número do cartão é obrigatório'
    }),
  
  cardHolderName: Joi.string()
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
  
  expirationMonth: Joi.string()
    .pattern(new RegExp('^(0[1-9]|1[0-2])$'))
    .required()
    .messages({
  'string.pattern.base': 'Mês de expiração deve ser 01-12',
  'any.required': 'Mês de expiração é obrigatório'
    }),
  
  expirationYear: Joi.string()
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
  
  cvv: Joi.string()
    .pattern(new RegExp('^\\d{3,4}$'))
    .required()
    .messages({
  'string.pattern.base': 'CVV deve ter 3 ou 4 dígitos',
  'any.required': 'CVV é obrigatório'
    }),

  isDefault: Joi.boolean()
    .default(false)
    .messages({
  'boolean.base': 'Indicador de padrão deve ser true ou false'
    })
});

// Validação de Atualização de Cartão
export const updateCardSchema = Joi.object({
  cardHolderName: Joi.string()
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

  isDefault: Joi.boolean()
    .optional()
    .messages({
  'boolean.base': 'Indicador de padrão deve ser true ou false'
    })
});

// Middleware de validação de cartão com verificações aprimoradas
export const validateCard = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map((detail: any) => ({
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

  // Validações adicionais de cartão de crédito para operações de salvamento
    if (value.cardNumber) {
  // Validar número do cartão com algoritmo de Luhn
      if (!validateCreditCardNumber(value.cardNumber)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Número de cartão inválido',
            code: 'INVALID_CARD_NUMBER'
          }
        });
      }

  // Validar data de expiração
      if (!validateCardExpiration(value.expirationMonth, value.expirationYear)) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Cartão expirado',
            code: 'CARD_EXPIRED'
          }
        });
      }

  // Validar bandeira do cartão
      const brand = getCardBrand(value.cardNumber);
      if (brand === 'unknown') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Bandeira de cartão não suportada',
            code: 'UNSUPPORTED_CARD_BRAND'
          }
        });
      }

  // Adicionar bandeira do cartão aos dados validados
      value.cardBrand = brand;
    }

    req.body = value;
    next();
  };
};