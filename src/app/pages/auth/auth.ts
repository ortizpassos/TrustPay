import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LoginComponent } from '../../components/auth/login/login';
import { RegisterComponent } from '../../components/auth/register/register';

@Component({
  selector: 'app-auth',
  imports: [CommonModule, LoginComponent, RegisterComponent],
  templateUrl: './auth.html',
  styleUrl: './auth.css'
})
export class AuthComponent {
  isLoginMode = true;
  postRegisterMsg = '';

  constructor(private router: Router, private route: ActivatedRoute) {
    const mode = this.route.snapshot.queryParamMap.get('mode');
    if (mode === 'register') this.isLoginMode = false;
    if (mode === 'login') this.isLoginMode = true;
  }

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
  }

  onLoginSuccess() {
    // Navegar para o dashboard após login bem-sucedido
    this.router.navigate(['/dashboard']);
  }

  onRegisterSuccess() {
    // Trocar para login e definir mensagem de sucesso
    this.postRegisterMsg = 'Cadastro realizado com sucesso!';
    this.isLoginMode = true;
  }
}
