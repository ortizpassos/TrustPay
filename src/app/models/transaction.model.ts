export type TransactionStatus = 
  | 'PENDING' 
  | 'PROCESSING' 
  | 'APPROVED' 
  | 'DECLINED' 
  | 'FAILED' 
  | 'EXPIRED';

// Note: frontend uses 'saldo' label but backend persists 'internal_transfer'.
// We'll accept both on the UI layer.
export type PaymentMethod = 'credit_card' | 'pix' | 'saldo' | 'internal_transfer';

export interface Customer {
  name: string;
  email: string;
  document?: string;
}

export interface Transaction {
  id: string;
  orderId: string;
  // Present when transaction belongs to a merchant sale
  merchantId?: string;
  // P2P: user who received an internal transfer
  recipientUserId?: string;
  amount: number;
  baseAmount?: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  customer: Customer;
  returnUrl: string;
  callbackUrl: string;
  createdAt: Date;
  updatedAt: Date;
  bankTransactionId?: string;
  bankPixId?: string;
  pixCode?: string;
  qrCodeImage?: string;
  expiresAt?: Date;
  userId?: string; // ID do usuário logado (opcional para pagamentos sem cadastro)
  savedCardId?: string; // ID do cartão salvo usado (se aplicável)
  // ...existing code...
  installments?: {
    quantity: number;
    interestMonthly: number;
    totalWithInterest: number;
    installmentValue: number;
    mode: 'AVISTA' | 'PARCELADO';
  };
}

export interface PaymentInitiateRequest {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  customer: Customer;
  returnUrl: string;
  callbackUrl: string;
  // ...existing code...
  installments?: {
    quantity: number; // 1 = à vista
  };
}

export interface CreditCardPaymentRequest {
  transactionId: string;
  savedCardId?: string;
  cardNumber?: string;
  cardHolderName?: string;
  cardHolderCpf?: string;
  expirationMonth?: string;
  expirationYear?: string;
  cvv?: string;
}

export interface PixPaymentRequest {
  transactionId: string;
}

export interface PaymentResponse {
  success: boolean;
  data?: Transaction;
  error?: {
    message: string;
    code?: string;
  };
}