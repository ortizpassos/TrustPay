// Simple external card validation mock server
// Usage: NODE_ENV=development node mock-card-validation.js
// Endpoint: POST http://localhost:4001/validate
// Returns { valid: boolean, reason?: string }

const http = require('http');

const PORT = process.env.MOCK_CARD_PORT || 4001;

// Sample rejection patterns for deterministic tests
// 4000000000000002 -> stolen
// 4000000000000127 -> insufficient_funds
// 4000000000000069 -> expired
// 4999999999999999 -> generic external decline
// Otherwise -> valid

function classify(number) {
  if (!/^[0-9]{13,19}$/.test(number)) return { success: false, status: 'DECLINED', reason: 'INVALID_FORMAT' };
  if (number === '4111111111111111') {
    return {
      createdAt: new Date().toISOString(),
      amount: 299.9,
      success: true,
      flow: 'CREDIT_AUTHORIZATION',
      transactionId: 1,
      merchantName: 'Tech Store SA',
      typePayment: 'CREDIT',
      status: 'AUTHORIZED'
    };
  }
  switch (number) {
    case '4000000000000002': return { success: false, status: 'DECLINED', reason: 'CARD_STOLEN' };
    case '4000000000000127': return { success: false, status: 'DECLINED', reason: 'INSUFFICIENT_FUNDS' };
    case '4000000000000069': return { success: false, status: 'DECLINED', reason: 'CARD_EXPIRED' };
    case '4999999999999999': return { success: false, status: 'DECLINED', reason: 'EXTERNAL_DECLINE' };
    default: return {
      createdAt: new Date().toISOString(),
      amount: 299.9,
      success: true,
      flow: 'CREDIT_AUTHORIZATION',
      transactionId: 2,
      merchantName: 'Tech Store SA',
      typePayment: 'CREDIT',
      status: 'AUTHORIZED'
    };
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/validate') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const json = JSON.parse(body || '{}');
        const start = Date.now();
        const result = classify(json.cardNumber || '');
        // Debug logging (sanitizado)
        if (process.env.MOCK_CARD_DEBUG === 'true') {
          const mask = (c) => (c || '').replace(/^(\d{6})\d+(\d{4})$/, '$1********$2');
          console.log('[MOCK-CARD][REQUEST]', {
            cardNumber: mask(json.cardNumber),
            expirationMonth: json.expirationMonth,
            expirationYear: json.expirationYear,
            cardHolderName: json.cardHolderName,
            user: json.user?.id
          });
        }
        // Artificial latency 80-250ms
        const latency = 80 + Math.floor(Math.random() * 170);
        setTimeout(() => {
          const payload = { ...result, provider: 'mock', processedAt: new Date().toISOString() };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(payload));
          console.log(`[MOCK-CARD] ${json.cardNumber} -> ${JSON.stringify(payload)} (${Date.now() - start}ms + artificial)`);
        }, latency);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ valid: false, reason: 'BAD_REQUEST' }));
      }
    });
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, () => {
  console.log(`Mock Card Validation API running at http://localhost:${PORT}/validate`);
});
