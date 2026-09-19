import React, { useState } from 'react';
import { Entity, RelationTriplet, TextOptimizationAnalysis } from '../types';
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Copy,
  Check,
  Zap,
  SplitSquareVertical,
  Layers,
  HelpCircle,
  Lightbulb,
  FileText,
  Network
} from 'lucide-react';

interface TextOptimizationReportProps {
  currentText: string;
  entities: Entity[];
  relations: RelationTriplet[];
  analysis: TextOptimizationAnalysis | null;
  isLoading: boolean;
  onRunAnalysis: () => void;
  onApplyOptimizedText: (optimizedText: string) => void;
}

export const TextOptimizationReport: React.FC<TextOptimizationReportProps> = ({
  currentText,
  entities,
  relations,
  analysis,
  isLoading,
  onRunAnalysis,
  onApplyOptimizedText
}) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'optimized' | 'comparison'>('optimized');

  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return { bg: 'bg-[#1E5E3A]', text: 'text-[#1E5E3A]', badge: 'bg-[#1E5E3A]/10 text-[#1E5E3A] border-[#1E5E3A]/30' };
    if (score >= 60) return { bg: 'bg-[#E5A93C]', text: 'text-[#92400E]', badge: 'bg-[#E5A93C]/20 text-[#92400E] border-[#E5A93C]/40' };
    if (score >= 40) return { bg: 'bg-amber-500', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800 border-amber-300' };
    return { bg: 'bg-rose-500', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-800 border-rose-300' };
  };

  if (!analysis && !isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-[#FAF9F6] text-[#08121E] rounded-2xl flex items-center justify-center mx-auto border border-slate-200 shadow-2xs">
          <Sparkles className="w-8 h-8 text-[#E5A93C] animate-pulse" />
        </div>

        <div className="max-w-xl mx-auto space-y-2">
          <h3 className="font-serif text-2xl font-bold text-[#08121E]">
            Otimizador de Coesão e Conectividade Textual
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed font-sans">
            O Gemini analisa profundamente as entidades e relações extraídas do seu texto, diagnosticando termos isolados, anáforas ambíguas e orações passivas para gerar um relatório completo de melhorias com texto pronto para reextração.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
          <div className="p-4 rounded-xl bg-[#FAF9F6] border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 text-[#08121E] font-bold text-xs">
              <Layers className="w-4 h-4 text-[#1E5E3A]" />
              <span>Nós Isolados</span>
            </div>
            <p className="text-xs text-slate-600">
              Identifica entidades mencionadas sem predicados relacionais claros.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF9F6] border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 text-[#08121E] font-bold text-xs">
              <Zap className="w-4 h-4 text-[#E5A93C]" />
              <span>Antes vs. Depois</span>
            </div>
            <p className="text-xs text-slate-600">
              Sugestões pontuais de orações ativas com verbos relacionais diretos.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF9F6] border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 text-[#08121E] font-bold text-xs">
              <Network className="w-4 h-4 text-[#1E5E3A]" />
              <span>Reextração em 1 Clique</span>
            </div>
            <p className="text-xs text-slate-600">
              Aplica o texto otimizado e reexecuta o grafo com muito mais arestas.
            </p>
          </div>
        </div>

        <button
          id="btn-run-first-connectivity-analysis"
          type="button"
          onClick={onRunAnalysis}
          disabled={!currentText.trim()}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#E5A93C] hover:bg-[#D99A2B] text-[#08121E] text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Gerar Relatório de Conectividade com Gemini</span>
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-3 border-[#FAF9F6] border-t-[#08121E] animate-spin mx-auto" />
        <div className="space-y-1">
          <h4 className="font-serif text-lg font-bold text-[#08121E]">
            Analisando topologia do texto e densidade de conexões...
          </h4>
          <p className="text-xs text-slate-500">
            O Gemini está inspecionando {entities.length} entidades e {relations.length} relações para formular sugestões de alta precisão.
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
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#1E5E3A]/10 text-[#1E5E3A] border border-[#1E5E3A]/20 text-xs font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#E5A93C]" />
              Gemini OpenNRE Intelligence
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${scoreTheme.badge}`}>
              Nível: {analysis.connectivityLevel}
            </span>
          </div>
          <h2 className="font-serif text-xl font-bold text-[#08121E]">
            Relatório de Diagnóstico e Otimização Relacional
          </h2>
          <p className="text-xs text-slate-500">
            Estratégias computacionais para transformar menções soltas em arestas densas de conhecimento.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            id="btn-reanalyze-text-connectivity"
            type="button"
            onClick={onRunAnalysis}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[#FAF9F6] hover:bg-slate-100 text-[#08121E] text-xs font-bold transition-colors border border-slate-200 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reanalisar</span>
          </button>

          <button
            id="btn-apply-optimized-text-top"
            type="button"
            onClick={() => onApplyOptimizedText(analysis.optimizedText)}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-[#E5A93C] hover:bg-[#D99A2B] text-[#08121E] text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Aplicar Texto e Reextrair Grafo</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid (3 Numeric Focus Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Score Card */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Índice de Conectividade</span>
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
              ? 'Alta densidade de predicados verbais.'
              : analysis.connectivityScore >= 50
              ? 'Conectividade moderada, nós isolados detectados.'
              : 'Muitas entidades sem conexões diretas.'}
          </span>
        </div>

        {/* Isolated Entities Count */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Entidades Isoladas</span>
            <AlertTriangle className={`w-4 h-4 ${analysis.isolatedEntities.length > 0 ? 'text-amber-500' : 'text-[#1E5E3A]'}`} />
          </div>
          <div className="my-2">
            <span className="text-3xl font-serif font-bold text-[#08121E]">
              {analysis.isolatedEntities.length}
            </span>
            <span className="text-xs text-slate-500 ml-1.5">sem relações no grafo</span>
          </div>
          <span className="text-[11px] text-slate-500">
            {analysis.isolatedEntities.length === 0
              ? 'Todas as entidades estão conectadas.'
              : 'Podem ser ligadas com pequenas adições de verbos.'}
          </span>
        </div>

        {/* Expected New Relations */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Novas Relações Estimadas</span>
            <Zap className="w-4 h-4 text-[#1E5E3A]" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-serif font-bold text-[#1E5E3A]">
              +{analysis.expectedNewRelations.length || 3}
            </span>
            <span className="text-xs text-slate-500 ml-1.5">arestas adicionais</span>
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
              <Lightbulb className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Diagnóstico Geral da Topologia Relacional
            </span>
          </div>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10">
            OpenNRE Graph Topology
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
          {analysis.diagnosisSummary}
        </p>
      </div>

      {/* Main Content Layout: Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Diagnostics & Rewrite Snippets (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Isolated Entities Section */}
          {analysis.isolatedEntities.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-serif text-base font-bold text-[#08121E]">
                  Entidades Isoladas no Grafo ({analysis.isolatedEntities.length})
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Estas entidades foram reconhecidas como termos relevantes, mas o texto não expressa uma ligação direta com as demais:
              </p>

              <div className="space-y-2.5 pt-1">
                {analysis.isolatedEntities.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#FAF9F6] border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#08121E] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#E5A93C]" />
                        {item.entity}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200">
                        {item.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">
                      <strong className="text-[#08121E] font-medium">Motivo:</strong> {item.reason}
                    </p>
                    <p className="text-xs text-emerald-950 bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200 flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#1E5E3A] shrink-0 mt-0.5" />
                      <span><strong>Como conectar:</strong> {item.suggestedFix}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rewrite Suggestions: Snippets Before vs After */}
          {analysis.rewriteSuggestions && analysis.rewriteSuggestions.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#FAF9F6] text-[#08121E] border border-slate-200 flex items-center justify-center">
                  <SplitSquareVertical className="w-3.5 h-3.5" />
                </div>
                <h3 className="font-serif text-base font-bold text-[#08121E]">
                  Sugestões Pontuais de Reescrita (Antes vs. Depois)
                </h3>
              </div>

              <div className="space-y-3 pt-1">
                {analysis.rewriteSuggestions.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#FAF9F6] border border-slate-200 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* Original */}
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-slate-800 space-y-1">
                        <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wide flex items-center gap-1">
                          ✕ Texto Original
                        </span>
                        <p className="text-xs italic leading-relaxed text-slate-700">
                          "{item.originalSnippet}"
                        </p>
                      </div>

                      {/* Suggested */}
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-slate-800 space-y-1">
                        <span className="text-[10px] font-bold text-[#1E5E3A] uppercase tracking-wide flex items-center gap-1">
                          ✓ Proposta Otimizada
                        </span>
                        <p className="text-xs font-medium leading-relaxed text-slate-900">
                          "{item.suggestedSnippet}"
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
                ))}
              </div>
            </div>
          )}

          {/* Key Improvements Highlights */}
          {analysis.keyImprovements && analysis.keyImprovements.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-2xs space-y-2.5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Principais Ganhos Estruturais
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {analysis.keyImprovements.map((imp, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[#1E5E3A] shrink-0 mt-0.5" />
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: Full Optimized Text with 1-Click Action (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-2xs space-y-4 sticky top-24">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#1E5E3A]" />
                <h3 className="font-serif text-base font-bold text-[#08121E]">Texto Integral Otimizado</h3>
              </div>

              <div className="flex items-center gap-1 bg-[#FAF9F6] border border-slate-200 p-0.5 rounded-full text-[11px]">
                <button
                  type="button"
                  onClick={() => setViewMode('optimized')}
                  className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer ${
                    viewMode === 'optimized'
                      ? 'bg-white text-[#08121E] shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Otimizado
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('comparison')}
                  className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer ${
                    viewMode === 'comparison'
                      ? 'bg-white text-[#08121E] shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Comparar
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
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#FAF9F6] hover:bg-slate-100 text-[#08121E] text-xs font-bold transition-colors border border-slate-200 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#1E5E3A]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
                  </button>

                  <button
                    id="btn-apply-optimized-text-sidebar"
                    type="button"
                    onClick={() => onApplyOptimizedText(analysis.optimizedText)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[#E5A93C] hover:bg-[#D99A2B] text-[#08121E] text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Aplicar e Reextrair Grafo</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Original:</span>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 max-h-40 overflow-y-auto leading-relaxed">
                    {currentText}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#1E5E3A] uppercase tracking-wider">Otimizado pelo Gemini:</span>
                  <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 text-slate-800 font-medium max-h-48 overflow-y-auto leading-relaxed">
                    {analysis.optimizedText}
                  </div>
                </div>

                <button
                  id="btn-apply-optimized-text-compare"
                  type="button"
                  onClick={() => onApplyOptimizedText(analysis.optimizedText)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[#E5A93C] hover:bg-[#D99A2B] text-[#08121E] text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Aplicar Versão Otimizada no Grafo</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
