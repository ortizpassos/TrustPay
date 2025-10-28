# TrustPay - API para Lojas Parceiras (Merchant)

Documentação da API pública para e‑commerces integrarem o TrustPay como meio de pagamento. Esta API utiliza autenticação via HMAC (chave/segredo) e inclui fluxos de cartão de crédito, PIX, consulta de status e reembolso.

> Ambiente padrão de desenvolvimento: http://localhost:3000
> Base da API Merchant: http://localhost:3000/api/merchant/v1

## Autenticação HMAC

- Headers obrigatórios em todas as requisições:
  - x-api-key: sua chave pública do merchant
  - x-timestamp: timestamp em milissegundos (Date.now())
  - x-signature: assinatura HMAC-SHA256 no formato hex
- Payload utilizado para assinar:
  - METHOD + "\n" + PATH + "\n" + TIMESTAMP + "\n" + RAW_BODY
  - Exemplo de PATH: /api/merchant/v1/payment-intents (inclua query string se houver)
- Tolerância de tempo: por padrão ±300s (configurável), requisições fora da janela serão rejeitadas.

### Geração de assinatura (exemplo Node.js)

```ts
import crypto from 'crypto';

function signRequest(method: string, path: string, body: any, apiKey: string, secret: string) {
  const timestamp = Date.now().toString();
  const rawBody = body ? JSON.stringify(body) : '';
  const payload = `${method.toUpperCase()}\n${path}\n${timestamp}\n${rawBody}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return { headers: { 'x-api-key': apiKey, 'x-timestamp': timestamp, 'x-signature': signature }, rawBody };
}
```

### Configuração do servidor (BACKEND)

- Variável de ambiente TRUSTPAY_MERCHANT_KEYS para cadastrar chaves/segredos válidos:
  - Formato: KEY:SECRET,KEY2:SECRET2
  - Ex.: TRUSTPAY_MERCHANT_KEYS="demo-key:demo-secret"
- Opcional: tolerância de assinatura (segundos)
  - TRUSTPAY_SIGNATURE_TOLERANCE_SEC=300

Quando nenhuma chave é configurada, as rotas Merchant não são montadas.

## Endpoints

Base: /api/merchant/v1

### 1) Criar Payment Intent
- POST /payment-intents
- Body
  - orderId (string, obrigatório, único por merchant)
  - amount (number, obrigatório, ex.: 149.90)
  - currency (string, obrigatório, ex.: BRL)
  - description (string, opcional)
  - customer (objeto opcional: email, name, document)
- Respostas
  - 201 Created: { transactionId, status: 'PENDING', orderId, amount, currency, ... }
  - 409 Conflict: já existe intent para esse orderId

### 2) Consultar pagamento por ID
- GET /payments/:id
- Respostas
  - 200 OK: dados do pagamento
  - 404 Not Found

### 3) Capturar pagamento no cartão
- POST /payments/:id/capture
- Body
  - number, expMonth, expYear, cvv, holderName
  - saveCard (boolean opcional)
- Respostas
  - 200 OK: status atualizado (ex.: APPROVED)
  - 400/402: falha na captura
  - 404 Not Found

### 4) Iniciar PIX
- POST /payments/:id/pix
- Respostas
  - 200 OK: { qrCode, expiresAt, status }
  - 404 Not Found

### 5) Consultar status
- GET /payments/:id/status
- Respostas
  - 200 OK: { status, updatedAt, ... }
  - 404 Not Found

### 6) Reembolsar pagamento
- POST /payments/:id/refund
- Body (opcional)
  - amount (number, se omitido, reembolso total)
  - reason (string, opcional)
- Respostas
  - 200 OK: { status: 'REFUNDED', refund: { amount, at, reason } }
  - 400: inválido ou já reembolsado
  - 404 Not Found

### 7) Webhook (placeholder)
- POST /webhooks/trustpay
- Observação: Normalmente o merchant expõe seu próprio endpoint para receber notificações do TrustPay. Este endpoint existe para demonstração/troca de mensagens; ajuste conforme sua arquitetura.

## Exemplos com cURL

Criar intent:

```bash
# Exemplo didático: gere assinatura no seu app/servidor e injete nos headers
curl -X POST "http://localhost:3000/api/merchant/v1/payment-intents" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <KEY>" \
  -H "x-timestamp: <TIMESTAMP_MS>" \
  -H "x-signature: <HMAC_HEX>" \
  -d '{"orderId":"ORDER-123","amount":149.90,"currency":"BRL","description":"Pedido 123"}'
```

Capturar (cartão):

```bash
curl -X POST "http://localhost:3000/api/merchant/v1/payments/<TRANSACTION_ID>/capture" \
  -H "Content-Type: application/json" \
  -H "x-api-key: <KEY>" \
  -H "x-timestamp: <TIMESTAMP_MS>" \
  -H "x-signature: <HMAC_HEX>" \
  -d '{"number":"4111111111111111","expMonth":12,"expYear":2030,"cvv":"123","holderName":"JOAO SILVA"}'
```

## Códigos de erro comuns

- 401 UNAUTHORIZED: chave inválida ou ausente
- 401 INVALID_SIGNATURE: assinatura não confere
- 401 TIMESTAMP_OUT_OF_RANGE: timestamp fora da tolerância
- 400 VALIDATION_ERROR: payload inválido (Joi)
- 404 NOT_FOUND: recurso inexistente
- 409 CONFLICT: operação idempotente já existente (orderId)
- 429 RATE_LIMIT_EXCEEDED: limite de requisições
- 500 INTERNAL_ERROR: erro inesperado

Os erros seguem o padrão:

```json
{
  "success": false,
  "error": { "message": "...", "code": "..." }
}
```

## Boas práticas

- Gere e valide a assinatura sempre no servidor (nunca no cliente/browser).
- Use relógio sincronizado (NTP) para evitar rejeições por timestamp.
- Idempotência: use orderId único por compra.
- Armazene o transactionId para futuras consultas/reembolsos.
- Para produção, armazene suas chaves/segredos fora do código-fonte.

## Perguntas Frequentes

- As rotas Merchant só aparecem se TRUSTPAY_MERCHANT_KEYS estiver configurada no backend.
- O CORS permite chamadas server-to-server (sem origin); em browser, a origem deve estar na whitelist.
- Para testes locais, use valores de cartão de teste (ex.: 4111 1111 1111 1111).

---

Precisa de um exemplo pronto (Node/Express ou Next.js API Route) com assinatura HMAC? Abra uma issue ou peça aqui que enviamos um snippet completo.