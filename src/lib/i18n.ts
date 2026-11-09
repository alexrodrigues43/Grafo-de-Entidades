export type SupportedLang = "pt" | "en" | "es";

export interface Translations {
  nav: {
    services: string;
    suite: string;
    blog: string;
    podcasts: string;
    contact: string;
    unlimitedCredits: string;
    credits: string;
    buyCredits: string;
    createAccount: string;
    subscription: string;
    superAdmin: string;
    login: string;
    logout: string;
    adminPanel: string;
    reloadSub: string;
    languageSelectAria: string;
    nodesLabel: string;
    relationsLabel: string;
    statusActive: string;
    planLabel: string;
    balanceLabel: string;
  };
  navLinks: {
    services: string;
    suite: string;
    blog: string;
    podcasts: string;
    contact: string;
    consulting: string;
    mission: string;
    author: string;
  };
  subnav: {
    problem: string;
    studio: string;
    benefits: string;
    howItWorks: string;
  };
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    pillSeo: string;
    pillD3: string;
    pillAi: string;
  };
  telemetry: {
    pipeline: string;
    latency: string;
    taxonomy: string;
  };
  projectLanguage: {
    label: string;
    pt: string;
    en: string;
    es: string;
    hint: string;
  };
  input: {
    headerTitle: string;
    headerSubtitle: string;
    btnUpload: string;
    uploadedSuccess: string;
    dismissNotice: string;
    fileLimitTitle: string;
    monitorTitle: string;
    monitorExceeded: string;
    monitorWarning: string;
    monitorIdeal: string;
    monitorMaxSupported: string;
    idealLimit: string;
    hardLimit: string;
    lockTitle: string;
    lockBody: string;
    lockSolution: string;
    warningTitle: string;
    warningBody: string;
    contextLabel: string;
    contextPlaceholder: string;
    contextHelp: string;
    contextActive: string;
    contextRequired: string;
    contextQuickSuggestions: string;
    contextAlertTitle: string;
    contextAlertBody: string;
    tabEditor: string;
    tabAnnotated: string;
    annotatedEmpty: string;
    wordsCount: string;
    charsCount: string;
    paragraphsCount: string;
    readingTime: string;
    btnClear: string;
    textLabel: string;
    textPlaceholder: string;
    dragDropHint: string;
    waitingText: string;
    readyText: string;
    blockedReduce: string;
    taxonomyLabel: string;
    thresholdLabel: string;
    btnExtract: string;
    btnExtracting: string;
    btnSample: string;
    taxonomyOptions: {
      semantic_seo: string;
      wiki80: string;
      tacred: string;
    };
    lockActiveDefineContext: string;
    goToField: string;
  };
  tabs: {
    graph: string;
    triplets: string;
    analytics: string;
    taxonomy: string;
    optimizer: string;
  };
  graph: {
    searchPlaceholder: string;
    zoomIn: string;
    zoomOut: string;
    resetZoom: string;
    downloadSvg: string;
    toggleEdgeLabels: string;
    hideEdgeLabels: string;
    showEdgeLabels: string;
    filterTypes: string;
    showAll: string;
    confidence: string;
    clickToInspect: string;
    emptyGraphTitle: string;
    emptyGraphSubtitle: string;
    tooltipConfidence: string;
    tooltipClickRelation: string;
  };
  triplets: {
    title: string;
    searchPlaceholder: string;
    filterAll: string;
    thHead: string;
    thRelation: string;
    thTail: string;
    thConfidence: string;
    thEvidence: string;
    thActions: string;
    empty: string;
    emptySearch: string;
    btnAddRelation: string;
    modalTitle: string;
    headLabel: string;
    relationLabel: string;
    tailLabel: string;
    evidenceLabel: string;
    qualifiersLabel: string;
    btnSave: string;
    btnCancel: string;
  };
  metrics: {
    title: string;
    subtitle: string;
    pillarCardTitle: string;
    pillarCardDesc: string;
    focusAligned: string;
    focusAlert: string;
    focusGravity: string;
    noContextPrompt: string;
    densityTitle: string;
    highDensity: string;
    highDensityDesc: string;
    balancedDensity: string;
    balancedDensityDesc: string;
    lowDensity: string;
    lowDensityDesc: string;
    centralEntitiesTitle: string;
    centralEntitiesDesc: string;
  };
  optimizer: {
    title: string;
    subtitle: string;
    btnRunAnalysis: string;
    btnAnalyzing: string;
    scoreLabel: string;
    scoreLevel: string;
    btnApplyOptimized: string;
    appliedSuccess: string;
    btnExportMarkdown: string;
    copiedMarkdown: string;
    tabOverview: string;
    tabComparison: string;
    tabDiff: string;
    tabSideBySide: string;
    isolatedTitle: string;
    isolatedDesc: string;
    connectWith: string;
    editorialOption: string;
    seoOption: string;
    btnApplySnippet: string;
    btnCopySnippet: string;
    topicalGapsTitle: string;
    topicalGapsDesc: string;
    whyEssential: string;
    recommendedRelation: string;
    suggestedSnippet: string;
    btnInsertGap: string;
    rewritesTitle: string;
    rewritesDesc: string;
    originalSnippet: string;
    optimizedSnippet: string;
    emptyTitle: string;
    emptyDesc: string;
  };
  detailModal: {
    title: string;
    viewWikidata: string;
    confidence: string;
    degree: string;
    relationsUnit: string;
    aliasesTitle: string;
    outgoingTitle: string;
    incomingTitle: string;
    noOutgoing: string;
    noIncoming: string;
    copyCypher: string;
    copiedCypher: string;
    close: string;
  };
  howItWorks: {
    title: string;
    subtitle: string;
    step1Number: string;
    step1Title: string;
    step1Desc: string;
    step2Number: string;
    step2Title: string;
    step2Desc: string;
    step3Number: string;
    step3Title: string;
    step3Desc: string;
  };
  toasts: {
    contextRequired: string;
    extractError: string;
    optimizeError: string;
    appliedSuccess: string;
    snippetReplaced: string;
    snippetNotFound: string;
    gapInserted: string;
  };
  footer: {
    tagline: string;
    consulting: string;
    blog: string;
    contactExpert: string;
    rights: string;
  };
  common: {
    loading: string;
    success: string;
    error: string;
    close: string;
    copy: string;
    copied: string;
  };
}

export const TRANSLATIONS: Record<SupportedLang, Translations> = {
  pt: {
    nav: {
      services: "Serviços",
      suite: "Suíte",
      blog: "Blog",
      podcasts: "Podcasts",
      contact: "Contato",
      unlimitedCredits: "Créditos Ilimitados",
      credits: "créditos",
      buyCredits: "Comprar Créditos",
      createAccount: "Criar Conta",
      subscription: "Assinatura",
      superAdmin: "Super Admin",
      login: "Entrar",
      logout: "Sair da Conta",
      adminPanel: "Painel Super Admin",
      reloadSub: "Recarregar Assinatura",
      languageSelectAria: "Selecionar idioma da interface",
      nodesLabel: "nós",
      relationsLabel: "relações",
      statusActive: "Ativo",
      planLabel: "Plano",
      balanceLabel: "Saldo:",
    },
    navLinks: {
      services: "https://semantico.com.br/servicos.html",
      suite: "https://semantico.com.br/suite-semantica.html",
      blog: "https://semantico.com.br/blog",
      podcasts: "https://semantico.com.br/podcast-semantico.html",
      contact: "https://semantico.com.br/contato.html",
      consulting: "https://semantico.com.br/",
      mission: "https://semantico.com.br/semantico-seo.html",
      author: "https://semantico.com.br/alexander-rodrigues-silva.html",
    },
    subnav: {
      problem: "O Problema",
      studio: "Graph Studio",
      benefits: "Benefícios",
      howItWorks: "Como Funciona",
    },
    hero: {
      badge: "Engenharia de Conhecimento & SEO Semântico",
      title: "Grafo de Entidades & Relações Semânticas",
      subtitle:
        "Mapeie a rede de entidades, conceitos e relações do seu conteúdo. Transforme textos soltos em grafos de conhecimento estruturados para potencializar a compreensão algorítmica e autoridade temática.",
      pillSeo: "SEO Semântico, Wiki80 & TACRED",
      pillD3: "Visualização D3 com Força Direcionada",
      pillAi: "Diagnóstico & Otimizador Editorial AI",
    },
    telemetry: {
      pipeline: "Pipeline Semântico:",
      latency: "Latência:",
      taxonomy: "Taxonomia:",
    },
    projectLanguage: {
      label: "Idioma do Conteúdo:",
      pt: "Português",
      en: "Inglês",
      es: "Espanhol",
      hint: "Define o idioma para processamento NLP, ontologias e sugestões editoriais.",
    },
    input: {
      headerTitle: "Texto Fonte & Engenharia Semântica",
      headerSubtitle: "Insira o texto do seu artigo, página ou documento para mapeamento de entidades",
      btnUpload: "Carregar Arquivo (.txt / .md)",
      uploadedSuccess: "Arquivo carregado com sucesso:",
      dismissNotice: "Dispensar aviso",
      fileLimitTitle: "Aviso de Arquivo Extenso",
      monitorTitle: "Monitor de Volume & Qualidade Relacional:",
      monitorExceeded: "Limite de Segurança Excedido",
      monitorWarning: "Texto Extenso",
      monitorIdeal: "Capacidade Ideal",
      monitorMaxSupported: "Máximo suportado: 15.000 palavras por envio",
      idealLimit: "Ideal: até 6.000 palavras",
      hardLimit: "Trava Máxima: 15.000 palavras",
      lockTitle: "Trava de Segurança Ativa: Limite de 15.000 Palavras Excedido",
      lockBody: "Para evitar perda de atenção no meio do texto (Lost-in-the-Middle) ou estouro de tokens, o envio de textos acima de 15.000 palavras está bloqueado.",
      lockSolution: "Solução recomendada: Divida o documento em capítulos, tópicos ou seções menores para extrair grafos densos e de máxima precisão.",
      warningTitle: "Texto Extenso",
      warningBody: "O processamento será realizado normalmente. Para densidade relacional máxima, textos de até 6.000 palavras são ideais.",
      contextLabel: "Contexto Temático Principal (Obrigatório)",
      contextPlaceholder: "Ex: SEO Semântico, Arquitetura de Informação, Medicina Veterinária...",
      contextHelp: "Ancora a extração semântica ao domínio temático e desambigua termos homônimos.",
      contextActive: "Contexto Ativo",
      contextRequired: "Condição Obrigatória",
      contextQuickSuggestions: "Sugestões rápidas para testar:",
      contextAlertTitle: "Análise Travada: O contexto temático é condição indispensável para gerar a análise",
      contextAlertBody: "Para que o modelo não mapeie entidades sem sentido ou capture termos aleatórios, ele precisa saber previamente sobre o que seu texto trata. Escreva livremente no campo acima ou clique em uma das sugestões para destravar a extração.",
      tabEditor: "Editor de Texto",
      tabAnnotated: "Entidades Destacadas",
      annotatedEmpty: "Execute a extração primeiro para visualizar as entidades anotadas diretamente no texto fonte.",
      wordsCount: "palavras",
      charsCount: "caracteres",
      paragraphsCount: "parágrafos",
      readingTime: "min de leitura",
      btnClear: "Limpar",
      textLabel: "Texto Fonte para Análise e Extração",
      textPlaceholder: "Cole o texto completo do artigo, página ou documento a ser mapeado...",
      dragDropHint: "Dica: Você pode arrastar e soltar arquivos .txt ou .md diretamente aqui.",
      waitingText: "Aguardando texto...",
      readyText: "Texto pronto para extração",
      blockedReduce: "Bloqueado: Reduza o Texto (≤ 15k palavras)",
      taxonomyLabel: "Taxonomia Relacional",
      thresholdLabel: "Limiar Mínimo de Confiança",
      btnExtract: "Extrair Grafo de Conhecimento",
      btnExtracting: "Mapeando Entidades & Relações...",
      btnSample: "Carregar Exemplo",
      taxonomyOptions: {
        semantic_seo: "SEO Semântico & Topic Clusters (Recomendado para Artigos)",
        wiki80: "Wikidata & Conhecimento Geral (Ontologia Aberta)",
        tacred: "Corporativo & Perfis de Pessoas (Stanford TACRED)",
      },
      lockActiveDefineContext: "Trava Ativa: Definir Contexto",
      goToField: "Ir ao campo",
    },
    tabs: {
      graph: "Grafo Interativo",
      triplets: "Tabela de Triplas",
      analytics: "Métricas de Rede",
      taxonomy: "Taxonomia & Ontologias",
      optimizer: "Otimizador Editorial",
    },
    graph: {
      searchPlaceholder: "Buscar entidade no grafo...",
      zoomIn: "Aproximar (Zoom In)",
      zoomOut: "Afastar (Zoom Out)",
      resetZoom: "Resetar Visualização",
      downloadSvg: "Exportar Grafo em SVG Vetorial",
      toggleEdgeLabels: "Alternar Rótulos das Arestas",
      hideEdgeLabels: "Ocultar rótulos das arestas",
      showEdgeLabels: "Mostrar rótulos das arestas",
      filterTypes: "Tipos de Entidade:",
      showAll: "Mostrar Todos",
      confidence: "confiança",
      clickToInspect: "Clique na entidade para inspecionar",
      emptyGraphTitle: "Nenhum Grafo de Conhecimento gerado ainda",
      emptyGraphSubtitle: "Insira o contexto temático e o texto ao lado para mapear as entidades e relações ontológicas.",
      tooltipConfidence: "confiança",
      tooltipClickRelation: "Clique na relação para detalhes",
    },
    triplets: {
      title: "Triplas de Relação Extraídas",
      searchPlaceholder: "Filtrar por entidade ou predicado...",
      filterAll: "Todas as Relações",
      thHead: "Entidade Origem (Head)",
      thRelation: "Predicado (Relação)",
      thTail: "Entidade Destino (Tail)",
      thConfidence: "Confiança",
      thEvidence: "Evidência Textual",
      thActions: "Ações",
      empty: "Nenhuma relação extraída ainda. Execute a extração acima.",
      emptySearch: "Nenhuma tripla encontrada para os filtros selecionados.",
      btnAddRelation: "Adicionar Tripla Manual",
      modalTitle: "Adicionar Relação Manual",
      headLabel: "Entidade Origem (Sujeto)",
      relationLabel: "Predicado (Relação)",
      tailLabel: "Entidade Destino (Objeto)",
      evidenceLabel: "Evidência Textual (Opcional)",
      qualifiersLabel: "Qualificadores (Chave / Valor)",
      btnSave: "Salvar Relação",
      btnCancel: "Cancelar",
    },
    metrics: {
      title: "Métricas de Rede & Centralidade do Grafo",
      subtitle: "Avalie o diâmetro conceitual, conectividade e hierarquia de autoridades do documento.",
      pillarCardTitle: "Entidade Pilar & Foco Temático",
      pillarCardDesc: "Identifica o núcleo conceitual mais conectado no grafo e avalia o alinhamento com seu contexto temático.",
      focusAligned: "está perfeitamente alinhada ao contexto temático",
      focusAlert: "Alerta de dispersão: A entidade mais conectada difere do contexto temático definido. Verifique se o artigo não está desviando o foco.",
      focusGravity: "atua como núcleo de gravidade de conhecimento do documento.",
      noContextPrompt: "Defina um contexto temático para verificar o alinhamento de foco.",
      densityTitle: "Densidade Relacional por 100 Palavras",
      highDensity: "Alta Densidade Relacional",
      highDensityDesc: "Excelente riqueza de predicados. O texto constrói pontes conceituais contínuas entre os tópicos.",
      balancedDensity: "Densidade Equilibrada",
      balancedDensityDesc: "Ritmo semântico saudável. Os termos centrais estão conectados com clareza gramatical.",
      lowDensity: "Densidade Baixa",
      lowDensityDesc: "Poucas relações explícitas detectadas. Recomendado conectar mais entidades com verbos ativos.",
      centralEntitiesTitle: "Entidades com Maior Grau de Conexão",
      centralEntitiesDesc: "Nós com maior centralidade e influência estrutural no grafo de conhecimento.",
    },
    optimizer: {
      title: "Diagnóstico Editorial & Conectividade Semântica",
      subtitle: "Audite entidades desconectadas, lacunas de autoridade e obtenha sugestões de reescrita com verbos ativos.",
      btnRunAnalysis: "Executar Diagnóstico Editorial",
      btnAnalyzing: "Analisando Conectividade Semântica...",
      scoreLabel: "Índice de Conectividade",
      scoreLevel: "Nível de Conectividade",
      btnApplyOptimized: "Aplicar Texto Otimizado",
      appliedSuccess: "Texto otimizado aplicado com sucesso!",
      btnExportMarkdown: "Exportar Dossiê (Markdown)",
      copiedMarkdown: "Markdown Copiado!",
      tabOverview: "Visão Geral Otimizada",
      tabComparison: "Comparativo Antes vs. Depois",
      tabDiff: "Diff Granular",
      tabSideBySide: "Lado a Lado",
      isolatedTitle: "Entidades Isoladas (Sem Conexão no Grafo)",
      isolatedDesc: "Entidades mencionadas no texto que não possuem arestas direcionadas a outros nós.",
      connectWith: "Conectar com",
      editorialOption: "Opção Editorial (Estilo Fluido)",
      seoOption: "Opção SEO Direto (Tripla Ontológica)",
      btnApplySnippet: "Aplicar este trecho no editor",
      btnCopySnippet: "Copiar trecho",
      topicalGapsTitle: "Lacunas de Autoridade Temática (Topical Gaps)",
      topicalGapsDesc: "Conceitos fundamentais que os buscadores esperam encontrar no seu nicho temático.",
      whyEssential: "Por que é essencial:",
      recommendedRelation: "Relação recomendada:",
      suggestedSnippet: "Sugestão para inserir:",
      btnInsertGap: "Inserir no final do artigo",
      rewritesTitle: "Sugestões de Reescrita com Conexões Ativas",
      rewritesDesc: "Frases reestruturadas para transformar passagens estáticas em triplas relacionais com verbos de ação.",
      originalSnippet: "Original:",
      optimizedSnippet: "Otimizado:",
      emptyTitle: "Nenhum Diagnóstico Gerado Ainda",
      emptyDesc: "Clique no botão 'Executar Diagnóstico Editorial' para auditar entidades isoladas e receber sugestões de reescrita.",
    },
    detailModal: {
      title: "Detalhes da Entidade",
      viewWikidata: "Ver no Wikidata",
      confidence: "Confiança na Extração",
      degree: "Grau Total de Conexão",
      relationsUnit: "relações",
      aliasesTitle: "Formas de Superfície & Sinônimos (Aliases):",
      outgoingTitle: "Relações de Saída (Outgoing):",
      incomingTitle: "Relações de Entrada (Incoming):",
      noOutgoing: "Nenhuma relação de saída.",
      noIncoming: "Nenhuma relação de entrada.",
      copyCypher: "Copiar Consulta Cypher (Neo4j)",
      copiedCypher: "Consulta Cypher Copiada!",
      close: "Fechar",
    },
    howItWorks: {
      title: "Como o Graph Studio Opera a Extração",
      subtitle: "Metodologia de três etapas baseada em ontologias científicas e modelos neurais de ponta.",
      step1Number: "01",
      step1Title: "Reconhecimento de Entidades (NER)",
      step1Desc: "Identifica e classifica nós fundamentais (pessoas, organizações, locais, tecnologias, conceitos e produtos) presentes no texto.",
      step2Number: "02",
      step2Title: "Extração de Relações (OpenNRE)",
      step2Desc: "Mapeia as arestas direcionadas com predição de confiança e extração de evidências citadas no próprio documento.",
      step3Number: "03",
      step3Title: "Grafo Interativo & Exportação",
      step3Desc: "Renderiza em tempo real com D3.js e exporta os tripletos diretamente para Cypher (Neo4j), Turtle (RDF) ou JSON-LD.",
    },
    toasts: {
      contextRequired: "Contexto Obrigatório: A análise está travada. O contexto temático é indispensável para evitar entidades desconexas.",
      extractError: "Falha ao extrair relações do servidor.",
      optimizeError: "Erro ao analisar conectividade do texto.",
      appliedSuccess: "Texto otimizado aplicado com sucesso! Reextraindo relações e enriquecendo o grafo...",
      snippetReplaced: "Trecho substituído com sucesso no editor!",
      snippetNotFound: "Trecho original não localizado com exatidão no texto. Copie-o para colar manualmente.",
      gapInserted: "Tópico sugerido inserido ao final do artigo!",
    },
    footer: {
      tagline: "Graph Studio & Knowledge Engine",
      consulting: "Consultoria Semântico SEO",
      blog: "Blog",
      contactExpert: "Fale com um Especialista",
      rights: "Todos os direitos reservados.",
    },
    common: {
      loading: "Carregando...",
      success: "Sucesso",
      error: "Erro",
      close: "Fechar",
      copy: "Copiar",
      copied: "Copiado!",
    },
  },
  en: {
    nav: {
      services: "Services",
      suite: "Suite",
      blog: "Blog",
      podcasts: "Podcasts",
      contact: "Contact",
      unlimitedCredits: "Unlimited Credits",
      credits: "credits",
      buyCredits: "Buy Credits",
      createAccount: "Create Account",
      subscription: "Subscription",
      superAdmin: "Super Admin",
      login: "Sign In",
      logout: "Sign Out",
      adminPanel: "Super Admin Panel",
      reloadSub: "Reload Subscription",
      languageSelectAria: "Select interface language",
      nodesLabel: "nodes",
      relationsLabel: "relations",
      statusActive: "Active",
      planLabel: "Plan",
      balanceLabel: "Balance:",
    },
    navLinks: {
      services: "https://semantico.com.br/en/services.html",
      suite: "https://semantico.com.br/en/semantic-suite.html",
      blog: "https://semantico.com.br/blog/en/",
      podcasts: "https://semantico.com.br/en/podcasts.html",
      contact: "https://semantico.com.br/en/contact.html",
      consulting: "https://semantico.com.br/en/",
      mission: "https://semantico.com.br/en/semantic-seo.html",
      author: "https://semantico.com.br/en/alexander-rodrigues-silva.html",
    },
    subnav: {
      problem: "The Problem",
      studio: "Graph Studio",
      benefits: "Benefits",
      howItWorks: "How It Works",
    },
    hero: {
      badge: "Knowledge Engineering & Semantic SEO",
      title: "Entity Graph & Semantic Relations",
      subtitle:
        "Map the network of entities, concepts, and relationships in your content. Turn unstructured text into structured knowledge graphs to boost algorithmic comprehension and topical authority.",
      pillSeo: "Semantic SEO, Wiki80 & TACRED",
      pillD3: "D3 Force-Directed Visualization",
      pillAi: "AI Editorial Diagnosis & Optimizer",
    },
    telemetry: {
      pipeline: "Semantic Pipeline:",
      latency: "Latency:",
      taxonomy: "Taxonomy:",
    },
    projectLanguage: {
      label: "Content Language:",
      pt: "Portuguese",
      en: "English",
      es: "Spanish",
      hint: "Sets the language for NLP processing, ontology mapping, and editorial suggestions.",
    },
    input: {
      headerTitle: "Source Text & Semantic Engineering",
      headerSubtitle: "Insert the text of your article, page, or document for entity and relationship mapping",
      btnUpload: "Upload File (.txt / .md)",
      uploadedSuccess: "File uploaded successfully:",
      dismissNotice: "Dismiss notice",
      fileLimitTitle: "Long File Warning",
      monitorTitle: "Volume & Relational Quality Monitor:",
      monitorExceeded: "Safety Limit Exceeded",
      monitorWarning: "Long Text",
      monitorIdeal: "Ideal Capacity",
      monitorMaxSupported: "Max supported: 15,000 words per submission",
      idealLimit: "Ideal: up to 6,000 words",
      hardLimit: "Hard Cap: 15,000 words",
      lockTitle: "Active Safety Lock: 15,000 Word Limit Exceeded",
      lockBody: "To prevent model attention degradation (Lost-in-the-Middle) or JSON token output exhaustion, submissions above 15,000 words are blocked.",
      lockSolution: "Recommended solution: Split the document into chapters, topics, or smaller sections to extract dense and highly accurate graphs.",
      warningTitle: "Long Text",
      warningBody: "Processing will run normally. For maximum relational density, documents up to 6,000 words are ideal.",
      contextLabel: "Primary Thematic Context (Required)",
      contextPlaceholder: "e.g., Semantic SEO, Information Architecture, Veterinary Medicine...",
      contextHelp: "Anchors semantic extraction to the thematic domain and disambiguates homonyms.",
      contextActive: "Active Context",
      contextRequired: "Mandatory Condition",
      contextQuickSuggestions: "Quick suggestions to test:",
      contextAlertTitle: "Analysis Locked: Thematic context is required to run the analysis",
      contextAlertBody: "To ensure the model extracts meaningful entities rather than disconnected terms, it needs to know what your document is about. Type freely in the field above or click one of the suggestions to unlock extraction.",
      tabEditor: "Text Editor",
      tabAnnotated: "Highlighted Entities",
      annotatedEmpty: "Run extraction first to inspect highlighted entities directly within the source text.",
      wordsCount: "words",
      charsCount: "characters",
      paragraphsCount: "paragraphs",
      readingTime: "min read",
      btnClear: "Clear",
      textLabel: "Source Text for Analysis and Extraction",
      textPlaceholder: "Paste the full article, page, or document text to be mapped...",
      dragDropHint: "Tip: You can drag and drop .txt or .md files directly here.",
      waitingText: "Waiting for text...",
      readyText: "Text ready for extraction",
      blockedReduce: "Blocked: Reduce Text (≤ 15k words)",
      taxonomyLabel: "Relational Taxonomy",
      thresholdLabel: "Minimum Confidence Threshold",
      btnExtract: "Extract Knowledge Graph",
      btnExtracting: "Mapping Entities & Relations...",
      btnSample: "Load Example",
      taxonomyOptions: {
        semantic_seo: "Semantic SEO & Topic Clusters (Recommended for Articles)",
        wiki80: "Wikidata & General Knowledge (Open Ontology)",
        tacred: "Corporate & Person Profiles (Stanford TACRED)",
      },
      lockActiveDefineContext: "Lock Active: Define Context",
      goToField: "Go to field",
    },
    tabs: {
      graph: "Interactive Graph",
      triplets: "Triplets Table",
      analytics: "Network Metrics",
      taxonomy: "Taxonomy & Ontologies",
      optimizer: "Editorial Optimizer",
    },
    graph: {
      searchPlaceholder: "Search entity in graph...",
      zoomIn: "Zoom In",
      zoomOut: "Zoom Out",
      resetZoom: "Reset View",
      downloadSvg: "Export Graph as Vector SVG",
      toggleEdgeLabels: "Toggle Edge Labels",
      hideEdgeLabels: "Hide edge labels",
      showEdgeLabels: "Show edge labels",
      filterTypes: "Entity Types:",
      showAll: "Show All",
      confidence: "confidence",
      clickToInspect: "Click entity to inspect details",
      emptyGraphTitle: "No Knowledge Graph Generated Yet",
      emptyGraphSubtitle: "Enter the thematic context and source text on the left to map entities and ontological relations.",
      tooltipConfidence: "confidence",
      tooltipClickRelation: "Click relation for details",
    },
    triplets: {
      title: "Extracted Relation Triplets",
      searchPlaceholder: "Filter by entity or predicate...",
      filterAll: "All Relations",
      thHead: "Head Entity (Subject)",
      thRelation: "Predicate (Relation)",
      thTail: "Tail Entity (Object)",
      thConfidence: "Confidence",
      thEvidence: "Textual Evidence",
      thActions: "Actions",
      empty: "No relations extracted yet. Run the extraction engine above.",
      emptySearch: "No triplets found matching the selected criteria.",
      btnAddRelation: "Add Manual Triplet",
      modalTitle: "Add Manual Relation",
      headLabel: "Head Entity (Subject)",
      relationLabel: "Predicate (Relation)",
      tailLabel: "Tail Entity (Object)",
      evidenceLabel: "Textual Evidence (Optional)",
      qualifiersLabel: "Qualifiers (Key / Value)",
      btnSave: "Save Relation",
      btnCancel: "Cancel",
    },
    metrics: {
      title: "Network Metrics & Graph Centrality",
      subtitle: "Evaluate conceptual diameter, connectivity, and authority hierarchy of the document.",
      pillarCardTitle: "Pillar Entity & Thematic Focus",
      pillarCardDesc: "Identifies the most connected conceptual core and assesses alignment with your thematic context.",
      focusAligned: "is perfectly aligned with the thematic context",
      focusAlert: "Dispersal Alert: The most connected entity differs from your defined context. Verify that the content has not drifted off topic.",
      focusGravity: "serves as the primary center of knowledge gravity in the document.",
      noContextPrompt: "Define a thematic context to evaluate focus alignment.",
      densityTitle: "Relational Density per 100 Words",
      highDensity: "High Relational Density",
      highDensityDesc: "Excellent richness of predicates. The text builds continuous conceptual bridges across topics.",
      balancedDensity: "Balanced Density",
      balancedDensityDesc: "Healthy semantic pacing. Core terms are connected with grammatical clarity.",
      lowDensity: "Low Density",
      lowDensityDesc: "Few explicit relations detected. Recommended to connect more entities with active verbs.",
      centralEntitiesTitle: "Entities with Highest Degree of Connection",
      centralEntitiesDesc: "Nodes with highest structural centrality and topological influence in the knowledge graph.",
    },
    optimizer: {
      title: "Editorial Diagnosis & Semantic Connectivity",
      subtitle: "Audit isolated entities, topical gaps, and receive active verb rewrite recommendations.",
      btnRunAnalysis: "Run Editorial Diagnosis",
      btnAnalyzing: "Analyzing Semantic Connectivity...",
      scoreLabel: "Connectivity Score",
      scoreLevel: "Connectivity Level",
      btnApplyOptimized: "Apply Optimized Text",
      appliedSuccess: "Optimized text applied successfully!",
      btnExportMarkdown: "Export Dossier (Markdown)",
      copiedMarkdown: "Markdown Copied!",
      tabOverview: "Optimized Overview",
      tabComparison: "Before vs. After Comparison",
      tabDiff: "Granular Diff",
      tabSideBySide: "Side by Side",
      isolatedTitle: "Isolated Entities (Disconnected in Graph)",
      isolatedDesc: "Entities mentioned in text that have no directed edges connecting to other nodes.",
      connectWith: "Connect with",
      editorialOption: "Editorial Option (Fluent Style)",
      seoOption: "Direct SEO Option (Ontological Triplet)",
      btnApplySnippet: "Apply this snippet in editor",
      btnCopySnippet: "Copy snippet",
      topicalGapsTitle: "Topical Authority Gaps (Missing Entities)",
      topicalGapsDesc: "Core concepts search engines expect to find in your thematic niche.",
      whyEssential: "Why it is essential:",
      recommendedRelation: "Recommended relation:",
      suggestedSnippet: "Suggestion to insert:",
      btnInsertGap: "Insert at end of article",
      rewritesTitle: "Rewrite Suggestions with Active Connections",
      rewritesDesc: "Restructured sentences turning static phrases into active relational triplets with action verbs.",
      originalSnippet: "Original:",
      optimizedSnippet: "Optimized:",
      emptyTitle: "No Diagnosis Generated Yet",
      emptyDesc: "Click 'Run Editorial Diagnosis' to audit isolated entities and receive actionable rewrite suggestions.",
    },
    detailModal: {
      title: "Entity Details",
      viewWikidata: "View on Wikidata",
      confidence: "Extraction Confidence",
      degree: "Total Connected Degree",
      relationsUnit: "relations",
      aliasesTitle: "Resolved Surface Forms & Mentions (Aliases):",
      outgoingTitle: "Outgoing Relations:",
      incomingTitle: "Incoming Relations:",
      noOutgoing: "No outgoing relations.",
      noIncoming: "No incoming relations.",
      copyCypher: "Copy Cypher Query (Neo4j)",
      copiedCypher: "Cypher Query Copied!",
      close: "Close",
    },
    howItWorks: {
      title: "How Graph Studio Powers Knowledge Extraction",
      subtitle: "A three-stage methodology combining scientific ontologies and state-of-the-art neural models.",
      step1Number: "01",
      step1Title: "Named Entity Recognition (NER)",
      step1Desc: "Identifies and classifies core nodes (people, organizations, locations, technologies, concepts, and products) in text.",
      step2Number: "02",
      step2Title: "Relation Extraction (OpenNRE)",
      step2Desc: "Maps directed edges with confidence scoring and extracts explicit evidentiary passages from the source text.",
      step3Number: "03",
      step3Title: "Interactive Graph & Export",
      step3Desc: "Renders in real time with D3.js force simulation and exports triplets directly to Cypher (Neo4j), Turtle (RDF), or JSON-LD.",
    },
    toasts: {
      contextRequired: "Required Context: Analysis is locked. Thematic context is mandatory to avoid disconnected entities.",
      extractError: "Failed to extract relations from server.",
      optimizeError: "Error analyzing text connectivity.",
      appliedSuccess: "Optimized text applied successfully! Re-extracting relations and enriching graph...",
      snippetReplaced: "Snippet replaced successfully in editor!",
      snippetNotFound: "Original snippet could not be matched exactly. Use copy to paste manually.",
      gapInserted: "Suggested topic inserted at the end of the document!",
    },
    footer: {
      tagline: "Graph Studio & Knowledge Engine",
      consulting: "Semantic SEO Consulting",
      blog: "Blog",
      contactExpert: "Talk to an Expert",
      rights: "All rights reserved.",
    },
    common: {
      loading: "Loading...",
      success: "Success",
      error: "Error",
      close: "Close",
      copy: "Copy",
      copied: "Copied!",
    },
  },
  es: {
    nav: {
      services: "Servicios",
      suite: "Suite",
      blog: "Blog",
      podcasts: "Pódcasts",
      contact: "Contacto",
      unlimitedCredits: "Créditos Ilimitados",
      credits: "créditos",
      buyCredits: "Comprar Créditos",
      createAccount: "Crear Cuenta",
      subscription: "Suscripción",
      superAdmin: "Super Admin",
      login: "Iniciar Sesión",
      logout: "Cerrar Sesión",
      adminPanel: "Panel Super Admin",
      reloadSub: "Recargar Suscripción",
      languageSelectAria: "Seleccionar idioma de la interfaz",
      nodesLabel: "nodos",
      relationsLabel: "relaciones",
      statusActive: "Activo",
      planLabel: "Plan",
      balanceLabel: "Saldo:",
    },
    navLinks: {
      services: "https://semantico.com.br/es/servicios.html",
      suite: "https://semantico.com.br/es/herramientas-semanticas.html",
      blog: "https://semantico.com.br/blog/es/",
      podcasts: "https://semantico.com.br/es/podcast-semantico.html",
      contact: "https://semantico.com.br/es/contacto.html",
      consulting: "https://semantico.com.br/es/",
      mission: "https://semantico.com.br/es/semantico-seo.html",
      author: "https://semantico.com.br/es/alexander-rodrigues-silva.html",
    },
    subnav: {
      problem: "El Problema",
      studio: "Graph Studio",
      benefits: "Beneficios",
      howItWorks: "Cómo Funciona",
    },
    hero: {
      badge: "Ingeniería del Conocimiento & SEO Semántico",
      title: "Grafo de Entidades & Relaciones Semánticas",
      subtitle:
        "Mapee la red de entidades, conceptos y relaciones de su contenido. Transforme textos no estructurados en grafos de conocimiento para potenciar la comprensión algorítmica y la autoridad temática.",
      pillSeo: "SEO Semántico, Wiki80 & TACRED",
      pillD3: "Visualización D3 con Fuerzas Dirigidas",
      pillAi: "Diagnóstico & Optimizador Editorial AI",
    },
    telemetry: {
      pipeline: "Pipeline Semántico:",
      latency: "Latencia:",
      taxonomy: "Taxonomía:",
    },
    projectLanguage: {
      label: "Idioma del Contenido:",
      pt: "Portugués",
      en: "Inglés",
      es: "Español",
      hint: "Define el idioma para procesamiento PNL, ontologías y sugerencias editoriales.",
    },
    input: {
      headerTitle: "Texto Fuente & Ingeniería Semántica",
      headerSubtitle: "Ingrese el texto de su artículo, página o documento para mapear entidades y relaciones",
      btnUpload: "Cargar Archivo (.txt / .md)",
      uploadedSuccess: "Archivo cargado con éxito:",
      dismissNotice: "Descartar aviso",
      fileLimitTitle: "Aviso de Archivo Extenso",
      monitorTitle: "Monitor de Volumen & Calidad Relacional:",
      monitorExceeded: "Límite de Seguridad Excedido",
      monitorWarning: "Texto Extenso",
      monitorIdeal: "Capacidad Ideal",
      monitorMaxSupported: "Máximo soportado: 15.000 palabras por envío",
      idealLimit: "Ideal: hasta 6.000 palabras",
      hardLimit: "Límite Máximo: 15.000 palabras",
      lockTitle: "Bloqueo de Seguridad Activo: Límite de 15.000 Palabras Excedido",
      lockBody: "Para evitar pérdida de atención en el modelo (Lost-in-the-Middle) o desbordamiento de tokens JSON, el envío de textos superiores a 15.000 palabras está bloqueado.",
      lockSolution: "Solución recomendada: Divida el documento en capítulos, temas o secciones menores para extraer grafos densos y de máxima precisión.",
      warningTitle: "Texto Extenso",
      warningBody: "El procesamiento se realizará normalmente. Para máxima densidad relacional, textos de hasta 6.000 palabras son ideales.",
      contextLabel: "Contexto Temático Principal (Obligatorio)",
      contextPlaceholder: "Ej: SEO Semántico, Arquitectura de la Información, Medicina Veterinaria...",
      contextHelp: "Ancla la extracción semántica al dominio temático y desambigua términos homónimos.",
      contextActive: "Contexto Activo",
      contextRequired: "Condición Obligatoria",
      contextQuickSuggestions: "Sugerencias rápidas para probar:",
      contextAlertTitle: "Análisis Bloqueado: El contexto temático es condición indispensable para generar el análisis",
      contextAlertBody: "Para que el modelo no mapee entidades desconectadas o capture términos aleatorios, necesita conocer previamente el tema del documento. Escriba libremente en el campo superior o haga clic en una sugerencia para desbloquear la extracción.",
      tabEditor: "Editor de Texto",
      tabAnnotated: "Entidades Resaltadas",
      annotatedEmpty: "Ejecute la extracción primero para visualizar las entidades anotadas directamente en el texto fuente.",
      wordsCount: "palabras",
      charsCount: "caracteres",
      paragraphsCount: "párrafos",
      readingTime: "min de lectura",
      btnClear: "Limpiar",
      textLabel: "Texto Fuente para Análisis y Extracción",
      textPlaceholder: "Pegue el texto completo del artículo, página o documento para mapear...",
      dragDropHint: "Consejo: Puede arrastrar y soltar archivos .txt o .md directamente aquí.",
      waitingText: "Esperando texto...",
      readyText: "Texto listo para extracción",
      blockedReduce: "Bloqueado: Reduzca el Texto (≤ 15k palabras)",
      taxonomyLabel: "Taxonomía Relacional",
      thresholdLabel: "Umbral Mínimo de Confianza",
      btnExtract: "Extraer Grafo de Conocimiento",
      btnExtracting: "Mapeando Entidades & Relaciones...",
      btnSample: "Cargar Ejemplo",
      taxonomyOptions: {
        semantic_seo: "SEO Semántico & Topic Clusters (Recomendado para Artículos)",
        wiki80: "Wikidata & Conocimiento General (Ontología Abierta)",
        tacred: "Corporativo & Perfiles de Personas (Stanford TACRED)",
      },
      lockActiveDefineContext: "Bloqueo Activo: Definir Contexto",
      goToField: "Ir al campo",
    },
    tabs: {
      graph: "Grafo Interactivo",
      triplets: "Tabla de Tripletas",
      analytics: "Métricas de Red",
      taxonomy: "Taxonomía & Ontologías",
      optimizer: "Optimizador Editorial",
    },
    graph: {
      searchPlaceholder: "Buscar entidad en el grafo...",
      zoomIn: "Acercar (Zoom In)",
      zoomOut: "Alejar (Zoom Out)",
      resetZoom: "Restablecer Vista",
      downloadSvg: "Exportar Grafo en SVG Vectorial",
      toggleEdgeLabels: "Alternar Etiquetas de Aristas",
      hideEdgeLabels: "Ocultar etiquetas de aristas",
      showEdgeLabels: "Mostrar etiquetas de aristas",
      filterTypes: "Tipos de Entidad:",
      showAll: "Mostrar Todos",
      confidence: "confianza",
      clickToInspect: "Haga clic en la entidad para inspeccionar",
      emptyGraphTitle: "Ningún Grafo de Conocimiento generado todavía",
      emptyGraphSubtitle: "Ingrese el contexto temático y el texto fuente a la izquierda para mapear entidades y relaciones ontológicas.",
      tooltipConfidence: "confianza",
      tooltipClickRelation: "Haga clic en la relación para ver detalles",
    },
    triplets: {
      title: "Tripletas de Relación Extraídas",
      searchPlaceholder: "Filtrar por entidad o predicado...",
      filterAll: "Todas las Relaciones",
      thHead: "Entidad Origen (Sujeto)",
      thRelation: "Predicado (Relación)",
      thTail: "Entidad Destino (Objeto)",
      thConfidence: "Confianza",
      thEvidence: "Evidencia Textual",
      thActions: "Acciones",
      empty: "No se han extraído relaciones aún. Ejecute la extracción arriba.",
      emptySearch: "No se encontraron tripletas para los criterios seleccionados.",
      btnAddRelation: "Agregar Tripleta Manual",
      modalTitle: "Agregar Relación Manual",
      headLabel: "Entidad Origen (Sujeto)",
      relationLabel: "Predicado (Relación)",
      tailLabel: "Entidad Destino (Objeto)",
      evidenceLabel: "Evidencia Textual (Opcional)",
      qualifiersLabel: "Calificadores (Clave / Valor)",
      btnSave: "Guardar Relación",
      btnCancel: "Cancelar",
    },
    metrics: {
      title: "Métricas de Red & Centralidad del Grafo",
      subtitle: "Evalúe el diámetro conceptual, la conectividad y la jerarquía de autoridades del documento.",
      pillarCardTitle: "Entidad Pilar & Foco Temático",
      pillarCardDesc: "Identifica el núcleo conceptual más conectado en el grafo y evalúa la alineación con su contexto temático.",
      focusAligned: "está perfectamente alineada con el contexto temático",
      focusAlert: "Alerta de dispersión: La entidad más conectada difiere del contexto definido. Verifique que el artículo no esté desviando el foco.",
      focusGravity: "actúa como centro de gravedad de conocimiento del documento.",
      noContextPrompt: "Defina un contexto temático para evaluar la alineación del foco.",
      densityTitle: "Densidad Relacional por 100 Palabras",
      highDensity: "Alta Densidad Relacional",
      highDensityDesc: "Excelente riqueza de predicados. El texto construye puentes conceptuales continuos entre los temas.",
      balancedDensity: "Densidad Equilibrada",
      balancedDensityDesc: "Ritmo semántico saludable. Los términos centrales están conectados con claridad gramatical.",
      lowDensity: "Densidad Baja",
      lowDensityDesc: "Pocas relaciones explícitas detectadas. Se recomienda conectar más entidades con verbos activos.",
      centralEntitiesTitle: "Entidades con Mayor Grado de Conexión",
      centralEntitiesDesc: "Nodos con mayor centralidad estructural e influencia topológica en el grafo de conocimiento.",
    },
    optimizer: {
      title: "Diagnóstico Editorial & Conectividad Semántica",
      subtitle: "Audite entidades desconectadas, brechas de autoridad y reciba sugerencias de reescritura con verbos activos.",
      btnRunAnalysis: "Ejecutar Diagnóstico Editorial",
      btnAnalyzing: "Analizando Conectividad Semántica...",
      scoreLabel: "Índice de Conectividad",
      scoreLevel: "Nivel de Conectividad",
      btnApplyOptimized: "Aplicar Texto Optimizado",
      appliedSuccess: "¡Texto optimizado aplicado con éxito!",
      btnExportMarkdown: "Exportar Dossier (Markdown)",
      copiedMarkdown: "¡Markdown Copiado!",
      tabOverview: "Visión General Optimizada",
      tabComparison: "Comparativa Antes vs. Después",
      tabDiff: "Diff Granular",
      tabSideBySide: "Lado a Lado",
      isolatedTitle: "Entidades Aisladas (Sin Conexión en el Grafo)",
      isolatedDesc: "Entidades mencionadas en el texto que carecen de aristas dirigidas hacia otros nodos.",
      connectWith: "Conectar con",
      editorialOption: "Opción Editorial (Estilo Fluido)",
      seoOption: "Opción SEO Directo (Tripleta Ontológica)",
      btnApplySnippet: "Aplicar este fragmento en el editor",
      btnCopySnippet: "Copiar fragmento",
      topicalGapsTitle: "Brechas de Autoridad Temática (Topical Gaps)",
      topicalGapsDesc: "Conceptos fundamentales que los motores de búsqueda esperan encontrar en su nicho temático.",
      whyEssential: "Por qué es esencial:",
      recommendedRelation: "Relación recomendada:",
      suggestedSnippet: "Sugerencia para insertar:",
      btnInsertGap: "Insertar al final del artículo",
      rewritesTitle: "Sugerencias de Reescritura con Conexiones Activas",
      rewritesDesc: "Frases reestructuradas para transformar pasajes estáticos en tripletas relacionales con verbos de acción.",
      originalSnippet: "Original:",
      optimizedSnippet: "Optimizado:",
      emptyTitle: "Ningún Diagnóstico Generado Todavía",
      emptyDesc: "Haga clic en 'Ejecutar Diagnóstico Editorial' para auditar entidades aisladas y recibir sugerencias de reescritura.",
    },
    detailModal: {
      title: "Detalles de la Entidad",
      viewWikidata: "Ver en Wikidata",
      confidence: "Confianza en la Extracción",
      degree: "Grado Total de Conexión",
      relationsUnit: "relaciones",
      aliasesTitle: "Formas de Superficie & Sinónimos (Aliases):",
      outgoingTitle: "Relaciones Salientes (Outgoing):",
      incomingTitle: "Relaciones Entrantes (Incoming):",
      noOutgoing: "Ninguna relación saliente.",
      noIncoming: "Ninguna relación entrante.",
      copyCypher: "Copiar Consulta Cypher (Neo4j)",
      copiedCypher: "¡Consulta Cypher Copiada!",
      close: "Cerrar",
    },
    howItWorks: {
      title: "Cómo Opera Graph Studio la Extracción",
      subtitle: "Metodología de tres etapas basada en ontologías científicas y modelos neuronales de vanguardia.",
      step1Number: "01",
      step1Title: "Reconocimiento de Entidades (NER)",
      step1Desc: "Identifica y clasifica nodos fundamentales (personas, organizaciones, lugares, tecnologías, conceptos y productos) presentes en el texto.",
      step2Number: "02",
      step2Title: "Extracción de Relaciones (OpenNRE)",
      step2Desc: "Mapea las aristas dirigidas con predicción de confianza y extracción de evidencias citadas en el documento.",
      step3Number: "03",
      step3Title: "Grafo Interactivo & Exportación",
      step3Desc: "Renderiza en tiempo real con D3.js y exporta las tripletas directamente a Cypher (Neo4j), Turtle (RDF) o JSON-LD.",
    },
    toasts: {
      contextRequired: "Contexto Obligatorio: El análisis está bloqueado. El contexto temático es indispensable para evitar entidades desconectadas.",
      extractError: "Error al extraer relaciones del servidor.",
      optimizeError: "Error al analizar la conectividad del texto.",
      appliedSuccess: "¡Texto optimizado aplicado con éxito! Reextrayendo relaciones y enriqueciendo el grafo...",
      snippetReplaced: "¡Fragmento reemplazado con éxito en el editor!",
      snippetNotFound: "No se localizó con exactitud el fragmento original. Cópielo para pegarlo manualmente.",
      gapInserted: "¡Tema sugerido insertado al final del documento!",
    },
    footer: {
      tagline: "Graph Studio & Knowledge Engine",
      consulting: "Consultoría Semántico SEO",
      blog: "Blog",
      contactExpert: "Hable con un Especialista",
      rights: "Todos los derechos reservados.",
    },
    common: {
      loading: "Cargando...",
      success: "Éxito",
      error: "Error",
      close: "Cerrar",
      copy: "Copiar",
      copied: "¡Copiado!",
    },
  },
};

const STORAGE_UI_LANG_KEY = "semantico_ui_lang";

export function getInitialUiLang(): SupportedLang {
  try {
    const saved = localStorage.getItem(STORAGE_UI_LANG_KEY);
    if (saved === "pt" || saved === "en" || saved === "es") {
      return saved;
    }
    const navLang = navigator.language?.toLowerCase() || "";
    if (navLang.startsWith("es")) return "es";
    if (navLang.startsWith("en")) return "en";
  } catch (e) {
    console.error("Erro ao obter uiLang inicial:", e);
  }
  return "pt";
}

export function saveStoredUiLang(lang: SupportedLang): void {
  try {
    localStorage.setItem(STORAGE_UI_LANG_KEY, lang);
  } catch (e) {
    console.error("Erro ao salvar uiLang:", e);
  }
}

export function getTranslations(lang?: SupportedLang | string): Translations {
  if (lang === "en") return TRANSLATIONS.en;
  if (lang === "es") return TRANSLATIONS.es;
  return TRANSLATIONS.pt;
}
