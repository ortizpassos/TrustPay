import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Sidebar } from '../../shared/sidebar/sidebar';


@Component({
  selector: 'app-settings',
  templateUrl: './settings.html',
  styleUrls: ['./settings.css'],
  imports: [CommonModule, FormsModule, RouterModule, Sidebar]
})
export class SettingsPage {
  user: any = {};
  merchantKey: string | null = null;
  merchantSecret: string | null = null;
  isMerchant = false;
  successMsg = '';
  errorMsg = '';
  sidebarOpen = false;

  constructor(public auth: AuthService, private router: Router) {
    this.auth.getUserProfile().subscribe((res: any) => {
      const user = res?.user;
      this.user = { ...user };
      if (user?.accountType === 'loja') {
        this.isMerchant = true;
        this.merchantKey = user.merchantKey;
        this.merchantSecret = user.merchantSecret;
      }
    });
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebarOnNavigate() {
    this.sidebarOpen = false;
  }

  sair() {
    this.auth.logout().subscribe(() => {
      this.router.navigate(['/']);
    });
  }

  copyToClipboard(value: string | null) {
    if (!value) return;
    navigator.clipboard.writeText(value);
    this.successMsg = 'Chave copiada!';
    setTimeout(() => this.successMsg = '', 2000);
  }

  onSubmit() {
    this.successMsg = '';
    this.errorMsg = '';
    this.auth.updateProfile(this.user).subscribe({
      next: (res: any) => {
        this.successMsg = 'Dados atualizados com sucesso!';
      },
      error: (err: any) => {
        this.errorMsg = err.error?.message || 'Erro ao atualizar dados.';
      }
    });
  }

  onGenerateKeys() {
    this.successMsg = '';
    this.errorMsg = '';
    // Chamada para endpoint de geração de chaves merchant
    this.auth.generateMerchantKeys().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.merchantKey = res.data.merchantKey;
          this.merchantSecret = res.data.merchantSecret;
          this.successMsg = 'Chaves geradas com sucesso!';
        } else {
          this.errorMsg = res.error?.message || 'Erro ao gerar chaves.';
        }
      },
      error: (err: any) => {
        this.errorMsg = err.error?.message || 'Erro ao gerar chaves.';
      }
    });
  }
}
