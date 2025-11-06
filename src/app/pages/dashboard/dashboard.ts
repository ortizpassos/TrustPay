import { Component, computed, signal } from '@angular/core';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { CardService } from '../../services/card.service';
import { FormsModule } from '@angular/forms';
import { SavedCard, SaveCardRequest } from '../../models/user.model';
import { PaymentService } from '../../services/payment.service';
import { forkJoin, of } from 'rxjs';
import { Transaction } from '../../models/transaction.model';
import { mapExternalCardReason } from '../../shared/utils/external-reason.util';


@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule, NgIf, NgFor, RouterModule, Sidebar],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent {
  sidebarOpen = false;
  usuario = signal<User | null>(null);
  iniciais = computed(() => {
    const u = this.usuario();
    if (!u) return '';
    const partes = [u.firstName, u.lastName].filter(Boolean).map(p => p.charAt(0).toUpperCase());
    return partes.slice(0,2).join('');
  });

  cartoes = signal<SavedCard[]>([]);
  carregandoCartoes = signal(false);
  mostrarFormularioNovoCartao = signal(false);
  errosCartao = signal<string[]>([]);
  salvandoCartao = signal(false);
  removendoCartaoId = signal<string | null>(null);
  definindoPadraoId = signal<string | null>(null);
  transacoesRecentes = signal<Transaction[]>([]);
  carregandoTransacoes = signal(false);
  
  // Helpers para direção das transações (recebido vs pago)
  private isIncoming(t: Transaction, u: User | null): boolean {
    if (!u) return false;
    const uid = (u as any).id || (u as any)._id || '';
    const merchantKey = (u as any).merchantKey;
    return (
      (t.recipientUserId && t.recipientUserId === uid) ||
      (!!merchantKey && !!t.merchantId && t.merchantId === merchantKey)
    );
  }

  directionLabel(t: Transaction): 'Recebido' | 'Pago' {
    return this.isIncoming(t, this.usuario()) ? 'Recebido' : 'Pago';
  }

  amountClass(t: Transaction): string {
    return this.isIncoming(t, this.usuario()) ? 'amount-in' : 'amount-out';
  }

  signedAmount(t: Transaction): string {
    const sign = this.isIncoming(t, this.usuario()) ? '+' : '-';
    return `${sign} ${this.paymentService.formatCurrency(t.amount, t.currency)}`;
  }

  novoCartao = signal<SaveCardRequest>({
    cardNumber: '',
    cardHolderName: '',
    cardHolderCpf: '',
    expirationMonth: '',
    expirationYear: '',
    cvv: '',
    isDefault: false
  });

  constructor(
    private auth: AuthService,
    public router: Router,
    private cardService: CardService,
    public paymentService: PaymentService
  ) {
    this.usuario.set(this.auth.getCurrentUser());
    this.carregarCartoes();
    this.carregarTransacoesRecentes();
  }

  sair(): void {
    this.auth.logout().subscribe(() => {
      this.router.navigate(['/']);
    });
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebarOnNavigate(): void {
    this.sidebarOpen = false;
  }

  abrirFormularioNovoCartao(): void {
    this.mostrarFormularioNovoCartao.set(true);
  }

  editarPerfil(): void {
    // Placeholder para futura edição de perfil
  }

  carregarCartoes(): void {
    this.carregandoCartoes.set(true);
    this.cardService.getUserCards().subscribe({
      next: (resp) => {
        if (resp.success && Array.isArray(resp.data)) {
          this.cartoes.set(resp.data as SavedCard[]);
        } else {
          this.cartoes.set([]);
        }
        this.carregandoCartoes.set(false);
      },
      error: () => {
        this.cartoes.set([]);
        this.carregandoCartoes.set(false);
      }
    });
  }

  formatarNumeroCartaoInput(): void {
    const atual = this.novoCartao();
    const formatado = this.cardService.formatCardNumber(atual.cardNumber);
    this.novoCartao.set({ ...atual, cardNumber: formatado });
  }

  enviarNovoCartao(): void {
    this.errosCartao.set([]);
    const dados = this.novoCartao();
    const validacao = this.cardService.validateCardForSaving(dados);
    if (!validacao.isValid) {
      this.errosCartao.set(validacao.errors);
      return;
    }
    this.salvandoCartao.set(true);
    // Validação externa antes de salvar
    this.cardService.validateCardExternally(dados).subscribe({
      next: (extResp) => {
        if (extResp.valid) {
          // Só salva se a validação externa for positiva
          const payload = this.cardService['buildSavePayload'](dados);
          console.log('[FRONTEND][PAYLOAD ENVIADO PARA BACKEND]', payload);
          this.cardService.saveCard(payload).subscribe({
            next: (resp) => {
              let novoCartaoSalvo: SavedCard | undefined = undefined;
              if (resp.success) {
                // Aceita tanto resp.card quanto resp.data (caso seja objeto)
                if (resp.card) {
                  novoCartaoSalvo = resp.card;
                } else if (resp.data && !Array.isArray(resp.data)) {
                  novoCartaoSalvo = resp.data as SavedCard;
                }
              }
              if (novoCartaoSalvo) {
                const listaAtual = this.cartoes();
                this.cartoes.set([novoCartaoSalvo, ...listaAtual]);
                this.novoCartao.set({ cardNumber: '', cardHolderName: '', cardHolderCpf: '', expirationMonth: '', expirationYear: '', cvv: '', isDefault: false });
                this.mostrarFormularioNovoCartao.set(false);
                this.errosCartao.set(['Cartão salvo com sucesso']);
              } else {
                const friendly = mapExternalCardReason(resp.error?.message) || resp.error?.message || 'Falha ao salvar cartão';
                this.errosCartao.set([friendly]);
              }
              this.salvandoCartao.set(false);
            },
            error: (err) => {
              const raw = err.error?.error?.message || err.error?.message || 'Erro inesperado';
              const friendly = mapExternalCardReason(raw) || raw;
              this.errosCartao.set([friendly]);
              this.salvandoCartao.set(false);
            }
          });
        } else {
          // Bloqueia salvar se rejeitado externamente
          const friendly = mapExternalCardReason(extResp.reason) || extResp.reason || 'Cartão rejeitado pela validação externa';
          this.errosCartao.set([friendly]);
          this.salvandoCartao.set(false);
        }
      },
      error: (err) => {
        const raw = err.error?.error?.message || err.error?.message || 'Erro inesperado';
        const friendly = mapExternalCardReason(raw) || raw;
        this.errosCartao.set([friendly]);
        this.salvandoCartao.set(false);
      }
    });
  }

  removerCartao(cartao: SavedCard): void {
    if (!confirm('Remover este cartão?')) return;
    this.removendoCartaoId.set(cartao.id);
    this.cardService.deleteCard(cartao.id).subscribe({
      next: () => {
        this.cartoes.set(this.cartoes().filter(c => c.id !== cartao.id));
        this.removendoCartaoId.set(null);
      },
      error: () => {
        this.removendoCartaoId.set(null);
      }
    });
  }

  definirPadrao(cartao: SavedCard): void {
    this.definindoPadraoId.set(cartao.id);
    this.cardService.setDefaultCard(cartao.id).subscribe({
      next: () => {
        this.cartoes.set(this.cartoes().map(c => ({ ...c, isDefault: c.id === cartao.id })));
        this.definindoPadraoId.set(null);
      },
      error: () => {
        this.definindoPadraoId.set(null);
      }
    });
  }

  // ===== Transações Recentes =====
  carregarTransacoesRecentes(limit = 5): void {
    this.carregandoTransacoes.set(true);
    const usuario = this.usuario();
    const merchantId = usuario && usuario.merchantKey ? usuario.merchantKey : undefined;

    // Se for merchant, buscamos RECEBIDOS (merchantId) e PAGOS (userId) e unimos
    if (merchantId) {
      forkJoin({
        recebidos: this.paymentService.getRecentTransactions(limit, merchantId, 'in'),
        pagos: this.paymentService.getRecentTransactions(limit, undefined, 'out')
      }).subscribe({
        next: ({ recebidos, pagos }) => {
          const rAll = recebidos.success && recebidos.data?.transactions ? recebidos.data.transactions as Transaction[] : [];
          const pAll = pagos.success && pagos.data?.transactions ? pagos.data.transactions as Transaction[] : [];
          // Ordena individualmente por data desc
          const rSorted = [...rAll].sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime());
          const pSorted = [...pAll].sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime());
          // Seleção balanceada: garantir presença de recebidos e pagos quando disponíveis
          const half = Math.ceil(limit / 2);
          const rPart = rSorted.slice(0, half);
          const pPart = pSorted.slice(0, limit - rPart.length);
          let combined = [...rPart, ...pPart];
          // Se ainda houver espaço (ex.: poucos recebidos), completa com o restante mais recente de qualquer lista
          if (combined.length < limit) {
            const extras = [...rSorted.slice(rPart.length), ...pSorted.slice(pPart.length)]
              .sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime())
              .slice(0, limit - combined.length);
            combined = [...combined, ...extras];
          }
          this.transacoesRecentes.set(combined);
          this.carregandoTransacoes.set(false);
        },
        error: () => {
          this.transacoesRecentes.set([]);
          this.carregandoTransacoes.set(false);
        }
      });
      return;
    }

    // Usuário comum: apenas as transações onde ele é o pagador
    this.paymentService.getRecentTransactions(limit).subscribe({
      next: (resp) => {
        if (resp.success && resp.data?.transactions) {
          const list = (resp.data.transactions as Transaction[]).sort((a, b) => {
            const ta = new Date(a.createdAt as any).getTime();
            const tb = new Date(b.createdAt as any).getTime();
            return tb - ta;
          });
          this.transacoesRecentes.set(list);
        } else {
          this.transacoesRecentes.set([]);
        }
        this.carregandoTransacoes.set(false);
      },
      error: () => {
        this.transacoesRecentes.set([]);
        this.carregandoTransacoes.set(false);
      }
    });
  }

  formatStatus(status: string): string {
    const map: Record<string,string> = {
      'PENDING': 'Pendente',
      'PROCESSING': 'Processando',
      'APPROVED': 'Aprovado',
      'DECLINED': 'Recusado',
      'FAILED': 'Falhou',
      'EXPIRED': 'Expirado'
    };
    return map[status] || status;
  }

  statusClass(status: string): string {
    if (status === 'APPROVED') return 'success';
    if (status === 'PENDING' || status === 'PROCESSING') return 'pending';
    return 'error';
  }

  descricaoTransacao(t: Transaction): string {
    // Mostrar apenas o método, sem o prefixo de direção (Recebido/Pago),
    // pois a direção já é exibida no badge ao lado.
    const method = t.paymentMethod === 'credit_card' ? 'Cartão'
      : (t.paymentMethod === 'pix' ? 'PIX'
      : (t.paymentMethod === 'saldo' || t.paymentMethod === 'internal_transfer' ? 'Transferência Interna' : 'Transação'));
    return method;
  }

  // ===== Ações Rápidas =====
  novoPagamento(): void {
    this.router.navigate(['/novo-pagamento']);
  }

  irParaRelatorios(): void {
    this.router.navigate(['/relatorios']);
  }

  irParaDesenvolvedor(): void {
    this.router.navigate(['/desenvolvedor']);
  }

  irParaConfiguracoes(): void {
    this.router.navigate(['/configuracoes']);
  }

  irParaCarteira(): void {
    this.router.navigate(['/carteira']);
  }
}
