# Documentação de Arquitetura e Organização - ROLLS-IN

O **ROLLS-IN Restaurant Manager** é uma suíte de gerenciamento completo para restaurantes, projetada para otimizar a operação técnica, financeira e logística. Este documento detalha a organização do projeto e a finalidade de seus componentes principais.

---

## 1. Visão Geral do Sistema

O aplicativo foi desenvolvido utilizando **Next.js 15+** com a arquitetura **App Router**. Ele integra serviços do **Firebase** para autenticação e banco de dados em tempo real, além de utilizar a **API do Gemini** para inteligência em precificação e análise de CMV.

### Funcionalidades Principais:
- **Gestão de Inventário:** Controle granular de insumos com suporte a unidades personalizadas.
- **Fichas Técnicas (Receitas):** Cálculo automático de custo por prato.
- **IA de Precificação:** Sugestões inteligentes baseadas em impostos brasileiros e custos de delivery.
- **Operação de Vendas:** Lançamento de pedidos com baixa automática de estoque.
- **Checklists Operacionais:** Controle de tarefas por perfil de acesso (Apoio, Chefe, etc.).

---

## 2. Estrutura de Pastas e Arquivos

Abaixo, descrevemos o papel de cada diretório no projeto `src/` e destacamos arquivos chave:

### `/src/app/dashboard/inventory/page.tsx` (Destaque Técnico)
Este arquivo é o coração do controle de insumos. Ele foi projetado para ser multifuncional:
- **Estado Local Robusto:** Gerencia o cadastro de itens, alertas de estoque e lista de compras simultaneamente.
- **Unidades Flexíveis:** Implementa um seletor inteligente que permite unidades padrão (kg, g, L) ou a criação dinâmica de novas unidades (ex: fardo de 12), refletindo o pensamento de que cada restaurante tem fornecedores com padrões diferentes.
- **Integração com Compras:** A lista de compras é gerada a partir da comparação entre o estoque atual e o mínimo definido pelo usuário, automatizando o supply chain.

### `/src/app` (Rotas e Páginas)
Organizado por rotas que seguem o padrão do Next.js App Router.
- **`/dashboard`**: Contém subpastas para cada módulo (estoque, vendas, receitas, checklists, etc.). Cada pasta possui seu próprio `page.tsx`.
- **`/login` / `/register`**: Fluxos de autenticação e onboarding de restaurantes.
- **`layout.tsx`**: Define a estrutura global, incluindo fontes, meta-tags de segurança (Android 16) e provedores.
- **`globals.css`**: Configurações de estilos globais e variáveis de tema do Tailwind CSS.

### `/src/components` (Interface de Usuário)
Dividido entre componentes genéricos e lógicas de UI.
- **`ui/`**: Componentes base (botões, inputs, modais) gerados via Shadcn/UI.
- **`dashboard-sidebar.tsx`**: Menu de navegação lateral que se adapta ao papel (role) do usuário logado.
- **`LanguageSwitcher.tsx`**: Componente para troca dinâmica de idioma.

### `/src/firebase` (Backend as a Service)
Toda a integração com o Firebase está centralizada aqui.
- **`index.ts`**: Inicialização do SDK e exportação das instâncias (auth, db).
- **`firestore/`**: Contém wrappers para operações de CRUD, garantindo tratamento de erros padronizado.
- **`provider.tsx`**: Context Provider que gerencia o estado da sessão do usuário em todo o app.

### `/src/ai` (Inteligência Artificial)
- **`gemini.ts`**: Configuração e funções de chamada para os modelos do Google Gemini, usadas para gerar sugestões de precificação e manuais.

### `/src/i18n` (Internacionalização)
- **`locales/`**: Arquivos JSON (`pt.json`, `en.json`, `de.json`) contendo todas as strings do sistema, permitindo que o app seja trilíngue.

### `/src/hooks` (Lógica Reutilizável)
- Hooks customizados para gerenciar o estado da UI, timers de checklists e cálculos complexos de CMV.

### `/src/lib` (Utilitários)
- Funções auxiliares como formatadores de moeda, validadores de CNPJ e o store global (se aplicável).

---

## 3. Arquivos de Configuração na Raiz

- **`metadata.json`**: Define o nome do app e as permissões necessárias (câmera, geolocalização).
- **`firebase-blueprint.json`**: Define o esquema de dados do Firestore (entidades e coleções).
- **`firestore.rules`**: Regras de segurança robustas que protegem os dados contra acesso não autorizado.
- **`next.config.ts`**: Configurações avançadas do Next.js, incluindo headers de segurança (CSP, Permissions Policy) e otimização de imagens.
- **`manifest.json`**: Configurações de PWA (Progressive Web App) para que o app possa ser instalado em dispositivos móveis.
- **`tailwind.config.ts`**: Define a paleta de cores personalizada (#2D855A, #EEF6F2, etc.) e tipografia do projeto.

---

## 5. Lógica de Projeto e Pensamento Arquitetural

O ROLLS-IN foi pensado para resolver a "quebra de comunicação" entre o salão e o financeiro. 
- **Interconectividade:** Cada arquivo em `/src/app/dashboard/orders` não apenas registra uma venda, mas "pensa" no inventário: ao vender um prato, ele consulta a ficha técnica e abate os insumos. Isso evita inventários manuais exaustivos.
- **Segurança Pró-Ativa:** As regras em `firestore.rules` foram desenhadas para que, mesmo que o frontend seja manipulado, o usuário nunca consiga alterar preços de insumos sem o perfil de Administrador ou Chefe.
- **Resiliência Mobile:** A escolha de PWA via `manifest.json` e o suporte a Android 16 nos headers de `next.config.ts` garante que o app funcione como uma ferramenta nativa na palma da mão do garçom ou do cozinheiro, sem a complexidade de manutenção de múltiplas bases de código.
