export type EntityType =
  | 'Person'
  | 'Organization'
  | 'Location'
  | 'Product'
  | 'Event'
  | 'Technology'
  | 'Concept'
  | 'Date'
  | 'Country'
  | 'Work'
  | 'Award'
  | 'Biomedical'
  | 'Other';

export interface Entity {
  id: string;
  text: string;
  type: EntityType;
  startPos?: number;
  endPos?: number;
  confidence?: number;
  aliases?: string[]; // Wikontic-style resolved surface forms / aliases (e.g. ["Altman", "o CEO"])
  wikidataId?: string; // Wikidata Item ID if grounded (e.g. "Q11463", "Q95")
  properties?: Record<string, string | number>;
}

export interface RelationQualifier {
  key: string; // e.g. "time", "year", "role", "condition", "location", "proportion", "target_domain", "stated_in"
  value: string; // e.g. "2026", "Lead Architect", "under high load", "Brazil"
  wikidataProperty?: string; // e.g. "P585" (point in time), "P3831" (object has role), "P580" (start time)
}

export interface RelationTriplet {
  id: string;
  headId: string;
  headText: string;
  headType: EntityType;
  tailId: string;
  tailText: string;
  tailType: EntityType;
  relation: string; // e.g. "founded_by", "headquarters_location", "member_of"
  relationLabel: string; // Human-friendly label
  taxonomy: string; // 'wiki80' | 'tacred' | 'fewrel' | 'semeval' | 'custom'
  confidence: number; // 0.00 - 1.00
  evidence?: string; // Text snippet / sentence containing the relation
  direction?: 'DIRECTED' | 'UNDIRECTED' | 'BIDIRECTIONAL';
  qualifiers?: RelationQualifier[]; // Wikontic-inspired Edge Qualifiers (time, role, condition, etc.)
  properties?: Record<string, string | number>;
}

export interface ExtractionResponse {
  entities: Entity[];
  relations: RelationTriplet[];
  rawText: string;
  taxonomy: string;
  executionTimeMs: number;
  modelUsed: string;
  summary: {
    totalEntities: number;
    totalRelations: number;
    avgConfidence: number;
    density: number;
  };
}

export type TaxonomyType = 'wiki80' | 'tacred' | 'fewrel' | 'semeval' | 'custom';

export interface TaxonomyRelationDef {
  relation: string;
  label: string;
  description: string;
  headType: EntityType[];
  tailType: EntityType[];
  example?: string;
}

export interface TaxonomyInfo {
  id: TaxonomyType;
  name: string;
  author: string;
  description: string;
  relationCount: number;
  defaultRelations: TaxonomyRelationDef[];
}

export interface IsolatedEntityDiagnostic {
  entity: string;
  type: string;
  contextSentence?: string; // Frase original onde a entidade aparece no texto
  reason: string; // Diagnóstico amigável para redator/copywriter
  suggestedFix?: string; // Resumo rápido da conexão recomendada
  targetEntityToConnect?: string; // Entidade central recomendada para conexão
  recommendedRelation?: string; // Predicado sugerido (ex: utiliza_algoritmo, desenvolvido_por)
  editorialOption?: string; // Reescrita estilística/criativa (mantém a voz autoral do redator)
  seoDirectOption?: string; // Reescrita semântica direta (sujeito + verbo ativo + objeto)
}

export interface TextOptimizationAnalysis {
  connectivityScore: number; // 0 - 100
  connectivityLevel: 'Low' | 'Moderate' | 'Good' | 'High';
  diagnosisSummary: string;
  isolatedEntities: IsolatedEntityDiagnostic[];
  implicitOrWeakRelations: Array<{
    headEntity: string;
    tailEntity: string;
    issue: string;
    suggestedRelation: string;
    howToClarify: string;
  }>;
  rewriteSuggestions: Array<{
    originalSnippet: string;
    suggestedSnippet: string;
    explanation: string;
    relationUnlocked: string;
  }>;
  optimizedText: string;
  expectedNewRelations: string[];
  keyImprovements: string[];
}

export type ExportFormat =
  | 'cypher'
  | 'turtle'
  | 'jsonld'
  | 'graphml'
  | 'gremlin'
  | 'csv-nodes'
  | 'csv-edges';

export interface AuthSession {
  authenticated: boolean;
  token: string;
  label?: string;
  expiresAt?: string | null;
}

export interface AccessKeyEntry {
  key: string;
  label: string;
  expiresAt: string | null; // ISO format or null for perpetual
  active: boolean;
}

export type UserRole = 'admin' | 'client';
export type UserStatus = 'active' | 'pending' | 'blocked' | 'expired';
export type SubscriptionPlan = 'trial' | 'monthly' | 'annual' | 'lifetime';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  status: UserStatus;
  plan: SubscriptionPlan;
  createdAt: string;
  notes?: string;
  usageCount: number;
  updatedAt?: string;
}
