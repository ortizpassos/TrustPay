import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-integrate',
  standalone: true,
  imports: [CommonModule, RouterModule, Sidebar],
  templateUrl: './integrate.html',
  styleUrls: ['./integrate.css']
})
export class IntegrateComponent {

    sidebarOpen = false;

    constructor(private router: Router) { }

    irParaIntegracao() {
        // Lógica para navegar para a seção de integração
        this.router.navigate(['/integrate']);
        this.sidebarOpen = false;
        

    }



}