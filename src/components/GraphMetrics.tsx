import React, { useMemo } from 'react';
import { Entity, RelationTriplet, SupportedLang } from '../types';
import { getEntityColor } from '../utils/colors';
import { getTranslations } from '../lib/i18n';
import {
  BarChart3,
  Award,
  Zap,
  TrendingUp,
  Target,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  GitFork,
  ArrowRight,
  ShieldCheck,
  Activity
} from 'lucide-react';

interface GraphMetricsProps {
  text?: string;
  domainContext?: string;
  entities: Entity[];
  relations: RelationTriplet[];
  onSelectEntity?: (entity: Entity) => void;
  uiLang?: SupportedLang;
}

export const GraphMetrics: React.FC<GraphMetricsProps> = ({
  text = '',
  domainContext = '',
  entities,
  relations,
  onSelectEntity,
  uiLang = 'pt'
}) => {
  const t = getTranslations(uiLang);
  // Word Count in text
  const wordCount = useMemo(() => {
    return text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  }, [text]);

  // Pillar Entity & Thematic Focus Analysis
  const { topCentralEntities, pillarEntity, isFocusAligned, focusMessage } = useMemo(() => {
    const degMap = new Map<string, { entity: Entity; inDegree: number; outDegree: number }>();

    entities.forEach(e => {
      degMap.set(e.id, { entity: e, inDegree: 0, outDegree: 0 });
    });

    relations.forEach(r => {
      const head = degMap.get(r.headId);
      if (head) head.outDegree += 1;

      const tail = degMap.get(r.tailId);
      if (tail) tail.inDegree += 1;
    });

    const sorted = Array.from(degMap.values())
      .map(item => ({
        ...item,
        totalDegree: item.inDegree + item.outDegree
      }))
      .sort((a, b) => b.totalDegree - a.totalDegree);

    const pillar = sorted[0] || null;

    let aligned = true;
    let message = t.metrics.noContextPrompt;

    if (pillar && domainContext && domainContext.trim()) {
      const cleanCtx = domainContext.toLowerCase();
      const cleanPillar = pillar.entity.text.toLowerCase();

      const contains = cleanCtx.includes(cleanPillar) || cleanPillar.includes(cleanCtx);
      const ctxWords = cleanCtx.split(/\s+/).filter(w => w.length > 3);
      const pillarWords = cleanPillar.split(/\s+/).filter(w => w.length > 3);
      const wordOverlap = ctxWords.some(w => pillarWords.includes(w));

      if (contains || wordOverlap) {
        aligned = true;
        message = `"${pillar.entity.text}" ${t.metrics.focusAligned} "${domainContext}".`;
      } else {
        aligned = false;
        message = t.metrics.focusAlert;
      }
    } else if (pillar) {
      message = `"${pillar.entity.text}" ${t.metrics.focusGravity}`;
    }

    return {
      topCentralEntities: sorted.slice(0, 8),
      pillarEntity: pillar,
      isFocusAligned: aligned,
      focusMessage: message
    };
  }, [entities, relations, domainContext, t]);

  // Semantic Density per 100 Words
  const relDensityPer100 = useMemo(() => {
    if (wordCount === 0 || relations.length === 0) return 0;
    return (relations.length / wordCount) * 100;
  }, [wordCount, relations.length]);

  const densityClassification = useMemo(() => {
    if (relDensityPer100 >= 1.5) {
      return {
        label: t.metrics.highDensity,
        badge: 'bg-[#1E5E3A]/10 text-[#1E5E3A] border-[#1E5E3A]/30',
        barColor: 'bg-[#1E5E3A]',
        text: t.metrics.highDensityDesc
      };
    }
    if (relDensityPer100 >= 0.7) {
      return {
        label: t.metrics.balancedDensity,
        badge: 'bg-[#E5A93C]/20 text-[#92400E] border-[#E5A93C]/40',
        barColor: 'bg-[#E5A93C]',
        text: t.metrics.balancedDensityDesc
      };
    }
    return {
      label: t.metrics.lowDensity,
      badge: 'bg-rose-100 text-rose-800 border-rose-300',
      barColor: 'bg-rose-500',
      text: t.metrics.lowDensityDesc
    };
  }, [relDensityPer100, t]);

  // Network Connectivity Percentage
  const connectivityRatio = useMemo(() => {
    if (entities.length === 0) return 0;
    const connectedIds = new Set<string>();
    relations.forEach(r => {
      connectedIds.add(r.headId);
      connectedIds.add(r.tailId);
    });
    return Math.round((connectedIds.size / entities.length) * 100);
  }, [entities, relations]);

  // Semantic Mix (Entity Type Breakdown)
  const typeDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    entities.forEach(e => {
      const t = e.type || 'Concept';
      counts.set(t, (counts.get(t) || 0) + 1);
    });

    const total = entities.length || 1;
    return Array.from(counts.entries())
      .map(([type, count]) => ({
        type,
        count,
        percent: Math.round((count / total) * 100)
      }))
      .sort((a, b) => b.count - a.count);
  }, [entities]);

  // E-E-A-T Mix Editorial Advice
  const mixAdvice = useMemo(() => {
    const hasMetric = entities.some(e => e.type === 'Metric');
    const hasMethod = entities.some(e => e.type === 'Method');
    const hasTech = entities.some(e => e.type === 'Technology');

    if (!hasMetric) {
      return 'Dica E-E-A-T: Incluir métricas mensuráveis (ex: CTR, LCP, conversão) eleva a comprovação analítica do seu artigo.';
    }
    if (!hasMethod) {
      return 'Dica Prática: Adicionar métodos ou passos operacionais torna o conteúdo mais acionável para o leitor.';
    }
    if (hasMetric && hasMethod && hasTech) {
      return 'Ecossistema equilibrado: seu artigo combina teoria, metodologia, tecnologia e métricas de resultado.';
    }
    return 'Mix semântico positivo. Bom equilíbrio entre conceitos centrais e elementos de apoio.';
  }, [entities]);

  // Predicate Frequency Breakdown
  const predicateDistribution = useMemo(() => {
    const countMap = new Map<string, number>();
    relations.forEach(r => {
      const label = r.relationLabel || r.relation;
      countMap.set(label, (countMap.get(label) || 0) + 1);
    });
    return Array.from(countMap.entries())
      .map(([relation, count]) => ({
        relation,
        count,
        percent: Math.round((count / (relations.length || 1)) * 100)
      }))
      .sort((a, b) => b.count - a.count);
  }, [relations]);

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#1E5E3A]/10 text-[#1E5E3A] border border-[#1E5E3A]/20 text-xs font-bold flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5 text-[#1E5E3A]" aria-hidden="true" />
              {t.metrics.title}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${densityClassification.badge}`}>
              {densityClassification.label}
            </span>
          </div>
          <h2 className="font-serif text-xl font-bold text-[#08121E]">
            {t.metrics.title}
          </h2>
          <p className="text-xs text-slate-500">
            {t.metrics.subtitle}
          </p>
        </div>

        {domainContext && (
          <div className="px-3.5 py-2 rounded-xl bg-[#FAF9F6] border border-slate-200 text-xs text-slate-700 shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">{t.input.contextActive}:</span>
            <strong className="text-[#08121E] font-semibold">{domainContext}</strong>
          </div>
        )}
      </div>

      {/* Thematic Focus Diagnostic Banner */}
      {pillarEntity && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 transition-all ${
            isFocusAligned
              ? 'bg-[#1E5E3A]/5 border-[#1E5E3A]/25 text-[#08121E]'
              : 'bg-amber-50/70 border-amber-300 text-amber-950'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
              isFocusAligned
                ? 'bg-[#1E5E3A]/15 border-[#1E5E3A]/30 text-[#1E5E3A]'
                : 'bg-amber-200/80 border-amber-400 text-amber-800'
            }`}
          >
            {isFocusAligned ? <ShieldCheck className="w-5 h-5 text-[#1E5E3A]" aria-hidden="true" /> : <AlertTriangle className="w-5 h-5 text-amber-700" aria-hidden="true" />}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider">
                {isFocusAligned ? t.metrics.pillarCardTitle : t.metrics.focusAlert}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-white border border-slate-200 text-slate-600">
                Pilar: {pillarEntity.entity.text} ({pillarEntity.totalDegree} arestas)
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-700">
              {focusMessage}
            </p>
          </div>
        </div>
      )}

      {/* 4 Focus KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Pillar Entity */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">{t.metrics.pillarCardTitle}</span>
            <Award className="w-4 h-4 text-[#E5A93C]" aria-hidden="true" />
          </div>
          <div className="my-2.5">
            <div className="font-serif text-lg font-bold text-[#08121E] truncate" title={pillarEntity?.entity.text || 'N/A'}>
              {pillarEntity ? pillarEntity.entity.text : 'N/A'}
            </div>
            <span className="text-xs text-slate-500 block">
              {pillarEntity ? `${pillarEntity.totalDegree} ${t.detailModal.relationsUnit}` : 'N/A'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            {t.metrics.pillarCardDesc}
          </span>
        </div>

        {/* KPI 2: Relational Density */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">{t.metrics.densityTitle}</span>
            <Activity className="w-4 h-4 text-[#1E5E3A]" aria-hidden="true" />
          </div>
          <div className="my-2.5">
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-2xl font-bold text-[#1E5E3A]">
                {relDensityPer100 > 0 ? relDensityPer100.toFixed(1) : '0'}
              </span>
              <span className="text-xs text-slate-500 font-medium">/ 100 {t.input.wordsCount}</span>
            </div>
            <span className="text-xs text-slate-500 block">
              {wordCount > 0 ? `~${wordCount} ${t.input.wordsCount}` : t.input.waitingText}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 truncate">
            {densityClassification.text}
          </span>
        </div>

        {/* KPI 3: Network Connectivity Ratio */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">{t.optimizer.scoreLabel}</span>
            <TrendingUp className="w-4 h-4 text-[#E5A93C]" aria-hidden="true" />
          </div>
          <div className="my-2.5">
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-2xl font-bold text-[#08121E]">
                {connectivityRatio}%
              </span>
              <span className="text-xs text-slate-500 font-medium">%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-[#E5A93C] rounded-full transition-all duration-500"
                style={{ width: `${connectivityRatio}%` }}
              />
            </div>
          </div>
          <span className="text-[10px] text-slate-400">
            {connectivityRatio >= 80 ? 'Grafo articulado' : t.optimizer.isolatedDesc}
          </span>
        </div>

        {/* KPI 4: Total Relations */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">{t.nav.relationsLabel}</span>
            <GitFork className="w-4 h-4 text-slate-600" aria-hidden="true" />
          </div>
          <div className="my-2.5">
            <div className="font-serif text-2xl font-bold text-[#08121E]">
              {relations.length}
            </div>
            <span className="text-xs text-slate-500 block">
              {entities.length} {t.nav.nodesLabel}
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            {t.triplets.title}
          </span>
        </div>
      </div>

      {/* Main Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Top Entities Ranked by Role + Semantic Mix */}
        <div className="lg:col-span-7 space-y-6">
          {/* Top Entities Ranked by Editorial Role */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-serif text-base font-bold text-[#08121E] flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#E5A93C]" />
                  <span>Ranking de Entidades por Papel Editorial</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Classificação das entidades de acordo com a influência e densidade de conexões no artigo.
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Clique para inspecionar
              </span>
            </div>

            <div className="space-y-2">
              {topCentralEntities.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  Nenhuma entidade disponível para classificação.
                </p>
              ) : (
                topCentralEntities.map((item, idx) => {
                  const color = getEntityColor(item.entity.type);
                  const isTopPillar = idx === 0;
                  const isCore = idx > 0 && idx < 3;

                  const roleBadge = isTopPillar
                    ? 'bg-[#E5A93C]/20 text-[#92400E] border-[#E5A93C]/40 font-bold'
                    : isCore
                    ? 'bg-[#1E5E3A]/10 text-[#1E5E3A] border-[#1E5E3A]/20 font-semibold'
                    : 'bg-slate-100 text-slate-600 border-slate-200';

                  const roleLabel = isTopPillar
                    ? 'Tópico Nuclear'
                    : isCore
                    ? 'Tópico Estrutural'
                    : 'Tópico Satélite';

                  return (
                    <div
                      key={item.entity.id}
                      onClick={() => onSelectEntity && onSelectEntity(item.entity)}
                      className="p-3 bg-[#FAF9F6] hover:bg-white rounded-xl border border-slate-200/90 hover:border-[#E5A93C]/50 hover:shadow-xs transition-all flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-serif font-bold text-xs text-slate-400 w-4 text-center">
                          {idx + 1}.
                        </span>
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color.hex }}
                        />
                        <div className="min-w-0">
                          <span className="font-semibold text-xs text-[#08121E] group-hover:text-[#1E5E3A] transition-colors truncate block">
                            {item.entity.text}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {item.entity.type}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${roleBadge}`}>
                          {roleLabel}
                        </span>
                        <span className="font-mono text-xs font-bold text-[#08121E] bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {item.totalDegree} arestas
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Semantic Mix (Entity Type Breakdown) */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-2xs space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-serif text-base font-bold text-[#08121E] flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#1E5E3A]" />
                  <span>Mix Semântico & Diversidade E-E-A-T</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Equilíbrio entre conceitos teóricos, tecnologias, métodos de execução e métricas de resultado.
                </p>
              </div>
            </div>

            {/* Visual Mix Progress Bar */}
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
              {typeDistribution.map(item => {
                const color = getEntityColor(item.type);
                return (
                  <div
                    key={item.type}
                    title={`${item.type}: ${item.count} (${item.percent}%)`}
                    style={{ width: `${item.percent}%`, backgroundColor: color.hex }}
                    className="h-full transition-all"
                  />
                );
              })}
            </div>

            {/* Type Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {typeDistribution.map(item => {
                const color = getEntityColor(item.type);
                return (
                  <div key={item.type} className="p-2.5 rounded-xl bg-[#FAF9F6] border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color.hex }} />
                        {item.type}
                      </span>
                      <span className="text-[11px] font-bold text-[#08121E]">{item.percent}%</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      {item.count} {item.count === 1 ? 'entidade' : 'entidades'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Editorial Advice Banner */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[#E5A93C] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {mixAdvice}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Predicate Breakdown + Interpretation Guide */}
        <div className="lg:col-span-5 space-y-6">
          {/* Predicate Distribution */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-serif text-base font-bold text-[#08121E] flex items-center gap-1.5">
                <GitFork className="w-4 h-4 text-[#1E5E3A]" />
                <span>Distribuição de Predicados no Artigo</span>
              </h3>
              <p className="text-xs text-slate-500">
                Frequência das pontes e verbos ontológicos utilizados para unir os nós.
              </p>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {predicateDistribution.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  Nenhuma relação extraída até o momento.
                </p>
              ) : (
                predicateDistribution.map(item => (
                  <div key={item.relation} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[11px] font-semibold text-[#08121E]">
                        {item.relation}
                      </span>
                      <span className="text-slate-600 font-bold">
                        {item.count}x <span className="text-slate-400 font-normal">({item.percent}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1E5E3A] rounded-full transition-all duration-300"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Editorial Guide */}
          <div className="bg-[#FAF9F6] rounded-2xl border border-slate-200 p-5 space-y-3">
            <h4 className="font-serif text-sm font-bold text-[#08121E]">
              {uiLang === 'es' ? 'Cómo Interpretar la Topología del Documento' : uiLang === 'en' ? 'How to Interpret Document Topology' : 'Como Interpretar a Topologia do Artigo'}
            </h4>
            <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
              <div className="space-y-0.5">
                <strong className="text-[#08121E] block font-semibold">
                  1. {uiLang === 'es' ? 'Nodo Pilar (Hub Principal):' : uiLang === 'en' ? 'Pillar Node (Primary Hub):' : 'Nó Pilar (Hub Principal):'}
                </strong>
                <p>
                  {uiLang === 'es'
                    ? 'Debe corresponder siempre al concepto canónico o entidad central que desea posicionar en los motores de búsqueda.'
                    : uiLang === 'en'
                    ? 'Must always correspond to the canonical concept or central entity you want to establish topical authority for in search engines.'
                    : 'Deve sempre corresponder ao conceito canônico central que você quer posicionar nas buscas.'}
                </p>
              </div>
              <div className="space-y-0.5">
                <strong className="text-[#08121E] block font-semibold">
                  2. {uiLang === 'es' ? 'Temas Satélite:' : uiLang === 'en' ? 'Satellite Topics:' : 'Tópicos Satélites:'}
                </strong>
                <p>
                  {uiLang === 'es'
                    ? 'Las entidades periféricas deben conectarse a la entidad pilar mediante oraciones activas o subordinadas.'
                    : uiLang === 'en'
                    ? 'Peripheral entities should connect to the pillar entity through active or subordinate clauses.'
                    : 'Entidades periféricas devem apontar para a entidade pilar através de orações subordinadas ou ativas.'}
                </p>
              </div>
              <div className="space-y-0.5">
                <strong className="text-[#08121E] block font-semibold">
                  3. {uiLang === 'es' ? 'Variedad de Predicados:' : uiLang === 'en' ? 'Predicate Variety:' : 'Variedade de Predicados:'}
                </strong>
                <p>
                  {uiLang === 'es'
                    ? 'Evite repetir un único tipo de relación; alterne entre causa/efecto (impacts), composición (component_of) y medición (measures).'
                    : uiLang === 'en'
                    ? 'Avoid repeating a single relationship type; vary between cause/effect (impacts), composition (component_of), and measurement (measures).'
                    : 'Evite repetir apenas um tipo de relação; varie entre causa/efeito (impacts), composição (component_of) e mensuração (measures).'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
