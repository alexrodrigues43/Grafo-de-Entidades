import React, { useState, useRef } from 'react';
import { TAXONOMIES } from '../data/taxonomies';
import { TaxonomyType, Entity } from '../types';
import { getEntityColor } from '../utils/colors';
import {
  Sparkles,
  Upload,
  FileText,
  RotateCcw,
  Tag,
  Plus,
  FileCode,
  CheckCircle2,
  Sliders,
  AlignLeft,
  Clock,
  Layers,
  FileCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  ShieldCheck,
  Gauge,
  Compass,
  X,
  Lock,
  Unlock,
  Target
} from 'lucide-react';

export const IDEAL_WORDS_LIMIT = 6000;
export const MAX_SAFE_WORDS = 15000;
export const MAX_SAFE_CHARS = 100000;

interface TextInputSectionProps {
  text: string;
  onChangeText: (text: string) => void;
  domainContext: string;
  onChangeDomainContext: (domainContext: string) => void;
  taxonomy: TaxonomyType;
  onChangeTaxonomy: (taxonomy: TaxonomyType) => void;
  confidenceThreshold: number;
  onChangeConfidenceThreshold: (threshold: number) => void;
  customRelations: string[];
  onChangeCustomRelations: (relations: string[]) => void;
  onExtract: () => void;
  isLoading: boolean;
  entities: Entity[];
}

export const TextInputSection: React.FC<TextInputSectionProps> = ({
  text,
  onChangeText,
  domainContext,
  onChangeDomainContext,
  taxonomy,
  onChangeTaxonomy,
  confidenceThreshold,
  onChangeConfidenceThreshold,
  customRelations,
  onChangeCustomRelations,
  onExtract,
  isLoading,
  entities
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'annotated'>('editor');
  const [newCustomRelation, setNewCustomRelation] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [fileLimitWarning, setFileLimitWarning] = useState<string | null>(null);
  const [contextWarning, setContextWarning] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedTaxonomyInfo = TAXONOMIES[taxonomy] || TAXONOMIES.wiki80;

  // Text metrics calculation
  const charCount = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const paragraphs = text.trim() ? text.split(/\n\s*\n/).filter(p => p.trim().length > 0) : [];
  const paragraphCount = paragraphs.length;
  const estimatedReadingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  // Capacity & Safety Guardrails
  const isExceeded = wordCount > MAX_SAFE_WORDS || charCount > MAX_SAFE_CHARS;
  const isWarning = wordCount > IDEAL_WORDS_LIMIT && !isExceeded;
  const isIdeal = wordCount > 0 && wordCount <= IDEAL_WORDS_LIMIT;
  const capacityPercent = Math.min(100, Math.round((wordCount / MAX_SAFE_WORDS) * 100));

  // Handle File Upload (.txt, .md, .csv, .json)
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        const fileWords = content.trim().split(/\s+/).filter(Boolean).length;
        if (fileWords > MAX_SAFE_WORDS || content.length > MAX_SAFE_CHARS) {
          setFileLimitWarning(
            `O arquivo "${file.name}" possui ${fileWords.toLocaleString('pt-BR')} palavras e ultrapassa o limite seguro de 15.000 palavras. Divida o documento para prosseguir com a extração de qualidade.`
          );
        } else {
          setFileLimitWarning(null);
        }
        onChangeText(content);
        setUploadedFileName(file.name);
        setActiveTab('editor');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Intercept extraction to enforce mandatory domain context
  const handleExtractClick = () => {
    if (!domainContext.trim()) {
      setContextWarning(true);
      const el = document.getElementById('domain-context-input');
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    setContextWarning(false);
    onExtract();
  };

  // Add Custom Relation
  const handleAddCustomRelation = () => {
    if (!newCustomRelation.trim()) return;
    const formatted = newCustomRelation.trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (!customRelations.includes(formatted)) {
      onChangeCustomRelations([...customRelations, formatted]);
    }
    setNewCustomRelation('');
  };

  const handleRemoveCustomRelation = (rel: string) => {
    onChangeCustomRelations(customRelations.filter(r => r !== rel));
  };

  // Clear text
  const handleClear = () => {
    onChangeText('');
    setUploadedFileName(null);
    setFileLimitWarning(null);
    setActiveTab('editor');
  };

  // Render Annotated Text with Highlighted Entities
  const renderAnnotatedText = () => {
    if (entities.length === 0 || !text) {
      return (
        <div className="p-8 text-center text-slate-400 text-sm">
          Execute a extração primeiro para visualizar as entidades anotadas diretamente no texto fonte.
        </div>
      );
    }

    let parts: Array<{ text: string; entity?: Entity }> = [{ text }];

    entities.forEach(ent => {
      if (!ent.text || ent.text.length < 2) return;
      const nextParts: typeof parts = [];

      parts.forEach(part => {
        if (part.entity) {
          nextParts.push(part);
          return;
        }

        const idx = part.text.indexOf(ent.text);
        if (idx !== -1) {
          const before = part.text.substring(0, idx);
          const match = part.text.substring(idx, idx + ent.text.length);
          const after = part.text.substring(idx + ent.text.length);

          if (before) nextParts.push({ text: before });
          nextParts.push({ text: match, entity: ent });
          if (after) nextParts.push({ text: after });
        } else {
          nextParts.push(part);
        }
      });

      parts = nextParts;
    });

    return (
      <div className="p-4 leading-relaxed text-sm text-slate-800 bg-slate-50/80 rounded-lg whitespace-pre-wrap max-h-[360px] overflow-y-auto">
        {parts.map((p, i) => {
          if (p.entity) {
            const color = getEntityColor(p.entity.type);
            return (
              <span
                key={i}
                className={`inline-flex items-center gap-1 mx-0.5 px-1.5 py-0.5 rounded border text-xs font-semibold ${color.badge}`}
                title={`Tipo: ${p.entity.type} | Confiança: ${((p.entity.confidence || 0.95) * 100).toFixed(0)}%`}
              >
                {p.text}
                <span className="text-[9px] uppercase tracking-wider font-bold opacity-75">
                  [{p.entity.type}]
                </span>
              </span>
            );
          }
          return <span key={i}>{p.text}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-5 sm:p-6 card-editorial-topbar space-y-5">
      {/* Header & Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#1E5E3A]/10 border border-[#1E5E3A]/20 flex items-center justify-center text-[#1E5E3A]">
            <FileText className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-[#08121E] tracking-tight">
              Texto Fonte & Engenharia Semântica
            </h2>
            <p className="text-xs text-slate-500">
              Insira o texto do seu artigo, página ou documento para mapeamento de entidades
            </p>
          </div>
        </div>

        {/* Upload Action Button */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.json,.csv"
            className="hidden"
            onChange={e => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />
          <button
            type="button"
            id="btn-upload-file"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 text-[#08121E] font-semibold text-xs border border-slate-200 transition-colors shadow-2xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#1E5E3A]" />
            <span>Carregar Arquivo (.txt / .md)</span>
          </button>
        </div>
      </div>

      {/* Uploaded File Banner (if present) */}
      {uploadedFileName && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-900 animate-fade-in">
          <div className="flex items-center gap-2 font-medium">
            <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Arquivo carregado com sucesso:</span>
            <span className="font-bold font-mono px-1.5 py-0.5 bg-white rounded border border-emerald-300">
              {uploadedFileName}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setUploadedFileName(null)}
            className="text-emerald-700 hover:text-emerald-900 text-[11px] underline ml-2"
          >
            Dispensar aviso
          </button>
        </div>
      )}

      {/* File Upload Oversize Warning */}
      {fileLimitWarning && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-900 animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block">Aviso de Arquivo Extenso</span>
            <span>{fileLimitWarning}</span>
          </div>
        </div>
      )}

      {/* Capacity & Safety Indicator Meter */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <Gauge className="w-3.5 h-3.5 text-slate-500" />
            <span>Monitor de Volume & Qualidade Relacional:</span>
          </div>

          <div className="flex items-center gap-2">
            {isExceeded ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 border border-red-300 text-red-800 text-[11px] font-bold animate-pulse">
                <AlertCircle className="w-3 h-3 text-red-600" />
                Limite de Segurança Excedido ({wordCount.toLocaleString('pt-BR')} / 15.000 palavras)
              </span>
            ) : isWarning ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-[11px] font-semibold">
                <Info className="w-3 h-3 text-amber-600" />
                Texto Extenso ({wordCount.toLocaleString('pt-BR')} / 15.000 palavras • {capacityPercent}%)
              </span>
            ) : isIdeal ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-[11px] font-semibold">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Capacidade Ideal ({wordCount.toLocaleString('pt-BR')} palavras • Qualidade Máxima)
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">
                Máximo suportado: 15.000 palavras por envio
              </span>
            )}
          </div>
        </div>

        {/* Progress Capacity Bar */}
        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isExceeded
                ? 'bg-red-500'
                : isWarning
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.max(wordCount > 0 ? 2 : 0, capacityPercent)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>0 palavras</span>
          <span className="text-slate-500 font-medium">Ideal: até 6.000 palavras</span>
          <span className={isExceeded ? 'text-red-600 font-bold' : ''}>Trava Máxima: 15.000 palavras</span>
        </div>
      </div>

      {/* Safety Lock Alert Banner (When Exceeded) */}
      {isExceeded && (
        <div className="p-3.5 bg-red-50 border-2 border-red-300 rounded-xl flex items-start gap-3 text-xs text-red-900 animate-fade-in shadow-sm">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-red-800 text-sm">
              Trava de Segurança Ativa: Limite de 15.000 Palavras Excedido
            </h4>
            <p className="text-red-700 leading-relaxed">
              O texto inserido contém <strong>{wordCount.toLocaleString('pt-BR')} palavras</strong> ({charCount.toLocaleString('pt-BR')} caracteres).
              Para evitar que o modelo sofra com perda de atenção no meio do texto (<em>Lost-in-the-Middle</em>) ou estoure o limite de saída de tokens JSON, o envio de textos acima de 15.000 palavras está <strong>bloqueado</strong>.
            </p>
            <p className="text-red-800 font-medium pt-0.5">
              💡 <strong>Solução recomendada:</strong> Divida o documento em capítulos, tópicos ou seções menores para extrair grafos densos e de máxima precisão.
            </p>
          </div>
        </div>
      )}

      {/* Information Banner for Long Text Warning (6,001 - 15,000 words) */}
      {isWarning && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Texto Extenso ({wordCount.toLocaleString('pt-BR')} palavras):</strong> O processamento será realizado normalmente. Para densidade relacional máxima, textos de até 6.000 palavras são ideais.
            </span>
          </div>
          <span className="text-[11px] font-mono font-bold text-amber-700 shrink-0 bg-amber-100 px-2 py-0.5 rounded ml-2">
            {capacityPercent}% da cota
          </span>
        </div>
      )}

      {/* Mandatory Domain & Semantic Context Free-Form Field */}
      <div
        className={`p-4 rounded-xl border transition-all ${
          contextWarning
            ? 'bg-rose-50/80 border-rose-400 ring-4 ring-rose-200 shadow-sm'
            : domainContext.trim()
            ? 'bg-emerald-50/30 border-emerald-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-200'
            : 'bg-[#FAF9F6] border-slate-200 focus-within:border-[#E5A93C] focus-within:ring-2 focus-within:ring-[#E5A93C]/20'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2">
          <label htmlFor="domain-context-input" className="text-xs font-bold text-[#08121E] flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#E5A93C]" />
            <span>Contexto Temático do Texto</span>
            {domainContext.trim() ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Contexto Ativo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 shrink-0 animate-pulse">
                <Lock className="w-3 h-3 text-rose-600" />
                Condição Obrigatória
              </span>
            )}
          </label>
          <span className="text-[11px] text-slate-500">
            Campo livre: ancora a análise no nicho para evitar entidades e verbos sem sentido
          </span>
        </div>

        <div className="relative">
          <input
            id="domain-context-input"
            type="text"
            value={domainContext}
            onChange={e => {
              onChangeDomainContext(e.target.value);
              if (contextWarning && e.target.value.trim().length > 0) {
                setContextWarning(false);
              }
            }}
            placeholder="Sobre o que seu texto trata? Ex: SEO para E-commerce, Inteligência Artificial, Arquitetura de Software..."
            className={`w-full pl-3.5 pr-10 py-2.5 text-xs text-[#08121E] placeholder:text-slate-400 bg-white border rounded-lg focus:outline-none transition-all ${
              contextWarning
                ? 'border-rose-500 ring-2 ring-rose-200'
                : domainContext.trim()
                ? 'border-emerald-300 focus:border-emerald-500'
                : 'border-slate-300 focus:border-[#E5A93C]'
            }`}
          />
          {domainContext && (
            <button
              type="button"
              onClick={() => {
                onChangeDomainContext('');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
              title="Limpar contexto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Suggestion Chips for Fast Testing */}
        <div className="pt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] text-slate-500 font-medium mr-1 flex items-center gap-1">
            <Target className="w-3 h-3 text-slate-400" />
            Sugestões rápidas para testar:
          </span>
          {[
            'SEO para E-commerce',
            'Inteligência Artificial & LLMs',
            'Marketing de Conteúdo & Copy',
            'Arquitetura de Software',
            'Saúde & Medicina',
            'Direito & Legislação',
            'Finanças & Investimentos'
          ].map(chip => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                onChangeDomainContext(chip);
                setContextWarning(false);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all cursor-pointer ${
                domainContext.trim().toLowerCase() === chip.toLowerCase()
                  ? 'bg-[#1E5E3A] text-white border-[#1E5E3A] shadow-2xs font-semibold'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Lock Warning Banner When User Attempts Extraction Without Context */}
        {contextWarning && (
          <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-300 text-xs text-rose-900 flex items-start gap-2.5 animate-fade-in shadow-2xs">
            <div className="w-5 h-5 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center shrink-0 mt-0.5 font-bold">
              <Lock className="w-3 h-3 text-rose-700" />
            </div>
            <div className="space-y-1 flex-1">
              <strong className="font-bold block text-rose-950">
                ⚠️ Análise Travada: O contexto temático é condição indispensável para gerar a análise
              </strong>
              <p className="text-rose-900 leading-relaxed">
                Para que o modelo não mapeie entidades sem sentido ou capture termos aleatórios, ele precisa saber previamente sobre o que seu texto trata. Por favor, <strong>escreva livremente no campo acima</strong> ou clique em uma das sugestões para destravar a extração.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* View Switcher & Live Text Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-medium self-start">
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'editor'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span>Editor de Texto</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('annotated')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'annotated'
                ? 'bg-white text-slate-900 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Entidades Destacadas {entities.length > 0 && `(${entities.length})`}</span>
          </button>
        </div>

        {/* Dynamic Metrics */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{wordCount}</span> palavras
          <span>•</span>
          <span>{charCount} caracteres</span>
          {paragraphCount > 1 && (
            <>
              <span>•</span>
              <span>{paragraphCount} parágrafos</span>
            </>
          )}
          {wordCount > 50 && (
            <>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-slate-600">
                <Clock className="w-3 h-3" />
                ~{estimatedReadingTimeMin} min de leitura
              </span>
            </>
          )}
          {text && (
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-400 hover:text-red-600 ml-2 flex items-center gap-1 transition-colors"
              title="Limpar editor"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[11px]">Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* Editor Area / Highlighted View */}
      {activeTab === 'editor' ? (
        <div
          onDragOver={e => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`relative border rounded-xl transition-all ${
            isDragOver
              ? 'border-blue-500 bg-blue-50/30 ring-2 ring-blue-200'
              : isExceeded
              ? 'border-red-300 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100 bg-red-50/20'
              : 'border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 bg-slate-50/40'
          }`}
        >
          <textarea
            id="opennre-input-textarea"
            rows={7}
            value={text}
            onChange={e => onChangeText(e.target.value)}
            placeholder="Cole ou digite aqui o texto do seu post de blog, artigo, resumo de pesquisa ou documento. Suporta textos longos em Português, Inglês ou qualquer outro idioma..."
            className="w-full p-4 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent resize-y focus:outline-none font-sans leading-relaxed min-h-[160px]"
          />

          {/* Bottom helper bar inside textarea */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2 bg-slate-100/80 border-t border-slate-200/80 rounded-b-xl text-xs text-slate-500 gap-2">
            <span className="text-[11px]">
              Dica: Você pode arrastar e soltar arquivos <strong>.txt</strong> ou <strong>.md</strong> diretamente aqui.
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">
                {text.trim().length === 0
                  ? 'Aguardando texto...'
                  : isExceeded
                  ? '⚠️ Limite de 15.000 palavras excedido'
                  : 'Texto pronto para extração'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl min-h-[160px]">
          {renderAnnotatedText()}
        </div>
      )}

      {/* Model & Taxonomy Configuration Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
        {/* Taxonomy Picker */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="taxonomy-select"
            className="text-xs font-bold text-slate-800 flex items-center justify-between"
          >
            <span>Taxonomia Relacional</span>
            <span className="text-[10px] text-[#590050] font-semibold">
              {selectedTaxonomyInfo.relationCount > 0
                ? `${selectedTaxonomyInfo.relationCount} relações`
                : 'Schema Custom'}
            </span>
          </label>
          <select
            id="taxonomy-select"
            value={taxonomy}
            onChange={e => onChangeTaxonomy(e.target.value as TaxonomyType)}
            className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#fdd910] focus:border-[#302c33]"
          >
            <option value="wiki80">OpenNRE Wiki80 (Wikidata / 80 relações)</option>
            <option value="tacred">TACRED (Stanford NLP / 42 relações)</option>
            <option value="fewrel">FewRel (Few-shot RE / 100 relações)</option>
            <option value="semeval">SemEval-2010 Task 8 (9 relações clássicas)</option>
            <option value="custom">Esquema Customizado / Relações Abertas</option>
          </select>
        </div>

        {/* Confidence Threshold Slider */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
            <span>Limiar Mínimo de Confiança</span>
            <span className="text-xs font-mono font-bold text-[#590050] bg-[#590050]/10 px-1.5 py-0.5 rounded">
              {(confidenceThreshold * 100).toFixed(0)}%
            </span>
          </label>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="range"
              min="0.30"
              max="0.95"
              step="0.05"
              value={confidenceThreshold}
              onChange={e => onChangeConfidenceThreshold(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#590050]"
            />
          </div>
        </div>

        {/* Extraction Trigger CTA */}
        <div className="flex items-end">
          <div className="w-full space-y-1.5">
            {!domainContext.trim() && text.trim().length > 0 && (
              <div className="flex items-center justify-between px-2 text-[10px] text-rose-700 font-semibold animate-pulse">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-rose-600" />
                  Análise travada: preencha o contexto
                </span>
                <button
                  type="button"
                  className="text-[10px] underline text-rose-800 hover:text-rose-950 font-bold cursor-pointer"
                  onClick={() => {
                    const el = document.getElementById('domain-context-input');
                    el?.focus();
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                >
                  Ir ao campo
                </button>
              </div>
            )}
            <button
              id="extract-relations-btn"
              type="button"
              onClick={handleExtractClick}
              disabled={isLoading || !text.trim() || isExceeded}
              className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-full font-bold text-xs shadow-xs transition-all cursor-pointer ${
                isLoading || !text.trim()
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : isExceeded
                  ? 'bg-red-100 border border-red-200 text-red-600 cursor-not-allowed'
                  : !domainContext.trim()
                  ? 'bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 active:scale-[0.99]'
                  : 'bg-[#E5A93C] hover:bg-[#D99A2B] text-[#08121E] shadow-sm active:scale-[0.99]'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#08121E]/30 border-t-[#08121E] rounded-full animate-spin" />
                  <span>Processando Extração & Grafo...</span>
                </>
              ) : isExceeded ? (
                <>
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>Bloqueado: Reduza o Texto (&le; 15k palavras)</span>
                </>
              ) : !domainContext.trim() && text.trim().length > 0 ? (
                <>
                  <Lock className="w-4 h-4 text-rose-600" />
                  <span>Trava Ativa: Definir Contexto</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#08121E]" />
                  <span>Extrair Relações & Gerar Grafo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Custom Relations Input (Conditional for 'custom' taxonomy) */}
      {taxonomy === 'custom' && (
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-blue-600" />
            <span>Relações Personalizadas do Domínio (Ontologia)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="ex: desenvolve_tecnologia, lidera_projeto, cita_estudo, adquire"
              value={newCustomRelation}
              onChange={e => setNewCustomRelation(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomRelation();
                }
              }}
              className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAddCustomRelation}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-xs font-medium flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              Adicionar
            </button>
          </div>
          {customRelations.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {customRelations.map(rel => (
                <span
                  key={rel}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium"
                >
                  {rel}
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomRelation(rel)}
                    className="hover:text-blue-900 font-bold ml-0.5 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
