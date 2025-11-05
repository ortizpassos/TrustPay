import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { WalletService } from '../../services/wallet.service';
import { User } from '../../models/user.model';
import { Sidebar } from "../../shared/sidebar/sidebar";
import { WalletReceiptsChartComponent } from './components/wallet-receipts-chart.component';

@Component({
  selector: 'app-wallet',
  imports: [CommonModule, RouterModule, Sidebar, WalletReceiptsChartComponent],
  templateUrl: './wallet.html',
  styleUrl: './wallet.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WalletPage {
  get saldoCarteira(): number {
    return this.totalRecebido();
  }
  // Placeholder de estado inicial para futuras implementações
  carregando = signal(false);
  sidebarOpen = false;
  active: 'carteira' | 'novo' | 'relatorios' | 'config' = 'carteira';
  totalRecebido = signal<number>(0);
  totalPendente = signal<number>(0);
  usuario: User | null = null;

  constructor(private router: Router, public auth: AuthService, private walletService: WalletService) {
    this.usuario = this.auth.getCurrentUser();
    this.carregarResumoCarteira();
  }

  carregarResumoCarteira(): void {
    const merchantId = this.usuario && this.usuario.merchantKey ? this.usuario.merchantKey : undefined;
    if (!merchantId) return;
    this.carregando.set(true);
    this.walletService.getWalletSummary(merchantId).subscribe({
      next: (resp) => {
        if (resp.success && resp.data) {
          this.totalRecebido.set(resp.data.totalRecebido);
          this.totalPendente.set(resp.data.totalPendente);
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
}
