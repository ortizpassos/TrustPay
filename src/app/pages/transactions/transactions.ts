import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../services/payment.service';
import { Transaction } from '../../models/transaction.model';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-transactions-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './transactions.html',
  styleUrl: './transactions.css'
})
export class TransactionsPage {
  transacoes = signal<Transaction[]>([]);
  carregando = signal(false);
  pagination = signal({ page: 1, pages: 1, limit: 10, total: 0 });
  filtroStatus = '';
  filtroMetodo = '';
  filtroDirecao: '' | 'in' | 'out' = '';
  sortField: string = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';
  usuario: User | null = null;

  statusOptions = [
    { value: 'PENDING', label: 'Pendente' },
    { value: 'PROCESSING', label: 'Processando' },
    { value: 'APPROVED', label: 'Aprovado' },
    { value: 'DECLINED', label: 'Recusado' },
    { value: 'FAILED', label: 'Falhou' },
    { value: 'EXPIRED', label: 'Expirado' }
  ];

  constructor(public paymentService: PaymentService, private router: Router, private auth: AuthService) {
    this.usuario = this.auth.getCurrentUser();
    this.carregar();
  }

  carregar(page = 1): void {
    this.carregando.set(true);
    const merchantId = this.usuario && this.usuario.merchantKey ? this.usuario.merchantKey : undefined;
    const params: any = {
      page,
      limit: this.pagination().limit,
      status: this.filtroStatus || undefined,
      paymentMethod: this.filtroMetodo || undefined,
      sort: this.sortField,
      direction: this.sortDirection,
      flow: this.filtroDirecao || undefined
    };
    if (merchantId) params.merchantId = merchantId;
    this.paymentService.getTransactionHistory(params).subscribe({
      next: (resp) => {
        if (resp.success && resp.data?.transactions) {
          this.transacoes.set(resp.data.transactions as Transaction[]);
          if (resp.data.pagination) {
            const p = resp.data.pagination;
            this.pagination.set({ page: p.page, pages: p.pages, limit: p.limit, total: p.total });
          }
          if (resp.data.sort) this.sortField = resp.data.sort;
          if (resp.data.direction) this.sortDirection = resp.data.direction as 'asc' | 'desc';
        } else {
          this.transacoes.set([]);
        }
        this.carregando.set(false);
      },
      error: () => {
        this.transacoes.set([]);
        this.carregando.set(false);
      }
    });
  }

  ordenar(campo: string): void {
    if (this.sortField === campo) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = campo;
      this.sortDirection = 'desc';
    }
    this.carregar(this.pagination().page);
  }

  indicadorOrdenacao(campo: string): string {
    if (this.sortField !== campo) return '';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  jurosValor(t: Transaction): number | null {
    if (t.baseAmount && t.amount && t.amount > (t.baseAmount || 0)) {
      return parseFloat((t.amount - (t.baseAmount || 0)).toFixed(2));
    }
    return null;
  }

  jurosPercent(t: Transaction): string | null {
    if (t.baseAmount && t.amount && t.amount > t.baseAmount) {
      const pct = ((t.amount / t.baseAmount) - 1) * 100;
      return pct.toFixed(1) + '%';
    }
    return null;
  }

  parcelasResumo(t: Transaction): string | null {
    if (t.installments?.quantity && t.installments.quantity > 1) {
      return `${t.installments.quantity}x de ${this.paymentService.formatCurrency(t.installments.installmentValue, t.currency)}`;
    }
    return null;
  }

  // Removidos métodos de auto-refresh e atualização manual conforme solicitação.

  async exportarCsv(): Promise<void> {
    // Carrega até 1000 registros (ajustável). Para >1000, poderia paginar.
    const limit = 1000;
    this.paymentService.getTransactionHistory({ page: 1, limit, status: this.filtroStatus || undefined, paymentMethod: this.filtroMetodo || undefined, sort: this.sortField, direction: this.sortDirection })
      .subscribe({
        next: (resp) => {
          if (!resp.success || !resp.data?.transactions) return;
          const rows = resp.data.transactions;
          const header = ['id','createdAt','orderId','paymentMethod','status','amount','baseAmount','installmentsQty','installmentValue','totalWithInterest','interestPercent'];
          const csv = [header.join(',')];
            for (const t of rows) {
            const inst = (t as any).installments || {};
            const interestPct = t.baseAmount && t.amount && t.baseAmount > 0 ? (((t.amount / t.baseAmount) -1)*100).toFixed(2) : '';
            csv.push([
              t.id,
              new Date(t.createdAt).toISOString(),
              t.orderId,
              t.paymentMethod,
              t.status,
              t.amount,
              t.baseAmount || '',
              inst.quantity || '',
              inst.installmentValue || '',
              inst.totalWithInterest || '',
              interestPct
            ].join(','));
          }
          const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `transacoes_${new Date().toISOString()}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }
      });
  }

  exportarPdf(): void {
    // Lazy import to keep bundle smaller
    Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]).then(([jspdf]) => {
      const { jsPDF } = (jspdf as any);
      const doc = new jsPDF();
      const title = 'Transações';
      doc.setFontSize(14);
      doc.text(title, 14, 14);

      const limit = 1000;
      this.paymentService.getTransactionHistory({
        page: 1,
        limit,
        status: this.filtroStatus || undefined,
        paymentMethod: this.filtroMetodo || undefined,
        sort: this.sortField,
        direction: this.sortDirection,
        flow: this.filtroDirecao || undefined
      }).subscribe({
        next: (resp) => {
          if (!resp.success || !resp.data?.transactions) return;
          const rows = resp.data.transactions as Transaction[];
          const body = rows.map(t => {
            const jurosValor = this.jurosValor(t);
            const jurosPct = this.jurosPercent(t);
            const parcelas = this.parcelasResumo(t) || '-';
            return [
              new Date(t.createdAt as any).toLocaleString('pt-BR'),
              t.orderId,
              this.directionLabel(t),
              this.metodoLabel(t.paymentMethod),
              this.statusLabel(t.status),
              this.paymentService.formatCurrency(t.amount, t.currency),
              t.baseAmount ? this.paymentService.formatCurrency(t.baseAmount, t.currency) : '-',
              jurosValor ? this.paymentService.formatCurrency(jurosValor, t.currency) + (jurosPct ? ` (${jurosPct})` : '') : '-',
              parcelas
            ];
          });

          // @ts-ignore - autoTable is added by the plugin import
          (doc as any).autoTable({
            startY: 20,
            head: [[
              'Data', 'Order', 'Direção', 'Método', 'Status', 'Valor', 'Base', 'Juros', 'Parcelas'
            ]],
            body,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [33, 150, 243] }
          });

          doc.save(`transacoes_${new Date().toISOString().slice(0,10)}.pdf`);
        }
      });
    });
  }

  aplicarFiltros(): void {
    this.mudarPagina(1);
  }

  mudarPagina(p: number): void {
    if (p < 1 || p > this.pagination().pages) return;
    this.carregar(p);
  }

  metodoLabel(method: string): string {
    if (method === 'credit_card') return 'Cartão';
    if (method === 'pix') return 'PIX';
    if (method === 'internal_transfer' || method === 'saldo') return 'Transferência Interna';
    return method;
  }

  statusLabel(status: string): string {
    const map: Record<string,string> = {
      PENDING: 'Pendente',
      PROCESSING: 'Processando',
      APPROVED: 'Aprovado',
      DECLINED: 'Recusado',
      FAILED: 'Falhou',
      EXPIRED: 'Expirado'
    };
    return map[status] || status;
  }

  statusClass(status: string): string {
    if (status === 'APPROVED') return 'success';
    if (status === 'PENDING' || status === 'PROCESSING') return 'pending';
    return 'error';
  }

  private isIncoming(t: Transaction): boolean {
    const u = this.usuario;
    if (!u) return false;
    const uid = (u as any).id || (u as any)._id || '';
    const merchantKey = (u as any).merchantKey;
    return (
      (t.recipientUserId && t.recipientUserId === uid) ||
      (!!merchantKey && !!t.merchantId && t.merchantId === merchantKey)
    );
  }

  directionLabel(t: Transaction): 'Recebido' | 'Pago' {
    return this.isIncoming(t) ? 'Recebido' : 'Pago';
  }

  amountClass(t: Transaction): string {
    return this.isIncoming(t) ? 'amount-in' : 'amount-out';
  }

  signedAmount(t: Transaction): string {
    const sign = this.isIncoming(t) ? '+' : '-';
    return `${sign} ${this.paymentService.formatCurrency(t.amount, t.currency)}`;
  }

  verDetalhe(t: Transaction): void {
    this.router.navigate(['/payment', t.id]);
  }

  voltarDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
