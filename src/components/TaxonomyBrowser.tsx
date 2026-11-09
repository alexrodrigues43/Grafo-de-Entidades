import React, { useState, useMemo } from 'react';
import { TAXONOMIES } from '../data/taxonomies';
import { TaxonomyType } from '../types';
import {
  BookOpen,
  Search,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  Filter,
  Layers,
  Target,
  Zap,
  Activity,
  Lightbulb
} from 'lucide-react';

interface TaxonomyBrowserProps {
  currentText: string;
  currentTaxonomy: TaxonomyType;
  onSelectTaxonomy: (taxonomy: TaxonomyType) => void;
}

const PREDICATE_FORMULAS: Record<
  string,
  { category: string; formula: string; editorialTip: string }
> = {
  subtopic_of: {
    category: 'Arquitetura & Topic Clusters',
    formula: '[Subtópico / Satélite] é um subtópico fundamental de [Tópico Pilar]',
    editorialTip: 'Use para amarrar artigos satélites à sua Pillar Page principal.'
  },
  component_of: {
    category: 'Arquitetura & Topic Clusters',
    formula: '[Elemento] compõe a estrutura técnica de [Sistema / Conceito]',
    editorialTip: 'Perfeito para explicar partes constitutivas de uma metodologia ou ferramenta.'
  },
  defined_as: {
    category: 'Arquitetura & Topic Clusters',
    formula: '[Conceito / Termo] é caracterizado / definido como [Definição Canônica]',
    editorialTip: 'Ideal no primeiro parágrafo de cada H2 para conquistar Featured Snippets.'
  },
  solves_problem: {
    category: 'Problema & Solução',
    formula: '[Solução / Ferramenta] soluciona o gargalo de [Problema / Dor do Usuário]',
    editorialTip: 'Conecte dores reais da persona à solução técnica proposta no artigo.'
  },
  alternative_to: {
    category: 'Problema & Solução',
    formula: '[Ferramenta A] atua como alternativa direta a [Ferramenta B]',
    editorialTip: 'Essencial para artigos comparativos (Versus) e avaliações de software.'
  },
  answers_intent: {
    category: 'Intenção & Persona',
    formula: '[Conteúdo / Seção] atende à intenção de busca de [Tipo de Busca / Usuário]',
    editorialTip: 'Alinhe explicitamente a resposta ao tipo de intenção (comercial, informacional, etc).'
  },
  targets_audience: {
    category: 'Intenção & Persona',
    formula: '[Artigo / Metodologia] é direcionado a [Público-Alvo / Persona]',
    editorialTip: 'Sinaliza aos buscadores a persona e o nível técnico esperado do leitor.'
  },
  recommends: {
    category: 'Intenção & Persona',
    formula: '[Autor / Especialista] recomenda o uso de [Prática / Ferramenta]',
    editorialTip: 'Reforça sinais de E-E-A-T com recomendações balizadas por experiência prática.'
  },
  optimizes: {
    category: 'Ação & Tecnologia',
    formula: '[Ação / Técnica] otimiza diretamente o desempenho de [Métrica / Processo]',
    editorialTip: 'Use sempre com verbos de ação para demonstrar ganhos diretos de eficiência.'
  },
  uses_technology: {
    category: 'Ação & Tecnologia',
    formula: '[Entidade / Processo] utiliza e opera sobre [Tecnologia / Software]',
    editorialTip: 'Relacione o trabalho diário às ferramentas e tecnologias consagradas.'
  },
  enables: {
    category: 'Ação & Tecnologia',
    formula: '[Recurso A] habilita e viabiliza a execução de [Resultado B]',
    editorialTip: 'Crie uma ponte causal clara de viabilidade técnica.'
  },
  configures: {
    category: 'Ação & Tecnologia',
    formula: '[Parâmetro / Diretiva] configura o comportamento de [Sistema / Algoritmo]',
    editorialTip: 'Excelente para guias técnicos e documentação de processos operacionais.'
  },
  measures: {
    category: 'Métricas & Requisitos',
    formula: '[Ferramenta / Auditoria] mensura e avalia a métrica de [KPI]',
    editorialTip: 'Mostre como auditar o sucesso da estratégia com métricas objetivas.'
  },
  requires: {
    category: 'Métricas & Requisitos',
    formula: '[Estratégia] requer como pré-requisito obrigatório [Condição / Recurso]',
    editorialTip: 'Evite frustração do leitor delimitando os pré-requisitos antes do tutorial.'
  },
  impacts: {
    category: 'Métricas & Requisitos',
    formula: '[Fator / Mudança] impacta diretamente os resultados de [Métrica / Conversão]',
    editorialTip: 'Conecte causas e efeitos para demonstrar domínio analítico da área.'
  },
  authored_by: {
    category: 'Métricas & Requisitos',
    formula: '[Conteúdo / Framework] é de autoria de [Especialista / Entidade de Autoridade]',
    editorialTip: 'Elemento nuclear para diretrizes de E-E-A-T do Google Search Central.'
  }
};

const CATEGORIES = [
  'Todas',
  'Arquitetura & Topic Clusters',
  'Problema & Solução',
  'Intenção & Persona',
  'Ação & Tecnologia',
  'Métricas & Requisitos'
];

export const TaxonomyBrowser: React.FC<TaxonomyBrowserProps> = ({
  currentTaxonomy,
  onSelectTaxonomy
}) => {
  const [selectedTaxId, setSelectedTaxId] = useState<TaxonomyType>(currentTaxonomy);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const selectedTax = TAXONOMIES[selectedTaxId] || TAXONOMIES.semantic_seo || TAXONOMIES.wiki80;

  const handleCopy = (textToCopy: string, key: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Filtered Relations
  const filteredRelations = useMemo(() => {
    const list = selectedTax.defaultRelations || [];
    return list.filter(rel => {
      const formulaData = PREDICATE_FORMULAS[rel.relation];
      const category = formulaData?.category || 'Geral';

      const matchesCategory =
        selectedCategory === 'Todas' || category === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCategory;

      const matchesSearch =
        rel.relation.toLowerCase().includes(q) ||
        rel.label.toLowerCase().includes(q) ||
        rel.description.toLowerCase().includes(q) ||
        (rel.example && rel.example.toLowerCase().includes(q)) ||
        (formulaData?.formula && formulaData.formula.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [selectedTax, searchQuery, selectedCategory]);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Banner */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#E5A93C]/15 text-[#92400E] border border-[#E5A93C]/30 text-xs font-bold flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-[#E5A93C]" />
              Guia de Predicados Semânticos
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#1E5E3A]/10 text-[#1E5E3A] border border-[#1E5E3A]/20 text-xs font-bold">
              {filteredRelations.length} predicados disponíveis
            </span>
          </div>
          <h2 className="font-serif text-xl font-bold text-[#08121E]">
            Biblioteca de Predicados & Fórmulas de Redação
          </h2>
          <p className="text-xs text-slate-500">
            Fórmulas práticas e orações ativas prontas para redatores conectarem entidades e enriquecerem o grafo.
          </p>
        </div>

        {/* Taxonomy Picker Pills */}
        <div className="flex items-center gap-1 bg-[#FAF9F6] p-1 rounded-xl border border-slate-200 text-xs w-full md:w-auto">
          {Object.values(TAXONOMIES).map(tax => {
            const isSelected = selectedTaxId === tax.id;
            return (
              <button
                key={tax.id}
                type="button"
                onClick={() => {
                  setSelectedTaxId(tax.id as TaxonomyType);
                  onSelectTaxonomy(tax.id as TaxonomyType);
                  setSelectedCategory('Todas');
                }}
                className={`flex-1 md:flex-initial px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white text-[#08121E] shadow-2xs border border-slate-200/80'
                    : 'text-slate-500 hover:text-[#08121E] hover:bg-slate-100/60'
                }`}
              >
                {tax.id === 'semantic_seo' ? 'SEO Semântico (Recomendada)' : tax.name.split(' ')[0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Taxonomy Description Card */}
      <div className="bg-[#FAF9F6] border border-slate-200 rounded-2xl p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-serif text-sm font-bold text-[#08121E]">
              {selectedTax.name}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
              Autor: {selectedTax.author}
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
            {selectedTax.description}
          </p>
        </div>

        <span className="text-xs font-mono font-bold text-[#1E5E3A] bg-[#1E5E3A]/10 px-2.5 py-1 rounded-lg border border-[#1E5E3A]/20 shrink-0">
          Taxonomia Ativa: {selectedTaxId.toUpperCase()}
        </span>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar predicado por nome, verbo ou fórmula (ex: subtopic, otimiza, resolve)..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs text-[#08121E] placeholder:text-slate-400 focus:outline-none focus:border-[#E5A93C] focus:ring-1 focus:ring-[#E5A93C]/40 transition-all shadow-2xs"
            />
          </div>

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold cursor-pointer transition-colors"
            >
              Limpar Busca
            </button>
          )}
        </div>

        {/* Category Pills (available for semantic_seo) */}
        {selectedTaxId === 'semantic_seo' && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-1">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1 shrink-0">
              <Filter className="w-3 h-3" />
              Filtrar por Intenção:
            </span>
            {CATEGORIES.map(cat => {
              const isCatActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    isCatActive
                      ? 'bg-[#08121E] text-white shadow-2xs font-bold'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Predicate Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRelations.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
            <p className="text-xs text-slate-500">
              Nenhum predicado encontrado com o termo &ldquo;{searchQuery}&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('Todas');
              }}
              className="text-xs text-[#1E5E3A] font-bold hover:underline cursor-pointer"
            >
              Restaurar todos os predicados
            </button>
          </div>
        ) : (
          filteredRelations.map((rel, idx) => {
            const formulaInfo = PREDICATE_FORMULAS[rel.relation];
            const copyKey = `pred_${idx}`;
            const isCopied = copiedKey === copyKey;
            const textToCopy = rel.example || formulaInfo?.formula || rel.relation;

            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-[#E5E7EB] hover:border-[#E5A93C]/40 p-4.5 shadow-2xs space-y-3 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  {/* Card Header: Slug + Expected Node Types */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#1E5E3A] bg-[#1E5E3A]/10 px-2 py-0.5 rounded-md border border-[#1E5E3A]/20">
                        {rel.relation}
                      </span>
                      {formulaInfo?.category && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {formulaInfo.category}
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400 font-medium">
                      [{rel.headType.join('/')}] → [{rel.tailType.join('/')}]
                    </span>
                  </div>

                  {/* Meaning & Description */}
                  <p className="text-xs text-slate-700 leading-relaxed font-sans">
                    {rel.description}
                  </p>

                  {/* Writing Formula */}
                  {formulaInfo && (
                    <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/60 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#E5A93C]" />
                        Fórmula de Redação Semântica:
                      </span>
                      <p className="font-mono text-xs text-slate-900 leading-relaxed">
                        {formulaInfo.formula}
                      </p>
                      <span className="text-[10px] text-slate-500 block">
                        {formulaInfo.editorialTip}
                      </span>
                    </div>
                  )}

                  {/* Real Article Example */}
                  {rel.example && (
                    <div className="p-2.5 rounded-xl bg-[#FAF9F6] border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Exemplo Prático para o Seu Artigo:
                      </span>
                      <p className="text-xs italic text-slate-800 leading-relaxed">
                        &ldquo;{rel.example}&rdquo;
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => handleCopy(textToCopy, copyKey)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FAF9F6] hover:bg-slate-100 text-[#08121E] text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                    title="Copiar exemplo para colar ou adaptar no texto"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#1E5E3A]" />
                        <span className="text-[#1E5E3A] font-bold">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copiar Exemplo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
