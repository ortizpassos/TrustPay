import Joi from 'joi';

// Validação de Iniciação de Pagamento
export const initiatePaymentSchema = Joi.object({
  orderId: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .required()
    .messages({
  'string.min': 'Order ID não pode ser vazio',
  'string.max': 'Order ID não pode ter mais de 50 caracteres',
  'any.required': 'Order ID é obrigatório'
    }),
  
  amount: Joi.number()
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
  
  currency: Joi.string()
    .valid('BRL', 'USD', 'EUR')
    .default('BRL')
    .messages({
  'any.only': 'Moeda deve ser BRL, USD ou EUR'
    }),
  
  paymentMethod: Joi.string()
    .valid('credit_card', 'pix', 'internal_transfer', 'saldo')
    .required()
    .messages({
      'any.only': 'Método de pagamento deve ser credit_card, pix, internal_transfer ou saldo',
      'any.required': 'Método de pagamento é obrigatório'
    }),
  // Permitir referenciar um cartão salvo ao iniciar pagamento com cartão
  cardId: Joi.alternatives().conditional('paymentMethod', {
    is: Joi.valid('credit_card'),
    then: Joi.string().optional(),
    otherwise: Joi.any().strip()
  }),
  from: Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().min(2).max(100).optional(),
    document: Joi.string().optional()
  }).optional(),
  to: Joi.object({
    email: Joi.string().email().required()
  }).optional(),
  
  customer: Joi.alternatives().conditional('paymentMethod', {
    is: Joi.valid('internal_transfer', 'saldo'),
    then: Joi.object({
      name: Joi.string().trim().min(2).max(100).optional(),
      email: Joi.string().email().lowercase().trim().optional(),
      document: Joi.string().pattern(new RegExp('^(?:\\d{11}|\\d{14})$')).optional()
    }).optional(),
    otherwise: Joi.object({
      name: Joi.string().trim().min(2).max(100).required().messages({
        'string.min': 'Nome do cliente deve ter no mínimo 2 caracteres',
        'string.max': 'Nome do cliente não pode ter mais de 100 caracteres',
        'any.required': 'Nome do cliente é obrigatório'
      }),
      email: Joi.string().email().lowercase().trim().required().messages({
        'string.email': 'Informe um email válido do cliente',
        'any.required': 'Email do cliente é obrigatório'
      }),
      document: Joi.string().pattern(new RegExp('^\\d{11}$')).optional().messages({
        'string.pattern.base': 'Documento do cliente deve ser um CPF válido (11 dígitos)'
      })
    }).required()
  }),

  returnUrl: Joi.alternatives().conditional('paymentMethod', {
    is: Joi.valid('internal_transfer', 'saldo'),
    then: Joi.string().uri().optional(),
    otherwise: Joi.string().uri().required().messages({
      'string.uri': 'Return URL deve ser uma URL válida',
      'any.required': 'Return URL é obrigatória'
    })
  }),

  callbackUrl: Joi.alternatives().conditional('paymentMethod', {
    is: Joi.valid('internal_transfer', 'saldo'),
    then: Joi.string().uri().optional(),
    otherwise: Joi.string().uri().required().messages({
      'string.uri': 'Callback URL deve ser uma URL válida',
      'any.required': 'Callback URL é obrigatória'
    })
  }),

  // Parcelamento: permitido apenas para cartão de crédito
  installments: Joi.alternatives().conditional('paymentMethod', {
    is: Joi.valid('credit_card'),
    then: Joi.object({
      quantity: Joi.number().integer().min(1).max(24).optional()
    }).optional(),
    otherwise: Joi.any().strip()
  })
});

// Validação de Pagamento com Cartão de Crédito
// Para captura no cartão, aceitar DOIS formatos:
// A) savedCardId (usa cartão salvo do usuário)
// B) Campos completos do cartão (número, nome, validade, cvv)
export const creditCardPaymentSchema = Joi.alternatives().try(
  Joi.object({
    transactionId: Joi.string().required(),
    savedCardId: Joi.string().required(),
    saveCard: Joi.boolean().default(false)
  }),
  Joi.object({
    transactionId: Joi.string().required(),
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
    saveCard: Joi.boolean().default(false)
  })
);

// Validação de Pagamento PIX
export const pixPaymentSchema = Joi.object({
  transactionId: Joi.string()
    .required()
    .messages({
  'any.required': 'Transaction ID é obrigatório'
    })
});

// Merchant create payment intent schema (public API)
export const merchantCreateIntentSchema = Joi.object({
  orderId: Joi.string().trim().min(1).max(50).required(),
  amount: Joi.number().positive().precision(2).min(0.01).max(999999.99).required(),
  currency: Joi.string().valid('BRL', 'USD', 'EUR').default('BRL'),
  paymentMethod: Joi.string().valid('credit_card', 'pix').required(),
  customer: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    email: Joi.string().email().lowercase().trim().required(),
    document: Joi.string().pattern(new RegExp('^\\\d{11}$')).optional()
  }).required(),
  returnUrl: Joi.string().uri().required(),
  callbackUrl: Joi.string().uri().required(),
  installments: Joi.object({
    quantity: Joi.number().integer().min(1).max(24).optional()
  }).optional()
});

// Validação de Obtenção de Transação
export const getTransactionSchema = Joi.object({
  transactionId: Joi.string()
    .required()
    .messages({
  'any.required': 'Transaction ID é obrigatório'
    })
});

// Validação de Verificação de Status PIX
export const pixStatusSchema = Joi.object({
  transactionId: Joi.string()
    .required()
    .messages({
  'any.required': 'Transaction ID é obrigatório'
    })
});

// Validação personalizada para data de expiração do cartão
export const validateCardExpiration = (month: string, year: string): boolean => {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // getMonth() retorna 0-11
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

// Validação do algoritmo de Luhn para números de cartão de crédito
export const validateCreditCardNumber = (cardNumber: string): boolean => {
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

// Obter bandeira do cartão a partir do número
export const getCardBrand = (cardNumber: string): string => {
  const cleaned = cardNumber.replace(/\D/g, '');
  
  // Visa
  if (/^4/.test(cleaned)) {
    return 'visa';
  }
  
  // Mastercard
  if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) {
    return 'mastercard';
  }
  
  // American Express
  if (/^3[47]/.test(cleaned)) {
    return 'amex';
  }
  
  // Elo
  if (/^(4011|4312|4389|4514|4573|6277|6362|6363|6504|6505|6516|6550)/.test(cleaned)) {
    return 'elo';
  }
  
  return 'unknown';
};

// Validar método de pagamento em relação ao cartão
export const validatePaymentMethodCard = (paymentMethod: string, cardNumber: string): boolean => {
  if (paymentMethod !== 'credit_card') {
    return true; // Não valida pagamentos que não são de cartão aqui
  }

  const brand = getCardBrand(cardNumber);
  return brand !== 'unknown';
};

// Middleware de validação aprimorada para pagamentos
export const validatePayment = (schema: Joi.Schema) => {
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
          message: 'Falha de validação de pagamento',
          code: 'PAYMENT_VALIDATION_ERROR',
          details: errors
        }
      });
    }

  // Validações adicionais para cartão de crédito
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
    }

    req.body = value;
    next();
  };
};