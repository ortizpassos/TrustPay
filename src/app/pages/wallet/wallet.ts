import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Sidebar } from "../../shared/sidebar/sidebar";

@Component({
  selector: 'app-wallet',
  imports: [CommonModule, RouterModule, Sidebar],
  templateUrl: './wallet.html',
  styleUrl: './wallet.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WalletPage {
  // Placeholder de estado inicial para futuras implementações
  carregando = signal(false);
  sidebarOpen = false;
  active: 'carteira' | 'novo' | 'relatorios' | 'config' = 'carteira';

  constructor(private router: Router, public auth: AuthService) {}

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
