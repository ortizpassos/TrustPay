import { Request, Response } from 'express';
import { Transaction } from '../models/Transaction';
import { paymentGatewayService } from '../services/paymentGateway.service';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { merchantCreateIntentSchema, creditCardPaymentSchema } from '../utils/paymentValidation';

export const ecommerceController = {
  // POST /api/ecommerce/pay
  pay: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Validação do payload completo (pedido + cartão)
    const { orderId, amount, currency, customer, returnUrl, callbackUrl, cardNumber, cardHolderName, expirationMonth, expirationYear, cvv } = req.body;

    // Valida intenção de pagamento
    const intentPayload = { orderId, amount, currency, paymentMethod: 'credit_card', customer, returnUrl, callbackUrl };
    const { error: intentError } = merchantCreateIntentSchema.validate(intentPayload);
    if (intentError) throw new AppError(intentError.message, 400, 'VALIDATION_ERROR');

    // Cria intenção
    const tx = await Transaction.create({
      ...intentPayload,
      merchantId: req.merchant?.merchantKey,
      status: 'PENDING'
    });

  // Valida dados do cartão
  const capturePayload = { cardNumber, cardHolderName, expirationMonth, expirationYear, cvv, amount };
  const { error: cardError } = creditCardPaymentSchema.validate({ transactionId: tx._id, ...capturePayload });
  if (cardError) throw new AppError(cardError.message, 400, 'VALIDATION_ERROR');

    // Captura pagamento
    const gatewayResult = await paymentGatewayService.processCreditCard(
      {
        cardNumber,
        cardHolderName,
        expirationMonth,
        expirationYear,
        cvv
      },
      amount
    );

    // Atualiza transação
    tx.status = gatewayResult.success ? 'APPROVED' : 'DECLINED';
    tx.gatewayResponse = gatewayResult;
    await tx.save();

    res.json({ success: gatewayResult.success, transaction: tx.toJSON(), gateway: gatewayResult });
  })
};
