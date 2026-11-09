# Playbook de Deploy e Replicação no Google Cloud Run & Firebase
**Padrão Oficial de Engenharia — Ecossistema Semântico**

Este documento consolida a arquitetura, todas as lições aprendidas, scripts automatizados e o passo a passo exato para **replicar esta esteira de deploy em qualquer outro projeto presente ou futuro**.

---

## 1. Visão Geral da Arquitetura

```
+---------------------------------------------------------------------------------+
|                                 USUÁRIO / CLIENTE                               |
+---------------------------------------------------------------------------------+
             |                                                  |
             | HTTPS                                            | OAuth 2.0 Popup
             v                                                  v
+------------------------------------+         +----------------------------------+
|      Google Cloud Run Service      |         |      Firebase Authentication     |
|   (Container Node.js 20 / Vite)    |         |   (Google Identity Platform)     |
|  - Porta dinâmica: $PORT (8080)    |         |  - Projeto: blogsemantico-...    |
|  - 2 vCPUs, 2 GiB RAM, Auto-scale  |         |  - Domínios Autorizados no API   |
+------------------------------------+         +----------------------------------+
             |                                                  |
             +--------------------+   JWT Token                 |
                                  |   Verificação               |
                                  v                             v
                        +---------------------------------------------+
                        |               Google Firestore              |
                        |      (Perfis de Usuários, RBAC & Quotas)    |
                        +---------------------------------------------+
```

---

## 2. As 4 Armadilhas Críticas Resolvidas (Lições Aprendidas)

### 🚨 Armadilha 1: Porta Fixa no Express (`const PORT = 3000`)
- **Problema:** O Cloud Run atribui uma porta dinâmica via variável de ambiente `PORT` (usualmente `8080`). Se o servidor Express rodar fixo em `3000`, o proxy do Google não recebe resposta e a revisão falha com timeout.
- **Solução Padronizada:**
  ```typescript
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
  });
  ```

---

### 🚨 Armadilha 2: `PERMISSION_DENIED` na Service Account do Cloud Build
- **Problema:** Em novos projetos GCP, a conta de serviço padrão do Compute Engine (`<PROJECT_NUMBER>-compute@developer.gserviceaccount.com`) nasce sem permissão de leitura e administração no bucket temporário de fontes (`run-sources-*`) que o Cloud Run cria.
- **Solução Padronizada:** O script [`deploy_cloud_run.sh`](./deploy_cloud_run.sh) executa automaticamente antes do deploy:
  ```bash
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="roles/storage.admin" --condition=None
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="roles/storage.objectViewer" --condition=None
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="roles/logging.logWriter" --condition=None
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="roles/artifactregistry.writer" --condition=None
  ```

---

### 🚨 Armadilha 3: Erro `auth/unauthorized-domain` no Firebase Auth
- **Problema:** Ao publicar a ferramenta em uma nova URL do Cloud Run ou novo subdomínio, o botão "Entrar com Google" trava com o erro `Firebase: Error (auth/unauthorized-domain)`.
- **Solução Automatizada:** O utilitário [`authorize_firebase_domain.py`](./authorize_firebase_domain.py) conecta diretamente na Google Identity Toolkit v2 API e insere a nova URL sem precisar de intervenção manual no Console:
  ```bash
  python3 authorize_firebase_domain.py <URL_DO_CLOUD_RUN_OU_DOMINIO>
  ```
  *Nota: Esse passo já foi integrado diretamente ao final do script `deploy_cloud_run.sh`.*

---

### 🚨 Armadilha 4: Prompt Interativo no Cloud Build Bloqueando Scripts
- **Problema:** Na primeira execução, o `gcloud run deploy --source .` interrompe a execução no terminal perguntando se deseja criar o repositório no Artifact Registry (`Do you want to continue (Y/n)?`).
- **Solução Padronizada:** Inclusão da flag `--quiet` em todos os comandos do `deploy_cloud_run.sh`.

---

## 3. Passo a Passo para Replicar em Novos Projetos

Quando formos migrar qualquer outro projeto do ecossistema Semântico para o Google Cloud Run, o procedimento padrão é:

### Passo 1: Ajustar a Porta no Código do Projeto
Certifique-se de que o backend lê `process.env.PORT` (Node.js) ou `${PORT:-8080}` (Python/FastAPI).

### Passo 2: Copiar os Arquivos de Infraestrutura
Copie os seguintes arquivos deste projeto para a raiz do novo projeto:
1. `Dockerfile` (ajustando comandos de build se for Python ou Node)
2. `.dockerignore`
3. `deploy_cloud_run.sh` (alterando apenas a variável `SERVICE_NAME="nome-do-novo-servico"`)
4. `authorize_firebase_domain.py`
5. `cloudbuild.yaml` (opcional, para CI/CD)

### Passo 3: Executar o Deploy Automatizado
Se o projeto já tiver um ID no GCP:
```bash
./deploy_cloud_run.sh <PROJECT_ID> [REGIAO]
```
Se for necessário criar um novo projeto no Google Cloud via terminal:
```bash
# 1. Criar projeto
gcloud projects create meu-novo-projeto --name="Meu Novo Projeto"

# 2. Vincular faturamento (Conta oficial: Semantic_SEO_AI)
gcloud billing projects link meu-novo-projeto --billing-account="019B3A-990CAD-9C3633"

# 3. Rodar deploy (ele faz todo o resto automaticamente)
./deploy_cloud_run.sh meu-novo-projeto us-central1
```

### Passo 4: Mapear Subdomínio Customizado no DNS (Névoa / cPanel)
1. Acesse: `https://console.cloud.google.com/run/domains?project=<PROJECT_ID>`
2. Clique em **Adicionar mapeamento** e aponte para o serviço criado.
3. No seu DNS, adicione a entrada:
   - **Tipo:** `CNAME`
   - **Nome:** prefixo do subdomínio (ex: `ferramenta`)
   - **Destino:** `ghs.googlehosted.com.`
4. Rode para autorizar o subdomínio no Firebase:
   ```bash
   python3 authorize_firebase_domain.py ferramenta.semantico.com.br
   ```

---

## 4. Dados Mestres de Configuração do Ecossistema

- **Conta de Faturamento Oficial do GCP:** `Semantic_SEO_AI` (`019B3A-990CAD-9C3633`)
- **Projeto Central do Firebase Auth / Firestore:** `blogsemantico-1750525854725`
- **Super Administrador:** `alexrodrigues43@gmail.com`
- **Passcode Master de Reserva:** `opennre-2026`
- **Região Recomendada:** `us-central1` (ou `southamerica-east1`)

---

## 5. Padrão Oficial do Menu de Navegação Institucional & Header

Todas as ferramentas da Suíte Semântico SEO devem adotar obrigatoriamente a seguinte padronização de menu e links institucionais:

- **Serviços:** `https://semantico.com.br/servicos.html`
- **Suíte:** `https://semantico.com.br/suite-semantica.html` *(NUNCA utilizar a palavra "Ferramentas")*
- **Blog:** `https://semantico.com.br/blog`
- **Podcasts:** `https://semantico.com.br/podcast-semantico.html`
- **Contato:** `https://semantico.com.br/contato.html`

### Diretrizes de Header:
1. **Sem Pills de Release:** Não exibir pills como "Release", "Beta", etc.
2. **Sem Botão "Solicitar Orçamento" ou Bandeira:** Não incluir esses elementos no menu.
3. **Ordem de Ações à Direita:**
   - **Penúltimo item:** Botão dourado **"Criar Conta"** (`#f5be38`) abrindo o modal na aba de cadastro (ou "Assinatura" se logado).
   - **Último item:** Botão **"Entrar"** abrindo modal na aba de login (ou dropdown do perfil de usuário com saldo e logout se logado).
