# Semântico Graph Studio — Significado e Sentido

> Plataforma corporativa de **Extração Neural de Relações (OpenNRE)**, **Construção de Grafos de Conhecimento** e **Diagnóstico Editorial de SEO Semântico** alimentada por modelos de IA de última geração (Google Gemini) e ontologias Wikidata / TACRED / Wiki80.

---

## 📖 Visão Geral

O **Semântico Graph Studio** foi projetado para profissionais de SEO Avançado, Arquitetos de Informação, Engenheiros de Dados e Criadores de Conteúdo que precisam transformar textos não estruturados em **Knowledge Graphs (Grafos de Conhecimento)** com rigor ontológico e máxima densidade factual.

A ferramenta extrai entidades nomeadas, resolve anáforas e correferências textuais, mapeia predicados relacionais formais `(Sujeito, Predicado, Objeto)` e calcula métricas topológicas de rede, fornecendo também um **Auditor Editorial Semântico** que diagnostica problemas de redação (voz passiva, pronomes ambíguos, nós desconexos) e gera o texto integral reescrito para máxima absorção por buscadores (como o Googlebot e o Google Knowledge Vault).

---

## 🚀 Atualizações Recentes do Sistema

### 1. Motor de Resolução de Correferência (Zero-Pronoun Policy)
* **Eliminação de Nós Fantasmas:** A ferramenta é estritamente configurada para não criar entidades a partir de pronomes ou demonstrativos (`ele`, `ela`, `eles`, `elas`, `esses dados`, `este sistema`).
* **Rastreamento Anafórico no Contexto:** Se uma frase cita *"Ele roda simultaneamente no servidor"*, o motor recupera o antecedente no parágrafo e vincula a entidade canônica real (ex: `Googlebot`).

### 2. Pré-Processamento Estrutural e Isolamento de Títulos
* **Separação Sintática de Cabeçalhos:** Identifica automaticamente marcações Markdown (`#`, `##`, `###`), títulos e subtítulos isolados de parágrafos.
* **Prevenção de Fusão Errada:** Impede que títulos se fundam com o primeiro período do parágrafo, eliminando relações artificiais entre cabeçalhos e frases subordinadas.

### 3. Mapeamento de Listas e Predicados Enriquecidos
* **Sanitização de Pontuação em Listas:** Entidades originadas de listas e definições (ex: `Análise de logs de servidor:`) são limpas de pontuações residuais (`:`, `;`, aspas).
* **Conversão de Verbos Copulativos:** Predicados fracos como `"é"`, `"são"` ou `"tem"` são automaticamente enriquecidos para relações ontológicas precisas (`defined_as`, `enables`, `monitors`, `executes_on`, `subclass_of`).

### 4. Arquitetura de IA Resiliente com Failover Instantâneo
* **Cascata Multi-Modelo:** Utiliza como modelo primário o **`gemini-3.8-flash`** (com `ThinkingLevel.LOW` para latência mínima e processamento ultrarrápido).
* **Failover Imediato para Alta Demanda:** Em caso de indisponibilidade ou picos temporários (erros 503/429), a requisição alterna instantaneamente para **`gemini-3.1-flash-lite`**, **`gemini-flash-latest`** e **`gemini-3.7-flash`**, garantindo taxa de sucesso ininterrupta.
* **Fallback Heurístico Local:** Se todos os serviços de nuvem estiverem inacessíveis, um motor algorítmico local assume a extração sem quebrar a interface do usuário.

---

## ✨ Funcionalidades Principais

### 1. Extração Neural & Visualizador D3.js de Alta Precisão
* **Visualizador Dinâmico de Forças (Force-Directed Graph):**
  * Nós dimensionados proporcionalmente ao grau de conectividade.
  * Arestas com setas direcionadas e rótulos semânticos legíveis.
  * Cores intuitivas mapeadas por tipo ontológico (`Organization`, `Software`, `Concept`, `Person`, etc.).
  * Controles de zoom, arrasto (pan), centralização automática e clique para inspeção profunda de nós.
* **Navegador de Taxonomias:** Suporte nativo aos esquemas **Wiki80** (Wikidata) e **TACRED** (LDC/Stanford), com suporte a taxonomias abertas.
* **Métricas Topológicas em Tempo Real:**
  * Total de Entidades e Relacionamentos.
  * Densidade do Grafo ($2 \times E / (V \times (V - 1))$).
  * Nível de Confiança Média das Extrações.
  * Tempo de Execução em milissegundos.

### 2. Diagnóstico & Otimizador Editorial Semântico
* **Score de Conectividade (0 a 100):** Medição algorítmica da clareza e densidade do texto.
* **Detecção de Entidades Isoladas:** Lista entidades citadas no texto que ficaram desconectadas do cluster central e explica o motivo linguístico.
* **Relações Implícitas / Fracas:** Identifica conexões óbvias que foram ofuscadas por redação passiva.
* **Sugestões "Antes vs. Depois":** Mostra trechos exatos do texto com sugestão de reescrita ativa.
* **Texto Integral Otimizado:** Reescreve o documento completo mantendo todos os fatos, mas com orações ativas e conexões inequívocas.
* **Botão "Re-extrair Grafo com Texto Otimizado":** Carrega o texto melhorado de volta no extrator com 1 clique.

### 3. Central de Exportação Multiformato
* **JSON-LD Schema.org:** Código estruturado para inserção direta no `<head>` de páginas web (SEO técnico).
* **Cypher Query:** Script pronto para ingestão em bancos de dados orientados a grafos (**Neo4j**, **Memgraph**, **AWS Neptune**).
* **RDF / Turtle:** Padrão W3C para Web Semântica e ontologias SPARQL.
* **Mermaid.js:** Código de diagrama para inclusão em documentações Markdown e GitHub.
* **CSV de Arestas e Nós:** Exportação tabular para ferramentas científicas como **Gephi** e **Cytoscape**.

### 4. Controle de Acesso, Assinaturas e Paywall em Tempo Real
* **Autenticação Segura via Firebase:** Login via E-mail/Senha e autenticação em 1 clique com Conta Google.
* **Aprovação de Cadastros (Workflow de Liberação):** Novos usuários são criados no Firestore com status `pending` (Aguardando Liberação).
* **Super Admin Nativo:** O e-mail `alexrodrigues43@gmail.com` é automaticamente reconhecido como Administrador vitalício com acesso irrestrito.
* **Paywall Gracioso com Desbloqueio Instantâneo:** Usuários não aprovados podem visualizar o ambiente; ao tentar executar análises, recebem o modal de aprovação. Graças ao listener `onSnapshot` do Firestore, assim que o administrador aprova o acesso, a tela desbloqueia em tempo real sem necessidade de recarregar a página (F5).
* **Painel Administrativo Completo:**
  * Métricas de uso globais (Usuários ativos, pendentes, total de extrações realizadas).
  * Gerenciamento de planos (`trial`, `monthly`, `annual`, `lifetime`).
  * Edição de notas internas e bloqueio/desbloqueio em 1 clique.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia | Descrição |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite | Interface SPA moderna, tipada e de alta performance |
| **Estilização** | Tailwind CSS v4, Lucide React, Motion | Design limpo, responsivo, sem dependências legadas |
| **Visualização** | D3.js (`d3-force`, `d3-zoom`, `d3-selection`) | Renderização de grafos vetoriais escaláveis e interativos |
| **Backend** | Node.js, Express, `tsx` | Servidor proxy de API para segurança de chaves e regras |
| **Motor de IA** | Google GenAI SDK (`@google/genai`) | Chamadas server-side com `gemini-3.8-flash` e cascata resiliente |
| **Banco de Dados** | Google Cloud Firestore | Persistência de usuários, permissões e histórico em tempo real |
| **Autenticação** | Firebase Authentication | Provedores Google OAuth e Email/Senha |

---

## 🚀 Como Executar o Projeto Localmente

### 1. Pré-requisitos
* **Node.js** 20+ instalado
* **npm** ou **pnpm**
* Chave de API do **Google Gemini** ([Google AI Studio](https://aistudio.google.com/))
* Projeto criado no **Firebase** com Authentication e Firestore ativos

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
Crie um arquivo `.env` na raiz do projeto contendo sua chave da Gemini API:
```env
GEMINI_API_KEY=AIzaSy...sua_chave_aqui
```

As credenciais públicas do Firebase para o cliente ficam salvas em `firebase-applet-config.json` na raiz:
```json
{
  "projectId": "seu-projeto-firebase",
  "appId": "seu-app-id",
  "apiKey": "sua-api-key-firebase",
  "authDomain": "seu-projeto.firebaseapp.com",
  "firestoreDatabaseId": "seu-database-id",
  "storageBucket": "seu-projeto.firebasestorage.app",
  "messagingSenderId": "seu-sender-id"
}
```

### 5. Ativação dos Provedores no Firebase Console
No [Console do Firebase](https://console.firebase.google.com/):
1. Acesse **Build** > **Authentication** > guia **Sign-in method**.
2. Ative os provedores:
   * **Google**
   * **E-mail/senha** (Email/Password)
3. No menu **Firestore Database**, confirme a criação do banco de dados no modo de produção.

### 6. Executando em Desenvolvimento
```bash
npm run dev
```
A aplicação estará disponível em `http://localhost:3000`.

### 7. Build e Execução de Produção
```bash
npm run build
npm start
```

---

## 🔒 Segurança e Regras do Firestore (`firestore.rules`)

As regras de segurança protegem os dados contra acesso indevido e impedem auto-escalação de privilégios:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    function isSuperAdmin() {
      return isAuthenticated() && request.auth.token.email == 'alexrodrigues43@gmail.com';
    }
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read: if isOwner(userId) || isSuperAdmin();
      allow create: if isAuthenticated() && (
        isSuperAdmin() || (
          isOwner(userId) &&
          request.resource.data.role == 'client' &&
          request.resource.data.status == 'pending'
        )
      );
      allow update: if isSuperAdmin() || (
        isOwner(userId) &&
        request.resource.data.role == resource.data.role &&
        request.resource.data.status == resource.data.status
      );
      allow delete: if isSuperAdmin();
    }
  }
}
```

Para aplicar as regras no Firebase:
```bash
firebase deploy --only firestore:rules
```

---

## 📡 Endpoints da API Backend

### `POST /api/extract`
Extrai entidades e relações com taxonomia OpenNRE e resolução de correferência.
* **Payload:** `{ "text": string, "taxonomy": "wiki80" | "tacred" | "open" }`
* **Retorno:** Entidades sanitizadas, tripletos relacionais com score de confiança, tempo de execução e métricas de densidade.

### `POST /api/analyze-text-connectivity`
Gera o relatório de diagnóstico e otimização editorial.
* **Payload:** `{ "text": string, "entities": [...], "relations": [...] }`
* **Retorno:** Score de conectividade, diagnóstico de nós isolados, sugestões Antes/Depois e texto integral reescrito.

### `GET /api/taxonomies`
Retorna as definições e esquemas disponíveis para Wiki80 e TACRED.

---

## 📄 Licença e Direitos

Desenvolvido para **Semântico SEO** — *Significado e Sentido*.  
Todos os direitos reservados.
