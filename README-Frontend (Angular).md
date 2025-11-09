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
| ![Página Inicial](https://private-us-east-1.manuscdn.com/sessionFile/Wd0H7o6GraKKU8reKP7jr8/sandbox/3UfMiPjl3H93UzMp2KCEM3-images_1762646885370_na1fn_L2hvbWUvdWJ1bnR1L1RydXN0UGF5L3NjcmVlbnNob3RzL3NjcmVlbi0wMQ.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvV2QwSDdvNkdyYUtLVThyZUtQN2pyOC9zYW5kYm94LzNVZk1pUGpsM0g5M1V6TXAyS0NFTTMtaW1hZ2VzXzE3NjI2NDY4ODUzNzBfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwxUnlkWE4wVUdGNUwzTmpjbVZsYm5Ob2IzUnpMM05qY21WbGJpMHdNUS5wbmciLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=AURAR2fi2vW2OQiu8f6TjvOM9yCy7kQ3ZuDsSRSQIH32wjveANDhbqh2rDI1rmzNqJMkAgZ1tXROPk-7H3oM93azma8vUj4QYIhMf6OHF7lzTsaXh9U7Cx-Ige3I8f8bn8Ofe44kOq~tDI5d05lP4nARd9Yc5qK~vBBXyDBbd~n8eCuk~SrxydFB3WlHGCtHd-Dg91qLF62yqQRKXOf5vnAWfCvK3N-cRmdcsa7rrMNSf~DrHM8yBmTArOGA3rwVLRbtiZhY6dMrMoRQ~w8tpub5kcDp5prDUZ7Eq0jT7WiMATpaskwmH-QzKT9OV047DCP5Lkzzwk-tXoKPnkamCQ__) | |
| **Login** | Tela de autenticação unificada para ambos os perfis. Permite o acesso via e-mail/celular e senha, além da opção de criar uma nova conta. |
| ![Tela de Login](https://private-us-east-1.manuscdn.com/sessionFile/Wd0H7o6GraKKU8reKP7jr8/sandbox/3UfMiPjl3H93UzMp2KCEM3-images_1762646885376_na1fn_L2hvbWUvdWJ1bnR1L1RydXN0UGF5L3NjcmVlbnNob3RzL3NjcmVlbi0wMg.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvV2QwSDdvNkdyYUtLVThyZUtQN2pyOC9zYW5kYm94LzNVZk1pUGpsM0g5M1V6TXAyS0NFTTMtaW1hZ2VzXzE3NjI2NDY4ODUzNzZfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwxUnlkWE4wVUdGNUwzTmpjbVZsYm5Ob2IzUnpMM05qY21WbGJpMHdNZy5wbmciLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=uXY2idB4BZcQaJ6ELt7hGq8OHDQj0aKR6PdI8eOsXbnkjgr-BC7-l7unmO6SmViV0JoMAZQLtSWxqaCamNKNelsCvys5O9xkEoFsDP2Euqb655kEN0w~VmfjzUpdIxBAZxx7L6QS46GdgPT-c0Tw70q~i9p0afPrMnlWfLRP8wA7yIECJkM8QrloSWenCGmnlm7LcrRqwTL8fRpggFDZ17CFV7bkWOkBiAvKmfX-Ty3C7aCJ0Rbf73BCMg7dPwNPuvIp40RBgBgWZ~5PXWLxv5aiXrhYMsonlf~viwwYYaO7DZgKy75F-NVJeDLZq40WFWVh55OCiyF8jPS4ujwBoQ__) | |

### 2. Dashboard (Perfil)

| Tela | Perfil | Descrição |
| :--- | :--- | :--- |
| **Dashboard (Lojista)** | **Lojista** | Exibe o perfil da empresa (`OrtizPassos Ltda`), cartões salvos e um resumo das **Transações Recentes**. O menu lateral inclui a opção **Developer** (Desenvolvedor), exclusiva para lojistas. |
| ![Dashboard Lojista](https://private-us-east-1.manuscdn.com/sessionFile/Wd0H7o6GraKKU8reKP7jr8/sandbox/3UfMiPjl3H93UzMp2KCEM3-images_1762646885378_na1fn_L2hvbWUvdWJ1bnR1L1RydXN0UGF5L3NjcmVlbnNob3RzL3NjcmVlbi0wMw.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvV2QwSDdvNkdyYUtLVThyZUtQN2pyOC9zYW5kYm94LzNVZk1pUGpsM0g5M1V6TXAyS0NFTTMtaW1hZ2VzXzE3NjI2NDY4ODUzNzhfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwxUnlkWE4wVUdGNUwzTmpjbVZsYm5Ob2IzUnpMM05qY21WbGJpMHdNdy5wbmciLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=uAsMhWpVRn8HSiIAKyUxHp86XPNjiIiwAdSzweoNn4mg57CMDtrwLf~DtMiFflZFrvxePFnlmF-uqj1E6XLiWRA-KDBw-m0C4IBh2I~T7u04xKH-6dhAFwzsOcuQHpyVqo9sZ8826RcZVFb4sYFVntflB1wM~I7kutCWeRSzrrTzNVseE0-sJpz5DUTes2iFfaXL1Gzxk7YI8l2Ee~wAhKIWnE7K98INcVzxbi5n-JKEBGUrHS2kLnJoqkf2BpTImpL8wfVkHnH0ui~aIoIpq-Dfdcs3zN1VeDq47zBOFFF9GSTuOcVvVYHxT28rIRCwnYqSQtXHJ5nef4D9OBrP9A__) | |

### 3. Novo Pagamento

| Tela | Perfil | Descrição |
| :--- | :--- | :--- |
| **Novo Pagamento** | **Comum a ambos** | Formulário para iniciar uma nova transação. Requer o e-mail do destinatário, valor, método de pagamento (Cartão de Crédito) e opções de parcelamento. |
| ![Novo Pagamento](https://private-us-east-1.manuscdn.com/sessionFile/Wd0H7o6GraKKU8reKP7jr8/sandbox/3UfMiPjl3H93UzMp2KCEM3-images_1762646885379_na1fn_L2hvbWUvdWJ1bnR1L1RydXN0UGF5L3NjcmVlbnNob3RzL3NjcmVlbi0wNA.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvV2QwSDdvNkdyYUtLVThyZUtQN2pyOC9zYW5kYm94LzNVZk1pUGpsM0g5M1V6TXAyS0NFTTMtaW1hZ2VzXzE3NjI2NDY4ODUzNzlfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwxUnlkWE4wVUdGNUwzTmpjbVZsYm5Ob2IzUnpMM05qY21WbGJpMHdOQS5wbmciLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=T5OfgOjkNvz0ZLdc9D3v6FstReac7MpJiktnne~sqYt3wqqja-XRDwEvjH-cwcR9X~eoKwOzehryvQ~00H4~2LnECbCK7LG8zHVN2MjNuLPKeHY2~mpxK9FzxZMc2VYy6UhBfx~fBg6V~~3lvzpaD~KLWyQVeMLvmfY06fwZ-5em5uwciVjxGx1TsplD4Zfo6tpQvpPhaKmC0IZkGM49LVt9kVwQ0C~OOvKn2nWfjUATy~MQL37DlSQ3xNmI~H0zHtJdnOD573AZxMr8KWfT7v4xOQw5Oig5-Ebryt-oskvaaINUrF-aj23fStHLE3Pfeyxtc-xsNVYMesav9YGLew__) | |

### 4. Relatórios e Transações

| Tela | Perfil | Descrição |
| :--- | :--- | :--- |
| **Relatórios de Transações** | **Comum a ambos** | Permite a busca de transações por período. |
| ![Relatórios de Transações](https://private-us-east-1.manuscdn.com/sessionFile/Wd0H7o6GraKKU8reKP7jr8/sandbox/3UfMiPjl3H93UzMp2KCEM3-images_1762646885380_na1fn_L2hvbWUvdWJ1bnR1L1RydXN0UGF5L3NjcmVlbnNob3RzL3NjcmVlbi0wNQ.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvV2QwSDdvNkdyYUtLVThyZUtQN2pyOC9zYW5kYm94LzNVZk1pUGpsM0g5M1V6TXAyS0NFTTMtaW1hZ2VzXzE3NjI2NDY4ODUzODBfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwxUnlkWE4wVUdGNUwzTmpjbVZsYm5Ob2IzUnpMM05qY21WbGJpMHdOUS5wbmciLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=JE784VU7LUsDmbivRdwnItOxOgm4NQUMVU3AT23ExuwHNPne8KwvP0bz6iMbmnSFTWC3N2r0uUWloVKczTnt7oygUKQ-seMxAmr3QYtun2EpwGFtJTRg044Elz40plc-qw5q-MY0~CatbLrHdR~7-9t67m1Iv1wjreyoZaQal1YVaM3Oqw37N5~Hl8ovwWJF5n2NVAfroZZTemOj7tvmFNMiclVVfbdgs~XCJ6hUhdQ-Hm7trINSF0VdGeUDgX7cziirJObHayrCwZ6N2EHaCHxEwWadiYA5CMjMQphssB6GtOKHEKejyOEpPIRNYBUA9TcYYb7KdU-eQZMRao8SfQ__) | |
| **Transações** | **Comum a ambos** | Lista detalhada das transações, com filtros por Status, Método e Direção (Recebido/Pago). Inclui a opção de **Exportar PDF**. |
| ![Lista de Transações](https://private-us-east-1.manuscdn.com/sessionFile/Wd0H7o6GraKKU8reKP7jr8/sandbox/3UfMiPjl3H93UzMp2KCEM3-images_1762646885381_na1fn_L2hvbWUvdWJ1bnR1L1RydXN0UGF5L3NjcmVlbnNob3RzL3NjcmVlbi0wNg.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvV2QwSDdvNkdyYUtLVThyZUtQN2pyOC9zYW5kYm94LzNVZk1pUGpsM0g5M1V6TXAyS0NFTTMtaW1hZ2VzXzE3NjI2NDY4ODUzODFfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwxUnlkWE4wVUdGNUwzTmpjbVZsYm5Ob2IzUnpMM05qY21WbGJpMHdOZy5wbmciLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=jmfTriPiS3gtfJ6PpTD2Pauw5J~EWKiLN9AUs8HFDmBFflL2rICW6-CUlV94YvyIvxCm-Kew6pIxlYZtZt3uvrqktVCsCB2fwerv3azzDiWuhMQl3Q6rjt1pNmscfF3J4EG49tvMe0-sWE0HCAE70t3O2UZW7l5P8H4zakNpFKNoCbWdHnuh~ykeeuWR3Jqne65beTKDGHYyuATZ8ZVrNqmET5zL0IW35J~YxH5dTXEPMob36GYf2K3Q-jE75x9ujJZ2cqpMNJ2q4bZt7PM1DI~eJrMR1Z~bQcG56IvTPng2tc0X2UCV3z~PXCg6KVWRHT7agT5fS5zD5TbHsm9MXw__) | |

### 5. Carteira

| Tela | Perfil | Descrição |
| :--- | :--- | :--- |
| **Carteira** | **Comum a ambos** | Exibe o **Saldo Disponível** e o valor **A Receber (Pendentes)**. Inclui um gráfico de barras para visualização dos recebimentos mensais. |
| ![Carteira](https://private-us-east-1.manuscdn.com/sessionFile/Wd0H7o6GraKKU8reKP7jr8/sandbox/3UfMiPjl3H93UzMp2KCEM3-images_1762646885381_na1fn_L2hvbWUvdWJ1bnR1L1RydXN0UGF5L3NjcmVlbnNob3RzL3NjcmVlbi0wNw.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvV2QwSDdvNkdyYUtLVThyZUtQN2pyOC9zYW5kYm94LzNVZk1pUGpsM0g5M1V6TXAyS0NFTTMtaW1hZ2VzXzE3NjI2NDY4ODUzODFfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwxUnlkWE4wVUdGNUwzTmpjbVZsYm5Ob2IzUnpMM05qY21WbGJpMHdOdy5wbmciLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=XA54c12X-ybJkPCkYLPB23i8wX~Qvt3h-sMls5MBUhuVhgqN-8n754Gkbo~i401hiHyQQcaKwIJWNA1NRRlLBWACYw2i5G~tLaYO-egq9lgsRrXNtMauwe0ZzCG4n4LtKdrX06VIrNsYStikjKrZwoa61aCwWvuiJcpA0ezG0AJLyTV3gmxNGTpNH7oihCZh1IiV6iP0IpiYeOPsoEC8X0VRAPAaACJHvyDILY8HUcuh9DMsasvoH1e7et~Mh8mMqsIifwgXGfEf7FVh~QdbSNlEDDwGTKQbpsf4i8X6YFRr~HLSiIQs6VUcoQhOngdNNt6d-krY~FELoMX7EMChrA__) | |

### 6. Configurações da Conta

| Tela | Perfil | Descrição |
| :--- | :--- | :--- |
| **Configurações da Conta** | **Comum a ambos** | Tela para atualização dos dados cadastrais (Nome, Sobrenome, Email, Telefone). A aba "Configurações da sua loja TrustPay" sugere que o formulário pode se adaptar para incluir dados específicos de pessoa jurídica. |
| ![Configurações da Conta](https://private-us-east-1.manuscdn.com/sessionFile/Wd0H7o6GraKKU8reKP7jr8/sandbox/3UfMiPjl3H93UzMp2KCEM3-images_1762646885382_na1fn_L2hvbWUvdWJ1bnR1L1RydXN0UGF5L3NjcmVlbnNob3RzL3NjcmVlbi0wOA.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvV2QwSDdvNkdyYUtLVThyZUtQN2pyOC9zYW5kYm94LzNVZk1pUGpsM0g5M1V6TXAyS0NFTTMtaW1hZ2VzXzE3NjI2NDY4ODUzODJfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwxUnlkWE4wVUdGNUwzTmpjbVZsYm5Ob2IzUnpMM05qY21WbGJpMHdPQS5wbmciLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=bMuPVNLMbrv5TDfLG94wKlg715hiDfrHK~2qUZ5dxXXQiLDCJeEuGBsIuahv~tEWHmK2COXXljx0VlNLfoKrR97-u1hl4xi2w2Z9hDbG5KNsAWx9TOaOvHhPna7tDs~ZwxLBNXZy-JytKY-uwKNcW3lBjXrpkaUXM6w3X04Zlqz3xCw-D2J5tQJoJycGUjtsjFSm2st2I4pFFAHhseVlgpcIhOu48tLfHHI1fw5Y4tc9OkoGIp0Q04oMkeQ0jSivY88LPLYqXp3chiEthQhXsym8w1i3LEFSKMTeBni5pw3XJmqPcX6KtIF-3Mwb~AJbcQt3-J67yljv21Uv9ex--A__) | |

### 7. Área do Desenvolvedor (Exclusivo Lojista)

| Tela | Perfil | Descrição |
| :--- | :--- | :--- |
| **Developer** | **Lojista** | Área crucial para integração. Contém a documentação de como usar a **API TrustPay**, os **Endpoints essenciais** e uma ferramenta para **Visualizar Chaves Merchant** e gerar *Headers* e *Payloads* de teste. |
| ![Área do Desenvolvedor](https://private-us-east-1.manuscdn.com/sessionFile/Wd0H7o6GraKKU8reKP7jr8/sandbox/3UfMiPjl3H93UzMp2KCEM3-images_1762646885383_na1fn_L2hvbWUvdWJ1bnR1L1RydXN0UGF5L3NjcmVlbnNob3RzL3NjcmVlbi0wOQ.png?Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvV2QwSDdvNkdyYUtLVThyZUtQN2pyOC9zYW5kYm94LzNVZk1pUGpsM0g5M1V6TXAyS0NFTTMtaW1hZ2VzXzE3NjI2NDY4ODUzODNfbmExZm5fTDJodmJXVXZkV0oxYm5SMUwxUnlkWE4wVUdGNUwzTmpjbVZsYm5Ob2IzUnpMM05qY21WbGJpMHdPUS5wbmciLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=ZgWZAsnor406mKGRGjihN9JFpPU0Y6UcwdRTrdlbC6YuCwutfM1N7-KsU1v2ns3SnhHJl4liI47fsj9BV-om5G97Idli8vf5DoC5ZAC6d46ESzcqCEVMHweGvYiw2fFt5sIpqrqPoemInxLfYeYFO~Z3FuqbT5rirJl4yAvYTsLv~~NNmdsnIVOuh3aBano3~bwa1vgilv8Hw-F44gBnfpdyd1qyTcBmRkCPPtKSUh84K4L8Jf7bZKYic9jfOsbA75ALayRR-kj~tYFCMUatt3o2KXPDWCs~YRS5dfsw7Jc7ox-xrL529UsHk66c1KwwrAYVovkIMxrHR7COgR0Ofg__) | |

***

*Este README foi gerado automaticamente por Manus AI.*

## 🗓️ Planejamento do Projeto (Gráfico de Gantt)

O planejamento a seguir é uma proposta de divisão do projeto em Sprints, baseada nas funcionalidades identificadas no frontend e backend.

```mermaid
gantt
    title Planejamento de Sprints - TrustPay
    dateFormat  YYYY-MM-DD
    section Sprint 1: Estrutura e Autenticação (02/10 - 11/10)
    Configuração Inicial: 2025-10-02, 2d
    Desenvolvimento da Landing Page: 2025-10-04, 2d
    API de Autenticação (Backend): 2025-10-02, 5d
    Tela de Login/Cadastro (Frontend): 2025-10-06, 5d

    section Sprint 2: Transações e Pagamentos (12/10 - 22/10)
    API de Pagamentos (Backend): 2025-10-12, 6d
    Tela de Novo Pagamento (Frontend): 2025-10-18, 4d
    Tela de Transações (Frontend): 2025-10-22, 3d

    section Sprint 3: Carteira e Relatórios (23/10 - 31/10)
    API de Carteira (Backend): 2025-10-23, 4d
    Tela de Carteira (Frontend): 2025-10-27, 3d
    API de Relatórios (Backend): 2025-10-27, 3d
    Tela de Relatórios (Frontend): 2025-10-30, 3d

    section Sprint 4: Integração Lojista e Finalização (01/11 - 06/11)
    API Merchant (Backend): 2025-11-01, 3d
    Tela Desenvolvedor (Frontend): 2025-11-04, 2d
    Documentação e Testes Finais: 2025-11-06, 1d
```

***


