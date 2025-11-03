import Joi from 'joi';
import { validateCreditCardNumber, validateCardExpiration, getCardBrand } from './paymentValidation';

// Validação de Salvamento de Cartão
export const saveCardSchema = Joi.object({
  cardNumber: Joi.string()
    .pattern(new RegExp('^\\d{13,19}$'))
    .required(),
  cardHolderName: Joi.string().min(3).max(50).required(),
  cardHolderCpf: Joi.string().pattern(new RegExp('^\\d{11}$')).required(),
  expirationMonth: Joi.string().pattern(new RegExp('^(0[1-9]|1[0-2])$')).required(),
  expirationYear: Joi.string().pattern(new RegExp('^\\d{4}$')).required(),
  cvv: Joi.string().pattern(new RegExp('^\\d{3,4}$')).required(),
  isDefault: Joi.boolean().optional()
});

    // Middleware de validação de cartão com verificações aprimoradas
    export const validateCard = (schema: Joi.ObjectSchema) => {
      return (req: any, res: any, next: any) => {
        const { error, value } = schema.validate(req.body, {
          abortEarly: false
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

        req.body = { ...value, ...req.body };

        // Validações adicionais de cartão de crédito para operações de salvamento
        if (req.body.cardNumber) {
          if (!validateCreditCardNumber(req.body.cardNumber)) {
            return res.status(400).json({
              success: false,
              error: {
                message: 'Número de cartão inválido',
                code: 'INVALID_CARD_NUMBER'
              }
            });
          }

          if (!validateCardExpiration(req.body.expirationMonth, req.body.expirationYear)) {
            return res.status(400).json({
              success: false,
              error: {
                message: 'Cartão expirado',
                code: 'CARD_EXPIRED'
              }
            });
          }

          const brand = getCardBrand(req.body.cardNumber);
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
// ...existing code...