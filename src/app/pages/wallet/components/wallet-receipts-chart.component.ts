import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartConfiguration, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'wallet-receipts-chart',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div class="wallet-chart-container">
      <canvas baseChart
        [data]="chartData"
        [type]="chartType"
        [options]="chartOptions">
      </canvas>
    </div>
  `,
  styles: [`
    .wallet-chart-container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto 2rem auto;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
      padding: 1.5rem;
    }
  `]
})
export class WalletReceiptsChartComponent {
  chartType: ChartType = 'bar';
  chartData: ChartConfiguration['data'] = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Recebimentos',
        data: [1200, 1500, 800, 1700, 900, 2100], // Substituir por dados reais
        backgroundColor: '#1976d2',
        borderRadius: 6,
      }
    ]
  };
  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: { display: true },
      title: { display: true, text: 'Recebimentos por mês' }
    }
  };
}
