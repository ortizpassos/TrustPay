import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getApiBase } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class WalletService {
  private apiUrl = getApiBase();

  constructor(private http: HttpClient) {}

  getWalletSummary(merchantId: string) {
    return this.http.get<{ success: boolean; data: { totalRecebido: number; totalPendente: number } }>(`${this.apiUrl}/wallet/summary?merchantId=${encodeURIComponent(merchantId)}`);
  }
}
