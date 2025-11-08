import { Component, signal, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { WalletService } from '../../services/wallet.service';
import { User } from '../../models/user.model';
import { Sidebar } from "../../shared/sidebar/sidebar";
import { WalletReceiptsChartComponent } from './components/wallet-receipts-chart.component';
import { Subscription, forkJoin } from 'rxjs';

@Component({
  selector: 'app-wallet',
  imports: [CommonModule, RouterModule, Sidebar, WalletReceiptsChartComponent],
  templateUrl: './wallet.html',
  styleUrl: './wallet.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WalletPage implements OnDestroy {
  // Saldo disponível (recebidos aprovados - enviados aprovados)
  saldo = signal<number>(0);
  // Placeholder de estado inicial para futuras implementações
  carregando = signal(false);
  sidebarOpen = false;
  active: 'carteira' | 'novo' | 'relatorios' | 'config' = 'carteira';
  totalRecebido = signal<number>(0);
  totalPendente = signal<number>(0);
  usuario: User | null = null;
  private refreshSub?: Subscription;

  constructor(private router: Router, public auth: AuthService, private walletService: WalletService) {
    this.usuario = this.auth.getCurrentUser();
    this.carregarResumoCarteira();
    // Atualiza automaticamente quando algum evento de refresh for emitido
    this.refreshSub = this.walletService.refresh$.subscribe(() => this.carregarResumoCarteira());
  }

  carregarResumoCarteira(): void {
    const merchantId = this.usuario && this.usuario.merchantKey ? this.usuario.merchantKey : undefined;
    this.carregando.set(true);
    const balance$ = this.walletService.getUserBalance();
    const summary$ = merchantId
      ? this.walletService.getWalletSummary(merchantId)
      : this.walletService.getUserWalletSummary();

    forkJoin({ balance: balance$, summary: summary$ }).subscribe({
      next: ({ balance, summary }) => {
        if (balance.success && balance.data) {
          this.saldo.set(balance.data.saldo);
        }
        if (summary.success && summary.data) {
          this.totalRecebido.set(summary.data.totalRecebido);
          this.totalPendente.set(summary.data.totalPendente);
        }
        this.carregando.set(false);
      },
      error: () => {
        this.carregando.set(false);
      }
    });
  }

  sair(): void {
    this.auth.logout().subscribe(() => {
      this.router.navigate(['/']);
    });
  }

  novoPagamento(): void {
    this.active = 'novo';
    this.router.navigate(['/novo-pagamento']);
  }

  irParaRelatorios(): void {
    this.active = 'relatorios';
    this.router.navigate(['/relatorios']);
  }

  irParaConfiguracoes(): void {
    this.active = 'config';
    this.router.navigate(['/configuracoes']);
  }

  irParaCarteira(): void {
    this.active = 'carteira';
    this.router.navigate(['/carteira']);
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebarOnNavigate(): void {
    this.sidebarOpen = false;
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }
}
