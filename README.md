# Semântico Graph Studio — Significado e Sentido

> Plataforma profissional de Extração Neural de Relações, Construção de Grafos de Conhecimento e Diagnóstico Editorial Semântico alimentada por IA (OpenNRE + Gemini).

---

## 📖 Visão Geral

O **Semântico Graph Studio** transforma textos brutos em grafos de conhecimento estruturados com rigor ontológico. A aplicação extrai entidades, mapeia relações semânticas com esquemas padronizados (Wiki80 e TACRED), calcula métricas topológicas e gera exportações prontas para bancos de dados de grafos e SEO estruturado.

Além disso, conta com um ecossistema completo de **autenticação, controle de assinaturas, paywall gracioso e painel administrativo**.

---

## ✨ Principais Funcionalidades

### 1. Extração Neural & Grafos de Conhecimento
- **Extração Semântica com Gemini e OpenNRE**: Reconhece entidades e suas relações ontológicas diretas e inversas a partir de texto corrido.
- **Visualizador Interativo D3.js**: Grafo de forças com nós interativos, setas direcionais, destaque por categorização semântica, zoom, pan e visualização detalhada em clique.
- **Navegador de Taxonomias**: Suporte nativo aos frameworks ontológicos **Wiki80** e **TACRED**.
- **Métricas Topológicas**: Cálculo em tempo real de densidade do grafo, diâmetro, grau médio e centralidade.

### 2. Diagnóstico & Otimizador Editorial
- **Detecção de Nós Isolados**: Identifica entidades citadas sem predicados relacionais diretos.
- **Relatório de Conectividade**: Medição de 0 a 100 da densidade lógica do texto.
- **Sugestões "Antes vs. Depois"**: Propostas de orações ativas com verbos relacionais explícitos.
- **Reextração em 1 Clique**: Aplicação do texto otimizado diretamente no grafo.

### 3. Estúdio de Exportação Multiformato
- **JSON-LD** (`@context`: `schema.org`)
- **Cypher Query** (Neo4j / Memgraph / AWS Neptune)
- **RDF / Turtle** (Semântica W3C)
- **Mermaid.js** (Diagramas Markdown)
- **CSV de Arestas e Nós** (Gephi, Cytoscape, planilhas)

### 4. Sistema de Acesso, Assinaturas e Paywall
- **Firebase Auth**: Login por E-mail/Senha e login em 1 clique via Google.
- **Reconhecimento Automático do Super Admin**: O e-mail `alexrodrigues43@gmail.com` é automaticamente provisionado como Administrador com plano vitalício e privilégios totais.
- **Fluxo de Liberação (Status Pending)**: Novos cadastros iniciam como `pending` (Aguardando Aprovação).
- **Paywall Gracioso com Desbloqueio em Tempo Real**: Visitantes e contas pendentes navegam livremente pela interface e exemplos; ao tentar executar ações principais, abre-se o modal de liberação com monitoramento em tempo real via `onSnapshot` do Firestore — quando o admin aprova, a tela destrava instantaneamente sem F5.
- **Painel Administrativo Completo**:
  - Métricas gerais (total de cadastros, assinantes ativos, pendentes e execuções totais).
  - Tabela com busca, filtros por status, alteração de planos (`trial`, `monthly`, `annual`, `lifetime`), edição de notas internas e contador de uso individual.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Motion.
- **Visualização de Dados**: D3.js (Force-directed graph).
- **Backend / Proxy**: Express, Node.js (`server.ts` executado via `tsx` em dev e empacotado via `esbuild` em prod).
- **Inteligência Artificial**: Google GenAI SDK (`@google/genai`) para análise e extração semântica server-side.
- **Banco de Dados & Autenticação**: Firebase Auth & Google Cloud Firestore com regras de segurança granulares (`firestore.rules`).

---

## 🚀 Como Executar o Projeto Localmente

### 1. Pré-requisitos
- **Node.js** (versão 20 ou superior recomendada)
- **npm** ou **yarn**
- Chave de API do **Google Gemini** ([Google AI Studio](https://aistudio.google.com/))
- Projeto configurado no **Firebase** com Authentication e Firestore ativados.

### 2. Clonando o Repositório
```bash
git clone https://github.com/SEU-USUARIO/semantico-graph-studio.git
cd semantico-graph-studio
```

### 3. Instalando as Dependências
```bash
npm install
```

### 4. Configuração das Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
GEMINI_API_KEY=sua_chave_gemini_aqui
```

Certifique-se de que o arquivo `firebase-applet-config.json` contenha as credenciais do seu projeto Firebase:
```json
{
  "projectId": "seu-projeto-firebase",
  "appId": "seu-app-id",
  "apiKey": "sua-api-key",
  "authDomain": "seu-projeto.firebaseapp.com",
  "firestoreDatabaseId": "seu-database-id",
  "storageBucket": "seu-projeto.firebasestorage.app",
  "messagingSenderId": "seu-sender-id"
}
```

### 5. Ativação dos Métodos de Login no Firebase Console
No painel do Firebase Console ([console.firebase.google.com](https://console.firebase.google.com/)):
1. Vá em **Authentication** > **Sign-in method** (Método de login).
2. Habilite o provedor **Google**.
3. Habilite o provedor **E-mail/Senha** (Email/Password).

### 6. Executando em Modo de Desenvolvimento
```bash
npm run dev
```
Acesse a aplicação no navegador em `http://localhost:3000`.

### 7. Build e Execução de Produção
```bash
npm run build
npm start
```

---

## 🔒 Segurança e Regras do Firestore

O projeto inclui o arquivo `firestore.rules` pronto para produção com validações estritas:
- Leitura e listagem de usuários restrita ao próprio usuário ou a administradores autenticados.
- Auto-atribuição de privilégios bloqueada (novos usuários só podem se cadastrar como `client` e `pending`).
- O Super Admin (`alexrodrigues43@gmail.com`) possui liberação irrestrita nas regras.

Para fazer deploy das regras de segurança no Firebase:
```bash
firebase deploy --only firestore:rules
```

---

## 📄 Licença

Desenvolvido para **Semântico SEO** — Significado e Sentido.
Todos os direitos reservados.
