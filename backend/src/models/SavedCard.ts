import mongoose, { Document, Schema } from 'mongoose';

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'elo' | 'unknown';

export interface ISavedCard extends Document {
  _id: string;
  userId: string;
  cardToken: string; // Número do cartão tokenizado (determinístico)
  encryptedData: string; // Payload sensível do cartão criptografado
  lastFourDigits: string;
  cardBrand: CardBrand;
  cardHolderName: string;
  expirationMonth: string;
  expirationYear: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SavedCardSchema = new Schema<ISavedCard>({
  userId: {
    type: String,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  cardToken: {
    type: String,
    required: [true, 'Card token is required']
  },
  encryptedData: {
    type: String,
    required: [true, 'Encrypted data is required']
  },
  lastFourDigits: {
    type: String,
    required: [true, 'Last four digits are required'],
    match: [/^\d{4}$/, 'Last four digits must be exactly 4 digits']
  },
  cardBrand: {
    type: String,
    required: [true, 'Card brand is required'],
    enum: ['visa', 'mastercard', 'amex', 'elo', 'unknown']
  },
  cardHolderName: {
    type: String,
    required: [true, 'Card holder name is required'],
    trim: true,
    maxlength: [100, 'Card holder name cannot be more than 100 characters']
  },
  expirationMonth: {
    type: String,
    required: [true, 'Expiration month is required'],
    match: [/^(0[1-9]|1[0-2])$/, 'Expiration month must be 01-12']
  },
  expirationYear: {
    type: String,
    required: [true, 'Expiration year is required'],
    match: [/^\d{4}$/, 'Expiration year must be 4 digits'],
    validate: {
      validator: function(v: string) {
        const year = parseInt(v);
        const currentYear = new Date().getFullYear();
        return year >= currentYear && year <= currentYear + 20;
      },
      message: 'Expiration year must be valid and not more than 20 years in the future'
    }
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc: any, ret: any) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.cardToken; // Nunca expor o token
      delete ret.encryptedData; // Nunca expor o payload criptografado
      return ret;
    }
  }
});

// Índices
SavedCardSchema.index({ userId: 1 });
SavedCardSchema.index({ userId: 1, isDefault: 1 });
// Garante unicidade do cartão por usuário (mesmo token determinístico não se repete para o mesmo user)
SavedCardSchema.index({ userId: 1, cardToken: 1 }, { unique: true });

// Garante apenas um cartão padrão por usuário
SavedCardSchema.pre('save', async function(next: any) {
  if (this.isDefault) {
    // Define todos os outros cartões deste usuário como não padrão
    await mongoose.model('SavedCard').updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

// Valida data de expiração
SavedCardSchema.pre('save', function(next: any) {
  const month = parseInt(this.expirationMonth);
  const year = parseInt(this.expirationYear);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  if (year > currentYear || (year === currentYear && month >= currentMonth)) {
    next();
  } else {
    next(new Error('Card has expired'));
  }
});

export const SavedCard = mongoose.model<ISavedCard>('SavedCard', SavedCardSchema);