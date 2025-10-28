import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Sidebar } from '../../shared/sidebar/sidebar';

@Component({
  selector: 'app-developer',
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule, Sidebar],
  templateUrl: './developer.html',
  styleUrls: ['./developer.css']
})
export class DeveloperPage {
  // sidebar state for mobile
  sidebarOpen = false;
  // Plain-text code samples injected into template via [textContent]
  signaturePayloadFormat = `METHOD
PATH
TIMESTAMP
RAW_BODY`;

  nodeSignExample = `const crypto = require('crypto');
function sign(opts) {
  const method = String(opts.method || 'GET').toUpperCase();
  const path = String(opts.path || '/');
  const timestamp = String(opts.timestamp || Math.floor(Date.now()/1000));
  const raw = opts.body ? JSON.stringify(opts.body) : '';
  const payload = method + '\n' + path + '\n' + timestamp + '\n' + raw;
  return crypto.createHmac('sha256', String(opts.secret)).update(payload).digest('hex');
}`;

  curlCreateIntent = `# Substitua API_KEY, TIMESTAMP e SIGNATURE por valores reais
curl -sS -X POST \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: API_KEY" \\
  -H "x-timestamp: TIMESTAMP" \\
  -H "x-signature: SIGNATURE" \\
  --data '{"orderId":"ORDER-1001","amount":123.45,"currency":"BRL","paymentMethod":"pix","customer":{"name":"Maria","email":"maria@example.com"},"returnUrl":"https://sualoja.com/return","callbackUrl":"https://sualoja.com/callback"}' \\
  http://localhost:3000/api/merchant/v1/payment-intents`;

  envVarExample = 'TRUSTPAY_MERCHANT_KEYS="key1:secret1,key2:secret2"';

  // Full docs examples
  endpointCreateIntentBody = `{
  "orderId": "ORDER-1001",
  "amount": 123.45,
  "currency": "BRL",
  "paymentMethod": "credit_card",
  "customer": { "name": "Maria", "email": "maria@example.com" },
  "returnUrl": "https://sualoja.com/checkout/return",
  "callbackUrl": "https://sualoja.com/webhooks/trustpay",
  "installments": { "quantity": 1 }
}`;

  captureBodyExample = `{
  "cardNumber": "4111111111111111",
  "cardHolderName": "JOAO SILVA",
  "expirationMonth": "12",
  "expirationYear": "2030",
  "cvv": "123"
}`;

  refundBodyExample = `{ "amount": 100.00, "reason": "customer_request" }`;

  pixReturnShape = '{ pixCode, qrCodeImage, expiresAt }';

  createIntentResponseExample = `{
  "_id": "67404b1d2fd4b5a2c1f0cabc",
  "orderId": "ORDER-1001",
  "amount": 123.45,
  "currency": "BRL",
  "paymentMethod": "pix",
  "status": "PENDING",
  "merchantId": "key1",
  "createdAt": "2025-10-14T12:34:56.000Z"
}`;

  // --- Gerador de Assinatura HMAC ---
  signMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST';
  signPath = '/api/merchant/v1/payment-intents';
  signTimestamp = Math.floor(Date.now() / 1000);
  signBody = '';
  signSecret = '';
  signApiKey = '';
  baseUrl = 'http://localhost:3000';
  testResult: any = null;
  signPayloadPreview = '';
  signSignatureHex = '';
  signError = '';
  headersText = '';
  curlText = '';

  constructor(private router: Router, private auth: AuthService, private http: HttpClient) {}

  testarEndpoint() {
    const url = this.baseUrl + this.signPath;
    // Para GET, não envie body nem Content-Type
    let headers: HttpHeaders;
    let options: any = { observe: 'response' };
    if (this.signMethod === 'GET') {
      headers = new HttpHeaders({
        'x-api-key': this.signApiKey,
        'x-timestamp': String(this.signTimestamp),
        'x-signature': this.signSignatureHex
      });
      options.headers = headers;
      // Nunca envie body em GET, mesmo se o usuário preencher
      options.body = undefined;
    } else {
      headers = new HttpHeaders({
        'x-api-key': this.signApiKey,
        'x-timestamp': String(this.signTimestamp),
        'x-signature': this.signSignatureHex,
        'Content-Type': 'application/json'
      });
      let body: any = undefined;
      if (this.signBody) {
        try {
          body = JSON.parse(this.signBody);
        } catch {
          this.testResult = { error: 'JSON inválido no corpo da requisição.' };
          return;
        }
      }
      options.headers = headers;
      options.body = body;
    }
    this.http.request(this.signMethod, url, options)
      .subscribe({
        next: res => this.testResult = res,
        error: err => this.testResult = err
      });
  }

  updateNowTimestamp(): void {
    this.signTimestamp = Math.floor(Date.now() / 1000);
  }

  private buildPayload(): string {
    const method = String(this.signMethod || 'GET').toUpperCase();
    const path = this.signPath || '/';
    const timestamp = String(this.signTimestamp || Math.floor(Date.now() / 1000));
    let rawBody = '';
    if (method === 'GET') {
      rawBody = '';
    } else if (this.signBody) {
      try {
        // Sempre minificar o JSON do body
        const parsed = JSON.parse(this.signBody);
        rawBody = JSON.stringify(parsed);
      } catch {
        // Se não for JSON válido, usa como está (para não travar a tela)
        rawBody = this.signBody;
      }
    }
    const payload = `${method}\n${path}\n${timestamp}\n${rawBody}`;
    this.signPayloadPreview = payload;
    return payload;
  }

  async generateSignature(): Promise<void> {
    this.signError = '';
    this.signSignatureHex = '';
    this.headersText = '';
    this.curlText = '';
    try {
      if (!this.signSecret) {
        this.signError = 'Informe o segredo (secret) do merchant.';
        return;
      }
      const payload = this.buildPayload();
      const enc = new TextEncoder();
      const keyData = enc.encode(this.signSecret);
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signature = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
      this.signSignatureHex = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Monta headers de saída
      const hasBody = this.signMethod !== 'GET' && !!this.signBody;
      const headers: string[] = [];
      headers.push(`x-api-key: ${this.signApiKey || 'SUA_API_KEY'}`);
      headers.push(`x-timestamp: ${this.signTimestamp}`);
      headers.push(`x-signature: ${this.signSignatureHex}`);
      if (hasBody) headers.push('Content-Type: application/json');
      this.headersText = headers.join('\n');

      // Monta cURL pronto (one-liner)
      const url = `${this.baseUrl}${this.signPath}`;
      const parts: string[] = ['curl -sS'];
      parts.push('-X', this.signMethod);
      parts.push('-H', `"x-api-key: ${this.signApiKey || 'SUA_API_KEY'}"`);
      parts.push('-H', `"x-timestamp: ${this.signTimestamp}"`);
      parts.push('-H', `"x-signature: ${this.signSignatureHex}"`);
      if (hasBody) {
        parts.push('-H', '"Content-Type: application/json"');
        // usar aspas simples para corpo JSON (compatível no PowerShell)
        parts.push('--data', `'${this.signBody}'`);
      }
      parts.push(url);
      this.curlText = parts.join(' ');
    } catch (e: any) {
      this.signError = e?.message || String(e);
    }
  }

  async copySignature(): Promise<void> {
    if (!this.signSignatureHex) return;
    try { await navigator.clipboard.writeText(this.signSignatureHex); } catch {}
  }

  async copyHeaders(): Promise<void> {
    if (!this.headersText) return;
    try { await navigator.clipboard.writeText(this.headersText); } catch {}
  }

  async copyCurl(): Promise<void> {
    if (!this.curlText) return;
    try { await navigator.clipboard.writeText(this.curlText); } catch {}
  }

  // ===== Shell actions (same behavior as dashboard) =====
  sair(): void {
    this.auth.logout().subscribe(() => {
      this.router.navigate(['/']);
    });
  }

  novoPagamento(): void {
    this.router.navigate(['/novo-pagamento']);
  }

  irParaRelatorios(): void {
    this.router.navigate(['/relatorios']);
  }

  irParaConfiguracoes(): void {
    this.router.navigate(['/configuracoes']);
  }

  irParaCarteira(): void {
    this.router.navigate(['/carteira']);
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebarOnNavigate(): void {
    this.sidebarOpen = false;
  }

  // --- Exemplos cURL (captura, status, reembolso) ---
  curlCapture = `# Substitua API_KEY, SECRET, PAYMENT_ID
TIMESTAMP=$(node -e "console.log(Math.floor(Date.now()/1000))")
BODY='{"cardNumber":"4111111111111111","cardHolderName":"JOAO SILVA","expirationMonth":"12","expirationYear":"2030","cvv":"123"}'
SIG=$(node -e "const crypto=require('crypto');const raw=process.env.BODY;const ts=process.env.TIMESTAMP;const id=process.env.ID;const payload=['POST','/api/merchant/v1/payments/'+id+'/capture',ts,raw].join('\\n');console.log(crypto.createHmac('sha256', process.env.SECRET).update(payload).digest('hex'))" )

curl -sS -X POST \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: $API_KEY" \\
  -H "x-timestamp: $TIMESTAMP" \\
  -H "x-signature: $SIG" \\
  --data "$BODY" \\
  http://localhost:3000/api/merchant/v1/payments/$ID/capture`;

  curlStatus = `# Substitua API_KEY, SECRET, PAYMENT_ID
TIMESTAMP=$(node -e "console.log(Math.floor(Date.now()/1000))")
SIG=$(node -e "const crypto=require('crypto');const ts=process.env.TIMESTAMP;const id=process.env.ID;const payload=['GET','/api/merchant/v1/payments/'+id+'/status',ts,''].join('\\n');console.log(crypto.createHmac('sha256', process.env.SECRET).update(payload).digest('hex'))" )

curl -sS \\
  -H "x-api-key: $API_KEY" \\
  -H "x-timestamp: $TIMESTAMP" \\
  -H "x-signature: $SIG" \\
  http://localhost:3000/api/merchant/v1/payments/$ID/status`;

  curlRefund = `# Substitua API_KEY, SECRET, PAYMENT_ID
TIMESTAMP=$(node -e "console.log(Math.floor(Date.now()/1000))")
BODY='{"amount":50.00,"reason":"customer_request"}'
SIG=$(node -e "const crypto=require('crypto');const raw=process.env.BODY;const ts=process.env.TIMESTAMP;const id=process.env.ID;const payload=['POST','/api/merchant/v1/payments/'+id+'/refund',ts,raw].join('\\n');console.log(crypto.createHmac('sha256', process.env.SECRET).update(payload).digest('hex'))" )

curl -sS -X POST \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: $API_KEY" \\
  -H "x-timestamp: $TIMESTAMP" \\
  -H "x-signature: $SIG" \\
  --data "$BODY" \\
  http://localhost:3000/api/merchant/v1/payments/$ID/refund`;

  // --- Exemplos Node.js (captura, status, reembolso) ---
  nodeCaptureExampleFull = `const API_KEY = 'SUA_API_KEY';
const SECRET = 'SEU_SEGREDO';
const id = 'PAYMENT_ID';
const ts = Math.floor(Date.now()/1000);
const body = { cardNumber: '4111111111111111', cardHolderName: 'JOAO SILVA', expirationMonth: '12', expirationYear: '2030', cvv: '123' };
const sig = sign({ method: 'POST', path: '/api/merchant/v1/payments/' + id + '/capture', timestamp: ts, body, secret: SECRET });

const res = await fetch('http://localhost:3000/api/merchant/v1/payments/' + id + '/capture', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, 'x-timestamp': String(ts), 'x-signature': sig },
  body: JSON.stringify(body)
});
console.log(await res.json());`;

  nodeStatusExampleFull = `const API_KEY = 'SUA_API_KEY';
const SECRET = 'SEU_SEGREDO';
const id = 'PAYMENT_ID';
const ts = Math.floor(Date.now()/1000);
const sig = sign({ method: 'GET', path: '/api/merchant/v1/payments/' + id + '/status', timestamp: ts, secret: SECRET });

const res = await fetch('http://localhost:3000/api/merchant/v1/payments/' + id + '/status', {
  headers: { 'x-api-key': API_KEY, 'x-timestamp': String(ts), 'x-signature': sig }
});
console.log(await res.json());`;

  nodeRefundExampleFull = `const API_KEY = 'SUA_API_KEY';
const SECRET = 'SEU_SEGREDO';
const id = 'PAYMENT_ID';
const ts = Math.floor(Date.now()/1000);
const body = { amount: 50.00, reason: 'customer_request' };
const sig = sign({ method: 'POST', path: '/api/merchant/v1/payments/' + id + '/refund', timestamp: ts, body, secret: SECRET });

const res = await fetch('http://localhost:3000/api/merchant/v1/payments/' + id + '/refund', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY, 'x-timestamp': String(ts), 'x-signature': sig },
  body: JSON.stringify(body)
});
console.log(await res.json());`;
}
