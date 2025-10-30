import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PaymentService } from '../../services/payment.service';
import { PaymentInitiateRequest, PaymentMethod, Transaction } from '../../models/transaction.model';
import { AuthService } from '../../services/auth.service';
import { UserService, UserOption } from '../../services/user.service';
import { Sidebar } from "../../shared/sidebar/sidebar";

@Component({
  selector: 'app-new-payment',
  imports: [CommonModule, FormsModule, RouterModule, Sidebar],
  templateUrl: './new-payment.html',
  styleUrl: './new-payment.css'
})
export class NewPaymentPage {
  valor = 100.00;
  metodo: PaymentMethod = 'credit_card';
  parcelas = 1;
  opcoesParcelas = [1,2,3,4,5,6,9,12];
  sidebarOpen = false;
  active: 'carteira' | 'novo' | 'relatorios' | 'config' = 'novo';
  // ...existing code...

  carregando = signal(false);
  erro = signal('');

  constructor(private payment: PaymentService, private router: Router, public auth: AuthService, private users: UserService) {}

  sair(): void {
    this.auth.logout().subscribe(() => {
      this.router.navigate(['/']);
    });
  }
  novoPagamento(): void { this.active = 'novo'; this.router.navigate(['/novo-pagamento']); }
  irParaRelatorios(): void { this.active = 'relatorios'; this.router.navigate(['/relatorios']); }
  irParaConfiguracoes(): void { this.active = 'config'; this.router.navigate(['/configuracoes']); }
  irParaCarteira(): void { this.active = 'carteira'; this.router.navigate(['/carteira']); }
  toggleSidebar(): void { this.sidebarOpen = !this.sidebarOpen; }
  closeSidebarOnNavigate(): void { this.sidebarOpen = false; }

  resumoParcelas = computed(() => {
    if (this.metodo !== 'credit_card') return null;
    const amount = this.valor;
    if (this.parcelas === 1) {
      return { quantity: 1, totalWithInterest: amount, installmentValue: amount, mode: 'AVISTA' };
    }
    const interest = 0.03;
    const total = parseFloat((amount * Math.pow(1 + interest, this.parcelas)).toFixed(2));
    const each = parseFloat((total / this.parcelas).toFixed(2));
    return { quantity: this.parcelas, totalWithInterest: total, installmentValue: each, mode: 'PARCELADO' };
  });

  formatarMoeda(v: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  }

  valorFormatado(): string { return this.formatarMoeda(this.valor); }

  iniciarPagamento(): void {
    this.erro.set('');
    if (!this.valor || this.valor <= 0) {
      this.erro.set('Informe um valor válido.');
      return;
    }
    const currentUser = this.auth.getCurrentUser();
    if (!currentUser) {
      this.router.navigate(['/auth']);
      return;
    }
    const req: PaymentInitiateRequest = {
      orderId: 'NP-' + Date.now(),
      amount: this.valor,
      currency: 'BRL',
      paymentMethod: this.metodo,
      customer: {
        name: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
        email: currentUser.email,
        document: currentUser.document
      },
      returnUrl: window.location.origin + '/dashboard',
      callbackUrl: window.location.origin + '/api/callback/mock'
    };
    if (this.metodo === 'credit_card') {
      req.installments = { quantity: this.parcelas };
    }
    this.carregando.set(true);
    this.payment.initiatePayment(req).subscribe({
      next: (resp) => {
        if (resp.success && resp.data) {
          const transacao = resp.data as Transaction;
          this.router.navigate(['/payment', transacao.id]);
        } else {
          this.erro.set(resp.error?.message || 'Falha ao iniciar pagamento');
        }
        this.carregando.set(false);
      },
      error: (err) => {
        this.erro.set(err.error?.error?.message || err.error?.message || 'Erro inesperado');
        this.carregando.set(false);
      }
    });
  }

  voltar(): void {
    this.router.navigate(['/dashboard']);
  }

  onUserSearchChange(): void {
    // ...existing code...
  }

  selectUser(u: UserOption): void {
  // ...existing code...
  }

  clearUserSearch(): void {
  // ...existing code...
  }

  buscarPorEmail(): void {
    // ...existing code...
  }

  usarEmailLookup(): void {
    // ...existing code...
  }

  // ...existing code...
}
