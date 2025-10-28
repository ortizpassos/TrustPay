import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css'],
  standalone: true,
  imports: [RouterModule]
})
export class Sidebar {
  @Input() sidebarOpen: boolean = false;
  @Input() user: any;

  closeSidebarOnNavigate() {
    this.sidebarOpen = false;
  }

  sair() {
    window.location.href = '/';
  }
}
