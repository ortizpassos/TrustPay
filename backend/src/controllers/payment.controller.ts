import { Request, Response } from 'express';
import { Transaction, ITransaction } from '../models/Transaction';
import { User, IUser } from '../models/User';
import { paymentGatewayService } from '../services/paymentGateway.service';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

interface PaymentResponse {
  success: boolean;
  data?: any;
  error?: {
    message: string;
    code?: string;
  };
}

class PaymentController {
  // Obter transações recentes (lista enxuta)
  recentTransactions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as IUser;
    const limit = Math.min(parseInt((req.query.limit as string) || '5', 10), 20); // hard cap 20
    const transactions = await Transaction.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('orderId amount currency paymentMethod status createdAt updatedAt recipientUserId recipientPixKey installments');

    res.json({
      success: true,
      data: {
        transactions: transactions.map(t => t.toJSON()),
        limit
      }
    });
  });
  // Iniciar uma nova transação de pagamento (suporta recebedor e parcelamento)
  initiatePayment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { 
      orderId, 
      amount, 
      currency, 
      paymentMethod, 
      customer, 
      returnUrl, 
      callbackUrl,
      recipientUserId,
      recipientPixKey,
      installments
    } = req.body;
    const user = req.user as IUser;

  // Verifica se orderId já existe para este usuário com transação ativa
    const existingTransaction = await Transaction.findOne({
      orderId,
      userId: user._id,
      status: { $in: ['PENDING', 'PROCESSING', 'APPROVED'] }
    });

    if (existingTransaction) {
      throw new AppError('Order ID already exists with active transaction', 400, 'DUPLICATE_ORDER_ID');
    }

  // Validação básica do recebedor (apenas um modo permitido)
    if (recipientUserId && recipientPixKey) {
      throw new AppError('Only one recipient type allowed (user or pix key)', 400, 'RECIPIENT_CONFLICT');
    }

    if (recipientPixKey && !/^[\w@+_.:-]{3,120}$/.test(recipientPixKey)) {
      throw new AppError('Invalid PIX key format', 400, 'INVALID_PIX_KEY');
    }

  // Trata parcelamento (somente para cartão de crédito)
    let finalAmount = amount;
    let installmentsData: any = undefined;
    if (paymentMethod === 'credit_card') {
      const qty = installments?.quantity ? parseInt(installments.quantity, 10) : 1;
      if (qty < 1 || qty > 24) {
        throw new AppError('Installments quantity must be between 1 and 24', 400, 'INVALID_INSTALLMENTS');
      }
      if (qty === 1) {
        installmentsData = {
          quantity: 1,
          interestMonthly: 0,
          totalWithInterest: amount,
          installmentValue: amount,
          mode: 'AVISTA'
        };
      } else {
  const interestMonthly = 0.03; // 3% ao mês
  // Fórmula de juros compostos: A = P * (1 + i)^n
        const totalWithInterest = parseFloat((amount * Math.pow(1 + interestMonthly, qty)).toFixed(2));
        const installmentValue = parseFloat((totalWithInterest / qty).toFixed(2));
        finalAmount = totalWithInterest;
        installmentsData = {
          quantity: qty,
            interestMonthly,
          totalWithInterest,
          installmentValue,
          mode: 'PARCELADO'
        };
      }
    } else if (installments?.quantity) {
      throw new AppError('Installments only supported for credit card', 400, 'INSTALLMENTS_NOT_ALLOWED');
    }

  // Cria nova transação com campos estendidos
    const transaction = new Transaction({
      orderId,
      userId: user._id,
      recipientUserId: recipientUserId || undefined,
      recipientPixKey: recipientPixKey || undefined,
      amount: finalAmount,
      baseAmount: paymentMethod === 'credit_card' ? amount : undefined,
      currency: currency || 'BRL',
      paymentMethod,
      status: 'PENDING',
      customer,
      returnUrl,
      callbackUrl,
      installments: installmentsData
    });

    await transaction.save();

    const response: PaymentResponse = {
      success: true,
      data: transaction.toJSON()
    };

    res.status(201).json(response);
  });

  // Processar pagamento com cartão de crédito
  processCreditCardPayment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { transactionId, cardNumber, cardHolderName, expirationMonth, expirationYear, cvv, saveCard } = req.body;
    const user = req.user as IUser;

  // Busca transação
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
    }

  // Verifica se transação pertence ao usuário (ou é guest permitida)
    if (transaction.userId && transaction.userId !== user._id) {
      throw new AppError('Unauthorized access to transaction', 403, 'UNAUTHORIZED_TRANSACTION');
    }

    if (transaction.status !== 'PENDING') {
      throw new AppError('Transaction cannot be processed in current status', 400, 'INVALID_TRANSACTION_STATUS');
    }

    if (transaction.paymentMethod !== 'credit_card') {
      throw new AppError('Invalid payment method for this transaction', 400, 'INVALID_PAYMENT_METHOD');
    }

    try {
      // Atualiza status para PROCESSING
      transaction.status = 'PROCESSING';
      await transaction.save();

      // Processa pagamento no gateway
      const amountToCharge = transaction.amount; // Já inclui juros se parcelado
      const gatewayResponse = await paymentGatewayService.processCreditCard({
        cardNumber,
        cardHolderName,
        expirationMonth,
        expirationYear,
        cvv
      }, amountToCharge);

  // Atualiza transação com resposta do gateway
      transaction.status = gatewayResponse.status as any;
      transaction.bankTransactionId = gatewayResponse.gatewayTransactionId;
      transaction.gatewayResponse = gatewayResponse.details;

      await transaction.save();

  // TODO: Se saveCard = true e aprovado, salvar cartão tokenizado (integração futura)
      if (saveCard && gatewayResponse.success && user) {
        // This will be implemented in the cards API
        console.log('Card saving requested - will be implemented in cards API');
      }

  // TODO: Enviar callback para o merchant
      // await this.sendCallbackNotification(transaction);

      const response: PaymentResponse = {
        success: gatewayResponse.success,
        data: {
          transaction: transaction.toJSON(),
          status: gatewayResponse.status,
          message: gatewayResponse.message,
          authCode: gatewayResponse.details?.authCode
        }
      };

      if (!gatewayResponse.success) {
        response.error = {
          message: gatewayResponse.message,
          code: 'PAYMENT_DECLINED'
        };
      }

      res.json(response);

    } catch (error) {
  // Atualiza status para FAILED em caso de erro
      transaction.status = 'FAILED';
      transaction.gatewayResponse = { error: (error as Error).message };
      await transaction.save();

      throw new AppError('Payment processing failed', 500, 'PAYMENT_PROCESSING_ERROR');
    }
  });

  // Processar pagamento PIX
  processPixPayment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { transactionId } = req.body;
    const user = req.user as IUser;

  // Busca transação
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
    }

  // Verifica se transação pertence ao usuário
    if (transaction.userId && transaction.userId !== user._id) {
      throw new AppError('Unauthorized access to transaction', 403, 'UNAUTHORIZED_TRANSACTION');
    }

    if (transaction.status !== 'PENDING') {
      throw new AppError('Transaction cannot be processed in current status', 400, 'INVALID_TRANSACTION_STATUS');
    }

    if (transaction.paymentMethod !== 'pix') {
      throw new AppError('Invalid payment method for this transaction', 400, 'INVALID_PAYMENT_METHOD');
    }

    try {
      // Processa PIX no gateway
      const gatewayResponse = await paymentGatewayService.processPixPayment({
        amount: transaction.amount,
        description: `Order ${transaction.orderId}`,
        customerEmail: transaction.customer.email
      });

  // Atualiza transação com dados PIX
      transaction.bankPixId = gatewayResponse.gatewayTransactionId;
      transaction.pixCode = gatewayResponse.pixCode;
      transaction.qrCodeImage = gatewayResponse.qrCodeImage;
      transaction.expiresAt = gatewayResponse.expiresAt;
      transaction.gatewayResponse = gatewayResponse.details;

      await transaction.save();

      const response: PaymentResponse = {
        success: gatewayResponse.success,
        data: {
          transaction: transaction.toJSON(),
          pixCode: gatewayResponse.pixCode,
          qrCodeImage: gatewayResponse.qrCodeImage,
          expiresAt: gatewayResponse.expiresAt,
          message: gatewayResponse.message
        }
      };

      res.json(response);

    } catch (error) {
  // Atualiza status para FAILED em caso de erro
      transaction.status = 'FAILED';
      transaction.gatewayResponse = { error: (error as Error).message };
      await transaction.save();

      throw new AppError('PIX payment processing failed', 500, 'PIX_PROCESSING_ERROR');
    }
  });

  // Checar status de pagamento PIX
  checkPixStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { transactionId } = req.params;
    const user = req.user as IUser;

  // Busca transação
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
    }

  // Verifica se transação pertence ao usuário
    if (transaction.userId && transaction.userId !== user._id) {
      throw new AppError('Unauthorized access to transaction', 403, 'UNAUTHORIZED_TRANSACTION');
    }

    if (transaction.paymentMethod !== 'pix') {
      throw new AppError('Invalid payment method for status check', 400, 'INVALID_PAYMENT_METHOD');
    }

    if (!transaction.bankPixId) {
      throw new AppError('PIX payment not yet initiated', 400, 'PIX_NOT_INITIATED');
    }

    try {
      // Consulta status no gateway
      const gatewayResponse = await paymentGatewayService.checkPixStatus(transaction.bankPixId);

      // Atualiza status da transação com resultado
      const oldStatus = transaction.status;
      transaction.status = gatewayResponse.status as any;
      transaction.gatewayResponse = {
        ...transaction.gatewayResponse,
        statusCheck: gatewayResponse.details
      };

      await transaction.save();

      // TODO: Enviar callback se status mudou
      if (oldStatus !== gatewayResponse.status) {
        // await this.sendCallbackNotification(transaction);
      }

      const response: PaymentResponse = {
        success: gatewayResponse.success,
        data: {
          transaction: transaction.toJSON(),
          status: gatewayResponse.status,
          message: gatewayResponse.message,
          paidAt: gatewayResponse.details?.paidAt
        }
      };

      res.json(response);

    } catch (error) {
      throw new AppError('Failed to check PIX status', 500, 'PIX_STATUS_CHECK_ERROR');
    }
  });

  // Obter transação por ID
  getTransaction = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { transactionId } = req.params;
    const user = req.user as IUser;

  // Busca transação
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
    }

  // Verifica se transação pertence ao usuário
    if (transaction.userId && transaction.userId !== user._id) {
      throw new AppError('Unauthorized access to transaction', 403, 'UNAUTHORIZED_TRANSACTION');
    }

    const response: PaymentResponse = {
      success: true,
      data: {
        transaction: transaction.toJSON()
      }
    };

    res.json(response);
  });

  // Listar histórico de transações do usuário com filtros/paginação
  getTransactionHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as IUser;
    const { page = 1, limit = 10, status, paymentMethod, sort = 'createdAt', direction = 'desc' } = req.query;

    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const skip = (pageNumber - 1) * limitNumber;

  // Monta filtros dinâmicos
    const query: any = { userId: user._id };
    
    if (status) {
      query.status = status;
    }
    
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

  // Campos seguros para ordenação
    const allowedSort = new Set(['createdAt','amount','status','paymentMethod']);
    const sortField = allowedSort.has(String(sort)) ? String(sort) : 'createdAt';
    const sortDir = String(direction).toLowerCase() === 'asc' ? 1 : -1;

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limitNumber),
      Transaction.countDocuments(query)
    ]);

    const response = {
      success: true,
      data: {
        transactions: transactions.map(t => t.toJSON()),
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          pages: Math.ceil(total / limitNumber)
        },
        sort: sortField,
        direction: sortDir === 1 ? 'asc' : 'desc'
      }
    };

    res.json(response);
  });

  // Cancelar transação pendente
  cancelTransaction = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { transactionId } = req.params;
    const user = req.user as IUser;

  // Busca transação
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
    }

  // Verifica se transação pertence ao usuário
    if (transaction.userId !== user._id) {
      throw new AppError('Unauthorized access to transaction', 403, 'UNAUTHORIZED_TRANSACTION');
    }

    if (!['PENDING', 'PROCESSING'].includes(transaction.status)) {
      throw new AppError('Transaction cannot be cancelled in current status', 400, 'CANNOT_CANCEL_TRANSACTION');
    }

  // Atualiza status para FAILED com metadados de cancelamento
    transaction.status = 'FAILED';
    transaction.gatewayResponse = {
      ...transaction.gatewayResponse,
      cancellation: {
        cancelledAt: new Date(),
        cancelledBy: user._id,
        reason: 'USER_CANCELLATION'
      }
    };

    await transaction.save();

    const response: PaymentResponse = {
      success: true,
      data: {
        transaction: transaction.toJSON(),
        message: 'Transaction cancelled successfully'
      }
    };

    res.json(response);
  });

  // Obter estatísticas de pagamentos (para dashboard)
  getPaymentStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as IUser;
    const { period = '30d' } = req.query;

    let dateFilter: Date;
    switch (period) {
      case '7d':
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        dateFilter = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const stats = await Transaction.aggregate([
      {
        $match: {
          userId: user._id,
          createdAt: { $gte: dateFilter }
        }
      },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          approvedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] }
          },
          approvedAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, '$amount', 0] }
          },
          declinedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'DECLINED'] }, 1, 0] }
          },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] }
          },
          creditCardCount: {
            $sum: { $cond: [{ $eq: ['$paymentMethod', 'credit_card'] }, 1, 0] }
          },
          pixCount: {
            $sum: { $cond: [{ $eq: ['$paymentMethod', 'pix'] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalTransactions: 0,
      totalAmount: 0,
      approvedCount: 0,
      approvedAmount: 0,
      declinedCount: 0,
      pendingCount: 0,
      creditCardCount: 0,
      pixCount: 0
    };

    const response = {
      success: true,
      data: {
        period,
        stats: {
          ...result,
          approvalRate: result.totalTransactions > 0 
            ? (result.approvedCount / result.totalTransactions * 100).toFixed(2)
            : '0.00'
        }
      }
    };

    res.json(response);
  });

  // Obter cartões de teste (ambiente de desenvolvimento)
  getTestCards = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const testCards = paymentGatewayService.getTestCards();

    res.json({
      success: true,
      data: {
        testCards,
        note: 'Esses cartões de teste podem ser usados para simular pagamentos em modo de desenvolvimento'
      }
    });
  });
}

export const paymentController = new PaymentController();