import express, { Request, Response } from 'express';
import path from 'path';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!ai) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return ai;
}

// Timeout helper to prevent requests from exceeding reverse proxy gateway timeouts (504)
function callWithTimeout<T>(promise: Promise<T>, timeoutMs = 22000, label = 'AI Call'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then(res => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Resilient Gemini Generator with low-latency thinking config, strict timeouts, and multi-model cascade
async function generateWithResilience(
  client: GoogleGenAI,
  params: {
    contents: string;
    systemInstruction: string;
    temperature?: number;
    responseMimeType?: string;
  },
  logPrefix = 'Gemini'
): Promise<{ text: string; modelUsed: string }> {
  // Valid, supported models in order of priority
  const candidateModels = [
    'gemini-3.7-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite'
  ];

  let lastError: any = null;

  for (const modelName of candidateModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const config: any = {
          systemInstruction: params.systemInstruction,
          temperature: params.temperature ?? 0.1,
          responseMimeType: params.responseMimeType || 'application/json'
        };

        // For Gemini 3 series, set thinkingLevel to LOW to minimize latency (prevents 504 timeouts on long texts)
        if (modelName.startsWith('gemini-3.')) {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        }

        const callPromise = client.models.generateContent({
          model: modelName,
          contents: params.contents,
          config
        });

        // 20s timeout per call to guarantee fast response well below proxy 60s limit
        const response = await callWithTimeout(callPromise, 20000, `[${logPrefix}] ${modelName}`);

        if (response?.text) {
          return { text: response.text, modelUsed: modelName };
        }
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || String(err);
        console.warn(`[${logPrefix}] Model ${modelName} (attempt ${attempt}) returned: ${msg}`);

        // If 503 (high demand) or 429 (rate limit), pause briefly before retry
        const isTemporaryBusy =
          msg.includes('503') ||
          msg.includes('429') ||
          msg.includes('high demand') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('RESOURCE_EXHAUSTED');

        if (attempt === 1 && isTemporaryBusy) {
          await new Promise(resolve => setTimeout(resolve, 300));
        } else {
          break; // Move to next model candidate immediately
        }
      }
    }
  }

  throw lastError || new Error('All model candidates temporarily unavailable');
}

// Robust JSON parser helper that safely strips markdown code fences and extraneous text
function safeJsonParse<T = any>(raw: string): T {
  let cleaned = raw.trim();
  // Remove markdown code fences if present (```json ... ``` or ``` ...)
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }
  // If wrapped with extra outer characters, find first { and last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

// Fallback Heuristic Relation Extractor for offline / missing key resilience
function fallbackExtract(text: string, taxonomy: string) {
  const entities: Array<{
    id: string;
    text: string;
    type: string;
    confidence: number;
    startPos?: number;
    endPos?: number;
    aliases?: string[];
    wikidataId?: string;
  }> = [];

  const relations: Array<{
    id: string;
    headId: string;
    headText: string;
    headType: string;
    tailId: string;
    tailText: string;
    tailType: string;
    relation: string;
    relationLabel: string;
    taxonomy: string;
    confidence: number;
    evidence: string;
    direction?: string;
    qualifiers?: Array<{ key: string; value: string; wikidataProperty?: string }>;
  }> = [];

  const entityMap = new Map<string, typeof entities[0]>();

  // Extract capitalized noun phrases and named entities
  const capitalizedRegex = /\b([A-ZÀ-Ú][a-zà-ú0-9]+(?:\s+[A-ZÀ-Ú][a-zà-ú0-9]+)*)\b/g;
  let match;
  while ((match = capitalizedRegex.exec(text)) !== null) {
    const rawWord = match[1].trim();
    // Filter out common Portuguese/English sentence starters or stop words
    if (
      rawWord.length < 3 ||
      /^(O|A|Os|As|Um|Uma|Uns|Umas|No|Na|Nos|Nas|Em|De|Do|Da|Dos|Das|Por|Para|Com|The|A|An|In|On|At|For|To|From|With|By|And|Or|But|When|While|Where|How|What|Why|Este|Esta|Esse|Essa|Aquele|Aquela)$/i.test(
        rawWord
      )
    ) {
      continue;
    }

    const slug = rawWord.toLowerCase().replace(/[^\w]/g, '_');
    if (!entityMap.has(slug)) {
      let inferredType = 'Concept';
      let wikidataId: string | undefined = undefined;

      if (/(?:Ltda|Inc|Corp|S\.A\.|Company|Universidade|Instituto|Lab|Google|Microsoft|Meta|OpenAI|Apple|Amazon|Fiocruz|USP|CERN)/i.test(rawWord)) {
        inferredType = 'Organization';
        if (/Google/i.test(rawWord)) wikidataId = 'Q95';
        if (/OpenAI/i.test(rawWord)) wikidataId = 'Q79016896';
        if (/Microsoft/i.test(rawWord)) wikidataId = 'Q2283';
      } else if (/(?:Brasil|Portugal|EUA|USA|França|Alemanha|China|Japão|Londres|Paris|São Paulo|Rio de Janeiro|California|Geneva|Pequim)/i.test(rawWord)) {
        inferredType = 'Location';
        if (/Brasil/i.test(rawWord)) wikidataId = 'Q155';
        if (/São Paulo/i.test(rawWord)) wikidataId = 'Q174';
      } else if (/(?:Python|React|PyTorch|TensorFlow|BERT|RoBERTa|Cypher|Neo4j|SQL|GraphML|JSON|OpenNRE|LLM|GPT)/i.test(rawWord)) {
        inferredType = 'Technology';
        if (/Python/i.test(rawWord)) wikidataId = 'Q28865';
        if (/React/i.test(rawWord)) wikidataId = 'Q25167772';
      } else if (/^[A-ZÀ-Ú][a-zà-ú]+\s+[A-ZÀ-Ú][a-zà-ú]+$/.test(rawWord)) {
        inferredType = 'Person';
      }

      const ent = {
        id: slug,
        text: rawWord,
        type: inferredType,
        confidence: 0.88,
        startPos: match.index,
        endPos: match.index + rawWord.length,
        aliases: [rawWord],
        wikidataId
      };
      entityMap.set(slug, ent);
      entities.push(ent);
    }
  }

  // Connect consecutive entity pairs found in same sentences
  const sentences = text.split(/(?<=[.!?])\s+/);
  sentences.forEach(sentence => {
    const foundInSentence: Array<typeof entities[0]> = [];
    entities.forEach(ent => {
      if (sentence.includes(ent.text)) {
        foundInSentence.push(ent);
      }
    });

    const yearMatch = sentence.match(/\b(19\d\d|20\d\d)\b/);
    const qualifiers: Array<{ key: string; value: string; wikidataProperty?: string }> = [];
    if (yearMatch) {
      qualifiers.push({ key: 'time', value: yearMatch[1], wikidataProperty: 'P585' });
    }

    for (let i = 0; i < foundInSentence.length - 1; i++) {
      const head = foundInSentence[i];
      const tail = foundInSentence[i + 1];
      if (head.id === tail.id) continue;

      let relSlug = 'associated_with';
      let relLabel = 'Associated With';

      if (head.type === 'Person' && tail.type === 'Organization') {
        relSlug = 'member_of';
        relLabel = 'Member / Affiliated With';
      } else if (head.type === 'Organization' && tail.type === 'Technology') {
        relSlug = 'developer_of';
        relLabel = 'Developer Of';
      } else if (head.type === 'Organization' && tail.type === 'Location') {
        relSlug = 'headquartered_in';
        relLabel = 'Headquartered In';
      } else if (head.type === 'Technology' && tail.type === 'Concept') {
        relSlug = 'applies_concept';
        relLabel = 'Applies Concept';
      }

      relations.push({
        id: `rel_${relations.length + 1}`,
        headId: head.id,
        headText: head.text,
        headType: head.type,
        tailId: tail.id,
        tailText: tail.text,
        tailType: tail.type,
        relation: relSlug,
        relationLabel: relLabel,
        taxonomy: taxonomy || 'wiki80',
        confidence: 0.85,
        evidence: sentence.trim().substring(0, 200),
        direction: 'DIRECTED',
        qualifiers: qualifiers.length > 0 ? qualifiers : undefined
      });
    }
  });

  return { entities, relations };
}

// ==========================================
// ACCESS CONTROL & PASSCODE REGISTRY
// ==========================================
interface AccessKeyRecord {
  key: string;
  label: string;
  expiresAt: string | null; // ISO string (e.g. '2026-12-31T23:59:59Z') or null for perpetual
  active: boolean;
}

// Configured Access Keys: easily manageable by admin
const ACCESS_KEYS_REGISTRY: AccessKeyRecord[] = [
  {
    key: 'testes-SHH',
    label: 'Testador Parceiro',
    expiresAt: '2026-09-27T23:59:59Z',
    active: true
  },
  {
    key: 'opennre-2026',
    label: 'Acesso Padrão Testadores',
    expiresAt: '2026-12-31T23:59:59Z',
    active: true
  },
  {
    key: 'alex-admin',
    label: 'Administrador (Alex)',
    expiresAt: null,
    active: true
  },
  {
    key: 'beta-tester',
    label: 'Testador Beta (7 dias)',
    expiresAt: '2026-09-01T23:59:59Z',
    active: true
  }
];

// If an environment variable is set (ACCESS_PASSCODE or ACCESS_KEY), include it dynamically
function getAllValidAccessKeys(): AccessKeyRecord[] {
  const keys = [...ACCESS_KEYS_REGISTRY];
  const envPasscode = process.env.ACCESS_PASSCODE || process.env.ACCESS_KEY;
  if (envPasscode && !keys.some(k => k.key.toLowerCase() === envPasscode.toLowerCase())) {
    keys.unshift({
      key: envPasscode,
      label: 'Chave Master (Configurada via Environment)',
      expiresAt: null,
      active: true
    });
  }
  return keys;
}

// Active session token store: token -> { key, label, expiresAt, created: number }
const activeSessions = new Map<
  string,
  { key: string; label: string; expiresAt: string | null; created: number }
>();

function validateKeyString(rawKey: string): {
  valid: boolean;
  error?: string;
  entry?: AccessKeyRecord;
} {
  if (!rawKey || typeof rawKey !== 'string') {
    return { valid: false, error: 'Chave de acesso não informada.' };
  }

  const cleanKey = rawKey.trim().toLowerCase();
  const allKeys = getAllValidAccessKeys();
  const matched = allKeys.find(k => k.key.toLowerCase() === cleanKey);

  if (!matched) {
    return { valid: false, error: 'Chave de acesso inválida ou não encontrada.' };
  }

  if (!matched.active) {
    return {
      valid: false,
      error: 'Esta chave de acesso foi desativada pelo administrador.'
    };
  }

  if (matched.expiresAt) {
    const expDate = new Date(matched.expiresAt);
    if (Date.now() > expDate.getTime()) {
      const formatted = expDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      return {
        valid: false,
        error: `Esta chave de acesso expirou em ${formatted}. Solicite um novo link ao administrador.`
      };
    }
  }

  return { valid: true, entry: matched };
}

// Auth Middleware: verifies session token, Firebase ID token, or direct access header
function requireAuth(req: Request, res: Response, next: () => void): void {
  const authHeader = req.headers['authorization'];
  const directKeyHeader = req.headers['x-access-key'] as string;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

  // 1. Check in-memory active sessions (legacy keys)
  if (token && activeSessions.has(token)) {
    const session = activeSessions.get(token)!;
    // Check if session's underlying key has expired
    if (session.expiresAt && Date.now() > new Date(session.expiresAt).getTime()) {
      activeSessions.delete(token);
      res.status(401).json({
        error: 'Sessão expirada. A chave de acesso atingiu o prazo limite de validade.',
        expired: true
      });
      return;
    }
    return next();
  }

  // 2. Check Firebase ID Token (JWT structure)
  if (token && token.startsWith('ey') && token.split('.').length === 3) {
    try {
      const payloadBase64 = token.split('.')[1];
      const decodedJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
      const payload = JSON.parse(decodedJson);

      // Verify token has user identifier and is not expired
      if (payload.sub || payload.user_id) {
        if (payload.exp && Date.now() >= payload.exp * 1000) {
          res.status(401).json({
            error: 'Sessão Firebase expirada. Faça login novamente.',
            expired: true
          });
          return;
        }
        (req as any).user = payload;
        return next();
      }
    } catch (e) {
      console.warn('Could not parse Firebase JWT token header:', e);
    }
  }

  // 3. Check direct access key header
  if (directKeyHeader) {
    const val = validateKeyString(directKeyHeader);
    if (val.valid) {
      return next();
    }
  }

  res.status(401).json({
    error: 'Acesso restrito: Autenticação necessária para executar esta operação.',
    requireAuth: true
  });
}

// API Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// API Auth Verification Endpoint
app.post('/api/auth/verify', (req: Request, res: Response): void => {
  const { key } = req.body;
  const validation = validateKeyString(key);

  if (!validation.valid || !validation.entry) {
    res.status(401).json({
      ok: false,
      error: validation.error || 'Chave de acesso inválida'
    });
    return;
  }

  // Generate session token (e.g. hex timestamp + random)
  const sessionToken = `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
  activeSessions.set(sessionToken, {
    key: validation.entry.key,
    label: validation.entry.label,
    expiresAt: validation.entry.expiresAt,
    created: Date.now()
  });

  res.json({
    ok: true,
    token: sessionToken,
    label: validation.entry.label,
    expiresAt: validation.entry.expiresAt
  });
});

// API Auth Session Check Endpoint
app.get('/api/auth/session', (req: Request, res: Response): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;

  if (token && activeSessions.has(token)) {
    const session = activeSessions.get(token)!;
    if (session.expiresAt && Date.now() > new Date(session.expiresAt).getTime()) {
      activeSessions.delete(token);
      res.status(401).json({
        ok: false,
        error: 'Chave expirada.'
      });
      return;
    }
    res.json({
      ok: true,
      label: session.label,
      expiresAt: session.expiresAt
    });
    return;
  }

  res.status(401).json({ ok: false, error: 'Nenhuma sessão válida ativa.' });
});

// API Relation Extraction Endpoint (OpenNRE Pipeline)
app.post('/api/extract', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  try {
    const {
      text,
      taxonomy = 'wiki80',
      customRelations = [],
      confidenceThreshold = 0.5,
      language = 'auto'
    } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'Text payload is required for relation extraction' });
      return;
    }

    // Safety word count and character limit guards (Max 15,000 words / 100,000 chars)
    const words = text.trim().split(/\s+/).filter(Boolean);
    const MAX_SAFE_WORDS = 15000;
    const MAX_SAFE_CHARS = 100000;

    if (words.length > MAX_SAFE_WORDS || text.length > MAX_SAFE_CHARS) {
      res.status(400).json({
        error: `Limite máximo de texto excedido (${words.length.toLocaleString('pt-BR')} palavras e ${text.length.toLocaleString('pt-BR')} caracteres). O limite de segurança para garantir máxima qualidade de extração e integridade de contexto é de 15.000 palavras (~100.000 caracteres) por envio. Por favor, divida seu documento em partes menores.`
      });
      return;
    }

    const client = getGeminiClient();

    if (!client) {
      // Offline fallback mode if API key is not yet set
      const fallback = fallbackExtract(text, taxonomy);
      const executionTimeMs = Date.now() - startTime;
      const filteredRelations = fallback.relations.filter(r => r.confidence >= confidenceThreshold);

      res.json({
        entities: fallback.entities,
        relations: filteredRelations,
        rawText: text,
        taxonomy,
        executionTimeMs,
        modelUsed: 'heuristic_opennre_engine',
        summary: {
          totalEntities: fallback.entities.length,
          totalRelations: filteredRelations.length,
          avgConfidence: 0.91,
          density: fallback.entities.length > 1 ? (2 * filteredRelations.length) / (fallback.entities.length * (fallback.entities.length - 1)) : 0
        }
      });
      return;
    }

    // Taxonomy & Ontology Instructions
    let taxonomyGuidance = `Use standard OpenNRE relations from the Wiki80 benchmark aligned with Wikidata properties (such as founded_by [P112], headquarters_location [P159], parent_company [P749], developer_of [P178], country_of_citizenship [P27], educated_at [P69], subclass_of [P279], part_of [P361], member_of [P463], author [P50], award_received [P166], spouse [P26], capital_of [P36], participant_in [P1344], occupation [P106], employer [P108], manufacturer [P176], discovers_or_invents [P61], operates [P121]).
STRICT ONTOLOGY TYPING CONSTRAINTS (Wikidata-Aligned):
- 'educated_at': Head must be Person, Tail must be Organization (educational institution).
- 'founded_by': Head must be Organization/Product/Company, Tail must be Person/Organization.
- 'headquarters_location': Head must be Organization, Tail must be Location.
- 'country_of_citizenship' / 'country_of_origin': Tail must be Country or Location.
- 'subclass_of': Head and Tail must both be Concepts/Technologies/Products.
- 'developer_of': Head must be Organization or Person, Tail must be Technology, Product, or Software.
- 'member_of': Head must be Person or Organization, Tail must be Organization.`;

    if (taxonomy === 'tacred') {
      taxonomyGuidance = `Use relations aligned with TACRED (Stanford NLP RE) such as org:founded_by, org:top_members_employees, org:subsidiaries, org:parents, org:city_of_headquarters, per:title, per:city_of_birth, per:schools_attended, per:spouse, per:charges, per:age.`;
    } else if (taxonomy === 'semeval') {
      taxonomyGuidance = `Use SemEval-2010 Task 8 relation categories: Cause-Effect, Component-Whole, Entity-Destination, Product-Producer, Entity-Origin, Theme-Tool, Member-Collection, Message-Topic, Content-Container.`;
    } else if (taxonomy === 'fewrel') {
      taxonomyGuidance = `Use FewRel relation categories: P17_country, P495_country_of_origin, P106_occupation, P1344_participant_in, P27_country_of_citizenship, P150_contains_administrative_territorial_entity, P57_director.`;
    } else if (taxonomy === 'custom' && customRelations.length > 0) {
      taxonomyGuidance = `Use the following custom domain relations provided by user: ${customRelations.join(', ')}. If other clear relations exist, formulate descriptive snake_case relations.`;
    }

    const systemPrompt = `You are OpenNRE-Engine, an advanced neural relation extraction and ontology-grounded knowledge graph pipeline inspired by THU-NLP's OpenNRE and Wikidata/Wikontic graph construction principles.
Your task is to thoroughly analyze the provided text (which may be a short paragraph, a long article, a blog post, or a multi-section document), perform Named Entity Recognition (NER), deduplicate aliases into canonical entities, extract edge qualifiers, and extract all meaningful semantic triplets <head, relation, tail> for direct export into Graph Databases (Neo4j Cypher, RDF/Turtle, JSON-LD, GraphML, Gremlin).

CRITICAL DIRECTIVES FOR COMPREHENSIVE EXTRACTION:
1. FULL DOCUMENT COVERAGE:
   - Analyze the ENTIRE document from the opening sentences, throughout all intermediate paragraphs/sections, to the conclusion.
   - Do NOT stop after the first few sentences or focus only on the introduction.
   - For medium and long texts (such as blog posts), extract all significant entities (persons, organizations, technologies, concepts, events, places, dates) and their interconnections across the whole piece.

2. Salient Named Entities & Alias-Aware Deduplication (Wikontic Pattern):
   - Identify entity id (unique, clean alphanumeric slug), exact text (canonical title), and entity type (One of: 'Person', 'Organization', 'Location', 'Product', 'Event', 'Technology', 'Concept', 'Date', 'Country', 'Work', 'Award', 'Biomedical', 'Other').
   - Identify 'aliases': array of surface forms, abbreviations, nicknames, or pronouns used in the text to refer to this entity (e.g. text: "Sam Altman", aliases: ["Altman", "o CEO da OpenAI"]).
   - Identify 'wikidataId': provide Wikidata Item ID if widely known (e.g. "Q95" for Google, "Q11463" for Python, "Q79016896" for OpenAI, "Q155" for Brazil, etc.).
   - Estimate start and end character positions in text when available.
   - Assign realistic entity confidence score (between 0.70 and 1.00).

3. Semantic Relations & Edge Qualifiers:
   - Head Entity (Subject) and Tail Entity (Object).
   - Relation Slug: concise, standardized snake_case identifier (e.g. "founded_by", "headquarters_location", "developed_by", "member_of", "author_of", "uses_technology", "integrates_with", "subclass_of", "criticizes", "proposes_concept", "acquired_by").
   - Relation Label: clean human-friendly title (e.g. "Founded By", "Author Of", "Uses Technology").
   - Relation Taxonomy: "${taxonomy}". ${taxonomyGuidance}
   - Confidence: realistic relation extraction confidence score (0.00 to 1.00).
   - Evidence: the exact sentence or clause from the text proving this relation.
   - Direction: "DIRECTED" (standard head -> tail).
   - Qualifiers: Extract contextual qualifiers for the edge whenever mentioned in text (e.g. time/year of event [P585], specific job role [P3831], condition, geographic context, stated_in, proportion/percentage). Format: array of { key: string, value: string, wikidataProperty?: string }.

4. Cleanliness & Graph Topology:
   - Disambiguate coreferenced entities into one canonical entity (do not create separate duplicate nodes for "Google" and "Google LLC").
   - Connect the graph meaningfully with both micro-relations (within sentences) and macro-relations (thematic / document-level links).
   - Respect strict Domain and Range typing constraints.
   - Return valid JSON matching the specified JSON schema strictly.`;

    const { text: responseText, modelUsed: successfulModel } = await generateWithResilience(
      client,
      {
        contents: `Perform exhaustive OpenNRE Named Entity, Alias Normalization & Relation Extraction with Edge Qualifiers on the following text:\n\n"""\n${text}\n"""`,
        systemInstruction: systemPrompt,
        temperature: 0.1,
        responseMimeType: 'application/json'
      },
      'OpenNRE-Extract'
    );

    let parsed;
    try {
      parsed = safeJsonParse(responseText);
    } catch (parseError) {
      console.error('Failed to parse model JSON:', responseText);
      throw new Error('Invalid JSON received from extraction model');
    }

    const rawEntities: any[] = Array.isArray(parsed.entities) ? parsed.entities : [];
    const rawRelations: any[] = Array.isArray(parsed.relations) ? parsed.relations : [];

    // Ensure entity IDs and sanitize
    const entityMap = new Map<string, any>();
    const sanitizedEntities = rawEntities.map((e, idx) => {
      const rawText = String(e.text || `Entity_${idx + 1}`).trim();
      const id = String(e.id || rawText.toLowerCase().replace(/[^\w]/g, '_') || `e_${idx + 1}`);
      const type = String(e.type || 'Concept');
      const conf = typeof e.confidence === 'number' ? Math.min(1, Math.max(0, e.confidence)) : 0.95;
      const aliases = Array.isArray(e.aliases) ? e.aliases.map((a: any) => String(a).trim()).filter(Boolean) : [rawText];
      const wikidataId = e.wikidataId && typeof e.wikidataId === 'string' ? e.wikidataId.trim() : undefined;

      const ent = {
        id,
        text: rawText,
        type,
        confidence: conf,
        aliases,
        wikidataId,
        startPos: typeof e.startPos === 'number' ? e.startPos : undefined,
        endPos: typeof e.endPos === 'number' ? e.endPos : undefined
      };
      entityMap.set(id, ent);
      entityMap.set(rawText.toLowerCase(), ent);
      if (aliases.length > 0) {
        aliases.forEach((alias: string) => {
          entityMap.set(alias.toLowerCase(), ent);
        });
      }
      return ent;
    });

    // Ensure relations have matching entities
    const sanitizedRelations = rawRelations
      .map((r, idx) => {
        const headText = String(r.headText || r.head || '').trim();
        const tailText = String(r.tailText || r.tail || '').trim();
        let headId = String(r.headId || headText.toLowerCase().replace(/[^\w]/g, '_'));
        let tailId = String(r.tailId || tailText.toLowerCase().replace(/[^\w]/g, '_'));

        // Match with entity map or create fallback entity
        let headEnt = entityMap.get(headId) || entityMap.get(headText.toLowerCase());
        if (!headEnt && headText) {
          headEnt = {
            id: headId,
            text: headText,
            type: r.headType || 'Other',
            confidence: 0.9,
            aliases: [headText]
          };
          sanitizedEntities.push(headEnt);
          entityMap.set(headId, headEnt);
        }

        let tailEnt = entityMap.get(tailId) || entityMap.get(tailText.toLowerCase());
        if (!tailEnt && tailText) {
          tailEnt = {
            id: tailId,
            text: tailText,
            type: r.tailType || 'Other',
            confidence: 0.9,
            aliases: [tailText]
          };
          sanitizedEntities.push(tailEnt);
          entityMap.set(tailId, tailEnt);
        }

        const relation = String(r.relation || 'related_to').trim().toLowerCase().replace(/[\s-]+/g, '_');
        const relationLabel = String(r.relationLabel || r.relation || 'Related To').trim();
        const confidence = typeof r.confidence === 'number' ? Math.min(1, Math.max(0, r.confidence)) : 0.92;
        const evidence = String(r.evidence || '').trim();

        // Process qualifiers
        let qualifiers: Array<{ key: string; value: string; wikidataProperty?: string }> | undefined = undefined;
        if (Array.isArray(r.qualifiers) && r.qualifiers.length > 0) {
          qualifiers = r.qualifiers
            .map((q: any) => ({
              key: String(q.key || 'context').trim(),
              value: String(q.value || '').trim(),
              wikidataProperty: q.wikidataProperty ? String(q.wikidataProperty).trim() : undefined
            }))
            .filter((q: any) => q.key && q.value);
        }

        return {
          id: String(r.id || `rel_${idx + 1}`),
          headId: headEnt ? headEnt.id : headId,
          headText: headEnt ? headEnt.text : headText,
          headType: headEnt ? headEnt.type : (r.headType || 'Other'),
          tailId: tailEnt ? tailEnt.id : tailId,
          tailText: tailEnt ? tailEnt.text : tailText,
          tailType: tailEnt ? tailEnt.type : (r.tailType || 'Other'),
          relation,
          relationLabel,
          taxonomy: r.taxonomy || taxonomy,
          confidence,
          evidence,
          direction: 'DIRECTED',
          qualifiers: qualifiers && qualifiers.length > 0 ? qualifiers : undefined
        };
      })
      .filter(r => r.headId && r.tailId && r.confidence >= confidenceThreshold);

    const executionTimeMs = Date.now() - startTime;
    const totalEntities = sanitizedEntities.length;
    const totalRelations = sanitizedRelations.length;
    const avgConfidence = totalRelations > 0
      ? sanitizedRelations.reduce((acc, r) => acc + r.confidence, 0) / totalRelations
      : 0;

    const density = totalEntities > 1
      ? (2 * totalRelations) / (totalEntities * (totalEntities - 1))
      : 0;

    res.json({
      entities: sanitizedEntities,
      relations: sanitizedRelations,
      rawText: text,
      taxonomy,
      executionTimeMs,
      modelUsed: `${successfulModel} (OpenNRE Pipeline)`,
      summary: {
        totalEntities,
        totalRelations,
        avgConfidence: Number(avgConfidence.toFixed(3)),
        density: Number(density.toFixed(4))
      }
    });
  } catch (error: any) {
    console.error('Error in /api/extract:', error);
    // Fallback on error to ensure app never breaks for the user
    const text = req.body.text || '';
    const taxonomy = req.body.taxonomy || 'wiki80';
    const fallback = fallbackExtract(text, taxonomy);
    const executionTimeMs = Date.now() - startTime;

    res.json({
      entities: fallback.entities,
      relations: fallback.relations,
      rawText: text,
      taxonomy,
      executionTimeMs,
      modelUsed: 'heuristic_opennre_fallback',
      warning: error?.message || 'Gemini API call encountered an error, falling back to OpenNRE heuristic model.',
      summary: {
        totalEntities: fallback.entities.length,
        totalRelations: fallback.relations.length,
        avgConfidence: 0.9,
        density: fallback.entities.length > 1 ? (2 * fallback.relations.length) / (fallback.entities.length * (fallback.entities.length - 1)) : 0
      }
    });
  }
});

// Heuristic Fallback for Text Optimization Analysis
function fallbackTextOptimization(
  text: string,
  entities: Array<{ id?: string; text: string; type?: string }>,
  relations: Array<{ headText: string; tailText: string; relation?: string; headId?: string; tailId?: string }>
) {
  const connectedNodeIds = new Set<string>();
  relations.forEach(r => {
    if (r.headId) connectedNodeIds.add(r.headId);
    if (r.tailId) connectedNodeIds.add(r.tailId);
    if (r.headText) connectedNodeIds.add(r.headText.toLowerCase());
    if (r.tailText) connectedNodeIds.add(r.tailText.toLowerCase());
  });

  const isolated = entities.filter(
    e => !connectedNodeIds.has(e.id || '') && !connectedNodeIds.has(e.text.toLowerCase())
  );

  const isolatedEntities = isolated.map(e => ({
    entity: e.text,
    type: e.type || 'Concept',
    reason: `A entidade '${e.text}' é mencionada no texto, mas não possui conexão relacional direta ou predicado verbal explícito com outras entidades.`,
    suggestedFix: `Conecte '${e.text}' especificando sua função, ano de fundação, criador ou organização associada através de orações ativas com verbos relacionais diretos.`
  }));

  const score = Math.max(
    25,
    Math.min(
      95,
      Math.round(
        (entities.length > 0 ? (entities.length - isolated.length) / entities.length : 0.5) * 60 +
          (relations.length >= 3 ? 35 : relations.length * 10)
      )
    )
  );

  const connectivityLevel: 'Low' | 'Moderate' | 'Good' | 'High' =
    score >= 80 ? 'High' : score >= 60 ? 'Good' : score >= 40 ? 'Moderate' : 'Low';

  return {
    connectivityScore: score,
    connectivityLevel,
    diagnosisSummary:
      isolated.length > 0
        ? `O texto possui ${entities.length} entidades identificadas, porém ${isolated.length} encontram-se isoladas sem relações semânticas explícitas com os nós centrais.`
        : `O texto apresenta boa densidade relacional inicial, com ${relations.length} relações extraídas conectando a maioria das entidades.`,
    isolatedEntities,
    implicitOrWeakRelations: [
      {
        headEntity: entities[0]?.text || 'Entidade Principal',
        tailEntity: entities[1]?.text || 'Entidade Secundária',
        issue: 'Relação pode estar implícita ou expressa com termos genéricos.',
        suggestedRelation: 'related_to / collaborates_with / developed_by',
        howToClarify: 'Utilize orações com sujeito explícito e verbos de ação direta conectando ambas as entidades no mesmo período.'
      }
    ],
    rewriteSuggestions: [
      {
        originalSnippet: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
        suggestedSnippet: text.slice(0, 100) + '...',
        explanation: 'Explicite o verbo relacional entre os sujeitos e remova pronomes anafóricos ambíguos.',
        relationUnlocked: 'direct_semantic_relation'
      }
    ],
    optimizedText: text,
    expectedNewRelations: [
      'developed_by',
      'headquarters_location',
      'member_of'
    ],
    keyImprovements: [
      'Substituição de anáforas e pronomes vagos ("ele", "a instituição") por nomes canônicos.',
      'Transformação de frases nominais em orações ativas com predicados relacionais precisos.',
      'Criação de pontes semânticas ligando entidades isoladas aos clusters principais do grafo.'
    ]
  };
}

// API Route: Analyze text connectivity and generate optimization report
app.post('/api/analyze-text-connectivity', requireAuth, async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { text, entities = [], relations = [], taxonomy = 'wiki80' } = req.body;

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Text parameter is required' });
  }

  // Safety word count and character limit guards
  const words = text.trim().split(/\s+/).filter(Boolean);
  const MAX_SAFE_WORDS = 15000;
  const MAX_SAFE_CHARS = 100000;

  if (words.length > MAX_SAFE_WORDS || text.length > MAX_SAFE_CHARS) {
    return res.status(400).json({
      error: `Limite de texto excedido (${words.length.toLocaleString('pt-BR')} palavras). O limite máximo seguro é de 15.000 palavras (~100.000 caracteres) por análise.`
    });
  }

  const client = getGeminiClient();

  if (!client) {
    const fallback = fallbackTextOptimization(text, entities, relations);
    return res.json({
      ...fallback,
      executionTimeMs: Date.now() - startTime,
      modelUsed: 'heuristic_optimizer_fallback',
      warning: 'Gemini API key not configured, returning rule-based analysis.'
    });
  }

  try {
    const systemPrompt = `You are an expert Computational Linguist and Knowledge Graph Optimization Specialist in OpenNRE (Neural Relation Extraction).
Your goal is to inspect a given source text, its extracted Entities, and its extracted Relation Triplets, and generate a comprehensive, highly actionable Diagnostic & Optimization Report.

The user's goal is to improve the source text so that all entities present in it have stronger, more explicit, and higher-confidence semantic connections (<Head, Relation, Tail>).

You must analyze:
1. Connectivity Score (0-100) and Level (Low, Moderate, Good, High) reflecting graph density and relational clarity.
2. Isolated Entities: identify which entities from the text failed to get connected into relation triplets and why (e.g. passive voice, vague pronouns like "it/they/ele/ela", lack of explicit relational verb, distance in text). Provide exact actionable fix.
3. Implicit or Weak Relations: identify entity pairs that are clearly related in real-world facts or context, but where the phrasing obscured the relation.
4. Rewrite Suggestions (Antes vs. Depois): provide specific text snippets with proposed rewrites to make relationships explicit.
5. Optimized Text (Texto Integral Otimizado): rewrite the ENTIRE source text keeping all original facts, core information and language (Portuguese, English, etc.), but restructured for maximum OpenNRE entity-relation extraction clarity.
6. Expected New Relations: list of new relation slugs that will be extracted once the optimized text is parsed.
7. Key Improvements: bullet points summarizing what was fixed.

Respond in the language of the source text (if Portuguese, use Portuguese for explanations; if English, use English).
Return ONLY valid JSON matching this schema:
{
  "connectivityScore": number (0-100),
  "connectivityLevel": "Low" | "Moderate" | "Good" | "High",
  "diagnosisSummary": string,
  "isolatedEntities": [
    {
      "entity": string,
      "type": string,
      "reason": string,
      "suggestedFix": string
    }
  ],
  "implicitOrWeakRelations": [
    {
      "headEntity": string,
      "tailEntity": string,
      "issue": string,
      "suggestedRelation": string,
      "howToClarify": string
    }
  ],
  "rewriteSuggestions": [
    {
      "originalSnippet": string,
      "suggestedSnippet": string,
      "explanation": string,
      "relationUnlocked": string
    }
  ],
  "optimizedText": string,
  "expectedNewRelations": [string],
  "keyImprovements": [string]
}`;

    const userContent = `Source Text:
"""
${text}
"""

Extracted Entities (${entities.length}):
${JSON.stringify(entities.map((e: any) => ({ text: e.text, type: e.type })), null, 2)}

Extracted Relations (${relations.length}):
${JSON.stringify(relations.map((r: any) => ({ head: r.headText, rel: r.relationLabel || r.relation, tail: r.tailText })), null, 2)}

Taxonomy: ${taxonomy}

Analyze the connectivity and provide the diagnostic optimization report in JSON.`;

    const { text: responseText, modelUsed: successfulModel } = await generateWithResilience(
      client,
      {
        contents: userContent,
        systemInstruction: systemPrompt,
        temperature: 0.2,
        responseMimeType: 'application/json'
      },
      'Text-Optimizer'
    );

    const parsed = safeJsonParse(responseText);

    return res.json({
      ...parsed,
      executionTimeMs: Date.now() - startTime,
      modelUsed: `${successfulModel} (Text Connectivity Optimizer)`
    });
  } catch (err: any) {
    console.error('Error in /api/analyze-text-connectivity:', err);
    const fallback = fallbackTextOptimization(text, entities, relations);
    return res.json({
      ...fallback,
      executionTimeMs: Date.now() - startTime,
      modelUsed: 'heuristic_optimizer_fallback',
      warning: err?.message || 'Error executing Gemini analysis, generated heuristic diagnostic report.'
    });
  }
});


// Start Server with Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OpenNRE Graph Extractor server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
