import { TaxonomyInfo } from '../types';

export const TAXONOMIES: Record<string, TaxonomyInfo> = {
  wiki80: {
    id: 'wiki80',
    name: 'OpenNRE Wiki80 (Wikidata)',
    author: 'THU-NLP / Han et al.',
    description: '80 common relations derived from Wikidata and Wikipedia, standard in OpenNRE pretrained models (BERT, RoBERTa, CNN).',
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
    name: 'TACRED (Stanford NLP)',
    author: 'Zhang et al. / Stanford',
    description: '42 fine-grained relations focused on Person and Organization profiles from the TAC KBP challenges.',
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
  },
  fewrel: {
    id: 'fewrel',
    name: 'FewRel (Few-shot RE)',
    author: 'THU-NLP / Han et al.',
    description: '100 relation categories tailored for few-shot relation extraction across diverse domains.',
    relationCount: 100,
    defaultRelations: [
      {
        relation: 'P17_country',
        label: 'Country (P17)',
        description: 'Sovereign state of an entity',
        headType: ['Location', 'Organization', 'Event'],
        tailType: ['Country'],
        example: 'The Amazon Rainforest is predominantly located in Brazil.'
      },
      {
        relation: 'P495_country_of_origin',
        label: 'Country of Origin (P495)',
        description: 'Country where a creative work, organization, or brand originated',
        headType: ['Product', 'Work', 'Organization'],
        tailType: ['Country'],
        example: 'Embraer is an aerospace manufacturer originating from Brazil.'
      },
      {
        relation: 'P106_occupation',
        label: 'Occupation (P106)',
        description: 'Primary professional activity of a person',
        headType: ['Person'],
        tailType: ['Concept'],
        example: 'Carl Sagan was an astronomer, astrophysicist, and author.'
      },
      {
        relation: 'P1344_participant_in',
        label: 'Participant In (P1344)',
        description: 'Event or initiative in which the entity participated',
        headType: ['Person', 'Organization', 'Country'],
        tailType: ['Event'],
        example: 'NASA participated in the Apollo 11 moon landing mission.'
      }
    ]
  },
  semeval: {
    id: 'semeval',
    name: 'SemEval-2010 Task 8',
    author: 'Hendrickx et al.',
    description: '9 classic semantic relations capturing abstract cognitive relationships between nominals.',
    relationCount: 9,
    defaultRelations: [
      {
        relation: 'Cause-Effect',
        label: 'Cause-Effect',
        description: 'An event or object causes an effect or outcome',
        headType: ['Event', 'Concept'],
        tailType: ['Event', 'Concept'],
        example: 'The earthquake generated a massive tsunami along the coastline.'
      },
      {
        relation: 'Component-Whole',
        label: 'Component-Whole',
        description: 'Head entity is an operational or physical component of Tail entity',
        headType: ['Product', 'Technology'],
        tailType: ['Product', 'Technology'],
        example: 'The transformer neural network is a core component of Large Language Models.'
      },
      {
        relation: 'Product-Producer',
        label: 'Product-Producer',
        description: 'Object or entity created by a maker or manufacturer',
        headType: ['Product', 'Technology'],
        tailType: ['Organization', 'Person'],
        example: 'The Falcon 9 rocket is manufactured by SpaceX.'
      },
      {
        relation: 'Entity-Destination',
        label: 'Entity-Destination',
        description: 'Entity moving towards or designated for a destination',
        headType: ['Product', 'Person'],
        tailType: ['Location'],
        example: 'The Perseverance rover traveled across space to Mars.'
      },
      {
        relation: 'Member-Collection',
        label: 'Member-Collection',
        description: 'Entity is a member of an aggregation, dataset, or collective group',
        headType: ['Concept', 'Organization'],
        tailType: ['Organization', 'Concept'],
        example: 'Wiki80 is a dataset member of the OpenNRE benchmark suite.'
      }
    ]
  },
  custom: {
    id: 'custom',
    name: 'Custom / Open Schema',
    author: 'User Defined Ontology',
    description: 'Flexible domain-specific ontology for biomedical, legal, intelligence, or business knowledge graphs.',
    relationCount: 0,
    defaultRelations: []
  }
};
