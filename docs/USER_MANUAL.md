# Manual do Usuário - ROLLS-IN Restaurant Manager

Bem-vindo ao **ROLLS-IN**, a solução definitiva para gestão de excelência em restaurantes. Este manual orientará você por todas as funcionalidades do sistema, desde a configuração inicial até a análise financeira avançada.

---

## 1. Primeiros Passos: Onboarding e Configuração

### 1.1 Cadastro do Restaurante
Ao acessar o sistema pela primeira vez, utilize a opção **"Registrar Restaurante"**.
- Preencha os dados básicos da sua unidade (Nome, CNPJ, Contato).
- Configure a moeda e os parâmetros fiscais (Simples Nacional, taxas de cartão, etc.) na área de configurações para que os cálculos de CMV e lucro sejam precisos.

### 1.2 Cadastro de Funcionários e Perfis de Acesso
A gestão de equipe é realizada em **Configurações > Equipe**. Cada funcionário deve ser vinculado a um dos quatro perfis operacionais:
- **Administrador:** Acesso total ao sistema, relatórios financeiros e configurações.
- **Chefe:** Focado na cozinha, fichas técnicas, produção e checklists de pré-preparo (MEP).
- **Apoio:** Responsável por tarefas operacionais, limpeza e organização (acesso a checklists específicos).
- **Serviço:** Focado em atendimento, abertura de mesas e lançamento de pedidos.

---

## 2. Dashboard Dinâmico
O Dashboard é a sua central de comando e se adapta automaticamente ao seu perfil:
- **Visão Admin:** Gráficos de vendas, alertas de estoque crítico e resumo financeiro do dia.
- **Visão Cozinha (Chefe/Apoio):** Próximas produções, checklists de abertura/fechamento e alertas de validade.
- **Visão Salão (Serviço):** Status das mesas e pedidos em andamento.

---

## 3. Gestão de Estoque (Insumos)
Módulo localizado em **Estoque (Insumos)**.

### 3.1 Cadastro de Insumos
Adicione seus ingredientes informando:
- **Nome e Categoria:** (Hortifruti, Carnes, Laticínios, etc.).
- **Unidade de Medida:** Escolha entre as opções padrão (kg, un, L, g, ml) ou crie uma **unidade personalizada** (ex: "maço", "fardo").
- **Estoque Mínimo:** Defina para receber alertas quando o item estiver acabando.
- **Validade:** O sistema monitora a data de validade e sinaliza itens próximos do vencimento.

### 3.2 Lista de Compras Inteligente
Acesse a aba **Lista de Compras** para:
- Adicionar itens manualmente.
- Usar a **Sugestão Inteligente**: O sistema identifica automaticamente todos os itens com estoque abaixo do mínimo e os adiciona à lista com um clique.

---

## 4. Engenharia de Cardápio e Fichas Técnicas
Módulo localizado em **Fichas Técnicas**.

### 4.1 Criação de Receitas
Vincule os insumos do estoque aos seus pratos. O ROLLS-IN calcula automaticamente o **CMV (Custo de Mercadoria Vendida)** teórico com base nos preços de compra atualizados.

### 4.2 Precificação Inteligente (IA)
Utilize nosso assistente de IA para definir o preço de venda ideal. A ferramenta considera:
- Custos de insumos.
- Taxas de plataformas (Delivery).
- Taxas de cartão.
- Impostos.
- Margem de lucro desejada.

---

## 5. Operação e Vendas
Módulo localizado em **Operação (Pedidos)**.

### 5.1 Lançamento de Pedidos
A equipe de serviço pode gerenciar mesas e pedidos de forma intuitiva.
- **Integração com Estoque:** Assim que um pedido é finalizado, o sistema realiza a baixa automática dos ingredientes no estoque, baseando-se na ficha técnica do prato vendido.

### 5.2 Food Waste (Perdas)
Registre desperdícios ou erros de produção em **Food Waste** para manter o estoque real sempre sincronizado com o sistema.

---

## 6. Controle Operacional (Checklists e Produção)
Para garantir o padrão de qualidade:
- **Checklists:** Listas de tarefas diárias para abertura, fechamento e limpeza.
- **Gestão de Produção:** Planejamento de pré-preparos semanais e diários.
- **Escalas:** Visualização de horários e banco de horas da equipe.

---

## 7. Relatórios de Performance
Acompanhe a saúde do seu negócio em **Relatórios**:
- **Lucratividade Real:** Relatórios que mostram o lucro líquido descontando todos os custos variáveis.
- **Curva ABC de Insumos:** Identifique onde você gasta mais.
- **Giro de Estoque:** Saiba quais produtos saem mais rápido e evite obsolescência.

---

## Dicas de Segurança (Android 16 Readiness)
O ROLLS-IN já está preparado para os novos padrões de segurança. 
- Utilize o app via navegador mobile ou instale como PWA para melhor performance.
- As permissões de câmera (para scan de notas/barcodes) são solicitadas apenas quando necessário.

---
*ROLLS-IN - Tecnologia a serviço da gastronomia.*
