import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PaymentService } from '../../services/payment.service';
import { CardService } from '../../services/card.service';
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
  cartaoSelecionado: string | null = null;
  emailDestinatario = '';
  valor = 100.00;
  metodo: PaymentMethod = 'credit_card';
  parcelas = 1;
  opcoesParcelas = [1,2,3,4,5,6,9,12];
  sidebarOpen = false;
  active: 'carteira' | 'novo' | 'relatorios' | 'config' = 'novo';

  carregando = signal(false);
  erro = signal('');
  sucesso = signal('');

  savedCards: any[] = [];
  carregandoCartoes = signal(false);
  semCartaoSalvo = signal(false);

  constructor(
    private payment: PaymentService,
    private router: Router,
    public auth: AuthService,
    private users: UserService,
    private cards: CardService
  ) {}

  ngOnInit() {
    if (this.metodo === 'credit_card') {
      this.buscarCartoesSalvos();
    }
  }

  buscarCartoesSalvos() {
    this.carregandoCartoes.set(true);
    this.cards.getUserCards().subscribe({
      next: (resp) => {
        if (resp.success && Array.isArray(resp.data) && resp.data.length > 0) {
          this.savedCards = resp.data;
          this.semCartaoSalvo.set(false);
        } else {
          this.savedCards = [];
          this.semCartaoSalvo.set(true);
        }
        this.carregandoCartoes.set(false);
      },
      error: () => {
        this.savedCards = [];
        this.semCartaoSalvo.set(true);
        this.carregandoCartoes.set(false);
      }
    });
  }

  onMetodoChange() {
    if (this.metodo === 'credit_card') {
      this.buscarCartoesSalvos();
    }
  }

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
    this.sucesso.set('');
    if (!this.emailDestinatario || !this.emailDestinatario.includes('@')) {
      this.erro.set('Informe um e-mail de destinatário válido.');
      return;
    }
    if (!this.valor || this.valor <= 0) {
      this.erro.set('Informe um valor válido.');
      return;
    }
    if (this.metodo === 'credit_card' && !this.cartaoSelecionado) {
      this.erro.set('Selecione um cartão para pagamento.');
      return;
    }
    const currentUser = this.auth.getCurrentUser();
    if (!currentUser) {
      this.router.navigate(['/auth']);
      return;
    }
    let req: any;
    if (this.metodo === 'credit_card') {
      req = {
        orderId: 'NP-' + Date.now(),
        amount: this.valor,
        currency: 'BRL',
        paymentMethod: 'credit_card',
        cardId: this.cartaoSelecionado,
        installments: { quantity: this.parcelas },
        from: {
          email: currentUser.email,
          name: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
          document: currentUser.document
        },
        to: {
          email: this.emailDestinatario
        }
      };
    } else if (this.metodo === 'saldo') {
      req = {
        orderId: 'NP-' + Date.now(),
        amount: this.valor,
        currency: 'BRL',
        paymentMethod: 'internal_transfer',
        from: {
          email: currentUser.email,
          name: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
          document: currentUser.document
        },
        to: {
          email: this.emailDestinatario
        }
      };
    }
    this.carregando.set(true);
    this.payment.initiatePayment(req).subscribe({
      next: (resp) => {
        if (resp.success && resp.data) {
          this.sucesso.set('Transferência realizada com sucesso!');
          setTimeout(() => {
            const transacao = resp.data as Transaction;
            this.router.navigate(['/payment', transacao.id]);
          }, 1200);
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
