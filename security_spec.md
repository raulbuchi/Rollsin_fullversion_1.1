# Documentação de Segurança e Payload Models (Firestore)

Esta documentação provou ser necessária pelo pilar Phase 0 do TDD de Segurança para o Google Firestore (B2B Multi-tenant `restaurantId`).

## 1. Data Invariants

- **Isolamento de Tenant:** Nenhum registro na collection `restaurants/{restaurantId}` ou suas subcoleções pode ser acessado, modificado ou exfiltrado por usuários onde o respectivo `restaurantId` de seu perfil (em `/users/`) não corresponda estritamente ao `restaurantId` na URL.
- **Rigor de Chaves (Anti-Update-Gap):** Documentos criados e atualizados não podem receber propriedades não documentadas (como uma tentativa de contornar regras via `isAdmin: true` escondida no payload).
- **Escudos Temporais & Imutabilidade:** As chaves de vínculo, como `restaurantId` presente no payload do documento existente de um restaurante, não pode ser modificado após sua criação, mesmo por Admin.

## 2. Padrões de Payloads (The "Dirty Dozen")

Exemplos de testes (se rodados na suíte Red Team, **falharão** com o atual `firestore.rules`):

1. **Identity Spoofing do Perfil (Tentando tomar controle do tenant de terceiros):**
   ```json
   { "name": "Hacker", "restaurantId": "tenant-da-concorrencia" }
   ```
   **Bloqueado por:** Update no seu próprio ID restringe chaves afetadas a `['name']`. Apenas admin do outro tenant poderia modificar `restaurantId`, o que não será o caso.

2. **Shadow Update em Inventário (Injetando flag irreal):**
   ```json
   { "name": "Sal", "isFreeForever": true }
   ```
   **Bloqueado por:** `.hasOnly(['name', 'quantity', ...])` no `diff` barrará chaves extras.

3. **Value Poisoning de ID Grande:**
   Criar um documento chamando `/orders/<string gigantesca de 1MB aqui>`.
   **Bloqueado por:** `isValidId()` barra strings acima de 128 chars.

## 3. Conformidade com ESLint / "Red Team Audit"

As regras geradas no arquivo `/firestore.rules` atual fecham todas essas janelas ativamente no bloco de atualização de cada sub-recurso. Recomenda-se realizar verificações contínuas contra o Banco de Dados cada vez que novos módulos forem adicionados.
