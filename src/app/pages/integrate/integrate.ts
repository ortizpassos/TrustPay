import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-integrate',
  standalone: true,
  imports: [CommonModule, RouterModule, Sidebar],
  templateUrl: './integrate.html',
  styleUrls: ['./integrate.css']
})
export class IntegrateComponent {
    sidebarOpen = false;
    merchantKey: string | null = null;
    merchantSecret: string | null = null;
    chaveStatus: string | null = null;

    constructor(private router: Router, private auth: AuthService) { }

    irParaIntegracao() {
      this.router.navigate(['/integrate']);
      this.sidebarOpen = false;
    }

    gerarChaves() {
      this.chaveStatus = null;
      this.auth.generateMerchantKeys().subscribe({
        next: (resp) => {
          if (resp.success && resp.data) {
            this.merchantKey = resp.data.merchantKey || null;
            this.merchantSecret = resp.data.merchantSecret || null;
            this.chaveStatus = 'Chaves geradas com sucesso!';
          } else {
            this.chaveStatus = resp.error?.message || 'Erro ao gerar chaves.';
          }
        },
        error: (err) => {
          this.chaveStatus = err.error?.message || 'Erro inesperado ao gerar chaves.';
        }
      });
    }
}