import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reports',
  imports: [CommonModule, RouterModule],
  template: `
  <div class="app">
  <aside class="sidebar" [class.open]="sidebarOpen" aria-label="Navegação principal" role="navigation">
      <div class="brand">
  <a class="logo" [routerLink]="['/dashboard']" aria-label="Ir para Dashboard">🏠</a>
        <div class="brand-text">
          <h1>TrustPay</h1>
          <p>Relatórios</p>
        </div>
      </div>
      <div class="sidebar-actions">
        <div class="quick-actions">
          <a class="quick-action-btn" [routerLink]="['/novo-pagamento']" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="closeSidebarOnNavigate()"><span class="action-icon">💳</span><span>Novo Pagamento</span></a>
          <a class="quick-action-btn" [routerLink]="['/relatorios']" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="closeSidebarOnNavigate()"><span class="action-icon">📊</span><span>Relatórios</span></a>
          <a class="quick-action-btn" [routerLink]="['/carteira']" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="closeSidebarOnNavigate()"><span class="action-icon">👛</span><span>Carteira</span></a>
          <a class="quick-action-btn" [routerLink]="['/desenvolvedor']" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="closeSidebarOnNavigate()"><span class="action-icon">🛠️</span><span>Developer</span></a>
          <a class="quick-action-btn" [routerLink]="['/configuracoes']" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="closeSidebarOnNavigate()"><span class="action-icon">⚙️</span><span>Configurações</span></a>
          <button class="quick-action-btn" type="button" (click)="sair()"><span class="action-icon">🚪</span><span>Sair</span></button>
          <img class="sidebar-gif" src="/assets/card.gif" alt="TrustPay animation" loading="lazy" />
        </div>
      </div>
    </aside>
    <main class="main">
      <header class="topbar" role="banner">
        <button id="menuToggle" class="menu-btn" aria-label="Abrir menu" (click)="toggleSidebar()">☰</button>
        <div class="search" role="search">
          <input aria-label="Pesquisar" placeholder="Pesquisar" />
        </div>
        <div class="user-actions">
          <button class="btn primary" (click)="sair()">Sair</button>
        </div>
      </header>
      <section class="content" aria-live="polite">
        <div class="dashboard-content">
          <div class="dashboard-grid">
            <div class="dashboard-card full-width">
              <h2>Relatórios</h2>
              <p>Esta é uma página placeholder para futuros relatórios (transações, cartões, performance).</p>
              <ul>
                <li>Total de transações aprovadas (futuro)</li>
                <li>Distribuição por método de pagamento</li>
                <li>Volume por período</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
  `,
  styleUrls: ['./reports.css']
})
export class ReportsPage {
  sidebarOpen = false;
  active: 'carteira' | 'novo' | 'relatorios' | 'config' = 'relatorios';
  constructor(private router: Router, private auth: AuthService) {}

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
}
