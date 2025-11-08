import { Component } from '@angular/core';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PaymentService } from '../../services/payment.service';

@Component({
  selector: 'app-reports',
  imports: [CommonModule, RouterModule, Sidebar, FormsModule],
  templateUrl: './reports.html',
  styleUrls: ['./reports.css']
})
export class ReportsPage {
  sidebarOpen = false;
  active: 'carteira' | 'novo' | 'relatorios' | 'config' = 'relatorios';
  dataInicio: string = '';
  dataFim: string = '';
  relatorio: any[] = [];
  carregando = false;
  erro: string = '';

  constructor(private router: Router, public auth: AuthService, private payment: PaymentService) {}

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

  buscarRelatorio(): void {
    this.carregando = true;
    this.erro = '';
    this.relatorio = [];
    this.payment.getReport({ from: this.dataInicio, to: this.dataFim }).subscribe({
      next: (resp) => {
        if (resp.success && resp.data?.transactions) {
          this.relatorio = resp.data.transactions;
          if (this.relatorio.length === 0) {
            this.erro = 'Nenhuma transação encontrada para o período.';
          }
        } else {
          this.erro = resp.error?.message || 'Erro ao buscar relatório.';
        }
        this.carregando = false;
      },
      error: (err) => {
        this.erro = err.error?.message || 'Erro inesperado.';
        this.carregando = false;
      }
    });
  }
}
