export interface TextSample {
  id: string;
  title: string;
  category: string;
  language: 'pt' | 'en';
  taxonomy: 'wiki80' | 'tacred' | 'fewrel' | 'semeval' | 'custom';
  text: string;
  description: string;
}

export const TEXT_SAMPLES: TextSample[] = [
  {
    id: 'custom-empty',
    title: 'Put your text here',
    category: 'Custom Input',
    language: 'pt',
    taxonomy: 'wiki80',
    description: 'Empty workspace ready to paste or type your own custom text.',
    text: ''
  },
  {
    id: 'opennre-thunlp',
    title: 'OpenNRE & Tsinghua University (NLP Ecosystem)',
    category: 'AI & Research',
    language: 'pt',
    taxonomy: 'wiki80',
    description: 'Relações entre laboratórios de IA, frameworks open-source e modelos de linguagem.',
    text: `O framework OpenNRE foi desenvolvido pelo THU-NLP (Laboratório de Processamento de Linguagem Natural da Universidade de Tsinghua), localizado em Pequim, China. O projeto foi liderado pelos pesquisadores Xu Han e Zhiyuan Liu para facilitar o treinamento de redes neurais para Extração de Relações (RE). O OpenNRE integra modelos pré-treinados como BERT e RoBERTa, desenvolvidos pelo Google e Meta respectivamente, e avalia o desempenho em benchmarks como Wiki80, FewRel e TACRED. O laboratório THU-NLP também colabora ativamente com a Academia de Inteligência Artificial de Pequim (BAAI) no desenvolvimento de ontologias de grafos de conhecimento.`
  },
  {
    id: 'tech-giants',
    title: 'Ecossistema Tech & Aquisições (Neo4j, Google, Meta)',
    category: 'Tecnologia & Negócios',
    language: 'pt',
    taxonomy: 'wiki80',
    description: 'Fundadores, sedes, produtos de banco de dados e aquisições corporativas.',
    text: `A empresa Neo4j foi fundada por Emil Eifrem e Johan Svensson em 2007 na Suécia, e atualmente mantém sua sede em San Mateo, Califórnia. O Neo4j desenvolveu a linguagem de consulta Cypher para bancos de dados de grafos. Em 2014, o Google adquiriu a DeepMind, empresa de IA fundada por Demis Hassabis em Londres. Posteriormente, a Meta Platforms, liderada por Mark Zuckerberg em Menlo Park, lançou o framework PyTorch, amplamente utilizado no OpenNRE para extração de entidades e relações em larga escala.`
  },
  {
    id: 'historia-brasil',
    title: 'História & Ciência no Brasil (Fiocruz, USP, Santos Dumont)',
    category: 'História & Ciência',
    language: 'pt',
    taxonomy: 'wiki80',
    description: 'Cientistas históricos, instituições de pesquisa e cidades brasileiras.',
    text: `O cientista e médico Oswaldo Cruz fundou o Instituto Soroterápico Federal em 1900 no Rio de Janeiro, instituição que mais tarde foi renomeada para Fundação Oswaldo Cruz (Fiocruz). O inventor Alberto Santos Dumont, nascido em Minas Gerais, desenvolveu o famoso avião 14-Bis e realizou o primeiro voo homologado em Paris, França, no ano de 1906. Anos mais tarde, o físico César Lattes, formado na Universidade de São Paulo (USP), foi co-descobridor do méson pi junto com Giuseppe Occhialini e Cecil Powell, recebendo reconhecimento internacional.`
  },
  {
    id: 'biomedical-pharma',
    title: 'Biomedical & Pharmacology Network',
    category: 'Saúde & Biologia',
    language: 'en',
    taxonomy: 'custom',
    description: 'Drugs, target proteins, diseases, clinical trials and pharmaceutical manufacturers.',
    text: `Aspirin, developed by the German pharmaceutical company Bayer headquartered in Leverkusen, inhibits the cyclooxygenase enzyme (COX-2) to reduce inflammation and pain. Metformin is widely prescribed to treat Type 2 Diabetes and is manufactured by Merck Group based in Darmstadt, Germany. The World Health Organization (WHO), situated in Geneva, Switzerland, classified SARS-CoV-2 as the causative pathogen of COVID-19, which prompted Pfizer and BioNTech to collaboratively engineer the Comirnaty mRNA vaccine.`
  },
  {
    id: 'space-astronomy',
    title: 'Space Exploration & Astrophysics',
    category: 'Astronomia & Aeroespacial',
    language: 'en',
    taxonomy: 'wiki80',
    description: 'Space agencies, missions, rovers, rockets and celestial discoveries.',
    text: `The James Webb Space Telescope (JWST) was developed by NASA in collaboration with the European Space Agency (ESA) and the Canadian Space Agency (CSA). Launched from Kourou in French Guiana on an Ariane 5 rocket manufactured by Arianespace, JWST orbits the Sun at the second Lagrange point (L2). NASA also oversees the Jet Propulsion Laboratory (JPL) located in Pasadena, California, which operates the Perseverance rover on Mars.`
  }
];
