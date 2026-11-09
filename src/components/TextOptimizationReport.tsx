import React, { useState } from 'react';
import { Entity, RelationTriplet, TextOptimizationAnalysis, SupportedLang } from '../types';
import { getTranslations } from '../lib/i18n';
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Copy,
  Check,
  Zap,
  SplitSquareVertical,
  Layers,
  Lightbulb,
  FileText,
  Network,
  PenTool,
  Target,
  Quote,
  FileDown,
  GitCompare,
  PlusCircle
} from 'lucide-react';

interface TextOptimizationReportProps {
  currentText: string;
  domainContext?: string;
  entities: Entity[];
  relations: RelationTriplet[];
  analysis: TextOptimizationAnalysis | null;
  isLoading: boolean;
  onRunAnalysis: () => void;
  onApplyOptimizedText: (optimizedText: string) => void;
  onReplaceSnippet?: (originalSnippet: string, newSnippet: string) => boolean;
  onInsertSnippet?: (snippetToInsert: string) => boolean;
  uiLang?: SupportedLang;
}

export const TextOptimizationReport: React.FC<TextOptimizationReportProps> = ({
  currentText,
  domainContext = '',
  entities,
  relations,
  analysis,
  isLoading,
  onRunAnalysis,
  onApplyOptimizedText,
  onReplaceSnippet,
  onInsertSnippet,
  uiLang = 'pt'
}) => {
  const t = getTranslations(uiLang);
  const [copied, setCopied] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [appliedKey, setAppliedKey] = useState<string | null>(null);
  const [markdownCopied, setMarkdownCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'optimized' | 'comparison'>('optimized');
  const [comparisonSubMode, setComparisonSubMode] = useState<'diff' | 'side-by-side'>('diff');

  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySnippet = (snippet: string, key: string) => {
    if (!snippet) return;
    navigator.clipboard.writeText(snippet);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleApplySnippet = (orig: string, replacement: string, key: string) => {
    if (!onReplaceSnippet || !orig || !replacement) return;
    const ok = onReplaceSnippet(orig, replacement);
    if (ok) {
      setAppliedKey(key);
      setTimeout(() => setAppliedKey(null), 2500);
    }
  };

  const handleInsertGap = (snippet: string, key: string) => {
    if (!onInsertSnippet || !snippet) return;
    const ok = onInsertSnippet(snippet);
    if (ok) {
      setAppliedKey(key);
      setTimeout(() => setAppliedKey(null), 2500);
    }
  };

  const handleExportMarkdown = () => {
    if (!analysis) return;

    const mdSections: string[] = [
      `# Relatório de Diagnóstico e Otimização Relacional`,
      `**Contexto Temático:** ${domainContext || 'Geral'}`,
      `**Índice de Conectividade:** ${analysis.connectivityScore}/100 (${analysis.connectivityLevel})`,
      '',
      `## 1. Diagnóstico Geral da Topologia`,
      analysis.diagnosisSummary,
      '',
      `## 2. Entidades Isoladas (${analysis.isolatedEntities.length})`,
      ...analysis.isolatedEntities.map((item, idx) => [
        `### ${idx + 1}. ${item.entity} (${item.type})`,
        `- **Frase Original:** "${item.contextSentence || 'N/A'}"`,
        `- **Conectar com:** ${item.targetEntityToConnect || 'Tópico Principal'} (+${item.recommendedRelation || 'relação'})`,
        `- **Motivo do Isolamento:** ${item.reason}`,
        `- **Opção Editorial (Estilo Criativo):** "${item.editorialOption || item.suggestedFix}"`,
        `- **Opção SEO Direto (Triplo Ontológico):** "${item.seoDirectOption || item.suggestedFix}"`,
        ''
      ].join('\n')),
      ...(analysis.topicalGaps && analysis.topicalGaps.length > 0 ? [
        `## 3. Lacunas de Autoridade Temática (Topical Gaps)`,
        ...analysis.topicalGaps.map((gap, idx) => [
          `### ${idx + 1}. ${gap.entity} (${gap.type}) - Prioridade: ${gap.importance}`,
          `- **Por que é essencial:** ${gap.whyEssential}`,
          `- **Relação Recomendada:** +${gap.suggestedRelation}`,
          `- **Sugestão para Inserir:** "${gap.suggestedSnippetToInsert}"`,
          ''
        ].join('\n'))
      ] : []),
      `## 4. Sugestões Pontuais de Reescrita (Antes vs. Depois)`,
      ...analysis.rewriteSuggestions.map((rw, idx) => [
        `### Sugestão ${idx + 1} (+${rw.relationUnlocked})`,
        `- **Original:** "${rw.originalSnippet}"`,
        `- **Otimizado:** "${rw.suggestedSnippet}"`,
        `- **Justificativa:** ${rw.explanation}`,
        ''
      ].join('\n')),
      `## 5. Principais Ganhos Estruturais`,
      ...analysis.keyImprovements.map(k => `- ${k}`),
      '',
      `## 6. Texto Integral Otimizado`,
      '```',
      analysis.optimizedText,
      '```'
    ];

    navigator.clipboard.writeText(mdSections.join('\n'));
    setMarkdownCopied(true);
    setTimeout(() => setMarkdownCopied(false), 2500);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return { bg: 'bg-[#1E5E3A]', text: 'text-[#1E5E3A]', badge: 'bg-[#1E5E3A]/10 text-[#1E5E3A] border-[#1E5E3A]/30' };
    if (score >= 60) return { bg: 'bg-[#E5A93C]', text: 'text-[#92400E]', badge: 'bg-[#E5A93C]/20 text-[#92400E] border-[#E5A93C]/40' };
    if (score >= 40) return { bg: 'bg-amber-500', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800 border-amber-300' };
    return { bg: 'bg-rose-500', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-800 border-rose-300' };
  };

  // Helper to visually highlight isolated and target entities inside the context sentence
  const renderHighlightedSentence = (sentence: string, isolatedEntity: string, targetEntity?: string) => {
    if (!sentence) return null;
    if (!isolatedEntity) return <span>&ldquo;{sentence}&rdquo;</span>;

    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const isoPattern = escapeRegExp(isolatedEntity);
    const targetPattern = targetEntity && targetEntity !== isolatedEntity ? escapeRegExp(targetEntity) : null;

    const combined = targetPattern
      ? new RegExp(`(${isoPattern}|${targetPattern})`, 'gi')
      : new RegExp(`(${isoPattern})`, 'gi');

    const parts = sentence.split(combined);

    return (
      <span className="italic leading-relaxed text-slate-800">
        &ldquo;
        {parts.map((part, i) => {
          if (part.toLowerCase() === isolatedEntity.toLowerCase()) {
            return (
              <mark
                key={i}
                className="bg-amber-200 text-amber-950 font-bold px-1.5 py-0.5 rounded text-[11px] not-italic border border-amber-300 shadow-2xs mx-0.5"
                title={`Entidade Isolada: ${isolatedEntity}`}
              >
                {part}
              </mark>
            );
          }
          if (targetPattern && part.toLowerCase() === targetEntity?.toLowerCase()) {
            return (
              <mark
                key={i}
                className="bg-emerald-100 text-emerald-950 font-bold px-1.5 py-0.5 rounded text-[11px] not-italic border border-emerald-300 shadow-2xs mx-0.5"
                title={`Entidade Alvo: ${targetEntity}`}
              >
                {part}
              </mark>
            );
          }
          return <span key={i}>{part}</span>;
        })}
        &rdquo;
      </span>
    );
  };

  if (!analysis && !isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-[#FAF9F6] text-[#08121E] rounded-2xl flex items-center justify-center mx-auto border border-slate-200 shadow-2xs">
          <Sparkles className="w-8 h-8 text-[#E5A93C] animate-pulse" aria-hidden="true" />
        </div>

        <div className="max-w-xl mx-auto space-y-2">
          <h3 className="font-serif text-2xl font-bold text-[#08121E]">
            {t.optimizer.title}
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed font-sans">
            {t.optimizer.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
          <div className="p-4 rounded-xl bg-[#FAF9F6] border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 text-[#08121E] font-bold text-xs">
              <Layers className="w-4 h-4 text-[#1E5E3A]" aria-hidden="true" />
              <span>{t.optimizer.isolatedTitle}</span>
            </div>
            <p className="text-xs text-slate-600">
              {t.optimizer.isolatedDesc}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF9F6] border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 text-[#08121E] font-bold text-xs">
              <Zap className="w-4 h-4 text-[#E5A93C]" aria-hidden="true" />
              <span>{t.optimizer.rewritesTitle}</span>
            </div>
            <p className="text-xs text-slate-600">
              {t.optimizer.rewritesDesc}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF9F6] border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 text-[#08121E] font-bold text-xs">
              <Target className="w-4 h-4 text-[#1E5E3A]" aria-hidden="true" />
              <span>{t.optimizer.topicalGapsTitle}</span>
            </div>
            <p className="text-xs text-slate-600">
              {t.optimizer.topicalGapsDesc}
            </p>
          </div>
        </div>

        <button
          id="btn-run-first-connectivity-analysis"
          type="button"
          onClick={onRunAnalysis}
          disabled={!currentText.trim()}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#E5A93C] hover:bg-[#D99A2B] text-[#08121E] text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer min-h-[44px]"
        >
          <Sparkles className="w-4 h-4" aria-hidden="true" />
          <span>{t.optimizer.btnRunAnalysis}</span>
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-3 border-[#FAF9F6] border-t-[#08121E] animate-spin mx-auto" aria-hidden="true" />
        <div className="space-y-1">
          <h4 className="font-serif text-lg font-bold text-[#08121E]">
            {t.optimizer.btnAnalyzing}
          </h4>
          <p className="text-xs text-slate-500">
            {entities.length} {t.nav.nodesLabel} • {relations.length} {t.nav.relationsLabel}
          </p>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const scoreTheme = getScoreColor(analysis.connectivityScore);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header & Action Banner */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#1E5E3A]/10 text-[#1E5E3A] border border-[#1E5E3A]/20 text-xs font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#E5A93C]" aria-hidden="true" />
              Gemini Semântico Intelligence
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${scoreTheme.badge}`}>
              {t.optimizer.scoreLevel}: {analysis.connectivityLevel}
            </span>
            {domainContext && (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium">
                {t.input.contextActive}: <strong>{domainContext}</strong>
              </span>
            )}
          </div>
          <h2 className="font-serif text-xl font-bold text-[#08121E]">
            {t.optimizer.title}
          </h2>
          <p className="text-xs text-slate-500">
            {t.optimizer.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Export Markdown Button */}
          <button
            id="btn-export-markdown-report"
            type="button"
            onClick={handleExportMarkdown}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-full bg-white hover:bg-slate-50 text-[#08121E] text-xs font-bold transition-colors border border-slate-200 cursor-pointer shadow-2xs min-h-[44px]"
            title={t.optimizer.btnExportMarkdown}
          >
            {markdownCopied ? <Check className="w-3.5 h-3.5 text-[#1E5E3A]" aria-hidden="true" /> : <FileDown className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />}
            <span>{markdownCopied ? t.optimizer.copiedMarkdown : t.optimizer.btnExportMarkdown}</span>
          </button>

          <button
            id="btn-reanalyze-text-connectivity"
            type="button"
            onClick={onRunAnalysis}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[#FAF9F6] hover:bg-slate-100 text-[#08121E] text-xs font-bold transition-colors border border-slate-200 cursor-pointer min-h-[44px]"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t.optimizer.btnRunAnalysis}</span>
          </button>

          <button
            id="btn-apply-optimized-text-top"
            type="button"
            onClick={() => onApplyOptimizedText(analysis.optimizedText)}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-[#E5A93C] hover:bg-[#D99A2B] text-[#08121E] text-xs font-bold shadow-xs transition-all cursor-pointer min-h-[44px]"
          >
            <Zap className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t.optimizer.btnApplyOptimized}</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid (3 Numeric Focus Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Score Card */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t.optimizer.scoreLabel}</span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${scoreTheme.badge}`}>
              {analysis.connectivityScore}/100
            </span>
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-serif font-bold ${scoreTheme.text}`}>
                {analysis.connectivityScore}
              </span>
              <span className="text-xs text-slate-400 font-medium">%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full ${scoreTheme.bg} transition-all duration-700`}
                style={{ width: `${analysis.connectivityScore}%` }}
              />
            </div>
          </div>
          <span className="text-[11px] text-slate-500">
            {analysis.connectivityScore >= 75
              ? 'Alta densidade de relações ontológicas.'
              : analysis.connectivityScore >= 50
              ? 'Conectividade moderada, nós isolados detectados.'
              : 'Muitas entidades sem conexões diretas.'}
          </span>
        </div>

        {/* Isolated Entities Count */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">{t.optimizer.isolatedTitle}</span>
            <AlertTriangle className={`w-4 h-4 ${analysis.isolatedEntities.length > 0 ? 'text-amber-500' : 'text-[#1E5E3A]'}`} aria-hidden="true" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-serif font-bold text-[#08121E]">
              {analysis.isolatedEntities.length}
            </span>
            <span className="text-xs text-slate-500 ml-1.5">{t.optimizer.isolatedDesc}</span>
          </div>
        </div>

        {/* Expected New Relations */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">{t.optimizer.topicalGapsTitle}</span>
            <Zap className="w-4 h-4 text-[#1E5E3A]" aria-hidden="true" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-serif font-bold text-[#1E5E3A]">
              +{analysis.expectedNewRelations.length || 3}
            </span>
            <span className="text-xs text-slate-500 ml-1.5">{t.optimizer.topicalGapsDesc}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {analysis.expectedNewRelations.slice(0, 3).map((rel, i) => (
              <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FAF9F6] border border-slate-200 text-[#08121E]">
                {rel}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Full-Width Dedicated Diagnostic Banner */}
      <div className="bg-[#08121E] text-white rounded-2xl p-5 shadow-sm border border-slate-800 space-y-2.5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1E5E3A] via-[#E5A93C] to-[#08121E]" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[#E5A93C]">
              <Lightbulb className="w-4 h-4" aria-hidden="true" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              {t.optimizer.title}
            </span>
          </div>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10">
            {t.optimizer.scoreLevel}: {analysis.connectivityLevel}
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
          {analysis.diagnosisSummary}
        </p>
      </div>

      {/* Main Content Layout: Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Diagnostics, Isolated Entities, Topical Gaps, Rewrites (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Consultoria Editorial de Entidades Isoladas */}
          {analysis.isolatedEntities.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-2xs space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#E5A93C]/15 text-[#92400E] flex items-center justify-center border border-[#E5A93C]/30 shadow-2xs">
                    <PenTool className="w-4 h-4 text-[#92400E]" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold text-[#08121E]">
                      {t.optimizer.isolatedTitle} ({analysis.isolatedEntities.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      {t.optimizer.isolatedDesc}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-1">
                {analysis.isolatedEntities.map((item, idx) => {
                  const itemKeyEditorial = `iso_ed_${idx}`;
                  const itemKeySeo = `iso_seo_${idx}`;
                  const editorialText = item.editorialOption || item.suggestedFix || '';
                  const seoText = item.seoDirectOption || item.suggestedFix || '';
                  const contextSentence = item.contextSentence || '';

                  const isAppliedEditorial = appliedKey === itemKeyEditorial;
                  const isAppliedSeo = appliedKey === itemKeySeo;

                  return (
                    <div key={idx} className="p-4 rounded-xl bg-[#FAF9F6] border border-slate-200/90 shadow-2xs space-y-3">
                      {/* Header: Entity Name + Type + Target Connection */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#E5A93C]" aria-hidden="true" />
                          <span className="font-serif text-sm font-bold text-[#08121E]">
                            {item.entity}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 shadow-2xs">
                            {item.type}
                          </span>
                        </div>

                        {item.targetEntityToConnect && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
                            <span className="text-slate-400 text-[11px]">{t.optimizer.connectWith}:</span>
                            <strong className="text-[#08121E] font-semibold">{item.targetEntityToConnect}</strong>
                            {item.recommendedRelation && (
                              <span className="font-mono text-[10px] text-[#1E5E3A] bg-[#1E5E3A]/10 px-1.5 py-0.5 rounded-sm">
                                +{item.recommendedRelation}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Context Sentence in Original Text with Entity Highlighting */}
                      {contextSentence && (
                        <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <Quote className="w-3 h-3 text-[#E5A93C]" aria-hidden="true" />
                            <span>{t.optimizer.originalSnippet}</span>
                          </div>
                          <div>
                            {renderHighlightedSentence(contextSentence, item.entity, item.targetEntityToConnect)}
                          </div>
                        </div>
                      )}

                      {/* Writer's Diagnostic */}
                      <div className="text-xs text-slate-700 space-y-1 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/60">
                        <span className="font-bold text-amber-900 block text-[11px] uppercase tracking-wide">
                          {t.optimizer.whyEssential}
                        </span>
                        <p className="leading-relaxed">
                          {item.reason}
                        </p>
                      </div>

                      {/* Ready-to-use Rewrite Options */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {/* Option A: Editorial / Creative */}
                        <div className="p-3 rounded-xl bg-white border border-[#E5A93C]/30 shadow-2xs space-y-2 flex flex-col justify-between">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-[#92400E] flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-[#E5A93C]" aria-hidden="true" />
                                {t.optimizer.editorialOption}
                              </span>
                            </div>
                            <p className="text-xs text-slate-800 leading-relaxed font-sans">
                              &ldquo;{editorialText}&rdquo;
                            </p>
                          </div>

                          <div className="pt-2 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopySnippet(editorialText, itemKeyEditorial)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#FAF9F6] hover:bg-slate-100 text-[#08121E] text-xs font-semibold border border-slate-200 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                              title={t.optimizer.btnCopySnippet}
                            >
                              {copiedKey === itemKeyEditorial ? <Check className="w-3.5 h-3.5 text-[#1E5E3A]" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />}
                            </button>

                            {onReplaceSnippet && contextSentence && (
                              <button
                                type="button"
                                onClick={() => handleApplySnippet(contextSentence, editorialText, itemKeyEditorial)}
                                className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-[#E5A93C]/15 hover:bg-[#E5A93C]/25 text-[#92400E] text-xs font-bold border border-[#E5A93C]/40 transition-colors cursor-pointer min-h-[44px]"
                                title={t.optimizer.btnApplySnippet}
                              >
                                {isAppliedEditorial ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-[#1E5E3A]" aria-hidden="true" />
                                    <span className="text-[#1E5E3A]">{t.optimizer.appliedSuccess}</span>
                                  </>
                                ) : (
                                  <>
                                    <Zap className="w-3.5 h-3.5 text-[#E5A93C]" aria-hidden="true" />
                                    <span>{t.optimizer.btnApplySnippet}</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Option B: Direct Semantic SEO */}
                        <div className="p-3 rounded-xl bg-white border border-emerald-300 shadow-2xs space-y-2 flex flex-col justify-between">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-[#1E5E3A] flex items-center gap-1">
                                <Target className="w-3 h-3 text-[#1E5E3A]" aria-hidden="true" />
                                {t.optimizer.seoOption}
                              </span>
                            </div>
                            <p className="text-xs text-slate-800 leading-relaxed font-sans">
                              &ldquo;{seoText}&rdquo;
                            </p>
                          </div>

                          <div className="pt-2 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopySnippet(seoText, itemKeySeo)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50/50 hover:bg-emerald-100/60 text-[#1E5E3A] text-xs font-semibold border border-emerald-200 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                              title={t.optimizer.btnCopySnippet}
                            >
                              {copiedKey === itemKeySeo ? <Check className="w-3.5 h-3.5 text-[#1E5E3A]" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5 text-[#1E5E3A]" aria-hidden="true" />}
                            </button>

                            {onReplaceSnippet && contextSentence && (
                              <button
                                type="button"
                                onClick={() => handleApplySnippet(contextSentence, seoText, itemKeySeo)}
                                className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs min-h-[44px]"
                                title={t.optimizer.btnApplySnippet}
                              >
                                {isAppliedSeo ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                                    <span>{t.optimizer.appliedSuccess}</span>
                                  </>
                                ) : (
                                  <>
                                    <Zap className="w-3.5 h-3.5 text-emerald-200" aria-hidden="true" />
                                    <span>{t.optimizer.btnApplySnippet}</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lacunas de Autoridade Temática (Topical Gaps) */}
          {analysis.topicalGaps && analysis.topicalGaps.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-2xs space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200 shadow-2xs">
                    <Target className="w-4 h-4 text-purple-700" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold text-[#08121E]">
                      {t.optimizer.topicalGapsTitle} ({analysis.topicalGaps.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      {t.optimizer.topicalGapsDesc}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {analysis.topicalGaps.map((gap, idx) => {
                  const gapKey = `gap_${idx}`;
                  const isApplied = appliedKey === gapKey;
                  const importanceBadge =
                    gap.importance === 'Crítica'
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : gap.importance === 'Alta'
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-blue-100 text-blue-800 border-blue-200';

                  return (
                    <div key={idx} className="p-4 rounded-xl bg-[#FAF9F6] border border-slate-200 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-sm font-bold text-[#08121E]">
                            {gap.entity}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200">
                            {gap.type}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${importanceBadge}`}>
                            {gap.importance}
                          </span>
                        </div>

                        {gap.suggestedRelation && (
                          <span className="font-mono text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full font-semibold">
                            +{gap.suggestedRelation}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        <strong className="text-slate-800">{t.optimizer.whyEssential} </strong>
                        {gap.whyEssential}
                      </p>

                      {gap.suggestedSnippetToInsert && (
                        <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            {t.optimizer.suggestedSnippet}
                          </span>
                          <p className="text-xs italic text-slate-800">
                            &ldquo;{gap.suggestedSnippetToInsert}&rdquo;
                          </p>
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleCopySnippet(gap.suggestedSnippetToInsert || '', gapKey)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#FAF9F6] hover:bg-slate-100 text-[#08121E] text-xs font-semibold border border-slate-200 transition-colors cursor-pointer min-h-[44px]"
                            >
                              {copiedKey === gapKey ? <Check className="w-3.5 h-3.5 text-[#1E5E3A]" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />}
                              <span>{copiedKey === gapKey ? 'OK' : t.optimizer.btnCopySnippet}</span>
                            </button>
                            {onInsertSnippet && (
                              <button
                                type="button"
                                onClick={() => handleInsertGap(gap.suggestedSnippetToInsert || '', gapKey)}
                                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-md bg-[#E5A93C] hover:bg-[#D99A2B] text-[#08121E] text-xs font-bold shadow-2xs transition-all cursor-pointer min-h-[44px]"
                              >
                                {isApplied ? <Check className="w-3.5 h-3.5 text-[#1E5E3A]" aria-hidden="true" /> : <PlusCircle className="w-3.5 h-3.5" aria-hidden="true" />}
                                <span>{isApplied ? t.optimizer.appliedSuccess : t.optimizer.btnInsertGap}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rewrite Suggestions: Snippets Before vs After */}
          {analysis.rewriteSuggestions && analysis.rewriteSuggestions.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#FAF9F6] text-[#08121E] border border-slate-200 flex items-center justify-center">
                  <SplitSquareVertical className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-[#08121E]">
                    {t.optimizer.rewritesTitle}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t.optimizer.rewritesDesc}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {analysis.rewriteSuggestions.map((item, idx) => {
                  const rwKey = `rw_${idx}`;
                  const isAppliedRw = appliedKey === rwKey;
                  return (
                    <div key={idx} className="p-3.5 rounded-xl bg-[#FAF9F6] border border-slate-200 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {/* Original */}
                        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-slate-800 space-y-1">
                          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wide flex items-center gap-1">
                            ✕ {t.optimizer.originalSnippet}
                          </span>
                          <p className="text-xs italic leading-relaxed text-slate-700">
                            &ldquo;{item.originalSnippet}&rdquo;
                          </p>
                        </div>

                        {/* Suggested */}
                        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-slate-800 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-[#1E5E3A] uppercase tracking-wide flex items-center gap-1">
                              ✓ {t.optimizer.optimizedSnippet}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleCopySnippet(item.suggestedSnippet, rwKey)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1E5E3A] hover:underline cursor-pointer min-h-[36px] px-1"
                              >
                                {copiedKey === rwKey ? (
                                  <span className="text-emerald-800 flex items-center gap-0.5">
                                    <Check className="w-3 h-3" aria-hidden="true" /> OK
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-0.5">
                                    <Copy className="w-3 h-3" aria-hidden="true" /> {t.optimizer.btnCopySnippet}
                                  </span>
                                )}
                              </button>

                              {onReplaceSnippet && (
                                <button
                                  type="button"
                                  onClick={() => handleApplySnippet(item.originalSnippet, item.suggestedSnippet, rwKey)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer min-h-[36px]"
                                >
                                  {isAppliedRw ? (
                                    <>
                                      <Check className="w-3 h-3" aria-hidden="true" />
                                      <span>OK!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Zap className="w-3 h-3" aria-hidden="true" />
                                      <span>{t.optimizer.btnApplySnippet}</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-xs font-medium leading-relaxed text-slate-900">
                            &ldquo;{item.suggestedSnippet}&rdquo;
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-600">
                        <span>{item.explanation}</span>
                        {item.relationUnlocked && (
                          <span className="px-2 py-0.5 rounded-full bg-[#1E5E3A]/10 text-[#1E5E3A] border border-[#1E5E3A]/20 font-mono font-semibold text-[10px]">
                            + {item.relationUnlocked}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Key Improvements Highlights */}
          {analysis.keyImprovements && analysis.keyImprovements.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-2xs space-y-2.5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {t.optimizer.title}
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {analysis.keyImprovements.map((imp, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#1E5E3A] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: Full Optimized Text with Comparison & 1-Click Action (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-2xs space-y-4 lg:sticky lg:top-24">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#1E5E3A]" aria-hidden="true" />
                <h3 className="font-serif text-base font-bold text-[#08121E]">{t.optimizer.tabOverview}</h3>
              </div>

              <div className="flex items-center gap-1 bg-[#FAF9F6] border border-slate-200 p-0.5 rounded-full text-[11px]">
                <button
                  type="button"
                  onClick={() => setViewMode('optimized')}
                  className={`px-3 py-1.5 rounded-full font-medium transition-all cursor-pointer min-h-[36px] ${
                    viewMode === 'optimized'
                      ? 'bg-white text-[#08121E] shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.optimizer.tabOverview}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('comparison')}
                  className={`px-3 py-1.5 rounded-full font-medium transition-all cursor-pointer min-h-[36px] ${
                    viewMode === 'comparison'
                      ? 'bg-white text-[#08121E] shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.optimizer.tabComparison}
                </button>
              </div>
            </div>

            {viewMode === 'optimized' ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-slate-200 font-sans text-xs leading-relaxed text-[#08121E] max-h-96 overflow-y-auto whitespace-pre-wrap">
                  {analysis.optimizedText}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="btn-copy-optimized-text"
                    type="button"
                    onClick={() => handleCopy(analysis.optimizedText)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#FAF9F6] hover:bg-slate-100 text-[#08121E] text-xs font-bold transition-colors border border-slate-200 cursor-pointer min-h-[44px]"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#1E5E3A]" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
                    <span>{copied ? 'OK!' : t.optimizer.btnCopySnippet}</span>
                  </button>

                  <button
                    id="btn-apply-optimized-text-sidebar"
                    type="button"
                    onClick={() => onApplyOptimizedText(analysis.optimizedText)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[#E5A93C] hover:bg-[#D99A2B] text-[#08121E] text-xs font-bold shadow-xs transition-all cursor-pointer min-h-[44px]"
                  >
                    <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t.optimizer.btnApplyOptimized}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {/* Secondary Diff Mode Toggle */}
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t.optimizer.tabComparison}:</span>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px]">
                    <button
                      type="button"
                      onClick={() => setComparisonSubMode('diff')}
                      className={`px-2 py-1 rounded font-medium transition-all cursor-pointer min-h-[36px] ${
                        comparisonSubMode === 'diff'
                          ? 'bg-white text-[#08121E] font-bold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t.optimizer.tabDiff}
                    </button>
                    <button
                      type="button"
                      onClick={() => setComparisonSubMode('side-by-side')}
                      className={`px-2 py-1 rounded font-medium transition-all cursor-pointer min-h-[36px] ${
                        comparisonSubMode === 'side-by-side'
                          ? 'bg-white text-[#08121E] font-bold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t.optimizer.tabSideBySide}
                    </button>
                  </div>
                </div>

                {comparisonSubMode === 'diff' ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto p-3.5 rounded-xl bg-[#FAF9F6] border border-slate-200">
                    {/* Paragraph by paragraph diff visualization */}
                    {analysis.optimizedText.split(/\n\s*\n/).map((optPara, idx) => {
                      const origPara = currentText.split(/\n\s*\n/)[idx] || '';
                      const isModified = origPara.trim() !== optPara.trim();

                      if (!isModified) {
                        return (
                          <p key={idx} className="text-slate-600 leading-relaxed text-xs">
                            {optPara}
                          </p>
                        );
                      }

                      return (
                        <div key={idx} className="p-3 rounded-lg bg-white border border-amber-200/80 space-y-2 shadow-2xs">
                          {origPara && (
                            <div className="text-[11px] text-rose-800 bg-rose-50/70 p-2 rounded border border-rose-200/60 line-through">
                              <span className="font-bold text-[10px] text-rose-900 block uppercase no-underline tracking-wider mb-0.5">
                                {t.optimizer.originalSnippet}
                              </span>
                              {origPara}
                            </div>
                          )}
                          <div className="text-[11px] text-emerald-950 bg-emerald-50/80 p-2 rounded border border-emerald-300 font-medium">
                            <span className="font-bold text-[10px] text-emerald-800 block uppercase tracking-wider mb-0.5 flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                              {t.optimizer.optimizedSnippet}
                            </span>
                            {optPara}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t.optimizer.originalSnippet}</span>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 max-h-36 overflow-y-auto leading-relaxed">
                        {currentText}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[#1E5E3A] uppercase tracking-wider">{t.optimizer.optimizedSnippet}</span>
                      <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 text-slate-800 font-medium max-h-44 overflow-y-auto leading-relaxed">
                        {analysis.optimizedText}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  id="btn-apply-optimized-text-compare"
                  type="button"
                  onClick={() => onApplyOptimizedText(analysis.optimizedText)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[#E5A93C] hover:bg-[#D99A2B] text-[#08121E] text-xs font-bold shadow-xs transition-all cursor-pointer min-h-[44px]"
                >
                  <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.optimizer.btnApplyOptimized}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
