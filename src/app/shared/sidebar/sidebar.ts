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

  get displayName(): string {
    const u = this.user || {};
    if (u.accountType === 'loja') {
      // For merchants, show only last name if available
      return (u.lastName || u.email || u.sidebarTitle || 'Menu');
    }
    const full = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
    return full || u.email || u.sidebarTitle || 'Menu';
  }

  closeSidebarOnNavigate() {
    this.sidebarOpen = false;
  }

  sair() {
    window.location.href = '/';
  }
}
