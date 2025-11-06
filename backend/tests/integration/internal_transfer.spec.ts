import request from 'supertest';
import app from '../../src/app';
import { Transaction } from '../../src/models/Transaction';
import { User } from '../../src/models/User';

async function registerAndLogin(email: string) {
  const payload = {
    email,
    password: 'Senha@123',
    firstName: 'Test',
    lastName: 'User'
  };
  await request(app).post('/api/auth/register').send(payload);
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: payload.email, password: payload.password })
    .expect(200);
  return login.body.data.token as string;
}

describe('Pagamentos com saldo (transferência interna)', () => {
  it('deve aprovar transferência quando há saldo suficiente', async () => {
    // Cria dois usuários: remetente e destinatário
    const remetenteEmail = 'remetente@example.com';
    const destinatarioEmail = 'destinatario@example.com';
    const remetenteToken = await registerAndLogin(remetenteEmail);
    await registerAndLogin(destinatarioEmail);

    // Localiza usuários no banco
    const remetente = await User.findOne({ email: remetenteEmail.toLowerCase() });
    const destinatario = await User.findOne({ email: destinatarioEmail.toLowerCase() });
    expect(remetente).toBeTruthy();
    expect(destinatario).toBeTruthy();

    // Concede saldo ao remetente inserindo uma transação aprovada recebida
    await Transaction.create({
      orderId: 'BOOST-' + Date.now(),
      userId: (destinatario as any)._id, // qualquer usuário como emissor
      recipientUserId: (remetente as any)._id,
      amount: 200,
      currency: 'BRL',
      paymentMethod: 'internal_transfer',
      status: 'APPROVED',
      customer: { name: 'Seed', email: remetenteEmail },
      returnUrl: 'http://localhost/return',
      callbackUrl: 'http://localhost/callback'
    });

    // Tenta transferir 50 do remetente para o destinatário
    const res = await request(app)
      .post('/api/payments/initiate')
      .set('Authorization', `Bearer ${remetenteToken}`)
      .send({
        orderId: 'TX-' + Date.now(),
        amount: 50,
        currency: 'BRL',
        paymentMethod: 'internal_transfer',
        from: { email: remetenteEmail },
        to: { email: destinatarioEmail },
        customer: { name: 'Teste', email: remetenteEmail }
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('APPROVED');
    expect(res.body.data.recipientUserId).toBe(String((destinatario as any)._id));
  });

  it('deve rejeitar transferência por saldo insuficiente', async () => {
    // Cria dois usuários: remetente e destinatário
    const remetenteEmail = 'remetente2@example.com';
    const destinatarioEmail = 'destinatario2@example.com';
    const remetenteToken = await registerAndLogin(remetenteEmail);
    await registerAndLogin(destinatarioEmail);

    // Concede saldo de 100 ao remetente
    const remetente = await User.findOne({ email: remetenteEmail.toLowerCase() });
    const destinatario = await User.findOne({ email: destinatarioEmail.toLowerCase() });
    await Transaction.create({
      orderId: 'BOOST-' + Date.now(),
      userId: (destinatario as any)._id,
      recipientUserId: (remetente as any)._id,
      amount: 100,
      currency: 'BRL',
      paymentMethod: 'internal_transfer',
      status: 'APPROVED',
      customer: { name: 'Seed', email: remetenteEmail },
      returnUrl: 'http://localhost/return',
      callbackUrl: 'http://localhost/callback'
    });

    // Tenta transferir 300 (maior que o saldo disponível)
    const res = await request(app)
      .post('/api/payments/initiate')
      .set('Authorization', `Bearer ${remetenteToken}`)
      .send({
        orderId: 'TX-' + Date.now(),
        amount: 300,
        currency: 'BRL',
        paymentMethod: 'internal_transfer',
        from: { email: remetenteEmail },
        to: { email: destinatarioEmail },
        customer: { name: 'Teste', email: remetenteEmail }
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error?.code).toBe('INSUFFICIENT_FUNDS');
  });
});
