# Semântico Graph Studio — Significado e Sentido

> Plataforma corporativa de **Extração Neural de Relações (OpenNRE)**, **Construção de Grafos de Conhecimento (Knowledge Graphs)**, **Auditoria Editorial de SEO Semântico** e **Otimização Estrutural de Conteúdo**, alimentada por modelos Google Gemini de última geração e ontologias Wikidata / TACRED / Wiki80.

---

## 📖 Visão Geral

O **Semântico Graph Studio** foi projetado para profissionais de SEO Avançado, Arquitetos de Informação, Engenheiros de Dados e Criadores de Conteúdo que precisam transformar textos não estruturados em **Knowledge Graphs (Grafos de Conhecimento)** com rigor ontológico, máxima densidade factual e sem ruídos semânticos.

A aplicação resolve uma das maiores dores dos modelos tradicionais de NER (Named Entity Recognition) e OpenNRE: **o mapeamento de nós que não fazem sentido** (como verbos conjugados, orações fatiadas, conectivos de transição ou termos fora do escopo temático).

Com o Semântico Graph Studio, a extração é ancorada em um **Contexto Temático Obrigatório**, enriquecida por um **Dicionário Negativo Multicamadas** (Stop-Verbs e Substantivos Vazios), processada por uma arquitetura de IA resiliente e visualizada em tempo real via grafos interativos D3.js.

---

## 🌟 Principais Inovações e Modificações Recentes

### 1. Trava Obrigatória por Contexto Temático Livre (Domain Context Anchoring)
* **Objetivo:** Garantir que o modelo extraia apenas entidades e relações estritamente pertencentes ao nicho do texto, eliminando ambiguidades e alucinações fora de domínio.
* **Comportamento Visual com Trava Ativa:** 
  * O usuário dispõe de um campo livre proeminente para informar o tema (ex: `SEO para E-commerce`, `Inteligência Artificial & LLMs`, `Cardiologia Preventiva`).
  * **Análise Travada por Padrão:** Se o campo estiver em branco e o usuário tentar clicar no botão de extração ou re-análise, a ação é **bloqueada imediatamente**. O sistema dispara um banner de alerta visual, emite feedback tátil/sonoro, foca automaticamente no campo de contexto e faz scroll suave até ele.
  * **Chips de Atalho Rápido:** Sugestões temáticas em um clique para agilizar testes (`SEO para E-commerce`, `Inteligência Artificial & LLMs`, `Marketing de Conteúdo & SaaS`, `Arquitetura de Dados & Grafos`).
  * **Dupla Validação (Frontend + Backend):** O botão exibe status bloqueado com ícone de cadeado (`Contexto obrigatório para liberar`). No backend, tanto o endpoint `/api/extract` quanto o `/api/analyze-text-connectivity` validam a presença do contexto e rejeitam chamadas vazias com erro `400 (Contexto Obrigatório)`.
  * **Ancoragem nas Instruções do Gemini:** O contexto é injetado como **Diretriz Primária (Directive 0)** nos prompts do Gemini, condicionando a desambiguação de entidades ao universo temático informado.

---

### 2. Dicionário Negativo Multicamadas de Entidades (Negative Entity Dictionary & Stop-Words)
Para solucionar queixas de entidades que "não faziam sentido" geradas por modelos de linguagem e extratores heurísticos:
* **Dicionário Exaustivo de Verbos Negativos (`INVALID_VERB_WORDS`):**
  * Em grafos ontológicos, verbos devem ser tratados **estritamente como predicados/relações**, nunca como nós/entidades.
  * Mapeamento completo de formas infinitivas e conjugadas dos verbos mais frequentes em PT-BR e EN (`ser`, `estar`, `ter`, `haver`, `fazer`, `poder`, `ir`, `vir`, `rodar`, `executa`, `permite`, `mostra`, `cria`, `gera`, `analisa`, `opera`, `integra`, etc.).
* **Filtro de Substantivos Vazios e Adjetivos Soltos (`INVALID_GENERIC_NOUNS_AND_ADJECTIVES`):**
  * Bloqueia termos ultragenéricos sem especificidade ontológica (`coisa`, `algo`, `modo`, `forma`, `tipo`, `parte`, `aspecto`, `fato`, `caso`, `exemplo`, `ideia`, `tema`, `melhor`, `novo`, `grande`, `relevante`, `correto`).
* **Blindagem Contra Conectivos e Elementos de Transição (`INVALID_CONNECTIVE_WORDS`):**
  * Bloqueia conjunções e advérbios (`afinal`, `abaixo`, `depois`, `ainda`, `dentro`, `ambas`, `assim`, `portanto`, `além disso`, `no entanto`, etc.).
* **Detecção de Orações Recortadas (`VERBAL_PHRASE_REGEX`):**
  * Expressões que começam com verbo seguido de artigo ou preposição (ex: *"analisa os dados"*, *"roda no servidor"*, *"permite fazer"*) são detectadas por expressão regular e excluídas de imediato.
* **Validação Tríplice:** Esse pipeline negativo opera em 3 níveis simultâneos:
  1. *Diretrizes no System Prompt da LLM* (Directive 8: Strict Prohibition of Verbs & Empty Nouns as Nodes).
  2. *Pós-processamento sanitizador do backend* (`isInvalidEntity`).
  3. *Motor Heurístico de Fallback Local* (`fallbackExtract`).

---

### 3. Arquitetura de IA Resiliente com Failover Instantâneo e Cooldown Inteligente
Para lidar com cotas de requisições por minuto/dia e garantir operação contínua sem interrupções:
* **Modelo Primário de Alto Desempenho:** Utiliza o `gemini-3.8-flash` com `ThinkingLevel.LOW` para latência mínima e processamento ultrarrápido de documentos extensos.
* **Mecanismo de Cooldown Ativo:**
  * Detecta erros `429 (Resource Exhausted / Quota Exceeded)` e `503 (High Demand / Service Unavailable)`.
  * Coloca o modelo em quarentena em memória (cooldown) por tempo programado, evitando disparos repetidos ineficazes contra cotas esgotadas.
* **Cascata Multi-Modelo Dinâmica:**
  * Alterna de forma automática, instantânea e transparente para candidatos resilientes:
    `gemini-3.8-flash` ➡️ `gemini-3.1-flash-lite` ➡️ `gemini-flash-latest` ➡️ `gemini-3.7-flash`.
* **Fallback Heurístico Local:**
  * Caso todas as chamadas de nuvem falhem ou a rede esteja offline, o sistema ativa um extrator heurístico local baseado em regex e POS rules, preservando a usabilidade da plataforma sem tela de erro.

---

### 4. Consultoria Editorial para Redatores e Copywriters (Foco em Produção Textual)
* **Score de Conectividade do Texto (0 a 100):** Mede o grau de coesão topológica das frases.
* **Diagnóstico de Entidades Isoladas:** Identifica conceitos mencionados no texto que não possuem nenhuma relação explícita com o restante das entidades e explica o impacto disso na absorção pelo Googlebot.
* **Duas Opções de Reescrita com Cópia em 1 Clique:**
  * **Opção Editorial (Estilo Criativo):** Mantém o tom autoral do redator, metáforas e fluidez narrativa, apenas inserindo a ligação necessária de forma sutil.
  * **Opção SEO Direto (Triplo Ontológico):** Estruturação clara `[Sujeito + Verbo Ativo + Objeto]` para pontuação factual máxima.
* **Garantia de Não-Duplicação:** A IA valida que o trecho sugerido é visivelmente melhorado e nunca idêntico ao original.
* **Texto Integral Otimizado & Botão de Re-análise:** Disponibiliza a versão reescrita completa e permite re-extrair o grafo com 1 clique para comparar o ganho de conectividade.

---

### 5. Resolução de Correferência e Normalização Estrutural
* **Zero-Pronoun Policy:** Elimina a criação de nós baseados em pronomes (`ele`, `ela`, `eles`, `esse sistema`). A entidade canônica original é restaurada por anáfora.
* **Isolamento de Títulos (Markdown & Linhas Livres):** Impede que cabeçalhos (`#`, `##`) se fundam sintaticamente com o parágrafo subsequente.
* **Sanitização de Pontuações de Listas:** Remove dois-pontos, aspas e pontuações de itens de lista (ex: `Análise de logs:` ➡️ `Análise de logs`).
* **Enriquecimento de Predicados Fracos:** Converte verbos vagos (`"é"`, `"tem"`) em relações ontológicas semânticas (`defined_as`, `enables`, `monitors`, `executes_on`, `subclass_of`).

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia | Função |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite | Interface SPA moderna, reativa e tipada |
| **Estilização** | Tailwind CSS v4, Lucide React, Motion | Design escuro profissional, sem componentes de terceiros pesados |
| **Visualização** | D3.js (`d3-force`, `d3-zoom`, `d3-selection`) | Motor interativo de física vetorial para grafos de conhecimento |
| **Backend** | Node.js, Express, `tsx` | Servidor proxy de API para segurança de chaves, validações e NLP |
| **Motor de IA** | Google GenAI SDK (`@google/genai`) | Modelos `gemini-3.8-flash`, `gemini-3.1-flash-lite`, etc. com fallback |
| **Persistência** | Google Cloud Firestore | Perfis de usuários, status de liberação e histórico |
| **Autenticação** | Firebase Authentication | Google OAuth e Email/Senha integrados |

---

## 🏗️ Estrutura de Pastas do Projeto

```text
├── index.html                  # Ponto de entrada HTML com meta tags e títulos SEO
├── server.ts                   # Servidor Express com rotas de IA, sanitizadores e dicionários negativos
├── src/
│   ├── main.tsx                # Ponto de entrada React 19
│   ├── App.tsx                 # Estado global, tabs, fluxo de extração e modais de acesso
│   ├── index.css               # Folha de estilo global com Tailwind CSS v4
│   ├── lib/
│   │   ├── firebase.ts         # Inicialização do Firebase Auth & Firestore
│   │   └── mockData.ts         # Dados de exemplo para demonstrações offline
│   └── components/
│       ├── TextInputSection.tsx         # Entrada de texto com trava por contexto temático livre e chips
│       ├── KnowledgeGraphView.tsx       # Renderizador de grafos D3.js com zoom, drag e física
│       ├── TextOptimizationReport.tsx   # Auditoria editorial com score, sugestões e texto reescrito
│       ├── EntityInspectorModal.tsx     # Inspeção detalhada de nós, aliases e arestas
│       ├── GraphExportModal.tsx         # Central de exportação (JSON-LD, Cypher, RDF, Mermaid, CSV)
│       ├── AdminPanelModal.tsx          # Painel de gestão de usuários e assinaturas
│       ├── AuthModal.tsx                # Modal de login/cadastro (Google & E-mail)
│       └── Header.tsx                   # Barra de navegação com métricas de sessão e status de usuário
├── firestore.rules             # Regras de segurança do Firestore
├── firebase-applet-config.json # Configurações públicas do Firebase
├── package.json                # Dependências e scripts do ecossistema Node.js
└── README.md                   # Documentação integral do projeto
```

---

## 📡 Endpoints da API Backend

### 1. `POST /api/extract`
Extrai entidades, aliases normalizados e predicados relacionais a partir do texto informado.
* **Payload:**
  ```json
  {
    "text": "O Googlebot rastreia a web usando o motor Chromium...",
    "domainContext": "SEO Técnico & Mecanismos de Busca",
    "taxonomy": "wiki80",
    "confidenceThreshold": 0.5,
    "language": "pt"
  }
  ```
* **Regra de Validação:** `domainContext` é **obrigatório**. Requisições sem esse campo retornam `400 Bad Request`.
* **Retorno:**
  ```json
  {
    "entities": [
      { "id": "googlebot", "label": "Googlebot", "type": "Software", "salience": 0.95 }
    ],
    "relations": [
      {
        "source": "googlebot",
        "target": "chromium",
        "relation": "uses_component",
        "label": "utiliza componente",
        "confidence": 0.98
      }
    ],
    "modelUsed": "gemini-3.8-flash",
    "executionTimeMs": 850
  }
  ```

---

### 2. `POST /api/analyze-text-connectivity`
Analisa a densidade semântica do texto, identifica nós isolados e gera sugestões editoriais de reescrita.
* **Payload:**
  ```json
  {
    "text": "Texto completo...",
    "domainContext": "SEO para E-commerce",
    "entities": [...],
    "relations": [...],
    "taxonomy": "wiki80"
  }
  ```
* **Regra de Validação:** Requer `text` e `domainContext`. Retorna `400 Bad Request` se ausentes.
* **Retorno:**
  ```json
  {
    "connectivityScore": 78,
    "scoreCategory": "regular",
    "summaryExplanation": "O texto apresenta conceitos sólidos, mas 3 entidades cruciais ficaram desconexas.",
    "isolatedEntitiesDiagnostic": [...],
    "weakRelationsDiagnostic": [...],
    "rewrittenFullText": "Versão completa reescrita com alta coesão factual...",
    "editorialInsights": [...]
  }
  ```

---

### 3. `POST /api/optimize-text`
Gera reescritas incrementais ou refinamentos específicos com base em orientações personalizadas.

---

### 4. `GET /api/taxonomies`
Retorna as definições e esquemas relacionais suportados (`wiki80`, `tacred`, `open`).

---

## 🔒 Segurança, Controle de Acesso e Paywall

* **Autenticação Firebase:** Suporte a Google Sign-In e E-mail/Senha.
* **Workflow de Aprovação de Cadastros:** Novos registros entram com perfil `pending`.
* **Super Admin Vitalício:** O e-mail `alexrodrigues43@gmail.com` recebe permissão irrestrita permanente de administrador.
* **Sincronização em Tempo Real (`onSnapshot`):** Usuários pendentes visualizam a aplicação em modo de espera. Quando o Super Admin aprova o cadastro no Painel Administrativo, a tela do usuário é desbloqueada instantaneamente sem necessidade de atualizar a página (F5).
* **Proteção de Chaves de API:** Todas as chamadas de IA ocorrem via backend Express. Nenhuma chave do Google Gemini é exposta ao bundle do cliente.

---

## 🚀 Como Executar o Projeto Localmente

### 1. Pré-requisitos
* **Node.js** v20 ou superior
* Gerenciador de pacotes **npm**
* Chave de API da Google Gemini ([Google AI Studio](https://aistudio.google.com/))
* Projeto Firebase com Authentication e Firestore ativos

### 2. Instalação
```bash
git clone https://github.com/SEU-USUARIO/semantico-graph-studio.git
cd semantico-graph-studio
npm install
```

### 3. Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
GEMINI_API_KEY=sua_chave_gemini_aqui
```

As configurações públicas do Firebase devem constar no arquivo `firebase-applet-config.json` na raiz:
```json
{
  "projectId": "seu-projeto-firebase",
  "appId": "seu-app-id",
  "apiKey": "sua-api-key-firebase",
  "authDomain": "seu-projeto.firebaseapp.com",
  "firestoreDatabaseId": "(default)",
  "storageBucket": "seu-projeto.appspot.com",
  "messagingSenderId": "seu-sender-id"
}
```

### 4. Executando em Modo de Desenvolvimento
```bash
npm run dev
```
O servidor Express e o Vite estarão disponíveis em `http://localhost:3000`.

### 5. Compilação e Produção
```bash
npm run build
npm start
```

---

## 📄 Licença e Direitos

Desenvolvido para **Semântico SEO** — *Significado e Sentido*.  
Todos os direitos reservados.
