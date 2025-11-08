# TrustPay - Backend (API de Pagamentos)

O backend do TrustPay é uma API robusta e segura, desenvolvida para processar transações e gerenciar contas de usuários e lojistas. A arquitetura é baseada em **Node.js** com **Express.js** e utiliza **TypeScript** para garantir a qualidade e manutenibilidade do código.

## 🚀 Tecnologias Utilizadas

| Categoria | Tecnologia | Versão Principal | Descrição |
| :--- | :--- | :--- | :--- |
| **Plataforma** | Node.js | - | Ambiente de execução JavaScript. |
| **Framework** | Express.js | 4.18.x | Framework web minimalista e flexível para Node.js. |
| **Linguagem** | TypeScript | 5.2.x | Superset do JavaScript com tipagem estática. |
| **Banco de Dados** | MongoDB | - | Banco de dados NoSQL, acessado via Mongoose. |
| **ORM/ODM** | Mongoose | 8.0.x | Modelagem de dados para MongoDB. |
| **Segurança** | JSON Web Token (JWT) | 9.0.x | Autenticação e autorização de usuários. |
| **Segurança** | bcryptjs | 2.4.x | Hashing de senhas. |
| **Validação** | Joi | 17.11.x | Validação de esquemas de dados. |
| **Testes** | Jest / Supertest | 29.7.x / 6.3.x | Frameworks para testes unitários e de integração. |

## 🛡️ Segurança e Arquitetura

A API foi construída com foco em segurança e desempenho:

*   **Autenticação:** Utiliza JWT para proteger as rotas de usuário.
*   **Criptografia:** Senhas são hasheadas com `bcryptjs`.
*   **Middleware de Segurança:** Uso de `helmet` para configurar cabeçalhos HTTP de segurança e `express-rate-limit` para proteção contra ataques de força bruta e DoS.
*   **Validação de Assinatura (HMAC):** O middleware `rawBodySaver` indica que a API está preparada para validar a integridade dos dados de requisições sensíveis (como webhooks ou API de Merchant) usando assinaturas HMAC.
*   **CORS:** Configuração dinâmica de CORS para permitir acesso apenas de origens frontend configuradas.

## ⚙️ Estrutura de Rotas (Endpoints)

O backend expõe as seguintes rotas principais, todas prefixadas por `/api`:

| Rota Base | Propósito | Rotas Chave |
| :--- | :--- | :--- |
| `/api/auth` | Autenticação de Usuários | Login, Registro, Refresh Token. |
| `/api/payments` | Processamento de Pagamentos | Criação, Consulta e Confirmação de Transações. |
| `/api/cards` | Gerenciamento de Cartões | Adicionar, Listar e Remover Cartões. |
| `/api/users` | Gerenciamento de Usuários | Consulta e Atualização de Dados do Usuário. |
| `/api/wallet` | Gerenciamento de Carteira | Consulta de Saldo e Histórico da Carteira. |
| `/api/merchant/v1` | API para Lojistas | Endpoints para integração de terceiros (exige autenticação e assinatura HMAC). |
| `/health` | Verificação de Saúde | Retorna o status da API. |

## 🛠️ Instalação e Execução

### Pré-requisitos

*   Node.js
*   pnpm
*   MongoDB (instância local ou remota)

### Variáveis de Ambiente

O projeto utiliza o pacote `dotenv` e requer um arquivo `.env` na raiz do diretório `backend` com as seguintes variáveis (mínimas):

```env
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://localhost:27017/trustpay
JWT_SECRET=sua_chave_secreta_jwt
ENCRYPTION_KEY=chave_de_32_caracteres_para_dados
FRONTEND_URLS=http://localhost:4200,https://seu-frontend-em-producao.com
```

### Passos

1.  **Instalar dependências:**
    ```bash
    cd backend
    npm install
    ```

2.  **Executar em Modo de Desenvolvimento:**
    ```bash
    npm dev
    # O comando utiliza nodemon e ts-node para recarregar automaticamente.
    ```

3.  **Compilar e Executar em Produção:**
    ```bash
    npm build  # Compila o TypeScript para JavaScript (dist/app.js)
    npm start  # Executa o código compilado
    ```

4.  **Executar Testes:**
    ```bash
    npm test
    # O projeto utiliza Jest e Supertest para testes de API.
    ```

***


