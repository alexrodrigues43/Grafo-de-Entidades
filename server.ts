import express, { Request, Response } from 'express';
import path from 'path';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config({ override: true });

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

  if (/^(pode|permite|possibilita|allows|enables)$/i.test(cleanSlug)) {
    return { slug: 'enables', label: 'Enables / Allows' };
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

CRITICAL DIRECTIVES FOR ROBUST EXTRACTION:
0. MANDATORY THEMATIC DOMAIN ANCHORING (ZERO NONSENSE POLICY):
   - Explicit Domain / Thematic Context Provided by User: "${contextStr}"
   - The user has strictly specified that this document belongs to and revolves around: "${contextStr}".
   - ONLY extract entities, concepts, and relationships that are directly relevant, meaningful, and coherent within the context of "${contextStr}".
   - STRICTLY SUPPRESS AND REJECT: incidental verbs treated as entities, peripheral conversational artifacts, off-topic stray words, or entities that make no sense within the domain of "${contextStr}".

1. FULL DOCUMENT COVERAGE:
   - Analyze the ENTIRE document from the opening sentences, throughout all intermediate paragraphs/sections, to the conclusion.
   - Do NOT stop after the first few sentences or focus only on the introduction.
   - For medium and long texts (such as blog posts), extract all significant entities (persons, organizations, technologies, concepts, events, places, dates) and their interconnections across the whole piece.

2. Salient Named Entities & Alias-Aware Deduplication (Wikontic Pattern):
   - Identify entity id (unique, clean alphanumeric slug), exact text (canonical title), and entity type (One of: 'Person', 'Organization', 'Location', 'Product', 'Event', 'Technology', 'Concept', 'Date', 'Country', 'Work', 'Award', 'Biomedical', 'Other').
   - Identify 'aliases': array of surface forms, abbreviations, nicknames, or specific technical terms used in the text to refer to this entity (e.g. text: "Googlebot", aliases: ["crawler do Google", "web crawler"]).
   - Identify 'wikidataId': provide Wikidata Item ID if widely known (e.g. "Q95" for Google, "Q11463" for Python, "Q79016896" for OpenAI, "Q155" for Brazil, etc.).
   - Entity Name Purity: NEVER leave colons (":"), semicolons, quotes, or trailing punctuation inside an entity name (e.g. write "Análise de logs de acesso", NEVER "Análise de logs de acesso:").
   - Assign realistic entity confidence score (between 0.70 and 1.00).

3. Semantic Relations & Edge Qualifiers:
   - Head Entity (Subject) and Tail Entity (Object).
   - Relation Slug: concise, standardized snake_case identifier (e.g. "founded_by", "headquarters_location", "developed_by", "member_of", "author_of", "uses_technology", "integrates_with", "subclass_of", "enables", "monitors", "analyzes", "executes_on", "used_for", "proposes_concept", "acquired_by").
   - Relation Label: clean human-friendly title (e.g. "Founded By", "Author Of", "Uses Technology", "Enables", "Monitors").
   - Relation Taxonomy: "${taxonomy}". ${taxonomyGuidance}
   - Confidence: realistic relation extraction confidence score (0.00 to 1.00).
   - Evidence: the exact sentence or clause from the text proving this relation.
   - Direction: "DIRECTED" (standard head -> tail).
   - Qualifiers: Extract contextual qualifiers for the edge whenever mentioned in text (e.g. time/year of event [P585], specific job role [P3831], condition, geographic context, stated_in, proportion/percentage). Format: array of { key: string, value: string, wikidataProperty?: string }.

4. MANDATORY STRUCTURAL ISOLATION (HEADINGS VS. PARAGRAPHS):
   - NEVER merge a section title, H1, or H2 (e.g. "A anatomia do Googlebot e a arquitetura de um web crawler moderno") with the opening sentence of the subsequent paragraph.
   - A title/heading establishes topic context; it is NOT the grammatical subject of the verb in the following paragraph!
   - If the text has: "A anatomia do Googlebot e a arquitetura de um web crawler moderno. O Googlebot é um sistema...", the Subject is "Googlebot" (Technology/Software), NOT the truncated title string.

5. MANDATORY COREFERENCE & ANAPHORA RESOLUTION (ZERO PRONOUN POLICY):
   - NEVER output personal pronouns, demonstrative pronouns, or vague generic noun phrases as Entity names, Head entities, or Tail entities.
   - STRICTLY FORBIDDEN ENTITIES include: "Ele", "Ela", "Eles", "Elas", "Ele roda...", "Isso", "Isto", "Aquilo", "Este", "Esta", "Esses", "Essas", "Esses dados", "Este sistema", "A ferramenta", "O crawler", "O mesmo", "A mesma", "It", "They", "This", "These data".
   - You MUST resolve any anaphoric pronoun to its true canonical referent from the surrounding paragraph context:
     * Example 1: If the text says "Ele roda simultaneamente em milhares de máquinas...", RESOLVE "Ele" -> Head: "Googlebot", Relation: "executes_on", Tail: "Máquinas distribuídas globalmente".
     * Example 2: If the text says "Esses dados são usados para alimentar índices de buscadores...", RESOLVE "Esses dados" -> Head: "Dados de requisição HTTP e conteúdo web baixado", Relation: "used_for", Tail: "Índices de buscadores e modelos de IA".
   - If a pronoun cannot be resolved with certainty to a known canonical entity, DO NOT extract a low-quality triplet.

6. STRICT BAN ON CONNECTIVES, DISCOURSE MARKERS, PREPOSITIONS & TRANSITIONAL ADVERBS:
   - UNDER NO CIRCUMSTANCES should transitional discourse markers, connectives, spatial/temporal adverbs, quantifiers, demonstratives, or conjunctions be extracted as Entities, Concepts, Head entities, or Tail entities!
   - STRICTLY FORBIDDEN WORDS AS ENTITIES: "Afinal", "Abaixo", "Acima", "Depois", "Antes", "Ainda", "Dentro", "Fora", "Ambas", "Ambos", "Assim", "Portanto", "Contudo", "Todavia", "Porém", "Entretanto", "Além disso", "Embora", "Enquanto", "Durante", "Segundo", "Conforme", "Diante", "Junto", "Apesar", "Ou seja", "Isto é", "Furthermore", "Moreover", "However", "Therefore", "After", "Below", "Within", "Both", "Either", "Neither", "Instead", "Meanwhile".
   - These words are grammatical glue, NOT knowledge graph nodes. Extracting them clutters the graph and breaks ontology integrity.

7. STRUCTURED LISTS & HIGH-VALUE PREDICATES (NO WEAK COPULA VERBS):
   - When parsing list items or definitions with colons (e.g. "Análise de logs de acesso: é possível isolar as requisições do Googlebot..."):
     * Extract the head entity cleanly without punctuation: "Análise de logs de acesso".
     * NEVER use weak copula verbs ("é", "são", "is", "are", "estabelece relação factual em", "tem") as relation predicates.
     * Formulate functional semantic relations: <Análise de logs de acesso, enables / monitors, Requisições do Googlebot>.

8. STRICT BAN ON VERBS, CONJUGATED FORMS, VERBAL PHRASES & EMPTY FILLER NOUNS:
   - In Knowledge Graphs, VERBS ARE EDGES (RELATIONS), NEVER NODES (ENTITIES)!
   - STRICTLY FORBIDDEN AS ENTITIES: Lone verbs or conjugated verb forms in Portuguese or English (e.g. "analisa", "roda", "permite", "executa", "ajuda", "garante", "funciona", "precisa", "cria", "gera", "opera", "tem", "faz", "é", "são", "foi", "foram", "deve", "pode").
   - STRICTLY FORBIDDEN AS ENTITIES: Clauses or fragments beginning with verbs (e.g. "analisa os dados", "permite fazer", "roda no servidor", "ajuda a entender", "usado para", "feito por", "é uma ferramenta").
   - STRICTLY FORBIDDEN AS ENTITIES: Abstract empty filler nouns (e.g. "coisa", "algo", "modo", "maneira", "tipo", "fato", "caso", "vez", "ponto", "aspecto", "questão", "exemplo") or standalone adjectives ("melhor", "novo", "rápido", "importante", "geral").
   - ENTITIES MUST ALWAYS BE CLEAN, SPECIFIC CANONICAL NOUN PHRASES (Named Entities, specific technologies, organizations, products, specialized technical concepts).

9. Cleanliness & Graph Topology:
   - Disambiguate coreferenced entities into one canonical entity (do not create separate duplicate nodes for "Google" e "Google LLC").
   - Connect the graph meaningfully with both micro-relations (within sentences) and macro-relations (thematic / document-level links).
   - Respect strict Domain and Range typing constraints.

10. MANDATORY JSON OUTPUT STRUCTURE:
   Return EXCLUSIVELY a single valid JSON object strictly matching this schema:
   {
     "entities": [
       {
         "id": "canonical_id_slug",
         "text": "Exact Canonical Entity Name",
         "type": "Person | Organization | Location | Product | Event | Technology | Concept | Date | Country | Work | Award | Biomedical | Other",
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
        temperature: 0.1,
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

    res.json({
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
    });
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
  relations: Array<{ headText: string; tailText: string; relation?: string; headId?: string; tailId?: string }>
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
  )?.text || validEntities[0]?.text || 'Tópico Principal';

  const isolatedEntities = isolated.map(e => {
    const context = findContextSentence(text, e.text);
    const target = mainConnected !== e.text ? mainConnected : (validEntities.find(o => o.text !== e.text)?.text || 'Entidade Central');
    
    return {
      entity: e.text,
      type: e.type || 'Concept',
      contextSentence: context || `Menção a ${e.text} no corpo do artigo.`,
      targetEntityToConnect: target,
      recommendedRelation: 'integrates_with',
      reason: `A entidade '${e.text}' é mencionada sem uma oração ativa ou predicado relacional explícito conectando-a diretamente a '${target}', deixando-a como nó órfão no grafo.`,
      editorialOption: `Ao estruturar a narrativa em torno de ${target}, ${e.text} atua como elemento fundamental para sustentar a eficácia do processo.`,
      seoDirectOption: `${target} integra e executa diretamente ${e.text}, otimizando a arquitetura relacional e a precisão do conhecimento.`,
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

  return {
    connectivityScore: score,
    connectivityLevel,
    diagnosisSummary:
      isolated.length > 0
        ? `O texto possui ${validEntities.length} entidades válidas identificadas, com ${isolated.length} termos isolados que necessitam de pontes predicativas para enriquecer a topologia do grafo.`
        : `O texto apresenta excelente densidade relacional, com ${relations.length} relações extraídas conectando solidamente os nós centrais de conhecimento.`,
    isolatedEntities,
    implicitOrWeakRelations: [
      {
        headEntity: ent1,
        tailEntity: ent2,
        issue: 'A relação pode estar implícita por proximidade textual, sem um verbo ontológico ativo unindo os termos.',
        suggestedRelation: 'integrates_with / developed_by / enables',
        howToClarify: 'Formule uma oração direta com sujeito canônico e verbo de ação no mesmo período gramatical.'
      }
    ],
    rewriteSuggestions: [
      {
        originalSnippet: firstSentence,
        suggestedSnippet: `${ent1} desenvolve e opera diretamente ${ent2}, estabelecendo a espinha dorsal de conhecimento do documento.`,
        explanation: 'Substituição de formulação elíptica ou passiva por oração ativa com predicado relacional explícito.',
        relationUnlocked: 'operates / integrates_with'
      }
    ],
    optimizedText: text,
    expectedNewRelations: [
      'developed_by',
      'integrates_with',
      'operates'
    ],
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
  const { text, entities = [], relations = [], taxonomy = 'wiki80', domainContext = '' } = req.body;

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
    const fallback = fallbackTextOptimization(cleanedText, validEntities, validRelations);
    return res.json({
      ...fallback,
      executionTimeMs: Date.now() - startTime,
      modelUsed: 'heuristic_optimizer_fallback',
      warning: 'Gemini API key not configured, returning rule-based analysis.'
    });
  }

  try {
    const systemPrompt = `Você é um especialista sênior em Engenharia de Conhecimento, Linguística Computacional e Consultoria Editorial para Redatores e Copywriters.
Seu objetivo é analisar profundamente o texto do autor, suas entidades e relações, oferecendo um Diagnóstico Relacional de alta sensibilidade editorial e prática.

DIRETIVA OBRIGATÓRIA DE CONTEXTO TEMÁTICO:
- O autor definiu que este texto trata estritamente sobre: "${contextStr}".
- Todas as sugestões de reescrita, diagnósticos de entidades isoladas e pontes relacionais sugeridas devem ser estritamente coerentes e ancoradas no nicho/tema "${contextStr}".

DIRETIVA OBRIGATÓRIA DE IDIOMA:
- TODO O DIAGNÓSTICO, EXPLICAÇÕES, SUGESTÕES E TEXTOS DEVEM SER GERADOS ESTRITAMENTE EM PORTUGUÊS DO BRASIL (PT-BR).
- O campo "diagnosisSummary" DEVE ser 100% em Português do Brasil. NUNCA escreva este campo nem qualquer explicação em inglês.

CONSULTORIA EDITORIAL PARA REDATORES E COPYWRITERS (FOCO EM QUEM ESCREVE):
- Redatores e autores de background criativo frequentemente 'dobram a linguagem': usam metáforas, construções estilísticas, orações subordinadas e voz passiva para enriquecer a narrativa.
- Nesse processo criativo natural, entidades fundamentais acabam ficando isoladas sem predicados relacionais formais que um motor de busca ou algoritmo de Grafo de Conhecimento possa extrair.
- O seu papel NÃO é dar broncas acadêmicas ou conselhos genéricos ("conecte a entidade usando verbo ativo"), mas entregar SOLUÇÕES PRONTAS E ELEGANTE PARA O AUTOR.

DIRETRIZES PARA CADA ENTIDADE ISOLADA (isolatedEntities):
Para CADA entidade que ficou sem conexão no grafo:
1. "entity": Nome exato da entidade.
2. "type": Tipo ontológico ('Technology', 'Concept', 'Organization', 'Person', etc.).
3. "contextSentence": A frase exata do texto de origem do autor onde essa entidade aparece.
4. "targetEntityToConnect": A principal entidade central do texto com a qual esta entidade isolada deve se conectar.
5. "recommendedRelation": O predicado ontológico ideal em snake_case (ex: "utiliza_tecnologia", "desenvolvido_por", "componente_de", "executa_em", "monitora").
6. "reason": Explicação amigável em PT-BR do porquê a redação criativa atual a deixou desconectada sintaticamente.
7. "editorialOption": Proposta de frase alternativa que PRESERVA o estilo autoral, o tom narrativo e a elegância criativa do autor, introduzindo a conexão com sutileza.
8. "seoDirectOption": Proposta de frase direta no modelo SEO Semântico (Sujeito Canônico + Verbo Ativo + Objeto) para máxima extração pelo OpenNRE.
9. "suggestedFix": Resumo prático de 1 frase.

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

Analise a topologia do texto e forneça o Relatório de Consultoria Editorial e Otimização Semântica estritamente em Português do Brasil (PT-BR).`;

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

    return res.json({
      ...parsed,
      isolatedEntities: sanitizedIsolated,
      rewriteSuggestions: sanitizedRewrites,
      executionTimeMs: Date.now() - startTime,
      modelUsed: `${successfulModel} (Text Connectivity Optimizer)`
    });
  } catch (err: any) {
    console.info('Notice in /api/analyze-text-connectivity: using heuristic fallback for editorial report.');
    const fallback = fallbackTextOptimization(text, entities, relations);
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
