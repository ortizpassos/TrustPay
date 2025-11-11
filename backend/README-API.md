# TrustPay API - Guia Completo

## Visão Geral
TrustPay é uma API de pagamentos para e-commerce, permitindo criar intenções de pagamento, capturar pagamentos com cartão, iniciar PIX, consultar status e realizar reembolsos. A API valida pagamentos com cartão via integração externa para máxima segurança.

## Autenticação
Todas as requisições protegidas exigem autenticação HMAC:
- `x-api-key`: sua chave pública (merchantKey)
- `x-timestamp`: data/hora em segundos (epoch)
- `x-signature`: assinatura HMAC-SHA256 do payload
- `Content-Type`: `application/json`

**Assinatura:**
Concatene `METHOD`, `PATH`, `TIMESTAMP` e `RAW_BODY` separados por `\n` e gere o HMAC usando seu `merchantSecret`.

## Endpoints Principais

### 1. Criar Intenção de Pagamento
`POST /api/merchant/v1/payment-intents`
**Payload:**
```json
{
  "orderId": "ORDER-12345",
  "amount": 299.90,
  "currency": "BRL",
  "paymentMethod": "credit_card",
  "customer": { "name": "Joao Silva", "email": "joao@example.com" },
  "callbackUrl": "https://seuecommerce.com/webhooks/trustpay",
  "returnUrl": "https://seuecommerce.com/checkout/success",
  "installments": 3
}
```
**Resposta:**
```json
{
  "success": true,
  "data": { "_id": "...", ... }
}
```

### 2. Capturar Pagamento (Cartão)
`POST /api/merchant/v1/payments/{id}/capture`
**Payload:**
```json
{
  "cardNumber": "4111111111111111",
  "cardHolderName": "JOAO SILVA",
  "expirationMonth": "12",
  "expirationYear": "2030",
  "cvv": "123"
}
```
**Validação Externa:**
O backend monta e envia para a API externa:
```json
{
  "typePayment": "CREDIT",
  "amount": 299.90,
  "currency": "BRL",
  "merchantName": "Tech Store SA",
  "cardNumber": "4111111111111111",
  "installmentsTotal": 3,
  "mcc": "5732",
  "category": "ELETRONICOS",
  "createdAt": "2025-10-30T12:34:56Z"
}
```
Só aprova se resposta for:
```json
{
  "success": true,
  "status": "AUTHORIZED"
}
```

### 3. Iniciar PIX
`POST /api/merchant/v1/payments/{id}/pix`
**Payload:**
```json
{
  "amount": 150.75,
  "description": "Pedido 12345"
}
```
**Resposta:**
```json
{
  "success": true,
  "data": { "pixCode": "...", "qrCodeImage": "...", "expiresAt": "..." }
}
```

### 4. Consultar Status
`GET /api/merchant/v1/payments/{id}/status`
**Resposta:**
```json
{
  "success": true,
  "data": { "transaction": { ... }, "updated": true }
}
```

### 5. Reembolso
`POST /api/merchant/v1/payments/{id}/refund`
**Payload:**
```json
{
  "amount": 100.00,
  "reason": "customer_request"
}
```
**Resposta:**
```json
{
  "success": true,
  "data": { ... }
}
```

## Passo a Passo para Simular Pagamento
1. Crie um intent de pagamento (veja payload acima).
2. Guarde o `id` retornado.
3. Capture o pagamento usando o id e os dados do cartão.
4. O backend valida com a API externa e aprova se autorizado.
5. Consulte status ou realize reembolso conforme necessário.

## Exemplos de Requisição (cURL)

**Criar Intent:**
```sh
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-api-key: SUA_API_KEY" \
  -H "x-timestamp: TIMESTAMP" \
  -H "x-signature: SIGNATURE" \
  --data '{"orderId":"ORDER-12345","amount":299.90,"currency":"BRL","paymentMethod":"credit_card","customer":{"name":"Joao Silva","email":"joao@example.com"},"callbackUrl":"https://seuecommerce.com/webhooks/trustpay","returnUrl":"https://seuecommerce.com/checkout/success","installments":3}' \
  http://localhost:3000/api/merchant/v1/payment-intents
```

**Capturar Pagamento:**
```sh
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-api-key: SUA_API_KEY" \
  -H "x-timestamp: TIMESTAMP" \
  -H "x-signature: SIGNATURE" \
  --data '{"cardNumber":"4111111111111111","cardHolderName":"JOAO SILVA","expirationMonth":"12","expirationYear":"2030","cvv":"123"}' \
  http://localhost:3000/api/merchant/v1/payments/{id}/capture
```

## Variáveis de Ambiente
- `EXTERNAL_CARD_API_URL`: URL da API externa de validação de cartão
- `EXTERNAL_CARD_API_KEY`: Chave de acesso à API externa
- `TRUSTPAY_MERCHANT_KEYS`: Chaves e segredos dos merchants

## Erros Comuns
- `INVALID_STATUS`: Tentar capturar pagamento que não está PENDING
- `EXTERNAL_PAYMENT_NOT_AUTHORIZED`: Pagamento recusado pela API externa
- `TRANSACTION_NOT_FOUND`: Id de pagamento inválido

## Observações
- Sempre gere os headers HMAC corretamente.
- O fluxo de captura só aprova se a API externa autorizar.
- Use a página developer para testar endpoints facilmente.

---
Dúvidas ou problemas? Consulte a documentação TrustPay ou entre em contato com o suporte técnico.
# 🚀 Sistema de Pagamentos - Backend

API completa para processamento de pagamentos com Node.js, TypeScript e MongoDB.

## 📋 Características

- 🔐 **Autenticação JWT** completa com refresh tokens
- 💳 **Processamento de Pagamentos** (Cartão de Crédito e PIX)
- 💾 **Cartões Salvos** com tokenização segura
- 📧 **Sistema de Emails** (verificação, recuperação de senha)
- 🛡️ **Segurança** (Rate limiting, CORS, Helmet)
- ✅ **Validação** robusta de dados
- 📱 **Responsivo** e compatível com frontend Angular

## 🛠️ Tecnologias

- **Node.js** + **TypeScript**
- **Express.js** - Framework web
- **MongoDB** + **Mongoose** - Banco de dados
- **JWT** - Autenticação
- **Bcrypt** - Hash de senhas
- **Nodemailer** - Envio de emails
- **Joi** - Validação de dados
- **Helmet** + **CORS** - Segurança

## 🚀 Instalação Rápida

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar ambiente
```bash
cp .env.example .env
# Editar .env com suas configurações
```

### 3. Iniciar MongoDB
```bash
# Windows
net start MongoDB

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### 4. Iniciar servidor
```bash
npm run dev
```

### 5. Testar
```bash
curl http://localhost:3000/health
```

## 📚 Documentação da API

### 🔐 Autenticação (`/api/auth`)

#### Registrar Usuário
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "MinhaSenh@123",
  "firstName": "João",
  "lastName": "Silva",
  "phone": "(11) 99999-9999",
  "document": "12345678901"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "MinhaSenh@123"
}
```

## ✅ API de Autenticação Implementada!

A API de autenticação está **100% completa** com todos os endpoints necessários para o frontend Angular.

### 🎯 **Próximos Passos:**

Agora que a autenticação está pronta, quer que eu implemente:

1. **🔥 API de Pagamentos** - Processar cartões e PIX
2. **💾 API de Cartões Salvos** - CRUD de cartões tokenizados  
3. **🌐 Gateway Mock** - Simulador de pagamentos para testes

**Qual você quer que eu faça primeiro?** 🚀

---

📦 Integração com Lojas (Merchant API)

Se você quer integrar um e‑commerce externo ao TrustPay (HMAC + payment intents, captura de cartão, PIX, status e reembolso), consulte:

- backend/README-MERCHANT-API.md