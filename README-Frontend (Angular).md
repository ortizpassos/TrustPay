# TrustPay - Frontend (Angular)

O frontend do TrustPay é uma aplicação web robusta desenvolvida em **Angular**, utilizando **TypeScript** para tipagem forte e **RxJS** para gerenciamento de estado reativo. A interface do usuário é construída com **Angular Material** e **Bootstrap**, garantindo um design moderno e responsivo.

## 🚀 Tecnologias Utilizadas

| Categoria | Tecnologia | Versão Principal | Descrição |
| :--- | :--- | :--- | :--- |
| **Framework** | Angular | 20.3.x | Plataforma para construção de aplicações web. |
| **Linguagem** | TypeScript | 5.9.x | Superset do JavaScript que adiciona tipagem estática. |
| **Estilo/UI** | Angular Material | 20.2.x | Componentes de UI de alta qualidade baseados no Material Design. |
| **Estilo/Layout** | Bootstrap | 5.3.x | Framework CSS para desenvolvimento responsivo. |
| **Reatividade** | RxJS | 7.8.x | Biblioteca para programação reativa. |
| **Gráficos** | Chart.js / ng2-charts | 4.5.x / 8.0.x | Visualização de dados e relatórios. |
| **Relatórios** | jspdf / jspdf-autotable | 2.5.x / 3.8.x | Geração de relatórios em PDF. |
| **Testes** | Jasmine / Karma | 5.9.x / 6.4.x | Ferramentas para testes unitários. |

## 🗺️ Estrutura de Rotas

A aplicação utiliza o Angular Router para gerenciar a navegação, implementando *Guards* (`authGuard` e `merchantGuard`) para proteger rotas e garantir que apenas usuários autenticados ou lojistas específicos possam acessá-las.

| Rota | Componente | Proteção | Descrição |
| :--- | :--- | :--- | :--- |
| `/` | `HomeComponent` | Nenhuma | Página inicial pública. |
| `/auth` | `AuthComponent` | Nenhuma | Tela de login e autenticação. |
| `/dashboard` | `DashboardComponent` | `authGuard` | Visão geral e principal painel do usuário. |
| `/payment/:id` | `PaymentComponent` | Nenhuma | Página de pagamento (acessível via link de transação). |
| `/novo-pagamento` | `NewPaymentPage` | `authGuard` | Formulário para iniciar um novo pagamento. |
| `/relatorios` | `ReportsPage` | `authGuard` | Visualização e geração de relatórios. |
| `/transacoes` | `TransactionsPage` | `authGuard` | Histórico e detalhes das transações. |
| `/carteira` | `WalletPage` | `authGuard` | Gerenciamento da carteira digital. |
| `/configuracoes` | `SettingsPage` | `authGuard` | Configurações gerais da conta. |
| `/desenvolvedor` | `DeveloperPage` | `authGuard`, `merchantGuard` | Área para desenvolvedores e lojistas (APIs, webhooks). |
| `/documentacao` | `DocumentacaoPage` | `authGuard` | Documentação interna da aplicação. |
| `/minha-conta` | `SettingsPage` | `authGuard` | Atalho para a página de configurações da conta. |

## ⚙️ Instalação e Execução

Este projeto utiliza o **npm** como gerenciador de pacotes.

### Pré-requisitos

*   Node.js (versão compatível com Angular 20)
*   npm

### Passos

1.  **Instalar dependências:**
    ```bash
    npm install
    ```

2.  **Executar o servidor de desenvolvimento:**
    ```bash
    npm start
    # ou
    ng serve
    ```
    O aplicativo será iniciado em `http://localhost:4200/`.

3.  **Compilar para produção:**
    ```bash
    npm build
    ```
    Os artefatos de *build* serão armazenados no diretório `dist/`.

## 🖼️ Telas da Aplicação

As telas a seguir ilustram a interface do usuário e as funcionalidades do TrustPay, com destaque para as diferenças entre os perfis de **Lojista** e **Pessoa Física**.

### 1. Página Inicial e Login

| Tela | Descrição |
| :--- | :--- |
| **Página Inicial** | A tela de *landing page* apresenta os principais benefícios do TrustPay: segurança, pagamentos instantâneos e suporte 24h. É o ponto de entrada para novos usuários. |
| ![Página Inicial](https://private-us-east-1.manuscdn.com/sessionFile/Wd0H7o6GraKKU8reKP7jr8/sandbox/WXgU6QQlTWRMeXgqrib36j-images_1762642233981_na1fn_L2hvbWUvdWJ1bnR1L1RydXN0UGF5L3NjcmVlbnNob3RzL3NjcmVlbi0wMQ.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvV2QwSDdvNkdyYUtLVThyZUtQN2pyOC9zYW5kYm94L1dYZ1U2UVFsVFdSTWVYZ3FyaWIzNmotaW1hZ2VzXzE3NjI2NDIyMzM5ODFfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwxUnlkWE4wVUdGNUwzTmpjbVZsYm5Ob2IzUnpMM05qY21WbGJpMHdNUS5wbmciLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=fNttfB5-PrtfNf2azIJnyieA-SyjsgyNRI1g5j4HGOyEyKuPvJ75uFQLoavwWXxN2XS3XY4RuBW8Bi-ZMCrFk4J0u7UXmJbNcwwHS-8qvAmhT6S3OBsq1goUfKn5gXxKnBspljvwdad~3iRRssfrfrzJBzcenB85UMoIyu9tPETLCOClOfk2JiQ2~grq-8rvt6lCc-~jkR7U-ebjXr1k-OhtExUsGbkwqBcEeSvLXu9P-h245JInMXz-6YA2a-dBwxZ9nArTBBqD~2duHHHTW2onUQA7853TWtXR7LEcBU-1-vYFdziJHwRYwt8TjW0phmrifwNYSRFzdLr5e~eHrg__) | |
| **Login** | Tela de autenticação unificada para ambos os perfis. Permite o acesso via e-mail/celular e senha, além da opção de criar uma nova conta. |
| ![Tela de Login](https://private-us-east-1.manuscdn.com/sessionFile/Wd0H7o6GraKKU8reKP7jr8/sandbox/WXgU6QQlTWRMeXgqrib36j-images_1762642233983_na1fn_L2hvbWUvdWJ1bnR1L1RydXN0UGF5L3NjcmVlbnNob3RzL3NjcmVlbi0wMg.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvV2QwSDdvNkdyYUtLVThyZUtQN2pyOC9zYW5kYm94L1dYZ1U2UVFsVFdSTWVYZ3FyaWIzNmotaW1hZ2VzXzE3NjI2NDIyMzM5ODNfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwxUnlkWE4wVUdGNUwzTmpjbVZsYm5Ob2IzUnpMM05qY21WbGJpMHdNZy5wbmciLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=tVUqttS5f4l66laIMg2P95RJLGRX~urU-3wClT-zATJA9Kvc9JYP1qxKK9~-dqZyxL~ASraHEwuG-8uLdmJFKLh3ST-CpD~pSrHSVpJfwRP18sk07a7e09m6db6kXISiypIVmBRF5F7cGOomjWTR~nMCBjMkA6khCkY0E69rkKvp36NV9jRfx~cJeYmBCilp76pLUQRwOmClY63CC5kqZtc7kjTDU3D9pd4NIruXRILC3EO9dX2wHje7E9ezFOTS~Mj8zZ4tZb37SeOnw8LudiivFtRFTbpN8uXDyY1VM1eNcDXvanMjsPc29mmm4jin5iotyKw1KIPORVyFBNDJ1w__) | |

### 2. Dashboard (Perfil)

| Tela | Perfil | Descrição |
| :--- | :--- | :--- |
| **Dashboard (Lojista)** | **Lojista** | Exibe o perfil da empresa (`OrtizPassos Ltda`), cartões salvos e um resumo das **Transações Recentes**. O menu lateral inclui a opção **Developer** (Desenvolvedor), exclusiva para lojistas. |
| ![Dashboard Lojista](https://private-us-east-1.manuscdn.com/sessionFile/Wd0H7o6GraKKU8reKP7jr8/sandbox/WXgU6QQlTWRMeXgqrib36j-images_1762642233985_na1fn_L2hvbWUvdWJ1bnR1L1RydXN0UGF5L3NjcmVlbnNob3RzL3NjcmVlbi0wMw.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvV2QwSDdvNkdyYUtLVThyZUtQN2pyOC9zYW5kYm94L1dYZ1U2UVFsVFdSTWVYZ3FyaWIzNmotaW1hZ2VzXzE3NjI2NDIyMzM5ODVfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwxUnlkWE4wVUdGNUwzTmpjbVZsYm5Ob2IzUnpMM05qY21WbGJpMHdNdy5wbmciLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=jA8UGHccFsWrAgKxbhYcEyqgj9CALsJ78c6WY4OpqoJtIQ2LHE3dSfWkBqnUdKtcwm7PStcEX8xcVhUTw2Be4FWq04gxkbVESf8KsMNHTeDLH7BwNN6y4fWNS1oMEQIx~Uc47cjezEZ9zVWLJ5TxgWNaFPKLNM9jI~BseSp~vtPkiRt-53LVOSx6PaJ2shwCr-pEji~o0aKlVi4KcjDqUfhbGb6t2L43hWa0nTP5G7In8NplRxqKsmlgmu4DfeF-VV7LNYkuFbWN2s3kEmOAfJD02-f~WTBW40-geIywB7EnYhQ3uOqhLP8CCAC97ncXIffEG4mLxD2mw54s~i4FkQ__) | |

### 3. Novo Pagamento

| Tela | Perfil | Descrição |
| :--- | :--- | :--- |
| **Novo Pagamento** | **Comum a ambos** | Formulário para iniciar uma nova transação. Requer o e-mail do destinatário, valor, método de pagamento (Cartão de Crédito) e opções de parcelamento. |
| ![Novo Pagamento](https://private-us-east-1.manuscdn.com/sessionFile/Wd0H7o6GraKKU8reKP7jr8/sandbox/WXgU6QQlTWRMeXgqrib36j-images_1762642233986_na1fn_L2hvbWUvdWJ1bnR1L1RydXN0UGF5L3NjcmVlbnNob3RzL3NjcmVlbi0wNA.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvV2QwSDdvNkdyYUtLVThyZUtQN2pyOC9zYW5kYm94L1dYZ1U2UVFsVFdSTWVYZ3FyaWIzNmotaW1hZ2VzXzE3NjI2NDIyMzM5ODZfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwxUnlkWE4wVUdGNUwzTmpjbVZsYm5Ob2IzUnpMM05qY21WbGJpMHdOQS5wbmciLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=dz-OKNsb-MP29aNZgGwvI1-bgYkSXVAX~VxN4xx3OyuDsiSb7O0xCh79L25UTJ9y4CeHFGqyxJaMqLxlaJghlfD31mh8lVRT0gaS3xcV30tYSM6zzZD94SS7gB8MawjbETr9fUS7AItDReRTWKpT0AzuUkO2pcPkIVGlwjSkjNOlmDvTyojSShcSry2aNStB~qxWu6JGnacCPE2CyxNuqK70qXTmYWvWG7-NP~oE4c-ZI5scZPVi7nEISI7~Xxx4sAXWJC-cqVaa0o82Y6YNnPal44db7efd8x84wVK~3qRooWHpQh8uVbFbr-SyXFQmji8mVUgFXkQTBTRa79QnXQ__) | |

### 4. Relatórios e Transações

| Tela | Perfil | Descrição |
| :--- | :--- | :--- |
| **Relatórios de Transações** | **Comum a ambos** | Permite a busca de transações por período. |
| ![Relatórios de Transações](https://private-us-east-1.manuscdn.com/sessionFile/Wd0H7o6GraKKU8reKP7jr8/sandbox/WXgU6QQlTWRMeXgqrib36j-images_1762642233988_na1fn_L2hvbWUvdWJ1bnR1L1RydXN0UGF5L3NjcmVlbnNob3RzL3NjcmVlbi0wNQ.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvV2QwSDdvNkdyYUtLVThyZUtQN2pyOC9zYW5kYm94L1dYZ1U2UVFsVFdSTWVYZ3FyaWIzNmotaW1hZ2VzXzE3NjI2NDIyMzM5ODhfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwxUnlkWE4wVUdGNUwzTmpjbVZsYm5Ob2IzUnpMM05qY21WbGJpMHdOUS5wbmciLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=bOBiU1jMyQrXGm4qMuG04wB~4WgfocrBXuIGZuHwjbLZzVLW6tbgACsGV5WmB166qPcYW5Wc2XgGW5AvT7vjeSpqW~GDfOxNwLLoGPBQuWGQeRNi3Jol10hH-0K0yJ8hWNiilEhuBitU720Mz2lPVLHXDOsZi-SiHDN-J~m0o1~CJ7shUhPxQyCr0kXsjmU~uFXEdwFwxkA7sDMgNZRane3R706Z6F2THgNkUd1HdLl7acitIcicx6jP-xhTzYcc-8iFGvGTzM9aSBGaD2VoV5FlzFoEPVuU7cbZbSglhVSqGJW01txzCKD2ZOZDVRY5GECw3DfqD~Xhk1FoDmc5Og__) | |
| **Transações** | **Comum a ambos** | Lista detalhada das transações, com filtros por Status, Método e Direção (Recebido/Pago). Inclui a opção de **Exportar PDF**. |
| ![Lista de Transações](https://private-us-east-1.manuscdn.com/sessionFile/Wd0H7o6GraKKU8reKP7jr8/sandbox/WXgU6QQlTWRMeXgqrib36j-images_1762642233997_na1fn_L2hvbWUvdWJ1bnR1L1RydXN0UGF5L3NjcmVlbnNob3RzL3NjcmVlbi0wNg.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvV2QwSDdvNkdyYUtLVThyZUtQN2pyOC9zYW5kYm94L1dYZ1U2UVFsVFdSTWVYZ3FyaWIzNmotaW1hZ2VzXzE3NjI2NDIyMzM5OTdfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwxUnlkWE4wVUdGNUwzTmpjbVZsYm5Ob2IzUnpMM05qY21WbGJpMHdOZy5wbmciLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=flYbM34FhMNG4XXHzYEkznuExRxyOnWuKUmqVVulTrGgbN5pgRqBcsBbTTXvHXbkoTJfmp2RfZRyIbKDYe9F0VPcGeOpKXo0PFV17ZuWXlKVwmnmHmrKoEW-62HJ5-UgDUdIbBlMf3TV8t7X65Scm0tV5r80OdKKjrOzWCQPetTYHXUSdeLot8DMB9M-6j~9YY3fr-vJdcqraDFO3ugYXmCIMqyQ3V4cdFI3KIgO3Fv4EIQekaFlNXxENXlf~BnT~JvYPxmb6JCzRXiROwz3RPQSeZ5QZn241bat6xeuzTKTFl5ABtmQietubybftDGAcDujBrsuTy~jTV0BX1Fgog__) | |

### 5. Carteira

| Tela | Perfil | Descrição |
| :--- | :--- | :--- |
| **Carteira** | **Comum a ambos** | Exibe o **Saldo Disponível** e o valor **A Receber (Pendentes)**. Inclui um gráfico de barras para visualização dos recebimentos mensais. |
| ![Carteira](https://private-us-east-1.manuscdn.com/sessionFile/Wd0H7o6GraKKU8reKP7jr8/sandbox/WXgU6QQlTWRMeXgqrib36j-images_1762642233999_na1fn_L2hvbWUvdWJ1bnR1L1RydXN0UGF5L3NjcmVlbnNob3RzL3NjcmVlbi0wNw.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvV2QwSDdvNkdyYUtLVThyZUtQN2pyOC9zYW5kYm94L1dYZ1U2UVFsVFdSTWVYZ3FyaWIzNmotaW1hZ2VzXzE3NjI2NDIyMzM5OTlfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwxUnlkWE4wVUdGNUwzTmpjbVZsYm5Ob2IzUnpMM05qY21WbGJpMHdOdy5wbmciLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=D00tHJBFhnMf907oSvH5qkSrurdZSBm-AK-04KEgcS1iDEiZdaSQh3u4bgj322AbraJTeV-dcIKa2lVWwreoGeO8YjDxovRFGwu37FkqIonzg4sMV4RJPwfCpXUr3m0HdWgJ8dCwhig2TYQcLYaNruS~6i9rPgydu~n7G5esbNo6ScXlAkaL~OYWwbXaSRI-FlTpyUNhlUC57G7c62T7JDeT80c6ibupnOxkdYHeGQNaH9Xei8JiqS6iYZ9lydAq~-KMjlSW1BMw3ljTHYW0OJfEIXONNnUcKqtv0B7s6PFDzK~BJB8biNrCEzgvm2Y1ojEhfEZFkLbmizstDSgFYg__) | |

### 6. Configurações da Conta

| Tela | Perfil | Descrição |
| :--- | :--- | :--- |
| **Configurações da Conta** | **Comum a ambos** | Tela para atualização dos dados cadastrais (Nome, Sobrenome, Email, Telefone). A aba "Configurações da sua loja TrustPay" sugere que o formulário pode se adaptar para incluir dados específicos de pessoa jurídica. |
| ![Configurações da Conta](https://private-us-east-1.manuscdn.com/sessionFile/Wd0H7o6GraKKU8reKP7jr8/sandbox/WXgU6QQlTWRMeXgqrib36j-images_1762642234000_na1fn_L2hvbWUvdWJ1bnR1L1RydXN0UGF5L3NjcmVlbnNob3RzL3NjcmVlbi0wOA.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvV2QwSDdvNkdyYUtLVThyZUtQN2pyOC9zYW5kYm94L1dYZ1U2UVFsVFdSTWVYZ3FyaWIzNmotaW1hZ2VzXzE3NjI2NDIyMzQwMDBfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwxUnlkWE4wVUdGNUwzTmpjbVZsYm5Ob2IzUnpMM05qY21WbGJpMHdPQS5wbmciLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=RymDbdWcYGiV98VVwK0rZ8pe1zMJxNzr4jXoqNsuVSv7dQpF2dRGl6MC6WC8If8eJxfRN0ZZnvKuPQNMwrytaGF5LShHyFW56b5WbWahoBA520WPZVfziXO3riX1lRsxiI2uSRVAyjcExmF8LqxtTFp2PalYqzTz-Fj2CtxpP4WK~AkLxnNr2lt8xjOk1H4amildhKoTxskK0G-UqDEa-y4BfUwBt3CIhS8ypBwr24K0p1h8tWFW0USfVvLFh0hDVCc-nbDG4MzDHMDEoooNJI2kGcM~MadbAXAVZOK32yjQGARlY2w~VU~ga64WIZg2HkFpNzplXRFgpV5QgkxExg__) | |

### 7. Área do Desenvolvedor (Exclusivo Lojista)

| Tela | Perfil | Descrição |
| :--- | :--- | :--- |
| **Developer** | **Lojista** | Área crucial para integração. Contém a documentação de como usar a **API TrustPay**, os **Endpoints essenciais** e uma ferramenta para **Visualizar Chaves Merchant** e gerar *Headers* e *Payloads* de teste. |
| ![Área do Desenvolvedor](https://private-us-east-1.manuscdn.com/sessionFile/Wd0H7o6GraKKU8reKP7jr8/sandbox/WXgU6QQlTWRMeXgqrib36j-images_1762642234001_na1fn_L2hvbWUvdWJ1bnR1L1RydXN0UGF5L3NjcmVlbnNob3RzL3NjcmVlbi0wOQ.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvV2QwSDdvNkdyYUtLVThyZUtQN2pyOC9zYW5kYm94L1dYZ1U2UVFsVFdSTWVYZ3FyaWIzNmotaW1hZ2VzXzE3NjI2NDIyMzQwMDFfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwxUnlkWE4wVUdGNUwzTmpjbVZsYm5Ob2IzUnpMM05qY21WbGJpMHdPUS5wbmciLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=nAefz33HvH6fbp1GZ7hO-OXsV4qycEUXbP3g2bY0F1RXIYzHsFu7P8prCee75sttkTIaAXKUOgdg6AnDUWHECXjpXbAdERyEzX48i3ms~InG29QanizN8X41xeKakBDTSMu4Vw6EWX9Jv-mqJ-o4QNtCk1o0GfAs80k9dFHysW4BEbHWEpkuTY7yzgz2xnP6E65Dq7adyGRFZwgOUTahNfdgkPdgCrLjmQWmITRbFADkvGG3ZBB~ubCU1~3uypxI-ENw125p-GPStru00jxqkEkIsL~xYJ2-GtfgRQh0X7bvYGkZhSCEjgo6FGgb0RVos0mgsqeeccCDRjwRC3sm6w__) | |

***

