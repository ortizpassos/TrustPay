import axios, { AxiosError } from 'axios';
import { env } from '../config/env';

// Requisição para validação externa de cartão
export interface ExternalCardValidationRequest {
  cardNumber: string;
  cardHolderName: string;
  expirationMonth: string;
  expirationYear: string;
  cvv: string;
  user: {
    email: string;
    firstName?: string;
    lastName?: string;
    document?: string;
  };
}

// Resposta padronizada da API de validação externa
export interface ExternalCardValidationResponse {
  valid: boolean;               // Indica se o cartão passou na validação externa
  reason?: string;              // Motivo da rejeição se !valid
  reasons?: any;                // Motivos detalhados da validação externa
  riskScore?: number;           // Score de risco (se fornecido pelo provedor)
  networkLatencyMs?: number;    // Latência medida da chamada externa
  provider?: string;            // Identificação do provedor / modo (ex: 'disabled', 'external')
}

class ExternalCardValidationService {
  private enabled = env.externalCardApi.enabled;

  // Executa a validação externa (retorna sucesso imediato se desabilitada)
  async validate(data: ExternalCardValidationRequest): Promise<ExternalCardValidationResponse> {
    console.log('[EXT-CARD][PAYLOAD TO EXTERNAL]', {
      cardNumber: data.cardNumber,
      ownerCpf: data.user?.document,
      ownerName: data.cardHolderName,
      expMonth: Number(data.expirationMonth),
      expYear: Number(data.expirationYear)
    });
    if (!this.enabled) {
      return { valid: true, provider: 'disabled' };
    }
    if (!env.externalCardApi.url) {
      return { valid: false, reason: 'CONFIG_MISSING_URL', provider: 'config' };
    }
    const started = Date.now();
    const debug = env.externalCardApi.debug;
  const maskCard = (c: string) => c.replace(/^(\d{6})\d+(\d{4})$/, '$1********$2'); // Preserva BIN + últimos 4
    if (debug) {
      try {
          console.log('[EXT-CARD][REQUEST]', {
            expirationMonth: data.expirationMonth,
            expirationYear: data.expirationYear
        });
      } catch {}
    }
    try {
      // Monta o payload no formato exigido pela API externa
      const payload = {
        cardNumber: data.cardNumber,
        ownerCpf: data.user?.document,
        ownerName: data.cardHolderName,
        expMonth: Number(data.expirationMonth),
        expYear: Number(data.expirationYear)
      };
      const resp = await axios.post(env.externalCardApi.url + '/validate', payload, {
        timeout: env.externalCardApi.timeoutMs,
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': env.externalCardApi.key
        }
      });
      const latency = Date.now() - started;
      const response = { ...resp.data, networkLatencyMs: latency };
      if (debug) {
        try {
          console.log('[EXT-CARD][RESPONSE]', {
            valid: response.valid,
            reason: response.reason,
            provider: response.provider,
            latencyMs: latency
          });
        } catch {}
      }
      return response;
    } catch (err) {
              const maskCard = (c: string) => c.replace(/^(\d{6})\d+(\d{4})$/, '$1********$2'); // Preserva BIN + últimos 4
  const ax = err as AxiosError;
  const latency = Date.now() - started;
      if (ax.code === 'ECONNABORTED') {
        const timeoutResp = { valid: false, reason: 'TIMEOUT', provider: 'external', networkLatencyMs: latency };
        if (debug) console.log('[EXT-CARD][ERROR][TIMEOUT]', timeoutResp);
        return timeoutResp;
      }
      if (ax.response) {
        const r: any = ax.response.data || {};
        // Se a resposta tem 'message' mas não tem 'reason', usa 'message' como motivo
        const reason = r.reason || r.message || 'EXTERNAL_REJECTED';
              // Monta o payload no formato exigido pela API externa
      }
      const genericReason = (ax as any)?.message || 'EXTERNAL_ERROR';
      const generic = { valid: false, reason: genericReason, provider: 'external', networkLatencyMs: latency };
      if (debug) console.log('[EXT-CARD][ERROR][GENERIC]', generic);
      return generic;
    }
  }
}

export const externalCardValidationService = new ExternalCardValidationService();