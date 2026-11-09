import { TaxonomyInfo } from '../types';

export const TAXONOMIES: Record<string, TaxonomyInfo> = {
  semantic_seo: {
    id: 'semantic_seo',
    name: 'SEO Semântico & Topic Clusters (Schema.org / Artigos)',
    author: 'Semântico Studio',
    description: 'Ontologia desenhada especificamente para redação, arquitetura de conteúdo, clusters de tópicos (Pillar/Cluster), intenção de busca, E-E-A-T e otimização semântica.',
    relationCount: 16,
    defaultRelations: [
      {
        relation: 'subtopic_of',
        label: 'Subtopic Of / Pillar-Cluster',
        description: 'Entidade é um subtópico especializado ou conceito satélite de um tópico pilar principal',
        headType: ['Concept', 'Technology', 'Method'],
        tailType: ['Concept'],
        example: 'Orçamento de Rastreamento é um subtópico fundamental de SEO Técnico.'
      },
      {
        relation: 'optimizes',
        label: 'Optimizes / Enhances',
        description: 'Técnica, ferramenta ou elemento melhora diretamente uma métrica, posicionamento ou desempenho',
        headType: ['Method', 'Technology', 'Concept'],
        tailType: ['Metric', 'Concept', 'Technology'],
        example: 'A minificação de scripts otimiza a métrica de LCP (Largest Contentful Paint).'
      },
      {
        relation: 'impacts',
        label: 'Impacts / Influences',
        description: 'Entidade influencia, altera ou produz consequências diretas sobre o resultado',
        headType: ['Concept', 'Technology', 'Metric', 'Event'],
        tailType: ['Concept', 'Metric'],
        example: 'A velocidade de carregamento da página impacta a taxa de conversão e a taxa de rejeição.'
      },
      {
        relation: 'solves_problem',
        label: 'Solves Problem / Pain Point',
        description: 'Solução, ferramenta ou diretiva técnica resolve uma dor específica do usuário ou erro de rastreamento',
        headType: ['Technology', 'Method', 'Product', 'Concept'],
        tailType: ['Concept'],
        example: 'A tag canonical resolve o problema de conteúdo duplicado entre URLs semelhantes.'
      },
      {
        relation: 'answers_intent',
        label: 'Answers Search Intent',
        description: 'Conteúdo, seção ou resposta satisfaz uma intenção de busca específica (Informacional, Comercial, Transacional, Navegacional)',
        headType: ['Concept', 'Product', 'Work'],
        tailType: ['Concept'],
        example: 'A tabela comparativa atende à intenção de busca comercial do leitor.'
      },
      {
        relation: 'targets_audience',
        label: 'Targets Audience / Persona',
        description: 'Artigo ou solução é endereçado a uma persona, leitor ou público específico',
        headType: ['Concept', 'Product', 'Work'],
        tailType: ['Concept', 'Person', 'Organization'],
        example: 'O guia avançado é direcionado a arquitetos de informação e engenheiros de dados.'
      },
      {
        relation: 'measures',
        label: 'Measures / Audits',
        description: 'Ferramenta, auditoria ou indicador quantifica e avalia o estado do alvo',
        headType: ['Technology', 'Product', 'Method'],
        tailType: ['Metric', 'Concept', 'Technology'],
        example: 'O Google Search Console mede a taxa de cliques (CTR) e erros de rastreamento.'
      },
      {
        relation: 'configures',
        label: 'Configures / Governs',
        description: 'Arquivo, diretiva ou parâmetro governa o comportamento ou execução do sistema alvo',
        headType: ['Technology', 'Product', 'Concept'],
        tailType: ['Technology', 'Concept'],
        example: 'O arquivo robots.txt configura o comportamento do Googlebot.'
      },
      {
        relation: 'alternative_to',
        label: 'Alternative To / Competitor',
        description: 'Produto, ferramenta ou método concorre ou serve como alternativa direta ao alvo',
        headType: ['Product', 'Technology', 'Method'],
        tailType: ['Product', 'Technology', 'Method'],
        example: 'O Matomo Analytics é uma alternativa focada em privacidade ao Google Analytics.'
      },
      {
        relation: 'recommends',
        label: 'Recommends / Endorses',
        description: 'Conteúdo, especialista ou guia recomenda o uso de uma ferramenta, prática ou produto',
        headType: ['Person', 'Organization', 'Work', 'Concept'],
        tailType: ['Product', 'Technology', 'Method'],
        example: 'O artigo recomenda o Screaming Frog para auditorias de URLs.'
      },
      {
        relation: 'requires',
        label: 'Requires / Prerequisite',
        description: 'Estratégia ou processo depende obrigatoriamente do alvo como pré-requisito funcional',
        headType: ['Method', 'Technology', 'Concept'],
        tailType: ['Technology', 'Concept', 'Metric'],
        example: 'A indexação em buscadores requer resposta de servidor com código HTTP 200.'
      },
      {
        relation: 'component_of',
        label: 'Component Of / Part Of',
        description: 'Elemento compõe a estrutura, sintaxe ou arquitetura do alvo',
        headType: ['Technology', 'Concept', 'Metric'],
        tailType: ['Technology', 'Concept'],
        example: 'O vocabulário Schema.org é um componente estrutural da Web Semântica.'
      },
      {
        relation: 'enables',
        label: 'Enables / Facilitates',
        description: 'Entidade desbloqueia, viabiliza ou facilita o recurso ou resultado alvo',
        headType: ['Technology', 'Concept', 'Method'],
        tailType: ['Concept', 'Technology'],
        example: 'A marcação JSON-LD habilita a exibição de Rich Snippets nas SERPs do Google.'
      },
      {
        relation: 'defined_as',
        label: 'Defined As / Characterized As',
        description: 'Definição ontológica de um conceito, termo técnico ou padrão',
        headType: ['Concept', 'Technology'],
        tailType: ['Concept'],
        example: 'O Crawl Budget é definido como o limite de requisições que o bot pode alocar ao site.'
      },
      {
        relation: 'authored_by',
        label: 'Authored By (E-E-A-T)',
        description: 'Atribuição de autoria, autoridade ou criador de uma metodologia ou conteúdo',
        headType: ['Work', 'Concept', 'Product'],
        tailType: ['Person', 'Organization'],
        example: 'As diretrizes do Google Search Essentials foram publicadas pelo Google Search Central.'
      },
      {
        relation: 'uses_technology',
        label: 'Uses Technology / Implements',
        description: 'Sistema ou entidade emprega ou integra software, algoritmo ou protocolo',
        headType: ['Technology', 'Organization', 'Person'],
        tailType: ['Technology', 'Product'],
        example: 'O crawler do Google utiliza o motor headless Chromium para renderização de páginas modernas.'
      }
    ]
  },
  wiki80: {
    id: 'wiki80',
    name: 'Wikidata & Conhecimento Geral (Ontologia Aberta)',
    author: 'THU-NLP / Wikidata',
    description: '80 relações enciclopédicas fundamentadas na Wikidata e Wikipedia, padrão universal em ontologias de grafos.',
    relationCount: 80,
    defaultRelations: [
      {
        relation: 'founded_by',
        label: 'Founded By',
        description: 'Organization was established or founded by the entity',
        headType: ['Organization'],
        tailType: ['Person', 'Organization'],
        example: 'Apple was founded by Steve Jobs and Steve Wozniak in 1976.'
      },
      {
        relation: 'headquarters_location',
        label: 'Headquarters Location',
        description: 'City, region, or country where an organization has its primary office',
        headType: ['Organization'],
        tailType: ['Location', 'Country'],
        example: 'Google maintains its headquarters in Mountain View, California.'
      },
      {
        relation: 'country_of_citizenship',
        label: 'Country of Citizenship',
        description: 'The country where a person holds citizenship or nationality',
        headType: ['Person'],
        tailType: ['Country', 'Location'],
        example: 'Albert Einstein was born in Germany and later gained Swiss and American citizenship.'
      },
      {
        relation: 'educated_at',
        label: 'Educated At',
        description: 'University or institution attended by a person',
        headType: ['Person'],
        tailType: ['Organization'],
        example: 'Marie Curie studied at the University of Paris.'
      },
      {
        relation: 'parent_company',
        label: 'Parent Company / Owned By',
        description: 'Holding entity or parent organization that controls another',
        headType: ['Organization'],
        tailType: ['Organization'],
        example: 'Instagram is a subsidiary owned by Meta Platforms.'
      },
      {
        relation: 'developer_of',
        label: 'Developer Of',
        description: 'Entity or person that created, designed, or developed a software or technology',
        headType: ['Person', 'Organization'],
        tailType: ['Technology', 'Product'],
        example: 'THU-NLP developed the OpenNRE toolkit for relation extraction.'
      },
      {
        relation: 'subclass_of',
        label: 'Subclass Of / Instance Of',
        description: 'Ontological hierarchy relation or type categorization',
        headType: ['Concept', 'Technology'],
        tailType: ['Concept'],
        example: 'Graph databases are a subclass of NoSQL database management systems.'
      },
      {
        relation: 'part_of',
        label: 'Part Of / Component Of',
        description: 'Structural or functional component of another entity',
        headType: ['Concept', 'Technology', 'Product'],
        tailType: ['Concept', 'Technology', 'Product'],
        example: 'The DOM is part of the HTML standard architecture.'
      },
      {
        relation: 'optimizes',
        label: 'Optimizes / Enhances',
        description: 'Entity improves performance, efficiency, ranking, or quality of target',
        headType: ['Technology', 'Concept', 'Product'],
        tailType: ['Concept', 'Technology', 'Product'],
        example: 'Compressing images optimizes the Largest Contentful Paint (LCP).'
      },
      {
        relation: 'impacts',
        label: 'Impacts / Influences',
        description: 'Entity directly influences, alters, or has consequences on target',
        headType: ['Concept', 'Technology', 'Event'],
        tailType: ['Concept', 'Technology'],
        example: 'Page load speed impacts user retention and conversion rates.'
      },
      {
        relation: 'requires',
        label: 'Requires / Depends On',
        description: 'Entity depends on or requires target to execute or function properly',
        headType: ['Technology', 'Concept'],
        tailType: ['Technology', 'Concept'],
        example: 'Server-side rendering requires a Node.js execution runtime.'
      },
      {
        relation: 'measures',
        label: 'Measures / Evaluates',
        description: 'Metric, tool, or audit quantifies or evaluates target performance',
        headType: ['Technology', 'Concept'],
        tailType: ['Concept', 'Technology'],
        example: 'PageSpeed Insights measures Core Web Vitals performance.'
      },
      {
        relation: 'configures',
        label: 'Configures / Governs',
        description: 'File, directive, or parameter defines the behavior of target',
        headType: ['Technology', 'Product', 'Concept'],
        tailType: ['Technology', 'Concept'],
        example: 'The robots.txt file configures Googlebot crawl behavior.'
      },
      {
        relation: 'uses_technology',
        label: 'Uses Technology / Implements',
        description: 'System or entity employs or integrates target software or standard',
        headType: ['Organization', 'Technology', 'Person'],
        tailType: ['Technology', 'Product'],
        example: 'The modern web crawler uses headless Chromium for JavaScript rendering.'
      },
      {
        relation: 'enables',
        label: 'Enables / Facilitates',
        description: 'Entity unlocks, facilitates, or makes target process possible',
        headType: ['Technology', 'Concept'],
        tailType: ['Concept', 'Technology'],
        example: 'Structured data enables rich snippets in Google search results.'
      },
      {
        relation: 'monitors',
        label: 'Monitors / Analyzes',
        description: 'Tool or process observes, tracks, or inspects target system',
        headType: ['Technology', 'Concept'],
        tailType: ['Technology', 'Concept'],
        example: 'Google Search Console monitors search index coverage and crawl errors.'
      },
      {
        relation: 'spouse',
        label: 'Spouse',
        description: 'Marriage or civil partnership between two persons',
        headType: ['Person'],
        tailType: ['Person'],
        example: 'Pierre Curie was married to Marie Curie.'
      },
      {
        relation: 'author',
        label: 'Author Of',
        description: 'Person or group who created a literary, scientific, or artistic work',
        headType: ['Work'],
        tailType: ['Person'],
        example: 'Dom Casmurro was written by Machado de Assis.'
      },
      {
        relation: 'capital_of',
        label: 'Capital Of',
        description: 'City that serves as the official capital of a territory or country',
        headType: ['Location'],
        tailType: ['Country', 'Location'],
        example: 'Brasília is the federal capital of Brazil.'
      },
      {
        relation: 'award_received',
        label: 'Award Received',
        description: 'Honor, prize, or award bestowed upon an entity',
        headType: ['Person', 'Organization', 'Work'],
        tailType: ['Award'],
        example: 'Richard Feynman was awarded the Nobel Prize in Physics.'
      },
      {
        relation: 'member_of',
        label: 'Member Of',
        description: 'Entity belongs to a collective body, alliance, or group',
        headType: ['Person', 'Organization', 'Country'],
        tailType: ['Organization', 'Event'],
        example: 'Brazil is a founding member of Mercosul and BRICS.'
      }
    ]
  },
  tacred: {
    id: 'tacred',
    name: 'Corporativo & Perfis de Pessoas (Stanford TACRED)',
    author: 'Stanford NLP / TAC KBP',
    description: '42 relações focadas em perfis corporativos, cargos de liderança, subsidiárias, histórico acadêmico e relações entre pessoas.',
    relationCount: 42,
    defaultRelations: [
      {
        relation: 'org:founded_by',
        label: 'org:founded_by',
        description: 'The person or entity that established the organization',
        headType: ['Organization'],
        tailType: ['Person', 'Organization'],
        example: 'Microsoft was founded by Bill Gates and Paul Allen.'
      },
      {
        relation: 'org:top_members_employees',
        label: 'org:top_members_employees',
        description: 'Leadership, executives, or key employees of an organization',
        headType: ['Organization'],
        tailType: ['Person'],
        example: 'Satya Nadella serves as the CEO of Microsoft.'
      },
      {
        relation: 'org:subsidiaries',
        label: 'org:subsidiaries',
        description: 'Companies or subsidiaries controlled by the parent organization',
        headType: ['Organization'],
        tailType: ['Organization'],
        example: 'Alphabet Inc. oversees Google, DeepMind, and Waymo.'
      },
      {
        relation: 'per:city_of_birth',
        label: 'per:city_of_birth',
        description: 'The city or town in which a person was born',
        headType: ['Person'],
        tailType: ['Location'],
        example: 'Alan Turing was born in Maida Vale, London.'
      },
      {
        relation: 'per:title',
        label: 'per:title',
        description: 'Official title, role, or profession of a person',
        headType: ['Person'],
        tailType: ['Concept'],
        example: 'Tim Cook is the Chief Executive Officer of Apple Inc.'
      },
      {
        relation: 'per:schools_attended',
        label: 'per:schools_attended',
        description: 'Academic institutions, universities, or schools attended',
        headType: ['Person'],
        tailType: ['Organization'],
        example: 'Sundar Pichai attended Stanford University and Wharton School.'
      }
    ]
  }
};
