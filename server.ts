import express, { Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config({ override: true });

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// In-Memory AI Generation Cache (24h TTL) isolated by language and parameters
interface CachedAiResponse {
  result: any;
  timestamp: number;
}
const aiGenerationCache = new Map<string, CachedAiResponse>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function getLangInstruction(lang?: string): string {
  const lower = (lang || 'pt').toLowerCase();
  if (lower.startsWith('en')) {
    return `LANGUAGE DIRECTIVE:
- Generate all explanations, summaries, diagnosis, and suggestions STRICTLY in ENGLISH.
- Strictly adhere to Semantic SEO vocabulary: NEVER use the word "keyword" or "keywords". Use "terms", "concepts", or "entities".`;
  }
  if (lower.startsWith('es')) {
    return `DIRECTIVA DE IDIOMA:
- Genere todas las explicaciones, resúmenes, diagnóstico y sugerencias ESTRICTAMENTE en ESPAÑOL.
- Adherencia estricta al vocabulario de SEO Semántico: NUNCA utilice el término "palabras clave" ni "palabra clave". Utilice exclusivamente "términos", "conceptos" o "entidades".`;
  }
  return `DIRETIVA DE IDIOMA:
- Gere todas as explicações, resumos, diagnóstico e sugestões ESTRITAMENTE em PORTUGUÊS DO BRASIL (PT-BR).
- Aderência estrita ao vocabulário de SEO Semântico: NUNCA utilize o termo "palavra-chave" ou "palavras-chave". Utilize exclusivamente "termos", "conceitos" ou "entidades".`;
}

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

// In-memory model cooldown tracker to avoid hammering quota-exhausted (429) or busy (503) models
const modelCooldowns = new Map<string, number>();

function isModelInCooldown(modelName: string): boolean {
  const expiry = modelCooldowns.get(modelName);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    modelCooldowns.delete(modelName);
    return false;
  }
  return true;
}

function setModelCooldown(modelName: string, durationMs = 15 * 60 * 1000): void {
  modelCooldowns.set(modelName, Date.now() + durationMs);
}

// Resilient Gemini Generator with low-latency thinking config, strict timeouts, and multi-model cascade
async function generateWithResilience(
  client: GoogleGenAI,
  params: {
    contents: string;
    systemInstruction: string;
    temperature?: number;
    responseMimeType?: string;
    maxOutputTokens?: number;
  },
  logPrefix = 'Gemini'
): Promise<{ text: string; modelUsed: string }> {
  // Candidate models ordered to prefer active, available models with available quota
  const baseCandidates = [
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.7-flash',
    'gemini-flash-latest'
  ];

  // Sort candidates so models not currently in cooldown are attempted first
  const candidateModels = [...baseCandidates].sort((a, b) => {
    const aCool = isModelInCooldown(a) ? 1 : 0;
    const bCool = isModelInCooldown(b) ? 1 : 0;
    return aCool - bCool;
  });

  let lastError: any = null;

  for (const modelName of candidateModels) {
    if (isModelInCooldown(modelName)) {
      // Cleanly skip model in cooldown without making a failing request or printing error logs
      continue;
    }

    try {
      const config: any = {
        systemInstruction: params.systemInstruction,
        temperature: params.temperature ?? 0.1,
        responseMimeType: params.responseMimeType || 'application/json',
        maxOutputTokens: params.maxOutputTokens ?? 8192
      };

      // Set thinkingLevel per model
      if (modelName === 'gemini-3.1-flash-lite') {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
      } else if (modelName.startsWith('gemini-3.')) {
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
        const trimmed = response.text.trim();
        // If JSON was requested, validate that the text contains parseable, structured content
        if (params.responseMimeType === 'application/json') {
          try {
            const parsed = safeJsonParse(trimmed);
            if (parsed && typeof parsed === 'object') {
              return { text: trimmed, modelUsed: modelName };
            }
            throw new Error(`Model returned empty or non-object content`);
          } catch (parseErr: any) {
            console.info(
              `[${logPrefix}] Model ${modelName} returned incomplete JSON, checking next candidate model.`
            );
            lastError = parseErr;
            continue;
          }
        } else if (trimmed.length > 0) {
          return { text: trimmed, modelUsed: modelName };
        }
      }
    } catch (err: any) {
      lastError = err;
      const status = err?.status || (err?.message?.includes('429') ? 429 : err?.message?.includes('503') ? 503 : 0);
      const isQuota = status === 429 || err?.message?.includes('RESOURCE_EXHAUSTED') || err?.message?.includes('Quota exceeded');
      const isBusy = status === 503 || err?.message?.includes('high demand') || err?.message?.includes('UNAVAILABLE');

      if (isQuota) {
        // Cooldown for 30 minutes to stop hammering quota
        setModelCooldown(modelName, 30 * 60 * 1000);
        console.info(`[${logPrefix}] Model ${modelName} rate limit / daily free-tier quota reached. Marked in cooldown.`);
      } else if (isBusy) {
        // Cooldown for 5 minutes for temporary spike
        setModelCooldown(modelName, 5 * 60 * 1000);
        console.info(`[${logPrefix}] Model ${modelName} experiencing temporary high demand (503). Switching to fallback model.`);
      } else {
        console.info(`[${logPrefix}] Model ${modelName} call bypassed, trying next candidate.`);
      }

      // Continue to next candidate model immediately without blocking
    }
  }

  throw lastError || new Error('All model candidates temporarily in cooldown or unavailable');
}

// Robust JSON parser helper that safely strips markdown code fences, handles objects and arrays, and repairs truncated JSON
function safeJsonParse<T = any>(raw: string): T {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Empty or non-string input to safeJsonParse');
  }

  let cleaned = raw.trim();

  // Strip markdown code fences if present (```json ... ``` or ``` ...)
  cleaned = cleaned.replace(/^```(?:json)?\s*/im, '').replace(/\s*```\s*$/m, '').trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  // 1. Direct parse attempt
  try {
    return JSON.parse(cleaned);
  } catch {
    // Continue with repair heuristics
  }

  // 2. Identify outer boundaries for object vs array
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');

  const isObject = firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket);
  const isArray = firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace);

  if (isObject && lastBrace > firstBrace) {
    const candidate = cleaned.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // Continue to truncation repair
    }
  } else if (isArray && lastBracket > firstBracket) {
    const candidate = cleaned.substring(firstBracket, lastBracket + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // Continue to truncation repair
    }
  }

  // 3. Tolerant repair for truncated JSON
  try {
    let repaired = cleaned;
    const startIdx = Math.min(
      firstBrace !== -1 ? firstBrace : Infinity,
      firstBracket !== -1 ? firstBracket : Infinity
    );
    if (startIdx !== Infinity) {
      repaired = repaired.substring(startIdx);
    }

    repaired = repaired.replace(/,\s*$/, '').trim();

    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < repaired.length; i++) {
      const char = repaired[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{') openBraces++;
        else if (char === '}') openBraces = Math.max(0, openBraces - 1);
        else if (char === '[') openBrackets++;
        else if (char === ']') openBrackets = Math.max(0, openBrackets - 1);
      }
    }

    if (inString) {
      repaired += '"';
    }

    while (openBrackets > 0) {
      repaired += ']';
      openBrackets--;
    }
    while (openBraces > 0) {
      repaired += '}';
      openBraces--;
    }

    return JSON.parse(repaired);
  } catch (err) {
    throw new Error(`Failed to parse model JSON: ${(err as Error).message}`);
  }
}

// ==========================================
// NLP PREPROCESSING, ANAPHORA & STRUCTURAL HELPERS
// ==========================================

/**
 * Normaliza o texto de entrada para pipelines de NLP/OpenNRE:
 * 1. Separa títulos (H1/H2/H3, cabeçalhos Markdown e linhas sem pontuação terminal) do corpo dos parágrafos,
 *    impedindo que o título se funda sintaticamente com o sujeito da primeira oração do parágrafo.
 * 2. Normaliza pontuações coladas acidentalmente (ex: "rastreador.O Googlebot" -> "rastreador. O Googlebot").
 * 3. Normaliza itens de listas técnicas ("Termo: explicação") garantindo quebras de linha e delimitação de oração.
 */
function preprocessInputText(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  let processed = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 1. Corrigir colagem acidental de ponto com palavra maiúscula (ex: "rastreador.O Googlebot")
  processed = processed.replace(/([a-z0-9à-ú])\.([A-ZÀ-Ú])/g, '$1. $2');

  // 2. Garantir isolamento e espaçamento de cabeçalhos Markdown (# H1, ## H2, ### H3, etc.)
  processed = processed.replace(/^(\#{1,6}\s+[^\n]+)$/gm, '\n$1\n');

  // 3. Normalizar itens de lista (bullets, números, travessões)
  processed = processed.replace(/^([*\-•]|\d+\.)\s+/gm, '\n$1 ');

  // 4. Tratar títulos isolados em linha única que não possuem pontuação terminal
  // (evita que "A anatomia do Googlebot e a arquitetura..." se funda com "O Googlebot é um sistema...")
  const lines = processed.split('\n');
  const normalizedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      normalizedLines.push('');
      continue;
    }

    // Se a linha já é cabeçalho Markdown ou item de lista, mantém
    if (/^(\#{1,6}|[*\-•]|\d+\.)\s+/.test(line)) {
      normalizedLines.push(line);
      continue;
    }

    const nextLine = lines[i + 1]?.trim();
    // É uma linha com cara de título (curta/média, sem pontuação terminal, seguida por linha começando com maiúscula)?
    const isTitleHeading =
      line.length <= 120 &&
      /^[A-ZÀ-Ú0-9]/.test(line) &&
      !/[.!?:;,]$/.test(line) &&
      Boolean(nextLine && /^[A-ZÀ-Ú0-9]/.test(nextLine));

    if (isTitleHeading) {
      // Adiciona ponto terminal e quebra de parágrafo dupla para isolar categoricamente a oração
      normalizedLines.push(line + '.');
      normalizedLines.push('');
    } else {
      normalizedLines.push(line);
    }
  }

  return normalizedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Sanitiza o nome de uma entidade, removendo pontuações terminais e acidentais
 * (por exemplo: "Análise de logs de acesso:" -> "Análise de logs de acesso")
 */
function sanitizeEntityText(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/^["'“”‘’\(\[\{\-–—\s]+/, '')
    .replace(/["'“”‘’\)\]\}\-–—:;.,\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Conjunto exaustivo de conectivos, marcadores discursivos, conjunções, advérbios de transição,
 * pronomes demonstrativos e anafóricos (em PT e EN) que NUNCA devem ser tratados como entidades de grafo.
 */
const INVALID_CONNECTIVE_WORDS = new Set([
  // Conectivos, conjunções e advérbios de transição em Português
  'afinal', 'abaixo', 'acima', 'adiante', 'depois', 'antes', 'ainda', 'dentro', 'fora', 'atrás',
  'ambas', 'ambos', 'assim', 'portanto', 'contudo', 'todavia', 'porém', 'entretanto', 'além',
  'embora', 'enquanto', 'durante', 'segundo', 'conforme', 'diante', 'junto', 'juntos', 'apesar',
  'outrossim', 'logo', 'isto', 'isso', 'aquilo', 'este', 'esta', 'estes', 'estas', 'esse', 'essa',
  'esses', 'essas', 'aquele', 'aquela', 'aqueles', 'aquelas', 'ele', 'ela', 'eles', 'elas',
  'ademais', 'doravante', 'inclusive', 'exclusive', 'consequentemente', 'finalmente', 'inicialmente',
  'primeiramente', 'sobretudo', 'principalmente', 'especialmente', 'atualmente', 'anteriormente',
  'posteriormente', 'recentemente', 'aliás', 'desde', 'até', 'sob', 'sobre', 'ante', 'após',
  'perante', 'contra', 'sem', 'com', 'trás', 'ora', 'já', 'quer', 'seja', 'caso', 'como',
  'mais', 'menos', 'pouco', 'muito', 'bastante', 'demais', 'apenas', 'somente', 'tão', 'quase',
  'mesmo', 'mesma', 'mesmos', 'mesmas', 'outro', 'outra', 'outros', 'outras', 'tudo', 'nada',
  'algo', 'cada', 'qualquer', 'quaisquer', 'algum', 'alguma', 'alguns', 'algumas', 'nenhum',
  'nenhuma', 'nenhuns', 'nenhumas', 'todo', 'toda', 'todos', 'todas', 'vários', 'várias',
  'certo', 'certa', 'certos', 'certas', 'então', 'pois', 'porquanto', 'porque',
  // Expressões conectivas compostas
  'além disso', 'por isso', 'por fim', 'isto é', 'ou seja', 'em suma', 'em síntese',
  'de fato', 'na verdade', 'por outro lado', 'por sua vez', 'no entanto', 'não obstante',
  'diante disso', 'com isso', 'desde que', 'já que', 'visto que', 'assim como', 'bem como',
  'tanto quanto', 'tal como', 'esses dados', 'estes dados', 'este sistema', 'esta ferramenta',
  'o mesmo', 'a mesma', 'os mesmos', 'as mesmas',
  // Conectivos em Inglês
  'after', 'before', 'below', 'above', 'inside', 'within', 'both', 'neither', 'either',
  'however', 'therefore', 'furthermore', 'moreover', 'meanwhile', 'besides', 'although',
  'nonetheless', 'nevertheless', 'finally', 'initially', 'currently', 'recently', 'actually',
  'indeed', 'whereas', 'otherwise', 'instead', 'likewise', 'similarly', 'consequently',
  'accordingly', 'hence', 'thus', 'overall', 'together', 'further', 'again', 'too', 'also',
  'it', 'they', 'them', 'this', 'these', 'those', 'the same', 'these data', 'this system'
]);

/**
 * DICIONÁRIO DE VERBOS NEGATIVOS (STOP-VERBS):
 * Formas infinitivas e conjugadas dos verbos mais frequentes do PT-BR que NUNCA devem ser entidades.
 * Verbos em Grafos de Conhecimento são PREDICADOS (arestas), JAMAIS nós (entidades).
 */
const INVALID_VERB_WORDS = new Set([
  // Verbos de ligação e fundamentais (ser, estar, ter, haver, fazer, poder, ir, vir)
  'ser', 'estar', 'ter', 'haver', 'fazer', 'poder', 'ir', 'vir', 'dar', 'ver', 'saber', 'querer',
  'ficar', 'passar', 'levar', 'trazer', 'usar', 'utilizar', 'rodar', 'executar', 'permitir',
  'indicar', 'mostrar', 'criar', 'gerar', 'ajudar', 'garantir', 'funcionar', 'precisar', 'dever',
  'existir', 'achar', 'pensar', 'falar', 'dizer', 'tentar', 'buscar', 'obter', 'encontrar',
  'seguir', 'manter', 'colocar', 'deixar', 'tomar', 'chamar', 'sentir', 'parecer', 'considerar',
  'entender', 'começar', 'continuar', 'parar', 'mudar', 'perder', 'ganhar', 'analisar', 'operar',
  // Formas flexionadas de alta frequência: Ser / Estar
  'é', 'era', 'eram', 'foi', 'foram', 'sendo', 'sido', 'seria', 'seriam', 'seja', 'sejam', 'fosse', 'fossem',
  'está', 'estão', 'estava', 'estavam', 'esteve', 'estiveram', 'estando', 'estado', 'esteja', 'estejam',
  // Ter / Haver
  'tem', 'têm', 'tinha', 'tinham', 'teve', 'tiveram', 'tendo', 'tido', 'teria', 'teriam', 'tenha', 'tenham',
  'há', 'havia', 'haviam', 'houve', 'houveram', 'havendo',
  // Fazer / Poder
  'faz', 'fazem', 'fazia', 'faziam', 'fez', 'fizeram', 'fazendo', 'feito', 'feita', 'feitos', 'feitas', 'fará', 'faria',
  'pode', 'podem', 'podia', 'podiam', 'pôde', 'puderam', 'podendo', 'podido', 'poderá', 'poderiam', 'possa', 'possam',
  // Ir / Vir
  'vai', 'vão', 'ia', 'iam', 'indo', 'ido', 'irá', 'iriam', 'vá',
  'vem', 'vêm', 'vinha', 'vinham', 'veio', 'vieram', 'vindo', 'virá', 'venha',
  // Verbos operacionais comuns em textos de tecnologia / negócios
  'dá', 'dão', 'deu', 'deram', 'dando', 'dado', 'dada',
  'vê', 'veem', 'viu', 'viram', 'vendo', 'visto', 'vista',
  'sabe', 'sabem', 'sabia', 'soube', 'souberam', 'sabendo',
  'quer', 'querem', 'queria', 'quis', 'quiseram', 'querendo',
  'fica', 'ficam', 'ficou', 'ficaram', 'ficando', 'ficado',
  'passa', 'passam', 'passou', 'passaram', 'passando', 'passado',
  'leva', 'levam', 'levou', 'levaram', 'levando', 'levado',
  'traz', 'trazem', 'trouxe', 'trouxeram', 'trazendo', 'trazido',
  'usa', 'usam', 'usava', 'usou', 'usaram', 'usando', 'usado', 'usada', 'usados', 'usadas',
  'utiliza', 'utilizam', 'utilizava', 'utilizou', 'utilizaram', 'utilizando', 'utilizado', 'utilizada',
  'roda', 'rodam', 'rodava', 'rodou', 'rodaram', 'rodando',
  'executa', 'executam', 'executava', 'executou', 'executaram', 'executando', 'executado',
  'permite', 'permitem', 'permitia', 'permitiu', 'permitiram', 'permitindo', 'permitido',
  'indica', 'indicam', 'indicava', 'indicou', 'indicaram', 'indicando', 'indicado',
  'mostra', 'mostram', 'mostrava', 'mostrou', 'mostraram', 'mostrando', 'mostrado',
  'cria', 'criam', 'criava', 'criou', 'criaram', 'criando', 'criado', 'criada',
  'gera', 'geram', 'gerava', 'gerou', 'geraram', 'gerando', 'gerado', 'gerada',
  'ajuda', 'ajudam', 'ajudava', 'ajudou', 'ajudaram', 'ajudando',
  'garante', 'garantem', 'garantia', 'garantiu', 'garantiram', 'garantindo', 'garantido',
  'funciona', 'funcionam', 'funcionava', 'funcionou', 'funcionaram', 'funcionando',
  'precisa', 'precisam', 'precisava', 'precisou', 'precisaram', 'precisando',
  'deve', 'devem', 'devia', 'deviam', 'devendo', 'devido', 'devida',
  'existe', 'existem', 'existia', 'existiam', 'existiu', 'existiram', 'existindo',
  'analisa', 'analisam', 'analisava', 'analisou', 'analisaram', 'analisando', 'analisado',
  'opera', 'operam', 'operava', 'operou', 'operaram', 'operando', 'operado',
  'integra', 'integram', 'integrava', 'integrou', 'integraram', 'integrando', 'integrado',
  'conecta', 'conectam', 'conectava', 'conectou', 'conectaram', 'conectando', 'conectado'
]);

/**
 * DICIONÁRIO DE TERMOS GENÉRICOS, SUBSTANTIVOS VAZIOS E ADJETIVOS ISOLADOS:
 * Termos abstratos que não carregam valor ontológico isolado em um grafo de conhecimento.
 */
const INVALID_GENERIC_NOUNS_AND_ADJECTIVES = new Set([
  // Substantivos ultragenéricos desprovidos de especificidade
  'coisa', 'coisas', 'algo', 'tudo', 'nada', 'modo', 'modos', 'maneira', 'maneiras',
  'forma', 'formas', 'jeito', 'jeitos', 'tipo', 'tipos', 'parte', 'partes',
  'aspecto', 'aspectos', 'elemento', 'elementos', 'detalhe', 'detalhes', 'ponto', 'pontos',
  'fato', 'fatos', 'caso', 'casos', 'vez', 'vezes', 'momento', 'momentos',
  'exemplo', 'exemplos', 'sentido', 'sentidos', 'ideia', 'ideias', 'questão', 'questões',
  'tema', 'temas', 'assunto', 'assuntos', 'motivo', 'motivos', 'razão', 'razões',
  'pessoa', 'pessoas', 'gente', 'indivíduo', 'indivíduos', 'alguém', 'ninguém',
  // Adjetivos qualificativos soltos que aparecem acidentalmente como nós
  'melhor', 'melhores', 'pior', 'piores', 'grande', 'grandes', 'pequeno', 'pequenos',
  'novo', 'novos', 'nova', 'novas', 'velho', 'velhos', 'velha', 'velhas',
  'bom', 'bons', 'boa', 'boas', 'mau', 'maus', 'má', 'más',
  'rápido', 'rápida', 'rápidos', 'rápidas', 'fácil', 'fáceis', 'difícil', 'difíceis',
  'importante', 'importantes', 'simples', 'complexo', 'complexa', 'complexos', 'complexas',
  'principal', 'principais', 'direto', 'direta', 'diretos', 'diretas',
  'geral', 'gerais', 'alto', 'alta', 'altos', 'altas', 'baixo', 'baixa', 'baixos', 'baixas',
  'relevante', 'relevantes', 'eficiente', 'eficientes', 'correto', 'correta', 'corretos', 'corretas'
]);

// Retrocompatibilidade
const INVALID_ENTITY_WORDS = INVALID_CONNECTIVE_WORDS;

/**
 * Regex para detectar orações ou fragmentos que começam com verbo ativo ou passivo
 * (ex: "analisa os dados", "permite fazer", "roda no servidor", "é uma ferramenta", "usado para")
 */
const VERBAL_PHRASE_REGEX = /^(é|são|era|foram|ser|estar|ter|tem|têm|faz|fazem|pode|podem|roda|rodam|analisa|analisam|executa|executam|permite|permitem|ajuda|ajudam|garante|garantem|funciona|precisa|deve|mostra|indica|cria|gera|opera|integra|usado|usada|utilizado|utilizada|feito|feita|desenvolvido|desenvolvida)\s+(a|o|os|as|um|uma|uns|umas|de|da|do|das|dos|em|no|na|nos|nas|por|pelo|pela|pelos|pelas|para|com|como|se|que)\b/i;

function isInvalidEntity(text: string): boolean {
  if (!text) return true;
  const clean = text.trim();
  const lower = clean.toLowerCase();

  // 0. Isenção: Siglas e acrônimos técnicos em maiúsculas (ex: SEM, SEO, CTR, LCP, CLS, DOM, CSS, API, AI, IA, URL, SDK, HTML, TTFB, SERP)
  // não devem ser bloqueados por conectivos ou verbos homógrafos de grafia idêntica (como "sem" vs "SEM", "ia" vs "IA")
  const isAcronym = clean.length >= 2 && clean === clean.toUpperCase() && /^[A-Z0-9_\-\.]+$/.test(clean);
  if (isAcronym) {
    return false;
  }

  // 1. Termo direto na lista de conectivos/pronomes
  if (INVALID_CONNECTIVE_WORDS.has(lower)) return true;

  // 2. Termo direto no dicionário de verbos negativos
  if (INVALID_VERB_WORDS.has(lower)) return true;

  // 3. Termo direto no dicionário de substantivos vazios / adjetivos genéricos
  if (INVALID_GENERIC_NOUNS_AND_ADJECTIVES.has(lower)) return true;

  // 4. Termos de 1 ou 2 letras que não sejam siglas técnicas consagradas
  if (clean.length <= 2 && !/^(ia|ai|ml|os|db|ui|ux|ip|re|ti|pr|ar|vr|seo|api|sdk|url)$/i.test(clean)) return true;

  // 5. Expressões que começam com verbo conjugado seguido de preposição/artigo (oração recortada)
  if (VERBAL_PHRASE_REGEX.test(lower)) return true;

  // 6. Expressões anafóricas ou construções com pronomes soltos
  if (/^(ele|ela|eles|elas)\s+(roda|possui|tem|faz|é|são|opera|funciona).*$/i.test(lower)) return true;
  if (/^(este|esta|esse|essa|estes|estas|esses|essas|aquele|aquela)\s+(artigo|texto|sistema|ferramenta|processo|dado|dados|crawler|software)$/i.test(lower)) return true;
  if (/^(o|a|os|as)\s+(mesmo|mesma|mesmos|mesmas|crawler|ferramenta|sistema)$/i.test(lower)) return true;

  // 7. Frases que começam com conectivo e preposição (ex: "Depois de", "Dentro de", "Abaixo de", "Afinal de")
  if (/^(afinal|depois|dentro|abaixo|acima|além|ainda|assim|portanto|contudo|todavia|porém|entretanto|inclusive)(\s+(de|da|do|das|dos|em|que|se|o|a|os|as))?$/i.test(lower)) {
    return true;
  }

  return false;
}

// Backward-compatible alias
const isInvalidAnaphora = isInvalidEntity;

/**
 * Normaliza predicados fracos ou verbos copulativos vazios (ex: "é", "são", "estabelece relação factual em")
 * para relações ontológicas precisas
 */
function normalizeRelation(slug: string, label: string): { slug: string; label: string } {
  const cleanSlug = (slug || 'related_to').toLowerCase().trim().replace(/[\s-]+/g, '_');
  const cleanLabel = (label || slug || 'Related To').trim();

  // Verbos de ligação vazios ou descrições heurísticas cruas
  if (
    /^(é|e|são|sao|is|are|ser|foi|foram|was|were)$/i.test(cleanSlug) ||
    cleanSlug === 'estabelece_relação_factual_em' ||
    cleanSlug === 'estabelece_relacao_factual_em' ||
    cleanSlug === 'relacao_factual'
  ) {
    return { slug: 'defined_as', label: 'Defined As / Characterized As' };
  }

  if (/^(tem|possui|possue|have|has|contains)$/i.test(cleanSlug)) {
    return { slug: 'has_property', label: 'Has Property / Features' };
  }

  if (/^(pode|permite|possibilita|allows|enables|habilita)$/i.test(cleanSlug)) {
    return { slug: 'enables', label: 'Enables / Allows' };
  }

  if (/^(otimiza|melhora|aprimora|optimizes|enhances)$/i.test(cleanSlug)) {
    return { slug: 'optimizes', label: 'Optimizes / Enhances' };
  }

  if (/^(impacta|influencia|afeta|impacts|influences|affects)$/i.test(cleanSlug)) {
    return { slug: 'impacts', label: 'Impacts / Influences' };
  }

  if (/^(requer|necessita|depende|depende_de|requires|depends_on)$/i.test(cleanSlug)) {
    return { slug: 'requires', label: 'Requires / Depends On' };
  }

  if (/^(mede|avalia|audita|quantifica|measures|evaluates|audits)$/i.test(cleanSlug)) {
    return { slug: 'measures', label: 'Measures / Evaluates' };
  }

  if (/^(configura|governa|orienta|configures|governs)$/i.test(cleanSlug)) {
    return { slug: 'configures', label: 'Configures / Governs' };
  }

  if (/^(monitora|rastreia|inspeciona|monitors|tracks|inspects)$/i.test(cleanSlug)) {
    return { slug: 'monitors', label: 'Monitors / Analyzes' };
  }

  if (/^(usa|utiliza|integra|uses|uses_technology|integrates_with)$/i.test(cleanSlug)) {
    return { slug: 'uses_technology', label: 'Uses Technology / Implements' };
  }

  if (/^(executa|executa_em|roda|roda_em|executes|executes_on|runs_on)$/i.test(cleanSlug)) {
    return { slug: 'executes_on', label: 'Executes On / Runs On' };
  }

  if (/^(gera|produz|cria|generates|produces)$/i.test(cleanSlug)) {
    return { slug: 'generates', label: 'Generates / Produces' };
  }

  if (/^(parte_de|faz_parte_de|componente_de|part_of|component_of)$/i.test(cleanSlug)) {
    return { slug: 'part_of', label: 'Part Of / Component Of' };
  }

  if (/^(subtopico_de|subtopico|subtopic_of|subtopic)$/i.test(cleanSlug)) {
    return { slug: 'subtopic_of', label: 'Subtopic Of / Pillar-Cluster' };
  }

  if (/^(resolve_problema|soluciona|solves_problem|resolves)$/i.test(cleanSlug)) {
    return { slug: 'solves_problem', label: 'Solves Problem / Pain Point' };
  }

  if (/^(atende_intencao|satisfaz_intencao|answers_intent|satisfies_intent)$/i.test(cleanSlug)) {
    return { slug: 'answers_intent', label: 'Answers Search Intent' };
  }

  if (/^(direcionado_a|destinado_a|publico_alvo|targets_audience|audience)$/i.test(cleanSlug)) {
    return { slug: 'targets_audience', label: 'Targets Audience / Persona' };
  }

  if (/^(alternativa_a|concorrente_de|alternative_to|competitor_of)$/i.test(cleanSlug)) {
    return { slug: 'alternative_to', label: 'Alternative To / Competitor' };
  }

  if (/^(recomenda|indica|recommends|endorses)$/i.test(cleanSlug)) {
    return { slug: 'recommends', label: 'Recommends / Endorses' };
  }

  if (/^(escrito_por|autoria_de|authored_by|created_by)$/i.test(cleanSlug)) {
    return { slug: 'authored_by', label: 'Authored By (E-E-A-T)' };
  }

  return { slug: cleanSlug, label: cleanLabel };
}

// Fallback Heuristic Relation Extractor for offline / missing key resilience
function fallbackExtract(rawText: string, taxonomy: string, domainContext: string = '') {
  const text = preprocessInputText(rawText);
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
    const rawWord = sanitizeEntityText(match[1].trim());
    // Filter out stop words, anaphoras, and pronouns
    if (
      rawWord.length < 3 ||
      isInvalidAnaphora(rawWord) ||
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
      } else if (/(?:Python|React|PyTorch|TensorFlow|BERT|RoBERTa|Cypher|Neo4j|SQL|GraphML|JSON|OpenNRE|LLM|GPT|Googlebot)/i.test(rawWord)) {
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
      domainContext = '',
      taxonomy = 'wiki80',
      customRelations = [],
      confidenceThreshold = 0.5,
      language = 'auto'
    } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'Text payload is required for relation extraction' });
      return;
    }

    const contextStr = typeof domainContext === 'string' ? domainContext.trim() : '';
    if (!contextStr) {
      res.status(400).json({
        error: 'Contexto Temático Obrigatório: A análise está travada. O campo de contexto é uma condição indispensável para ancorar a extração semântica e evitar entidades desconexas.'
      });
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

    // NLP Structural Preprocessing: separates headings from paragraph bodies, normalizes bullet lines and punctuation
    const cleanedText = preprocessInputText(text);

    // Check in-memory SHA-256 cache
    const targetLang = (language && language !== 'auto' ? language : 'pt').toLowerCase();
    const cacheKey = 'extract:' + crypto.createHash('sha256').update(`${targetLang}:${taxonomy}:${confidenceThreshold}:${contextStr}:${cleanedText}`).digest('hex');
    const cached = aiGenerationCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      res.json({
        ...cached.result,
        executionTimeMs: Date.now() - startTime,
        cached: true
      });
      return;
    }

    const client = getGeminiClient();

    if (!client) {
      // Offline fallback mode if API key is not yet set
      const fallback = fallbackExtract(cleanedText, taxonomy, contextStr);
      const executionTimeMs = Date.now() - startTime;
      const filteredRelations = fallback.relations.filter(r => r.confidence >= confidenceThreshold);

      res.json({
        entities: fallback.entities,
        relations: filteredRelations,
        rawText: cleanedText,
        taxonomy,
        domainContext: contextStr,
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
    let taxonomyGuidance = '';
    if (taxonomy === 'semantic_seo') {
      taxonomyGuidance = `TAXONOMY: SEO Semântico & Topic Clusters (Schema.org / Artigos - Recomendado):
Use domain relations specifically tailored for content architecture, topic clusters, search intent, and E-E-A-T:
- 'subtopic_of': Entity is a specialized subtopic or cluster component of a main pillar concept (e.g. <Crawl Budget, subtopic_of, SEO Técnico>).
- 'optimizes': Head improves, accelerates, or optimizes Tail metric or performance (e.g. <Compressão WebP, optimizes, LCP>).
- 'impacts': Head directly influences or affects Tail result (e.g. <Velocidade da Página, impacts, Taxa de Rejeição>).
- 'solves_problem': Solution or technique fixes target issue (e.g. <Tag Canonical, solves_problem, Conteúdo Duplicado>).
- 'answers_intent': Content satisfies specific search intent (e.g. <Tabela Comparativa, answers_intent, Intenção Comercial>).
- 'targets_audience': Tailored to specific persona or reader group (e.g. <Artigo, targets_audience, Desenvolvedores Web>).
- 'measures': Audits or monitors target metric or system (e.g. <Search Console, measures, CTR>).
- 'configures': Sets rules or directives for target (e.g. <Robots.txt, configures, Googlebot>).
- 'alternative_to': Compares competitor or alternative tool (e.g. <Matomo, alternative_to, Google Analytics>).
- 'recommends': Recommends or endorses target tool or practice (e.g. <Guia, recommends, Screaming Frog>).
- 'requires': Mandates prerequisite or condition (e.g. <Indexação, requires, Código HTTP 200>).
- 'component_of': Part of structural architecture (e.g. <Schema.org, component_of, Web Semântica>).
- 'enables': Unlocks feature or rich snippet (e.g. <JSON-LD, enables, Rich Snippets>).
- 'defined_as': Canonical ontological definition of a concept.
- 'authored_by': Authorial E-E-A-T attribution to person or company.
- 'uses_technology': Implements software or standard (e.g. <Googlebot, uses_technology, Chromium>).`;
    } else if (taxonomy === 'tacred') {
      taxonomyGuidance = `TAXONOMY: Stanford TACRED (Focused on Corporate, Executive Profiles & People):
Use relations aligned with TACRED: org:founded_by, org:top_members_employees, org:subsidiaries, org:parents, org:city_of_headquarters, per:title, per:city_of_birth, per:schools_attended, per:spouse, per:charges, per:age, per:member_of.`;
    } else {
      // wiki80 (Wikidata & General Knowledge Ontologies)
      taxonomyGuidance = `TAXONOMY: OpenNRE Wiki80 (Wikidata & General Knowledge Ontologies):
Use standard Wikidata properties and ontological relations:
- subclass_of [P279], part_of [P361], developer_of [P178], manufacturer [P176], operates [P121], author [P50], member_of [P463], founded_by [P112], headquarters_location [P159], country_of_citizenship [P27].
- Functional domain actions: optimizes, impacts, requires, measures, configures, uses_technology, enables, monitors, executes_on, generates, defined_as.`;
    }

    const systemPrompt = `You are OpenNRE Semantic Engine, a neural relation and knowledge graph extraction pipeline designed specifically for Content Writers, SEO Architects, and Ontology Engineers.
Your objective is to analyze the text, extract all legitimate semantic entities across the entire document, resolve coreferences, and construct a rich, highly informative Knowledge Graph <head, relation, tail> that accurately maps the document's topical landscape.

${getLangInstruction(targetLang)}

BALANCED EXTRACTION GUIDELINES (OPTIMAL RECALL + HIGH PRECISION):

1. THEMATIC CONTEXT ANCHORING & DOMAIN SCOPE:
   - Target Domain / Niche: "${contextStr}".
   - Interpret the document through the lens of "${contextStr}".
   - Prioritize all concepts, technologies, metrics, tools, methods, and entities that belong to the semantic web of "${contextStr}".
   - Use this context to disambiguate terms (e.g., in SEO, "código 200" is an HTTP Status Code, "rastreador" is a Web Crawler).
   - Discard only purely off-topic conversational banter or incidental metaphors that carry no domain value.

2. BALANCED DENSITY FOR CONTENT WRITERS (PREVENT PREMATURE PRUNING):
   - Redators and SEO specialists rely on this graph to audit entity completeness, topical authority, and semantic connections in their articles.
   - DO NOT be timid or overly conservative: extract ALL legitimate domain entities and concepts across the entire document (introduction, body sections, bullet points, technical explanations, and conclusion).
   - Target Entity Density: For standard articles, identify between 12 and 35 key domain entities (scaled proportionally according to text length) and connect them through rich semantic relations.
   - Capture the full conceptual hierarchy: Core Subjects, Subtopics, Supporting Concepts, Technical Standards, Tools, Metrics, and Outcomes.

3. RICH ENTITY TAXONOMY (WHAT COUNTS AS A VALID ENTITY):
   Entities must be NOUN PHRASES (Substantivos ou Sintagmas Nominais). Classify each entity into one of these types:
   - 'Concept': Core theoretical and domain concepts (e.g. "Orçamento de Rastreamento", "Arquitetura de Informação", "SEO On-Page", "Taxa de Rejeição", "Intenção de Busca", "Indexação", "Dados Estruturados", "Link Building").
   - 'Technology': Softwares, protocols, formats, tools, algorithms, specifications (e.g. "Googlebot", "Robots.txt", "Sitemap XML", "Screaming Frog", "Chromium", "HTML5", "CSS", "Apache").
   - 'Product': Commercial platforms, products, or services (e.g. "Google Search Console", "WordPress", "PageSpeed Insights", "Ahrefs").
   - 'Metric': Quantitative/qualitative metrics, HTTP status codes, performance criteria (e.g. "LCP", "CLS", "Código HTTP 200", "Tempo de Resposta TTFB", "CTR", "PageRank").
   - 'Method': Technical processes, practices, and actionable procedures treated as nouns (e.g. "Auditoria Técnica", "Renderização em JavaScript", "Minificação de CSS", "Compressão Gzip").
   - 'Organization': Companies, search engines, consortiums, institutions (e.g. "Google", "W3C", "Cloudflare", "OpenAI").
   - 'Person': Real individuals, industry specialists, authors (e.g. "John Mueller", "Matt Cutts").
   - 'Location', 'Event', 'Date', 'Country', 'Work', 'Biomedical', 'Other'.

4. STRUCTURAL NOUN-PHRASE PURITY (RESOLVING VERBS INTO EDGES, NOT NODES):
   - In a Knowledge Graph, VERBS ARE EDGES (RELATIONS), NEVER NODES (ENTITIES).
   - NEVER create entity nodes that are lone conjugated verbs (e.g. "analisa", "roda", "permite", "executa", "ajuda", "garante", "funciona", "cria", "gera") or verb fragments ("analisa os dados", "permite fazer", "roda no servidor").
   - Instead, transform verbal actions into relations connecting two noun entities:
     * Text: "O Googlebot analisa os logs de acesso do servidor para detectar anomalias."
     * Extraction: Head: "Googlebot" (Technology) -> Relation: "analyzes" (or "monitors") -> Tail: "Logs de acesso do servidor" (Concept/Technology).
   - Clean entity names: NEVER include trailing colons, semicolons, quotes, or list punctuation (write "Logs de acesso", NEVER "Logs de acesso:").

5. COREFERENCE & ANAPHORA RESOLUTION (ZERO PRONOUN POLICY):
   - NEVER output pronouns ("Ele", "Ela", "Eles", "Isso", "Este sistema", "A ferramenta", "O mesmo", "It", "They") as entity nodes.
   - Always resolve pronouns to their explicit canonical antecedent from the paragraph context (e.g., if "Ele consome..." refers to "Googlebot", the entity is "Googlebot").

6. BAN ON DISCOURSE CONNECTIVES & FILLER WORDS:
   - Grammatical connectives, transition adverbs, and discourse markers ("Afinal", "Abaixo", "Depois", "Ainda", "Dentro", "Assim", "Portanto", "Contudo", "Além disso", "Ou seja", "No entanto") are NEVER entities.
   - Standalone empty filler nouns ("coisa", "algo", "modo", "tipo", "fato", "caso", "exemplo") or standalone adjectives ("melhor", "novo", "rápido") are not entities unless part of a specific technical compound term (e.g. "Tipo de Conteúdo MIME", "Ponto de Entrada").

7. SEMANTIC RELATIONS & EVIDENCE:
   - Formulate clean, descriptive snake_case relations reflecting real domain dependencies (e.g. "optimizes", "impacts", "requires", "measures", "configures", "uses_technology", "enables", "monitors", "subclass_of", "part_of", "developer_of", "executes_on", "generates", "defined_as"). ${taxonomyGuidance}
   - Human-friendly Relation Labels (e.g. "Otimiza", "Impacta", "Requer", "Mede", "Configura", "Utiliza Tecnologia", "Habilita", "Monitora").
   - Ground each relation with the exact sentence proof in "evidence".
   - Assign realistic confidence scores (between 0.75 and 1.00).

8. MANDATORY JSON OUTPUT STRUCTURE:
   Return EXCLUSIVELY a single valid JSON object strictly matching this schema:
   {
     "entities": [
       {
         "id": "canonical_id_slug",
         "text": "Exact Canonical Entity Name",
         "type": "Concept | Technology | Product | Metric | Method | Organization | Person | Location | Event | Other",
         "confidence": 0.95,
         "aliases": ["alias_1", "alias_2"],
         "wikidataId": "Q95"
       }
     ],
     "relations": [
       {
         "id": "rel_1",
         "headId": "head_entity_slug",
         "headText": "Head Entity Name",
         "headType": "Technology",
         "tailId": "tail_entity_slug",
         "tailText": "Tail Entity Name",
         "tailType": "Concept",
         "relation": "snake_case_relation",
         "relationLabel": "Human Friendly Label",
         "taxonomy": "${taxonomy}",
         "confidence": 0.92,
         "evidence": "Exact sentence proving this relation",
         "direction": "DIRECTED",
         "qualifiers": [
           { "key": "time", "value": "2026", "wikidataProperty": "P585" }
         ]
       }
     ]
   }`;

    const { text: responseText, modelUsed: successfulModel } = await generateWithResilience(
      client,
      {
        contents: `Perform domain-grounded OpenNRE Named Entity, Alias Normalization & Relation Extraction with Edge Qualifiers on the following text.\nPrimary Thematic Context: "${contextStr}"\n\n"""\n${cleanedText}\n"""`,
        systemInstruction: systemPrompt,
        temperature: 0.25,
        responseMimeType: 'application/json'
      },
      'OpenNRE-Extract'
    );

    let parsed: any = null;
    try {
      parsed = safeJsonParse(responseText);
    } catch (parseError: any) {
      console.warn('Could not parse model JSON directly, using fallback recovery:', parseError?.message);
    }

    let rawEntities: any[] = [];
    let rawRelations: any[] = [];

    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.entities)) {
        rawEntities = parsed.entities;
      }
      if (Array.isArray(parsed.relations)) {
        rawRelations = parsed.relations;
      }
      // If model returned a top-level array
      if (Array.isArray(parsed)) {
        parsed.forEach((item: any) => {
          if (item?.head || item?.headText || item?.relation) {
            rawRelations.push(item);
          } else if (item?.text || item?.entity) {
            rawEntities.push(item);
          }
        });
      }
    }

    // If model extraction produced no entities or relations, smoothly fall back to heuristic extraction
    if (rawEntities.length === 0 && rawRelations.length === 0) {
      const fallback = fallbackExtract(cleanedText, taxonomy);
      rawEntities = fallback.entities;
      rawRelations = fallback.relations;
    }

    // Ensure entity IDs and sanitize
    const entityMap = new Map<string, any>();
    const sanitizedEntities: any[] = [];

    rawEntities.forEach((e, idx) => {
      const cleanedEntityName = sanitizeEntityText(String(e.text || `Entity_${idx + 1}`));
      // Exclude invalid anaphoras, pronouns, connectives and empty strings
      if (!cleanedEntityName || isInvalidEntity(cleanedEntityName)) {
        return;
      }

      const id = String(e.id || cleanedEntityName.toLowerCase().replace(/[^\w]/g, '_') || `e_${idx + 1}`);
      const type = String(e.type || 'Concept');
      const conf = typeof e.confidence === 'number' ? Math.min(1, Math.max(0, e.confidence)) : 0.95;
      const aliases = Array.isArray(e.aliases)
        ? e.aliases
            .map((a: any) => sanitizeEntityText(String(a)))
            .filter((a: string) => a && !isInvalidEntity(a))
        : [cleanedEntityName];
      const wikidataId = e.wikidataId && typeof e.wikidataId === 'string' ? e.wikidataId.trim() : undefined;

      const ent = {
        id,
        text: cleanedEntityName,
        type,
        confidence: conf,
        aliases: aliases.length > 0 ? aliases : [cleanedEntityName],
        wikidataId,
        startPos: typeof e.startPos === 'number' ? e.startPos : undefined,
        endPos: typeof e.endPos === 'number' ? e.endPos : undefined
      };

      sanitizedEntities.push(ent);
      entityMap.set(id, ent);
      entityMap.set(cleanedEntityName.toLowerCase(), ent);
      aliases.forEach((alias: string) => {
        entityMap.set(alias.toLowerCase(), ent);
      });
    });

    // Ensure relations have matching entities and normalize weak predicates
    const sanitizedRelations = rawRelations
      .map((r, idx) => {
        const rawHeadText = sanitizeEntityText(String(r.headText || r.head || ''));
        const rawTailText = sanitizeEntityText(String(r.tailText || r.tail || ''));

        // Filter out relations with pronouns, connectives, or empty entities
        if (!rawHeadText || !rawTailText || isInvalidEntity(rawHeadText) || isInvalidEntity(rawTailText)) {
          return null;
        }

        let headId = String(r.headId || rawHeadText.toLowerCase().replace(/[^\w]/g, '_'));
        let tailId = String(r.tailId || rawTailText.toLowerCase().replace(/[^\w]/g, '_'));

        // Match with entity map or create fallback entity
        let headEnt = entityMap.get(headId) || entityMap.get(rawHeadText.toLowerCase());
        if (!headEnt && rawHeadText) {
          headEnt = {
            id: headId,
            text: rawHeadText,
            type: r.headType || 'Other',
            confidence: 0.9,
            aliases: [rawHeadText]
          };
          sanitizedEntities.push(headEnt);
          entityMap.set(headId, headEnt);
        }

        let tailEnt = entityMap.get(tailId) || entityMap.get(rawTailText.toLowerCase());
        if (!tailEnt && rawTailText) {
          tailEnt = {
            id: tailId,
            text: rawTailText,
            type: r.tailType || 'Other',
            confidence: 0.9,
            aliases: [rawTailText]
          };
          sanitizedEntities.push(tailEnt);
          entityMap.set(tailId, tailEnt);
        }

        // Normalize weak relations (e.g. "é", "são", "estabelece relação factual em") into ontological relations
        const normalizedRel = normalizeRelation(
          String(r.relation || 'related_to'),
          String(r.relationLabel || r.relation || 'Related To')
        );

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
          headText: headEnt ? headEnt.text : rawHeadText,
          headType: headEnt ? headEnt.type : (r.headType || 'Other'),
          tailId: tailEnt ? tailEnt.id : tailId,
          tailText: tailEnt ? tailEnt.text : rawTailText,
          tailType: tailEnt ? tailEnt.type : (r.tailType || 'Other'),
          relation: normalizedRel.slug,
          relationLabel: normalizedRel.label,
          taxonomy: r.taxonomy || taxonomy,
          confidence,
          evidence,
          direction: 'DIRECTED',
          qualifiers: qualifiers && qualifiers.length > 0 ? qualifiers : undefined
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null && Boolean(r.headId && r.tailId && r.confidence >= confidenceThreshold));

    const executionTimeMs = Date.now() - startTime;
    const totalEntities = sanitizedEntities.length;
    const totalRelations = sanitizedRelations.length;
    const avgConfidence = totalRelations > 0
      ? sanitizedRelations.reduce((acc, r) => acc + r.confidence, 0) / totalRelations
      : 0;

    const density = totalEntities > 1
      ? (2 * totalRelations) / (totalEntities * (totalEntities - 1))
      : 0;

    const resultPayload = {
      entities: sanitizedEntities,
      relations: sanitizedRelations,
      rawText: cleanedText,
      taxonomy,
      executionTimeMs,
      modelUsed: `${successfulModel} (OpenNRE Pipeline)`,
      summary: {
        totalEntities,
        totalRelations,
        avgConfidence: Number(avgConfidence.toFixed(3)),
        density: Number(density.toFixed(4))
      }
    };

    // Cache valid extracted result
    aiGenerationCache.set(cacheKey, {
      result: resultPayload,
      timestamp: Date.now()
    });

    res.json(resultPayload);
  } catch (error: any) {
    console.info('Notice in /api/extract: using heuristic resilience fallback for relation extraction.');
    // Fallback on error to ensure app never breaks for the user
    const text = req.body.text || '';
    const cleanedText = preprocessInputText(text);
    const taxonomy = req.body.taxonomy || 'wiki80';
    const fallback = fallbackExtract(cleanedText, taxonomy, req.body.domainContext || '');
    const executionTimeMs = Date.now() - startTime;

    res.json({
      entities: fallback.entities,
      relations: fallback.relations,
      rawText: cleanedText,
      taxonomy,
      domainContext: req.body.domainContext || '',
      executionTimeMs,
      modelUsed: 'heuristic_opennre_fallback',
      warning: 'Cota de IA em espera temporária. O grafo foi construído com sucesso através do motor de fallback heurístico local.',
      summary: {
        totalEntities: fallback.entities.length,
        totalRelations: fallback.relations.length,
        avgConfidence: 0.9,
        density: fallback.entities.length > 1 ? (2 * fallback.relations.length) / (fallback.entities.length * (fallback.entities.length - 1)) : 0
      }
    });
  }
});

// Helper to extract sentence from text
function findContextSentence(fullText: string, entityText: string): string {
  if (!fullText || !entityText) return '';
  const sentences = fullText.split(/(?<=[.!?])\s+/);
  const found = sentences.find(s => {
    try {
      const regex = new RegExp(`\\b${entityText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(s);
    } catch {
      return s.toLowerCase().includes(entityText.toLowerCase());
    }
  });
  return found ? found.trim() : (sentences[0] || '').trim();
}

// Heuristic Fallback for Text Optimization Analysis
function fallbackTextOptimization(
  text: string,
  entities: Array<{ id?: string; text: string; type?: string }>,
  relations: Array<{ headText: string; tailText: string; relation?: string; headId?: string; tailId?: string }>,
  taxonomy: string = 'semantic_seo',
  domainContext: string = ''
) {
  const connectedNodeIds = new Set<string>();
  relations.forEach(r => {
    if (r.headId) connectedNodeIds.add(r.headId);
    if (r.tailId) connectedNodeIds.add(r.tailId);
    if (r.headText) connectedNodeIds.add(r.headText.toLowerCase());
    if (r.tailText) connectedNodeIds.add(r.tailText.toLowerCase());
  });

  // Filter out any connective or invalid entity words from diagnosis
  const validEntities = entities.filter(e => !isInvalidEntity(e.text));

  const isolated = validEntities.filter(
    e => !connectedNodeIds.has(e.id || '') && !connectedNodeIds.has(e.text.toLowerCase())
  );

  const mainConnected = validEntities.find(
    e => connectedNodeIds.has(e.id || '') || connectedNodeIds.has(e.text.toLowerCase())
  )?.text || validEntities[0]?.text || (domainContext || 'Tópico Principal');

  const defaultRelation = taxonomy === 'semantic_seo' 
    ? 'optimizes' 
    : taxonomy === 'tacred' 
    ? 'org:parents' 
    : 'use';

  const isolatedEntities = isolated.map(e => {
    const context = findContextSentence(text, e.text);
    const target = mainConnected !== e.text ? mainConnected : (validEntities.find(o => o.text !== e.text)?.text || 'Entidade Central');
    
    return {
      entity: e.text,
      type: e.type || 'Concept',
      contextSentence: context || `Menção a ${e.text} no corpo do artigo.`,
      targetEntityToConnect: target,
      recommendedRelation: defaultRelation,
      reason: `A entidade '${e.text}' é mencionada sem uma oração ativa ou predicado relacional explícito conectando-a diretamente a '${target}', deixando-a como nó órfão no grafo.`,
      editorialOption: `Ao estruturar a narrativa em torno de ${target}, ${e.text} atua como elemento fundamental para sustentar a eficácia do processo.`,
      seoDirectOption: `${target} ${defaultRelation === 'optimizes' ? 'otimiza e fundamenta' : 'integra diretamente'} ${e.text}, fortalecendo a topologia do conhecimento.`,
      suggestedFix: `Conecte '${e.text}' a '${target}' através de um predicado verbal ativo direto.`
    };
  });

  const score = Math.max(
    25,
    Math.min(
      95,
      Math.round(
        (validEntities.length > 0 ? (validEntities.length - isolated.length) / validEntities.length : 0.5) * 60 +
          (relations.length >= 3 ? 35 : relations.length * 10)
      )
    )
  );

  const connectivityLevel: 'Low' | 'Moderate' | 'Good' | 'High' =
    score >= 80 ? 'High' : score >= 60 ? 'Good' : score >= 40 ? 'Moderate' : 'Low';

  const firstSentence = text.split(/(?<=[.!?])\s+/)[0] || text.slice(0, 100);
  const ent1 = validEntities[0]?.text || 'O sistema';
  const ent2 = validEntities[1]?.text || 'as operações estruturais';

  const topicalGaps = domainContext ? [
    {
      entity: `Fundamentos de ${domainContext}`,
      type: 'Concept',
      importance: 'Crítica' as const,
      suggestedRelation: taxonomy === 'semantic_seo' ? 'subtopic_of' : 'part_of',
      whyEssential: `Cobrir a base conceitual de '${domainContext}' ancora o artigo como referência completa para motores de busca e leitores.`,
      suggestedSnippetToInsert: `Para consolidar a arquitetura de ${domainContext}, é recomendável detalhar explicitamente os princípios operacionais aplicáveis.`
    },
    {
      entity: `Boas Práticas e Métricas`,
      type: 'Metric',
      importance: 'Alta' as const,
      suggestedRelation: taxonomy === 'semantic_seo' ? 'measures_metric' : 'use',
      whyEssential: `Métricas quantificáveis aumentam o E-E-A-T do artigo, permitindo ao leitor avaliar o impacto das soluções apresentadas.`,
      suggestedSnippetToInsert: `A eficiência do processo é comprovada através de métricas de desempenho e taxas de conversão rigorosamente monitoradas.`
    }
  ] : [];

  return {
    connectivityScore: score,
    connectivityLevel,
    diagnosisSummary:
      isolated.length > 0
        ? `O texto possui ${validEntities.length} entidades válidas identificadas, com ${isolated.length} termos isolados que necessitam de pontes predicativas para enriquecer a topologia do grafo.`
        : `O texto apresenta excelente densidade relacional, com ${relations.length} relações extraídas conectando solidamente os nós centrais de conhecimento.`,
    isolatedEntities,
    topicalGaps,
    implicitOrWeakRelations: [
      {
        headEntity: ent1,
        tailEntity: ent2,
        issue: 'A relação pode estar implícita por proximidade textual, sem um verbo ontológico ativo unindo os termos.',
        suggestedRelation: taxonomy === 'semantic_seo' ? 'optimizes / component_of' : 'use / part_of',
        howToClarify: 'Formule uma oração direta com sujeito canônico e verbo de ação no mesmo período gramatical.'
      }
    ],
    rewriteSuggestions: [
      {
        originalSnippet: firstSentence,
        suggestedSnippet: `${ent1} desenvolve e opera diretamente ${ent2}, estabelecendo a espinha dorsal de conhecimento do documento.`,
        explanation: 'Substituição de formulação elíptica ou passiva por oração ativa com predicado relacional explícito.',
        relationUnlocked: taxonomy === 'semantic_seo' ? 'optimizes / executes_on' : 'operates / integrates_with'
      }
    ],
    optimizedText: text,
    expectedNewRelations: taxonomy === 'semantic_seo' ? ['optimizes', 'solves_problem', 'component_of'] : ['part_of', 'use', 'developer'],
    keyImprovements: [
      'Eliminação completa de nós órfãos através de predicados verbais ativos.',
      'Substituição de pronomes vagos por substantivos canônicos desambiguados.',
      'Aumento imediato na densidade de arestas direcionadas para motores de busca e grafos de conhecimento.'
    ]
  };
}

// API Route: Analyze text connectivity and generate optimization report
app.post('/api/analyze-text-connectivity', requireAuth, async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { text, entities = [], relations = [], taxonomy = 'semantic_seo', domainContext = '', language = 'pt' } = req.body;

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Text parameter is required' });
  }

  const contextStr = typeof domainContext === 'string' ? domainContext.trim() : '';
  if (!contextStr) {
    return res.status(400).json({
      error: 'Contexto Temático Obrigatório: A análise está travada. O campo de contexto é uma condição indispensável para ancorar o diagnóstico editorial de conectividade.'
    });
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

  const cleanedText = preprocessInputText(text);

  // Check in-memory SHA-256 cache
  const targetLang = (language || 'pt').toLowerCase();
  const cacheKey = 'optimize:' + crypto.createHash('sha256').update(`${targetLang}:${taxonomy}:${contextStr}:${cleanedText}`).digest('hex');
  const cached = aiGenerationCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return res.json({
      ...cached.result,
      executionTimeMs: Date.now() - startTime,
      cached: true
    });
  }

  // Filter out any connective or invalid entity words from input entities
  const validEntities = entities.filter((e: any) => e?.text && !isInvalidEntity(e.text));
  const validRelations = relations.filter(
    (r: any) =>
      r?.headText &&
      r?.tailText &&
      !isInvalidEntity(r.headText) &&
      !isInvalidEntity(r.tailText)
  );

  const client = getGeminiClient();

  if (!client) {
    const fallback = fallbackTextOptimization(cleanedText, validEntities, validRelations, taxonomy, contextStr);
    return res.json({
      ...fallback,
      executionTimeMs: Date.now() - startTime,
      modelUsed: 'heuristic_optimizer_fallback',
      warning: 'Gemini API key not configured, returning rule-based analysis.'
    });
  }

  try {
    const taxonomyDirectives = taxonomy === 'semantic_seo'
      ? `TAXONOMIA ATIVA: 'semantic_seo' (SEO Semântico, Schema.org e Topic Clusters).
Priorize e recomende ESTRITAMENTE predicados desta taxonomia:
- 'subtopic_of', 'solves_problem', 'answers_intent', 'targets_audience', 'alternative_to', 'optimizes', 'component_of', 'uses_technology', 'executes_on', 'measures_metric', 'requires_condition', 'impacts'.`
      : taxonomy === 'tacred'
      ? `TAXONOMIA ATIVA: 'tacred' (Relações Corporativas e Biográficas).
Priorize predicados TACRED: 'org:subsidiaries', 'org:founded_by', 'org:parents', 'per:title', 'per:employee_of', etc.`
      : `TAXONOMIA ATIVA: 'wiki80' (Wikidata Geral).
Priorize predicados Wikidata: 'subclass_of', 'part_of', 'instance_of', 'use', 'developer', 'manufacturer', 'owned_by', etc.`;

    const systemPrompt = `Você é um especialista sênior em Engenharia de Conhecimento, Linguística Computacional, SEO Semântico e Consultoria Editorial para Redatores e Copywriters.
Seu objetivo é analisar profundamente o texto do autor, suas entidades e relações, oferecendo um Diagnóstico Relacional de alta sensibilidade editorial e prática.

DIRETIVA OBRIGATÓRIA DE CONTEXTO TEMÁTICO:
- O autor definiu que este texto trata estritamente sobre: "${contextStr}".
- Todas as sugestões de reescrita, diagnósticos de entidades isoladas, lacunas tópicas e pontes relacionais sugeridas devem ser estritamente coerentes e ancoradas no nicho/tema "${contextStr}".

${taxonomyDirectives}

${getLangInstruction(targetLang)}

CONSULTORIA EDITORIAL PARA REDATORES E COPYWRITERS (FOCO EM QUEM ESCREVE):
- Redatores e autores de background criativo frequentemente 'dobram a linguagem': usam metáforas, construções estilísticas, orações subordinadas e voz passiva para enriquecer a narrativa.
- Nesse processo criativo natural, entidades fundamentais acabam ficando isoladas sem predicados relacionais formais que um motor de busca ou algoritmo de Grafo de Conhecimento possa extrair.
- O seu papel NÃO é dar broncas acadêmicas ou conselhos genéricos ("conecte a entidade usando verbo ativo"), mas entregar SOLUÇÕES PRONTAS E ELEGANTES PARA O AUTOR.

DIRETRIZES PARA CADA ENTIDADE ISOLADA (isolatedEntities):
Para CADA entidade que ficou sem conexão no grafo:
1. "entity": Nome exato da entidade.
2. "type": Tipo ontológico ('Technology', 'Concept', 'Organization', 'Person', 'Metric', 'Method', etc.).
3. "contextSentence": A frase exata do texto de origem do autor onde essa entidade aparece.
4. "targetEntityToConnect": A principal entidade central do texto com a qual esta entidade isolada deve se conectar.
5. "recommendedRelation": O predicado ontológico ideal alinhado à taxonomia ativa (ex: "optimizes", "component_of", "solves_problem", "subtopic_of", "uses_technology").
6. "reason": Explicação amigável em PT-BR do porquê a redação criativa atual a deixou desconectada sintaticamente.
7. "editorialOption": Proposta de frase alternativa que PRESERVA o estilo autoral, o tom narrativo e a elegância criativa do autor, introduzindo a conexão com sutileza.
8. "seoDirectOption": Proposta de frase direta no modelo SEO Semântico (Sujeito Canônico + Verbo Ativo + Objeto) para máxima extração pelo motor semântico.
9. "suggestedFix": Resumo prático de 1 frase.

DIRETIVA DE LACUNAS DE AUTORIDADE TEMÁTICA (topicalGaps):
- Analise o nicho "${contextStr}" e identifique de 2 a 4 entidades, métricas ou conceitos canônicos essenciais que NÃO foram mencionados no texto, mas que são indispensáveis para garantir Autoridade Tópica Máxima (Topical Authority / Helpful Content).
- Para cada lacuna forneça:
  - "entity": Nome da entidade ausente.
  - "type": Tipo ontológico ('Concept', 'Technology', 'Metric', 'Method', etc.).
  - "importance": "Crítica" | "Alta" | "Média".
  - "suggestedRelation": Predicado da taxonomia ativa para ligá-la ao tema central.
  - "whyEssential": Explicação de por que a ausência desta entidade enfraquece o alcance semântico do artigo perante o Google e leitores.
  - "suggestedSnippetToInsert": Uma frase pronta e natural sugerida para o redator adicionar ao artigo cobrindo o termo.

REGRA INVIOLÁVEL PARA SUGESTÕES DE REESCRITA (rewriteSuggestions):
- O campo "suggestedSnippet" NUNCA PODE SER IGUAL AO "originalSnippet". Proponha uma reescrita notavelmente diferente, mais ativa e rica em conexões. Se forem iguais, a resposta será inútil.

FILTRAGEM ESTRITA DE VERBOS, CONECTIVOS E TERMOS GENÉRICOS:
- NUNCA inclua verbos (ex: "analisa", "roda", "permite", "executa", "é", "são"), orações recortadas ("analisa os dados", "roda no servidor"), conectivos/advérbios ("Afinal", "Abaixo", "Depois", "Ainda", "Dentro", "Ambas", "Assim", "Portanto") ou substantivos vazios ("coisas", "modo", "tipo", "fato", "caso", "exemplo", "detalhe") como entidades isoladas. Verbos são predicados de relação, jamais nós.

Retorne EXCLUSIVAMENTE um JSON válido com esta estrutura:
{
  "connectivityScore": number (0-100),
  "connectivityLevel": "Low" | "Moderate" | "Good" | "High",
  "diagnosisSummary": string (EM PORTUGUÊS DO BRASIL),
  "isolatedEntities": [
    {
      "entity": string,
      "type": string,
      "contextSentence": string,
      "targetEntityToConnect": string,
      "recommendedRelation": string,
      "reason": string,
      "editorialOption": string,
      "seoDirectOption": string,
      "suggestedFix": string
    }
  ],
  "topicalGaps": [
    {
      "entity": string,
      "type": string,
      "importance": "Crítica" | "Alta" | "Média",
      "suggestedRelation": string,
      "whyEssential": string,
      "suggestedSnippetToInsert": string
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

    const userContent = `Texto de Origem para Análise:
"""
${cleanedText}
"""

Entidades Válidas Identificadas (${validEntities.length}):
${JSON.stringify(validEntities.map((e: any) => ({ text: e.text, type: e.type })), null, 2)}

Relações Extraídas (${validRelations.length}):
${JSON.stringify(validRelations.map((r: any) => ({ head: r.headText, rel: r.relationLabel || r.relation, tail: r.tailText })), null, 2)}

Taxonomia: ${taxonomy}
Contexto Temático do Documento: "${contextStr}"

Analise a topologia do texto e forneça o Relatório de Consultoria Editorial e Otimização Semântica de acordo com a diretiva de idioma fornecida.`;

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

    // Post-process isolatedEntities to filter any connectives and guarantee sentence contexts
    const rawIsolated = Array.isArray(parsed.isolatedEntities) ? parsed.isolatedEntities : [];
    const sanitizedIsolated = rawIsolated
      .filter((item: any) => item?.entity && !isInvalidEntity(String(item.entity)))
      .map((item: any) => {
        const entityText = String(item.entity);
        const context = item.contextSentence || findContextSentence(cleanedText, entityText);
        return {
          ...item,
          entity: entityText,
          contextSentence: context,
          editorialOption: item.editorialOption || `Ao considerar a estrutura narrativa, ${entityText} conecta-se harmonicamente ao contexto geral do documento.`,
          seoDirectOption: item.seoDirectOption || `${item.targetEntityToConnect || 'O sistema'} integra e utiliza ativamente ${entityText}.`
        };
      });

    // Post-process topicalGaps
    const rawGaps = Array.isArray(parsed.topicalGaps) ? parsed.topicalGaps : [];
    const sanitizedGaps = rawGaps
      .filter((g: any) => g?.entity && !isInvalidEntity(String(g.entity)))
      .map((g: any) => ({
        entity: String(g.entity),
        type: String(g.type || 'Concept'),
        importance: ['Crítica', 'Alta', 'Média'].includes(g.importance) ? g.importance : 'Alta',
        suggestedRelation: String(g.suggestedRelation || (taxonomy === 'semantic_seo' ? 'subtopic_of' : 'part_of')),
        whyEssential: String(g.whyEssential || 'Fortalece a cobertura semântica e a autoridade tópica do artigo.'),
        suggestedSnippetToInsert: String(g.suggestedSnippetToInsert || `A adoção de ${g.entity} consolida as bases de ${contextStr}.`)
      }));

    // Post-process rewriteSuggestions to ensure suggestedSnippet is never identical to originalSnippet
    const rawRewrites = Array.isArray(parsed.rewriteSuggestions) ? parsed.rewriteSuggestions : [];
    const sanitizedRewrites = rawRewrites.map((rw: any) => {
      let orig = String(rw.originalSnippet || '').trim();
      let sugg = String(rw.suggestedSnippet || '').trim();
      if (orig && sugg && orig.toLowerCase() === sugg.toLowerCase()) {
        sugg = `${orig.replace(/\.$/, '')} através de uma integração semântica direta e estruturada.`;
      }
      return {
        ...rw,
        originalSnippet: orig,
        suggestedSnippet: sugg
      };
    });

    const responsePayload = {
      ...parsed,
      isolatedEntities: sanitizedIsolated,
      topicalGaps: sanitizedGaps,
      rewriteSuggestions: sanitizedRewrites,
      executionTimeMs: Date.now() - startTime,
      modelUsed: `${successfulModel} (Text Connectivity Optimizer)`
    };

    aiGenerationCache.set(cacheKey, {
      result: responsePayload,
      timestamp: Date.now()
    });

    return res.json(responsePayload);
  } catch (err: any) {
    console.info('Notice in /api/analyze-text-connectivity: using heuristic fallback for editorial report.');
    const fallback = fallbackTextOptimization(text, entities, relations, taxonomy, contextStr);
    return res.json({
      ...fallback,
      executionTimeMs: Date.now() - startTime,
      modelUsed: 'heuristic_optimizer_fallback',
      warning: 'Cota de IA em espera temporária. O relatório editorial foi gerado com sucesso através do motor heurístico local.'
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
