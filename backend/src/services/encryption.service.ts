import crypto from 'crypto';

class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 32 bytes => 256 bits
  private readonly ivLength = 12;  // 96 bits de IV recomendado para GCM
  private readonly tagLength = 16; // Tag de autenticação de 128 bits

  // Obtém a chave de criptografia das variáveis de ambiente
  private getKey(): Buffer {
    const keyString = process.env.ENCRYPTION_KEY;
    if (!keyString || keyString.length !== this.keyLength) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
    }
    return Buffer.from(keyString, 'utf8');
  }

  // Criptografa dados sensíveis
  encrypt(text: string): string {
    try {
      const key = this.getKey();
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      // Formato do payload: iv(12 bytes) + tag(16 bytes) + ciphertext
      return Buffer.concat([iv, tag, encrypted]).toString('base64');
    } catch (error) {
      throw new Error('Encryption failed');
    }
  }

  // Descriptografa dados sensíveis
  decrypt(payload: string): string {
    try {
      const key = this.getKey();
      const raw = Buffer.from(payload, 'base64');
      const iv = raw.subarray(0, this.ivLength);
      const tag = raw.subarray(this.ivLength, this.ivLength + this.tagLength);
      const ciphertext = raw.subarray(this.ivLength + this.tagLength);
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }

  // Cria um hash seguro unidirecional para indexação
  hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  // Gera um token determinístico seguro para identificação de cartão
  generateCardToken(cardNumber: string, expirationMonth: string, expirationYear: string): string {
    const cardData = `${cardNumber}:${expirationMonth}:${expirationYear}`;
    const hash = this.hash(cardData);
    return `card_${hash.substring(0, 32)}`;
  }

  // Mascara o número do cartão para exibição
  maskCardNumber(cardNumber: string): string {
    if (cardNumber.length < 4) {
      return cardNumber;
    }
    const lastFour = cardNumber.slice(-4);
    const masked = '•'.repeat(cardNumber.length - 4);
    return `${masked}${lastFour}`;
  }

  // Obtém os últimos 4 dígitos do cartão
  getLastFourDigits(cardNumber: string): string {
    return cardNumber.slice(-4);
  }

  // Tokeniza os dados do cartão para armazenamento seguro
  tokenizeCard(cardData: {
    cardNumber: string;
    cardHolderName: string;
    expirationMonth: string;
    expirationYear: string;
  }): {
    token: string;
    lastFourDigits: string;
    encryptedData: string;
  } {
    // Cria o token seguro determinístico para identificação
    const token = this.generateCardToken(
      cardData.cardNumber,
      cardData.expirationMonth,
      cardData.expirationYear
    );

    // Criptografa os dados sensíveis do cartão
    const sensitiveData = JSON.stringify({
      cardNumber: cardData.cardNumber,
      cardHolderName: cardData.cardHolderName,
      expirationMonth: cardData.expirationMonth,
      expirationYear: cardData.expirationYear,
      tokenizedAt: new Date().toISOString()
    });

  const encryptedData = this.encrypt(sensitiveData);
  const lastFourDigits = this.getLastFourDigits(cardData.cardNumber);

    return {
      token,
      lastFourDigits,
      encryptedData
    };
  }

  // Destokeniza os dados do cartão (somente para processamento de pagamento)
  detokenizeCard(encryptedData: string): {
    cardNumber: string;
    cardHolderName: string;
    expirationMonth: string;
    expirationYear: string;
  } {
    const decryptedData = this.decrypt(encryptedData);
    const cardData = JSON.parse(decryptedData);

    return {
      cardNumber: cardData.cardNumber,
      cardHolderName: cardData.cardHolderName,
      expirationMonth: cardData.expirationMonth,
      expirationYear: cardData.expirationYear
    };
  }

  // Gera uma chave aleatória segura (apenas para setup inicial – não persistir em produção)
  static generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('utf8').substring(0, 32);
  }

  // Valida o formato do token de cartão
  isValidCardToken(token: string): boolean {
    return /^card_[a-f0-9]{32}$/.test(token);
  }

  // Verifica se dois cartões são equivalentes sem precisar descriptografar
  areCardsSame(
    cardNumber1: string,
    expMonth1: string,
    expYear1: string,
    token2: string
  ): boolean {
    const token1 = this.generateCardToken(cardNumber1, expMonth1, expYear1);
    return token1 === token2;
  }
}

export const encryptionService = new EncryptionService();