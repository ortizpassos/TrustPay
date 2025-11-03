"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cardController = void 0;
const SavedCard_1 = require("../models/SavedCard");
const encryption_service_1 = require("../services/encryption.service");
const paymentValidation_1 = require("../utils/paymentValidation");
const errorHandler_1 = require("../middleware/errorHandler");
const externalCardValidation_service_1 = require("../services/externalCardValidation.service");
class CardController {
    constructor() {
        this.getUserCards = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const user = req.user;
            const cards = await SavedCard_1.SavedCard.find({ userId: user._id }).sort({ createdAt: -1 });
            const response = {
                success: true,
                data: cards.map(card => card.toJSON())
            };
            res.json(response);
        });
        this.saveCard = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            console.log('[CARD_CONTROLLER][REQUEST BODY - RECEBIDO NO CONTROLLER]:', JSON.stringify(req.body));
            console.log('[CARD_CONTROLLER][Campos recebidos]:', {
                cardNumber: req.body.cardNumber,
                cardHolderName: req.body.cardHolderName,
                cardHolderCpf: req.body.cardHolderCpf,
                expirationMonth: req.body.expirationMonth,
                expirationYear: req.body.expirationYear,
                cvv: req.body.cvv,
                isDefault: req.body.isDefault
            });
            const user = req.user;
            let cardHolderCpf = req.body.cardHolderCpf;
            if (!cardHolderCpf) {
                console.warn('[CARD_CONTROLLER][AVISO] Campo cardHolderCpf não recebido no body. Campos recebidos:', Object.keys(req.body));
            }
            const { cardNumber, cardHolderName, expirationMonth, expirationYear, cvv, isDefault } = req.body;
            try {
                if (!cardNumber || !cvv || !cardHolderName || !expirationMonth || !expirationYear) {
                    throw new errorHandler_1.AppError('Campos obrigatórios do cartão ausentes', 400, 'CARD_VALIDATION_MISSING_FIELDS');
                }
                const cardCount = await SavedCard_1.SavedCard.countDocuments({ userId: user._id });
                if (cardCount >= 5) {
                    throw new errorHandler_1.AppError('Máximo de 5 cartões por usuário atingido', 400, 'CARD_LIMIT_EXCEEDED');
                }
                const cardBrand = (0, paymentValidation_1.getCardBrand)(cardNumber);
                const existingCard = await SavedCard_1.SavedCard.findOne({
                    userId: user._id,
                    lastFourDigits: cardNumber.slice(-4),
                    cardBrand,
                    expirationMonth,
                    expirationYear
                });
                if (existingCard) {
                    throw new errorHandler_1.AppError('Este cartão já está salvo', 400, 'CARD_ALREADY_EXISTS');
                }
                console.log('[CARD_CONTROLLER][CPF para validação externa]:', cardHolderCpf);
                const externalResult = await externalCardValidation_service_1.externalCardValidationService.validate({
                    cardNumber,
                    cardHolderName,
                    expirationMonth,
                    expirationYear,
                    cvv,
                    user: {
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        document: cardHolderCpf ? String(cardHolderCpf) : undefined
                    }
                });
                if (process.env.EXTERNAL_CARD_API_DEBUG === 'true') {
                    console.log('[CARD_CONTROLLER][EXTERNAL_RESULT]', {
                        valid: externalResult.valid,
                        reason: externalResult.reason,
                        provider: externalResult.provider,
                        latency: externalResult.networkLatencyMs
                    });
                }
                if (!externalResult.valid) {
                    res.status(422).json({
                        message: externalResult.reason || 'Cartão rejeitado pela validação externa',
                        success: false
                    });
                    return;
                }
                const tokenizedCard = encryption_service_1.encryptionService.tokenizeCard({
                    cardNumber,
                    cardHolderName,
                    expirationMonth,
                    expirationYear
                });
                const savedCard = new SavedCard_1.SavedCard({
                    userId: user._id,
                    cardToken: tokenizedCard.token,
                    encryptedData: tokenizedCard.encryptedData,
                    lastFourDigits: tokenizedCard.lastFourDigits,
                    cardBrand,
                    cardHolderName,
                    cardHolderCpf: req.body.cardHolderCpf,
                    expirationMonth,
                    expirationYear,
                    isDefault: isDefault || false
                });
                await savedCard.save();
                res.status(201).json({
                    success: true,
                    valid: true,
                    reasons: externalResult.reasons || {},
                });
            }
            catch (error) {
                const isDev = process.env.NODE_ENV !== 'production';
                if (isDev) {
                    console.error('[CARD_SAVE_ERROR] Root cause:', error);
                }
                if (error instanceof errorHandler_1.AppError) {
                    res.status(error.statusCode || 400).json({
                        success: false,
                        error: {
                            message: error.message,
                            code: error.code || 'CARD_SAVE_ERROR'
                        }
                    });
                    return;
                }
                if (error?.message && /Encryption failed/i.test(error.message)) {
                    res.status(500).json({
                        success: false,
                        error: {
                            message: 'Falha no processo de criptografia',
                            code: 'ENCRYPTION_ERROR'
                        }
                    });
                    return;
                }
                if (error?.name === 'ValidationError') {
                    res.status(400).json({
                        success: false,
                        error: {
                            message: 'Falha na validação do cartão na camada de persistência',
                            code: 'CARD_PERSIST_VALIDATION_ERROR'
                        }
                    });
                    return;
                }
                const baseMessage = 'Falha ao salvar cartão';
                res.status(500).json({
                    success: false,
                    error: {
                        message: isDev && error?.message ? `${baseMessage}: ${error.message}` : baseMessage,
                        code: 'CARD_SAVE_ERROR'
                    }
                });
                return;
            }
        });
        this.getCard = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const user = req.user;
            const { cardId } = req.params;
            const card = await SavedCard_1.SavedCard.findOne({
                _id: cardId,
                userId: user._id
            });
            if (!card) {
                throw new errorHandler_1.AppError('Cartão não encontrado', 404, 'CARD_NOT_FOUND');
            }
            const response = {
                success: true,
                data: {
                    card: card.toJSON()
                }
            };
            res.json(response);
        });
        this.updateCard = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const user = req.user;
            const { cardId } = req.params;
            const { cardHolderName, isDefault } = req.body;
            const card = await SavedCard_1.SavedCard.findOne({
                _id: cardId,
                userId: user._id
            });
            if (!card) {
                throw new errorHandler_1.AppError('Card not found', 404, 'CARD_NOT_FOUND');
            }
            if (cardHolderName !== undefined) {
                card.cardHolderName = cardHolderName;
            }
            if (isDefault !== undefined) {
                card.isDefault = isDefault;
            }
            await card.save();
            const response = {
                success: true,
                data: {
                    card: card.toJSON(),
                    message: 'Cartão atualizado com sucesso'
                }
            };
            res.json(response);
        });
        this.deleteCard = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const user = req.user;
            const { cardId } = req.params;
            const card = await SavedCard_1.SavedCard.findOne({
                _id: cardId,
                userId: user._id
            });
            if (!card) {
                throw new errorHandler_1.AppError('Cartão não encontrado', 404, 'CARD_NOT_FOUND');
            }
            await SavedCard_1.SavedCard.findByIdAndDelete(cardId);
            if (card.isDefault) {
                const nextCard = await SavedCard_1.SavedCard.findOne({ userId: user._id });
                if (nextCard) {
                    nextCard.isDefault = true;
                    await nextCard.save();
                }
            }
            const response = {
                success: true,
                data: {
                    message: 'Cartão removido com sucesso'
                }
            };
            res.json(response);
        });
        this.setDefaultCard = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const user = req.user;
            const { cardId } = req.params;
            const card = await SavedCard_1.SavedCard.findOne({
                _id: cardId,
                userId: user._id
            });
            if (!card) {
                throw new errorHandler_1.AppError('Cartão não encontrado', 404, 'CARD_NOT_FOUND');
            }
            await SavedCard_1.SavedCard.updateMany({ userId: user._id, _id: { $ne: cardId } }, { isDefault: false });
            card.isDefault = true;
            await card.save();
            const response = {
                success: true,
                data: {
                    card: card.toJSON(),
                    message: 'Cartão definido como padrão com sucesso'
                }
            };
            res.json(response);
        });
        this.getCardForPayment = (0, errorHandler_1.asyncHandler)(async (cardId, userId) => {
            const card = await SavedCard_1.SavedCard.findOne({
                _id: cardId,
                userId
            });
            if (!card) {
                return null;
            }
            try {
                const cardData = encryption_service_1.encryptionService.detokenizeCard(card.encryptedData);
                return cardData;
            }
            catch (error) {
                throw new errorHandler_1.AppError('Falha ao recuperar dados do cartão', 500, 'CARD_DECRYPT_ERROR');
            }
        });
        this.validateCardOwnership = (0, errorHandler_1.asyncHandler)(async (cardId, userId) => {
            const card = await SavedCard_1.SavedCard.findOne({
                _id: cardId,
                userId
            });
            return !!card;
        });
        this.checkCardExpiration = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const user = req.user;
            const cards = await SavedCard_1.SavedCard.find({ userId: user._id });
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();
            const expiredCards = cards.filter(card => {
                const expYear = parseInt(card.expirationYear);
                const expMonth = parseInt(card.expirationMonth);
                return expYear < currentYear || (expYear === currentYear && expMonth < currentMonth);
            });
            const expiringSoonCards = cards.filter(card => {
                const expYear = parseInt(card.expirationYear);
                const expMonth = parseInt(card.expirationMonth);
                const expirationDate = new Date(expYear, expMonth - 1);
                const threeMonthsFromNow = new Date();
                threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
                return expirationDate <= threeMonthsFromNow && expirationDate > now;
            });
            const response = {
                success: true,
                data: {
                    expiredCards: expiredCards.map(card => card.toJSON()),
                    expiringSoonCards: expiringSoonCards.map(card => card.toJSON()),
                    totalCards: cards.length,
                    expiredCount: expiredCards.length,
                    expiringSoonCount: expiringSoonCards.length
                }
            };
            res.json(response);
        });
        this.getCardStats = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const user = req.user;
            const stats = await SavedCard_1.SavedCard.aggregate([
                {
                    $match: { userId: user._id }
                },
                {
                    $group: {
                        _id: null,
                        totalCards: { $sum: 1 },
                        cardBrands: { $addToSet: '$cardBrand' },
                        defaultCard: {
                            $sum: { $cond: [{ $eq: ['$isDefault', true] }, 1, 0] }
                        },
                        brandCounts: {
                            $push: '$cardBrand'
                        }
                    }
                }
            ]);
            const result = stats[0] || {
                totalCards: 0,
                cardBrands: [],
                defaultCard: 0,
                brandCounts: []
            };
            const brandCount = result.brandCounts.reduce((acc, brand) => {
                acc[brand] = (acc[brand] || 0) + 1;
                return acc;
            }, {});
            const response = {
                success: true,
                data: {
                    totalCards: result.totalCards,
                    supportedBrands: result.cardBrands,
                    hasDefaultCard: result.defaultCard > 0,
                    brandDistribution: brandCount,
                    maxCardsAllowed: 5,
                    remainingSlots: Math.max(0, 5 - result.totalCards)
                }
            };
            res.json(response);
        });
        this.deleteExpiredCards = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const user = req.user;
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();
            const expiredCards = await SavedCard_1.SavedCard.find({
                userId: user._id,
                $or: [
                    { expirationYear: { $lt: currentYear.toString() } },
                    {
                        expirationYear: currentYear.toString(),
                        expirationMonth: { $lt: currentMonth.toString().padStart(2, '0') }
                    }
                ]
            });
            if (expiredCards.length === 0) {
                const response = {
                    success: true,
                    data: {
                        message: 'Nenhum cartão expirado encontrado',
                        deletedCount: 0
                    }
                };
                res.json(response);
            }
            const deleteResult = await SavedCard_1.SavedCard.deleteMany({
                _id: { $in: expiredCards.map(card => card._id) }
            });
            const wasDefaultDeleted = expiredCards.some(card => card.isDefault);
            if (wasDefaultDeleted) {
                const remainingCard = await SavedCard_1.SavedCard.findOne({ userId: user._id });
                if (remainingCard) {
                    remainingCard.isDefault = true;
                    await remainingCard.save();
                }
            }
            const response = {
                success: true,
                data: {
                    message: `${deleteResult.deletedCount} cartões expirados removidos com sucesso`,
                    deletedCount: deleteResult.deletedCount,
                    expiredCards: expiredCards.map(card => ({
                        id: card._id,
                        lastFourDigits: card.lastFourDigits,
                        cardBrand: card.cardBrand,
                        expirationMonth: card.expirationMonth,
                        expirationYear: card.expirationYear
                    }))
                }
            };
            res.json(response);
        });
    }
}
exports.cardController = new CardController();
//# sourceMappingURL=card.controller.js.map