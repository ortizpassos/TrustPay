import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { getApiBase } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class WalletService {
  private apiUrl = getApiBase();
  private refreshSubject = new Subject<void>();
  // Emite eventos para que páginas interessadas recarreguem o resumo da carteira
  refresh$ = this.refreshSubject.asObservable();

  constructor(private http: HttpClient) {}

  getWalletSummary(merchantId: string) {
    return this.http.get<{ success: boolean; data: { totalRecebido: number; totalPendente: number } }>(`${this.apiUrl}/wallet/summary?merchantId=${encodeURIComponent(merchantId)}`);
  }

  getUserWalletSummary() {
    return this.http.get<{ success: boolean; data: { totalRecebido: number; totalPendente: number } }>(`${this.apiUrl}/wallet/user-summary`);
  }

  // Notifica interessados para recarregar o resumo da carteira
  triggerRefresh(): void {
    this.refreshSubject.next();
  }

  getUserBalance() {
    return this.http.get<{ success: boolean; data: { saldo: number; recebidos: number; enviados: number } }>(`${this.apiUrl}/wallet/balance`);
  }
}
