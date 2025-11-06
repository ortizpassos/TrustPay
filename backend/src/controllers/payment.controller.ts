import { Request, Response } from 'express';
import { Transaction, ITransaction } from '../models/Transaction';
import { User, IUser } from '../models/User';
import { SavedCard } from '../models/SavedCard';
import { encryptionService } from '../services/encryption.service';
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
    const merchantId = req.query.merchantId as string | undefined;
    const flowRaw = String((req.query.flow as string) || 'all').toLowerCase();
    const flow: 'in' | 'out' | 'all' = (['in','out','all'] as const).includes(flowRaw as any) ? flowRaw as any : 'all';
    const uid = String(user._id);
    let filter: any = {};
    if (merchantId) {
      // Para merchant, in = vendas do merchant OU recebimentos P2P (recipientUserId = usuário);
      // out = pagamentos efetuados pelo usuário logado; all = união de in e out
      if (flow === 'in') filter = { $or: [ { merchantId }, { recipientUserId: uid } ] };
      else if (flow === 'out') filter = { userId: uid };
      else filter = { $or: [ { merchantId }, { userId: uid }, { recipientUserId: uid } ] };
    } else {
      // Para não-merchant, in = recebidos (recipientUserId); out = pagos (userId)
      if (flow === 'in') filter = { recipientUserId: uid };
      else if (flow === 'out') filter = { userId: uid };
      else filter = { $or: [ { userId: uid }, { recipientUserId: uid } ] };
    }
    const transactions = await Transaction.find(filter)
        .sort({ createdAt: -1 })
      .limit(limit)
      .select('orderId amount currency paymentMethod status createdAt updatedAt recipientUserId recipientPixKey installments merchantId');

    res.json({
      success: true,
      data: {
        transactions: transactions.map(t => t.toJSON()),
        limit
      }
    });
  });
  // Iniciar uma nova transação de pagamento (suporta recebedor, parcelamento e transferência interna)
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
      installments,
      from,
      to,
      cardId
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

    // Transferência interna via saldo
    if (paymentMethod === 'internal_transfer' || paymentMethod === 'saldo') {
      if (!from?.email || !to?.email) {
        throw new AppError('Dados do remetente ou destinatário ausentes', 400, 'MISSING_TRANSFER_DATA');
      }
      if (from.email === to.email) {
        throw new AppError('Não é possível transferir para si mesmo', 400, 'TRANSFER_TO_SELF');
      }
      // Buscar usuários
      const remetente = await User.findOne({ email: from.email.toLowerCase() });
      const destinatario = await User.findOne({ email: to.email.toLowerCase() });
      if (!remetente || !destinatario) {
        throw new AppError('Usuário remetente ou destinatário não encontrado', 404, 'USER_NOT_FOUND');
      }
      // Calcular saldo do remetente: recebido = recipientUserId OU (merchantId do próprio usuário), enviado = userId
      const recebidosMatch: any = { status: 'APPROVED', $or: [ { recipientUserId: remetente._id.toString() } ] };
      if (remetente.merchantKey) {
        recebidosMatch.$or.push({ merchantId: remetente.merchantKey });
      }
      const recebidos = await Transaction.aggregate([
        { $match: recebidosMatch },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      // Somar apenas valores enviados via saldo interno
      const enviados = await Transaction.aggregate([
        { $match: { userId: remetente._id.toString(), status: 'APPROVED', paymentMethod: 'internal_transfer' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const saldo = (recebidos[0]?.total || 0) - (enviados[0]?.total || 0);
      if (process.env.NODE_ENV !== 'production') {
        console.log('[SALDO][CHECK]', {
          user: remetente.email,
          recebidos: recebidos[0]?.total || 0,
          enviados: enviados[0]?.total || 0,
          saldo,
          merchantKey: remetente.merchantKey || null
        });
      }
      if (saldo < amount) {
        throw new AppError('Saldo insuficiente para transferência', 400, 'INSUFFICIENT_FUNDS');
      }
      // Criar transação aprovada
      const transaction = new Transaction({
        orderId,
        userId: remetente._id,
        recipientUserId: destinatario._id,
        amount,
        currency: currency || 'BRL',
        paymentMethod: 'internal_transfer',
        status: 'APPROVED',
        customer: {
          name: remetente.firstName + ' ' + remetente.lastName,
          email: remetente.email,
          document: remetente.document
        },
        returnUrl: returnUrl || '',
        callbackUrl: callbackUrl || ''
      });
      await transaction.save();
      const response: PaymentResponse = {
        success: true,
        data: transaction.toJSON()
      };
      res.status(201).json(response);
      return;
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

    // Opcional: identificar destinatário por e-mail para fluxos P2P com cartão
    let resolvedRecipientUserId: string | undefined = undefined;
    if (paymentMethod === 'credit_card' && to?.email) {
      const dest = await User.findOne({ email: String(to.email).toLowerCase() });
      if (dest) {
        resolvedRecipientUserId = dest._id;
      }
    }

    // Cria nova transação com campos estendidos
    const transaction = new Transaction({
      orderId,
      userId: user._id,
      recipientUserId: recipientUserId || resolvedRecipientUserId || undefined,
      recipientPixKey: recipientPixKey || undefined,
      amount: finalAmount,
      baseAmount: paymentMethod === 'credit_card' ? amount : undefined,
      currency: currency || 'BRL',
      paymentMethod,
      status: 'PENDING',
      customer,
      returnUrl,
      callbackUrl,
      installments: installmentsData,
      savedCardId: cardId || undefined
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
  const { transactionId, savedCardId, cardNumber: rawCardNumber, cardHolderName: rawHolder, expirationMonth: rawExpM, expirationYear: rawExpY, cvv: rawCvv, saveCard } = req.body;
    const user = req.user as IUser;

  // Busca transação
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
    }

  // Verifica se transação pertence ao usuário (pagador)
    const isOwner = transaction.userId && String(transaction.userId) === String(user._id);
    if (!isOwner) {
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

      // Resolver dados do cartão: usar savedCardId se informado; caso contrário, usar dados brutos do body
      let cardNumber = rawCardNumber;
      let cardHolderName = rawHolder;
      let expirationMonth = rawExpM;
      let expirationYear = rawExpY;
      let cvv = rawCvv;

      let effectiveSavedCardId: string | undefined = savedCardId || (transaction as any).savedCardId;
      if (effectiveSavedCardId && !cardNumber) {
        const saved = await SavedCard.findOne({ _id: effectiveSavedCardId, userId: user._id });
        if (!saved) {
          throw new AppError('Cartão salvo não encontrado', 404, 'SAVED_CARD_NOT_FOUND');
        }
        try {
          const data = encryptionService.detokenizeCard((saved as any).encryptedData);
          cardNumber = data.cardNumber;
          cardHolderName = data.cardHolderName;
          expirationMonth = data.expirationMonth;
          expirationYear = data.expirationYear;
        } catch (e) {
          throw new AppError('Falha ao recuperar dados do cartão', 500, 'CARD_DECRYPT_ERROR');
        }
        // CVV nunca é armazenado; deve ser fornecido quando necessário. Se a API externa não exigir, segue sem.
      }

      // Integração com API externa de compra para pagamentos entre usuários com cartão
      const axios = require('axios');
      const merchantEnvUrl = process.env.EXTERNAL_PURCHASE_API_URL;
      if (!merchantEnvUrl) {
        throw new AppError('External purchase API URL not configured', 500, 'MISSING_EXTERNAL_API_URL');
      }

      // Definir merchantName: usar nome do destinatário (se houver) ou do pagador
      let merchantName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'TrustPay P2P';
      if (transaction.recipientUserId) {
        try {
          const dest = await User.findById(transaction.recipientUserId);
          if (dest) {
            merchantName = `${dest.firstName || ''} ${dest.lastName || ''}`.trim() || merchantName;
          }
        } catch (_) {
          // fallback mantém merchantName atual
        }
      }

      const externalPayload = {
        typePayment: 'CREDIT',
        amount: transaction.amount,
        currency: transaction.currency,
        merchantName,
  cardNumber,
        installmentsTotal: transaction.installments?.quantity || 1,
        mcc: '5732',
        category: 'ELETRONICOS',
        createdAt: transaction.createdAt.toISOString()
      };

      // Log leve (evitar dados sensíveis)
      if (process.env.EXTERNAL_CARD_API_DEBUG === 'true') {
        const safeLog = { ...externalPayload, cardNumber: `****${String(cardNumber).slice(-4)}` };
        console.log('[P2P][CARD][EXTERNAL_PURCHASE_PAYLOAD]', safeLog);
      }

      let externalResp;
      try {
        externalResp = await axios.post(merchantEnvUrl, externalPayload, { headers: {} });
      } catch (e) {
        // Tratar recusas/erros da API externa com os mesmos padrões do fluxo merchant
        const err = e as any;
        const status = err?.response?.status;
        if (err.response && [400, 422, 500].includes(status)) {
          transaction.status = 'DECLINED' as any;
          transaction.gatewayResponse = err.response.data;
          await transaction.save();
          res.status(status).json(err.response.data);
          return;
        }
        // Demais erros: falha de comunicação com a API externa
        transaction.status = 'FAILED' as any;
        transaction.gatewayResponse = { error: 'EXTERNAL_API_ERROR' } as any;
        await transaction.save();
        res.status(502).json({ success: false, error: { message: 'Erro ao processar pagamento externo', code: 'EXTERNAL_API_ERROR' } });
        return;
      }

      if (!externalResp) {
        // segurança: se não houve resposta, retorna erro genérico
        transaction.status = 'FAILED' as any;
        transaction.gatewayResponse = { error: 'NO_EXTERNAL_RESPONSE' } as any;
        await transaction.save();
        res.status(502).json({ success: false, error: { message: 'Sem resposta da API externa', code: 'NO_EXTERNAL_RESPONSE' } });
        return;
      }

      const extData = externalResp.data;
      // Atualiza status local conforme retorno externo
      if (extData?.status === 'AUTHORIZED') {
        transaction.status = 'APPROVED' as any;
      } else {
        transaction.status = 'DECLINED' as any;
      }
      transaction.bankTransactionId = extData?.transactionId;
      transaction.gatewayResponse = extData;
      await transaction.save();

      // Opcional: salvar cartão se solicitado e autorizado
      if (saveCard && transaction.status === 'APPROVED') {
        console.log('[P2P][CARD] Solicitação para salvar cartão (a ser implementado)');
      }

      // Resposta no padrão atual da API de usuário
      const response: PaymentResponse = {
        success: extData?.status === 'AUTHORIZED',
        data: {
          transaction: transaction.toJSON(),
          status: transaction.status,
          message: extData?.message || (transaction.status === 'APPROVED' ? 'Pagamento autorizado' : 'Pagamento recusado'),
          external: extData
        }
      };

      if (transaction.status !== 'APPROVED') {
        response.error = { message: 'Pagamento recusado pela operadora', code: 'PAYMENT_DECLINED' };
      }

      res.status(externalResp.status || 200).json(response);

    } catch (error) {
      // Falha inesperada na orquestração
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

  // Verifica se transação pertence ao usuário (autor) ou se usuário é o destinatário
    const isOwner = transaction.userId && String(transaction.userId) === String(user._id);
    const isRecipient = transaction.recipientUserId && String(transaction.recipientUserId) === String(user._id);
    if (!isOwner && !isRecipient) {
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

  // Verifica se transação pertence ao usuário (pagador) ou se usuário é o destinatário
    const isOwner = transaction.userId && String(transaction.userId) === String(user._id);
    const isRecipient = transaction.recipientUserId && String(transaction.recipientUserId) === String(user._id);
    if (!isOwner && !isRecipient) {
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
    const merchantId = req.query.merchantId as string | undefined;
    const flowRaw = String((req.query.flow as string) || 'all').toLowerCase();
    const flow: 'in' | 'out' | 'all' = (['in','out','all'] as const).includes(flowRaw as any) ? flowRaw as any : 'all';
    const uid = String(user._id);
    let query: any;
    if (merchantId) {
      if (flow === 'in') query = { $or: [ { merchantId }, { recipientUserId: uid } ] };
      else if (flow === 'out') query = { userId: uid };
      else query = { $or: [ { merchantId }, { userId: uid }, { recipientUserId: uid } ] };
    } else {
      if (flow === 'in') query = { recipientUserId: uid };
      else if (flow === 'out') query = { userId: uid };
      else query = { $or: [ { userId: uid }, { recipientUserId: uid } ] };
    }
    
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

  // Relatório por período (com filtros opcionais)
  getReport = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as IUser;
    const { from, to, status, paymentMethod, merchantId, flow = 'all', limit = '1000' } = req.query as any;

    // Intervalo de datas
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    if (from) {
      const d = new Date(from);
      if (!isNaN(d.getTime())) startDate = new Date(d.setHours(0, 0, 0, 0));
    }
    if (to) {
      const d = new Date(to);
      if (!isNaN(d.getTime())) endDate = new Date(d.setHours(23, 59, 59, 999));
    }
    // Default: últimos 30 dias se nenhum período informado
    if (!startDate && !endDate) {
      endDate = new Date();
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const uid = String(user._id);
    const flowNorm: 'in' | 'out' | 'all' = (['in', 'out', 'all'] as const).includes(String(flow) as any)
      ? (flow as any)
      : 'all';

    // Base query respeitando escopo do usuário
    let query: any = {};
    if (merchantId) {
      if (flowNorm === 'in') query = { $or: [{ merchantId }, { recipientUserId: uid }] };
      else if (flowNorm === 'out') query = { userId: uid };
      else query = { $or: [{ merchantId }, { userId: uid }, { recipientUserId: uid }] };
    } else {
      if (flowNorm === 'in') query = { recipientUserId: uid };
      else if (flowNorm === 'out') query = { userId: uid };
      else query = { $or: [{ userId: uid }, { recipientUserId: uid }] };
    }

    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const limitNum = Math.max(1, Math.min(parseInt(String(limit), 10) || 1000, 5000));
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limitNum);

    const response = {
      success: true,
      data: {
        count: transactions.length,
        transactions: transactions.map(t => t.toJSON()),
        filters: {
          from: startDate?.toISOString() || null,
          to: endDate?.toISOString() || null,
          status: status || null,
          paymentMethod: paymentMethod || null,
          flow: flowNorm,
          merchantId: merchantId || null
        }
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