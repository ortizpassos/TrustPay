"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.externalCardValidationService = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
class ExternalCardValidationService {
    constructor() {
        this.enabled = env_1.env.externalCardApi.enabled;
    }
    async validate(data) {
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
        if (!env_1.env.externalCardApi.url) {
            return { valid: false, reason: 'CONFIG_MISSING_URL', provider: 'config' };
        }
        const started = Date.now();
        const debug = env_1.env.externalCardApi.debug;
        const maskCard = (c) => c.replace(/^(\d{6})\d+(\d{4})$/, '$1********$2');
        if (debug) {
            try {
                console.log('[EXT-CARD][REQUEST]', {
                    expirationMonth: data.expirationMonth,
                    expirationYear: data.expirationYear
                });
            }
            catch { }
        }
        try {
            const payload = {
                cardNumber: data.cardNumber,
                ownerCpf: data.user?.document,
                ownerName: data.cardHolderName,
                expMonth: Number(data.expirationMonth),
                expYear: Number(data.expirationYear)
            };
            const resp = await axios_1.default.post(env_1.env.externalCardApi.url + '/validate', payload, {
                timeout: env_1.env.externalCardApi.timeoutMs,
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-KEY': env_1.env.externalCardApi.key
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
                }
                catch { }
            }
            return response;
        }
        catch (err) {
            const maskCard = (c) => c.replace(/^(\d{6})\d+(\d{4})$/, '$1********$2');
            const ax = err;
            const latency = Date.now() - started;
            if (ax.code === 'ECONNABORTED') {
                const timeoutResp = { valid: false, reason: 'TIMEOUT', provider: 'external', networkLatencyMs: latency };
                if (debug)
                    console.log('[EXT-CARD][ERROR][TIMEOUT]', timeoutResp);
                return timeoutResp;
            }
            if (ax.response) {
                const r = ax.response.data || {};
                const reason = r.reason || r.message || 'EXTERNAL_REJECTED';
            }
            const genericReason = ax?.message || 'EXTERNAL_ERROR';
            const generic = { valid: false, reason: genericReason, provider: 'external', networkLatencyMs: latency };
            if (debug)
                console.log('[EXT-CARD][ERROR][GENERIC]', generic);
            return generic;
        }
    }
}
exports.externalCardValidationService = new ExternalCardValidationService();
//# sourceMappingURL=externalCardValidation.service.js.map