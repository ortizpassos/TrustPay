import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-documentacao',
  templateUrl: './documentacao.html',
  styleUrls: ['./documentacao.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, Sidebar]
})
export class DocumentacaoPage {
}
