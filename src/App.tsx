import React, { useState, useEffect, useCallback } from 'react';
import { Entity, RelationTriplet, TaxonomyType, TextOptimizationAnalysis, AuthSession } from './types';
import { Navbar } from './components/Navbar';
import { TextInputSection } from './components/TextInputSection';
import { GraphCanvas } from './components/GraphCanvas';
import { RelationsList } from './components/RelationsList';
import { ExportStudio } from './components/ExportStudio';
import { TaxonomyBrowser } from './components/TaxonomyBrowser';
import { GraphMetrics } from './components/GraphMetrics';
import { EntityDetailModal } from './components/EntityDetailModal';
import { TextOptimizationReport } from './components/TextOptimizationReport';
import { useAuth } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { PaywallModal } from './components/PaywallModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { incrementUserUsage } from './lib/firebase';
import {
  Network,
  ListFilter,
  Database,
  BarChart3,
  BookOpen,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Wand2,
  Zap
} from 'lucide-react';

export default function App() {
  // Authentication & Access Session State
  const {
    user,
    profile,
    isAdmin,
    isActiveSubscriber,
    isPending,
    isBlocked,
    guardAction,
    openPaywall
  } = useAuth();

  const [session, setSession] = useState<AuthSession | null>(() => {
    try {
      const stored = sessionStorage.getItem('opennre_auth_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.authenticated && parsed?.token) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read stored auth session', e);
    }
    return null;
  });

  const [authError, setAuthError] = useState<string | null>(null);

  // Main Extraction State (starts clean and empty)
  const [text, setText] = useState<string>('');
  const [domainContext, setDomainContext] = useState<string>('');
  const [taxonomy, setTaxonomy] = useState<TaxonomyType>('wiki80');
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.5);
  const [customRelations, setCustomRelations] = useState<string[]>([
    'treats_disease',
    'inhibits_enzyme',
    'manufactures_drug'
  ]);

  const [entities, setEntities] = useState<Entity[]>([]);
  const [relations, setRelations] = useState<RelationTriplet[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [executionStats, setExecutionStats] = useState<{
    timeMs: number;
    model: string;
  } | null>(null);

  // Text Connectivity & Optimization Analysis State
  const [optimizationReport, setOptimizationReport] = useState<TextOptimizationAnalysis | null>(null);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);

  // UI View Tab
  const [activeMainTab, setActiveMainTab] = useState<
    'graph' | 'triplets' | 'export' | 'analytics' | 'taxonomy' | 'optimizer'
  >('graph');

  // Selected Entity for Detail Modal
  const [inspectedEntity, setInspectedEntity] = useState<Entity | null>(null);

  // Core API Extraction Function
  const handleExtractRelationsWithText = useCallback(
    async (textToExtract: string, overrideToken?: string) => {
      if (!textToExtract.trim()) return;

      if (!domainContext.trim()) {
        setErrorMessage('Contexto Obrigatório: A análise está travada. O contexto temático é condição indispensável para gerar a análise e evitar entidades desconexas.');
        const el = document.getElementById('domain-context-input');
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      let currentToken = overrideToken || session?.token;
      if (user) {
        try {
          const fbToken = await user.getIdToken();
          if (fbToken) currentToken = fbToken;
        } catch (e) {
          console.warn('Could not retrieve Firebase ID token:', e);
        }
      }

      setIsLoading(true);
      setErrorMessage(null);
      setWarningMessage(null);

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        if (currentToken) {
          headers['Authorization'] = `Bearer ${currentToken}`;
        }
        if (user?.uid) {
          headers['x-user-uid'] = user.uid;
        }

        const response = await fetch('/api/extract', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            text: textToExtract,
            domainContext: domainContext.trim(),
            taxonomy,
            customRelations,
            confidenceThreshold
          })
        });

        if (response.status === 401) {
          openPaywall('Esta ação requer uma assinatura ativa do Semântico.');
          return;
        }

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error || `Erro no servidor (código ${response.status})`);
        }

        const data = await response.json();

        setEntities(data.entities || []);
        setRelations(data.relations || []);
        setExecutionStats({
          timeMs: data.executionTimeMs || 0,
          model: data.modelUsed || 'OpenNRE Engine'
        });

        // Increment user execution counter in Firestore
        if (user?.uid) {
          incrementUserUsage(user.uid).catch(err =>
            console.warn('Could not increment usage counter:', err)
          );
        }

        if (data.warning) {
          setWarningMessage(data.warning);
        }
      } catch (err: any) {
        console.error('Extraction failed:', err);
        setErrorMessage(err?.message || 'Falha ao extrair relações do servidor');
      } finally {
        setIsLoading(false);
      }
    },
    [domainContext, taxonomy, customRelations, confidenceThreshold, session?.token, user, openPaywall]
  );

  const handleExtractRelations = useCallback(() => {
    guardAction(() => {
      handleExtractRelationsWithText(text);
    }, 'a Extração Neural de Relações & Construção do Grafo');
  }, [guardAction, handleExtractRelationsWithText, text]);

  // Handle Text Optimization Analysis
  const handleRunTextOptimization = useCallback(async () => {
    if (!text.trim()) return;

    guardAction(async () => {
      setIsOptimizing(true);
      setErrorMessage(null);

      try {
        let currentToken = session?.token;
        if (user) {
          try {
            const fbToken = await user.getIdToken();
            if (fbToken) currentToken = fbToken;
          } catch (e) {
            console.warn('Could not retrieve Firebase token:', e);
          }
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        if (currentToken) {
          headers['Authorization'] = `Bearer ${currentToken}`;
        }
        if (user?.uid) {
          headers['x-user-uid'] = user.uid;
        }

        if (!domainContext.trim()) {
          setErrorMessage('Contexto Obrigatório: A análise está travada. O contexto temático é condição indispensável para gerar o diagnóstico e evitar entidades desconexas.');
          const el = document.getElementById('domain-context-input');
          if (el) {
            el.focus();
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }

        const response = await fetch('/api/analyze-text-connectivity', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            text,
            domainContext: domainContext.trim(),
            entities,
            relations,
            taxonomy
          })
        });

        if (response.status === 401) {
          openPaywall('A otimização de conectividade é restrita a assinantes.');
          return;
        }

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error || `Erro no servidor (código ${response.status})`);
        }

        const data = await response.json();
        setOptimizationReport(data);
        setActiveMainTab('optimizer');

        if (user?.uid) {
          incrementUserUsage(user.uid).catch(err =>
            console.warn('Could not increment usage counter:', err)
          );
        }
      } catch (err: any) {
        console.error('Optimization analysis failed:', err);
        setErrorMessage(err?.message || 'Erro ao analisar conectividade do texto.');
      } finally {
        setIsOptimizing(false);
      }
    }, 'o Otimizador Editorial Semântico');
  }, [text, domainContext, entities, relations, taxonomy, session?.token, user, guardAction, openPaywall]);

  // Apply Optimized Text in 1 Click
  const handleApplyOptimizedText = useCallback(
    async (optimizedText: string) => {
      setText(optimizedText);
      setActiveMainTab('graph');
      setSuccessToast('Texto otimizado aplicado com sucesso! Reextraindo relações e enriquecendo o grafo...');

      await handleExtractRelationsWithText(optimizedText);

      setTimeout(() => {
        setSuccessToast(null);
      }, 6000);
    },
    [handleExtractRelationsWithText]
  );

  // When session is authenticated
  const handleAuthenticated = (newSession: AuthSession) => {
    setSession(newSession);
    setAuthError(null);
    if (text.trim() && domainContext.trim()) {
      handleExtractRelationsWithText(text, newSession.token);
    }
  };

  // Logout / Lock
  const handleLogout = () => {
    setSession(null);
    try {
      sessionStorage.removeItem('opennre_auth_session');
      localStorage.removeItem('opennre_access_token');
    } catch (e) {
      console.warn(e);
    }
  };

  // Initial Extraction on Load ONLY if text is present, domainContext is filled, and user is authorized
  useEffect(() => {
    if (
      (session?.authenticated || isActiveSubscriber || isAdmin) &&
      text.trim().length > 0 &&
      domainContext.trim().length > 0
    ) {
      handleExtractRelations();
    }
  }, [session?.authenticated, isActiveSubscriber, isAdmin, domainContext]);

  // Delete Triplet
  const handleDeleteRelation = (id: string) => {
    setRelations(prev => prev.filter(r => r.id !== id));
  };

  // Add Manual Triplet
  const handleAddRelation = (newRel: RelationTriplet) => {
    setRelations(prev => [newRel, ...prev]);

    // Ensure entities exist in entities list
    setEntities(prev => {
      const existsHead = prev.some(e => e.id === newRel.headId);
      const existsTail = prev.some(e => e.id === newRel.tailId);
      const updated = [...prev];

      if (!existsHead) {
        updated.push({
          id: newRel.headId,
          text: newRel.headText,
          type: newRel.headType,
          confidence: 1.0
        });
      }
      if (!existsTail) {
        updated.push({
          id: newRel.tailId,
          text: newRel.tailText,
          type: newRel.tailType,
          confidence: 1.0
        });
      }
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#08121E] flex flex-col font-sans selection:bg-[#E5A93C]/30 selection:text-[#08121E]">
      {/* Top Navigation */}
      <Navbar
        totalEntities={entities.length}
        totalRelations={relations.length}
        session={session}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Editorial Section Hero Header (matching Semântico Design System) */}
        <section id="section-problema" className="text-center max-w-3xl mx-auto space-y-3 pt-2 pb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1E5E3A]/10 border border-[#1E5E3A]/20 text-[#1E5E3A] text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1E5E3A]" />
            Engenharia de Conhecimento & SEO Semântico
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#08121E] leading-tight">
            Grafo de Entidades & Relações Semânticas
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Mapeie a rede de entidades, conceitos e relações do seu conteúdo. Transforme textos soltos em grafos de conhecimento estruturados para potencializar a compreensão algorítmica e autoridade temática.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5A93C]" />
              Ontologia Wiki80 & TACRED
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1E5E3A]" />
              Visualização D3 com Força Direcionada
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#08121E]" />
              Exportação para Neo4j, RDF & JSON-LD
            </span>
          </div>
        </section>

        {/* Error / Warning Alert Banner */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800 shadow-2xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-700 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Success Toast Banner */}
        {successToast && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 shadow-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#1E5E3A] shrink-0" />
              <span className="font-semibold">{successToast}</span>
            </div>
            <button
              onClick={() => setSuccessToast(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Input & Extraction Control Card */}
        <section id="section-studio">
          <TextInputSection
            text={text}
            onChangeText={setText}
            domainContext={domainContext}
            onChangeDomainContext={setDomainContext}
            taxonomy={taxonomy}
            onChangeTaxonomy={setTaxonomy}
            confidenceThreshold={confidenceThreshold}
            onChangeConfidenceThreshold={setConfidenceThreshold}
            customRelations={customRelations}
            onChangeCustomRelations={setCustomRelations}
            onExtract={handleExtractRelations}
            isLoading={isLoading}
            entities={entities}
          />
        </section>

        {/* Status Bar / Model Telemetry & AI Optimization Trigger */}
        {executionStats && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 shadow-2xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 font-bold text-[#08121E]">
                <Sparkles className="w-3.5 h-3.5 text-[#E5A93C]" />
                Pipeline Semântico: {executionStats.model}
              </span>
              <span>•</span>
              <span>Latência: {executionStats.timeMs}ms</span>
              <span>•</span>
              <span>Taxonomia: {taxonomy.toUpperCase()}</span>
              <span>•</span>
              <div className="flex items-center gap-2 font-mono text-[#1E5E3A] font-semibold">
                <span>{entities.length} nós</span>
                <span>|</span>
                <span>{relations.length} relações</span>
              </div>
            </div>

            {/* Quick AI Connectivity Optimizer Trigger */}
            <button
              id="btn-quick-optimize-text"
              type="button"
              onClick={handleRunTextOptimization}
              disabled={isOptimizing || !text.trim()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#08121E] hover:bg-[#1A2533] text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              title="Gerar relatório de melhorias para conectar todas as entidades do texto"
            >
              {isOptimizing ? (
                <>
                  <div className="w-3 h-3 border-2 border-[#E5A93C] border-t-transparent rounded-full animate-spin" />
                  <span>Analisando Conectividade...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5 text-[#E5A93C]" />
                  <span>Otimizar Conexões (Semântico AI)</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Main Interactive Studio Tabs */}
        <section id="section-beneficios" className="space-y-4">
          {/* Main Navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto scrollbar-thin pb-0.5">
            <button
              onClick={() => setActiveMainTab('graph')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeMainTab === 'graph'
                  ? 'border-[#08121E] text-[#08121E] bg-white rounded-t-xl shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-[#08121E] hover:bg-slate-50'
              }`}
            >
              <Network className={`w-4 h-4 ${activeMainTab === 'graph' ? 'text-[#1E5E3A]' : ''}`} />
              <span>Grafo de Conhecimento Interativo</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#1E5E3A]/10 text-[#1E5E3A] text-[10px] font-bold">
                {entities.length}
              </span>
            </button>

            {/* AI Text & Connectivity Optimizer Tab */}
            <button
              id="tab-btn-optimizer"
              onClick={() => setActiveMainTab('optimizer')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeMainTab === 'optimizer'
                  ? 'border-[#E5A93C] text-[#08121E] bg-white rounded-t-xl shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-[#08121E] hover:bg-amber-50/40'
              }`}
            >
              <Wand2 className="w-4 h-4 text-[#E5A93C]" />
              <span>Diagnóstico & Otimizador Editorial</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#E5A93C]/20 text-[#92400E] text-[10px] font-extrabold">
                {optimizationReport ? `${optimizationReport.connectivityScore}% Score` : 'Semântico AI'}
              </span>
            </button>

            <button
              onClick={() => setActiveMainTab('triplets')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeMainTab === 'triplets'
                  ? 'border-[#08121E] text-[#08121E] bg-white rounded-t-xl shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ListFilter className="w-4 h-4 text-slate-700" />
              <span>Tabela de Relações & Tripletos</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                {relations.length}
              </span>
            </button>

            <button
              onClick={() => setActiveMainTab('export')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeMainTab === 'export'
                  ? 'border-[#2563EB] text-[#2563EB] bg-white rounded-t-xl shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-[#2563EB] hover:bg-blue-50/40'
              }`}
            >
              <Database className="w-4 h-4 text-[#2563EB]" />
              <span>Export Studio (Bancos de Grafos)</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-50 text-[#2563EB] text-[10px] font-bold">
                Neo4j • RDF • JSON-LD
              </span>
            </button>

            <button
              onClick={() => setActiveMainTab('analytics')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeMainTab === 'analytics'
                  ? 'border-[#1E5E3A] text-[#1E5E3A] bg-white rounded-t-xl shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-[#1E5E3A]" />
              <span>Métricas & Densidade de Rede</span>
            </button>

            <button
              onClick={() => setActiveMainTab('taxonomy')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeMainTab === 'taxonomy'
                  ? 'border-[#E5A93C] text-[#92400E] bg-white rounded-t-xl shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-amber-50/40'
              }`}
            >
              <BookOpen className="w-4 h-4 text-[#E5A93C]" />
              <span>Taxonomias (Wiki80 / TACRED)</span>
            </button>
          </div>

          {/* Tab Views */}
          {activeMainTab === 'graph' && (
            <div className="space-y-4">
              <GraphCanvas
                entities={entities}
                relations={relations}
                onSelectEntity={ent => setInspectedEntity(ent)}
                selectedEntityId={inspectedEntity?.id}
              />
            </div>
          )}

          {activeMainTab === 'optimizer' && (
            <TextOptimizationReport
              currentText={text}
              entities={entities}
              relations={relations}
              analysis={optimizationReport}
              isLoading={isOptimizing}
              onRunAnalysis={handleRunTextOptimization}
              onApplyOptimizedText={handleApplyOptimizedText}
            />
          )}

          {activeMainTab === 'triplets' && (
            <RelationsList
              relations={relations}
              entities={entities}
              onDeleteRelation={handleDeleteRelation}
              onAddRelation={handleAddRelation}
              onSelectEntity={ent => {
                setInspectedEntity(ent);
                setActiveMainTab('graph');
              }}
            />
          )}

          {activeMainTab === 'export' && (
            <ExportStudio entities={entities} relations={relations} />
          )}

          {activeMainTab === 'analytics' && (
            <GraphMetrics
              entities={entities}
              relations={relations}
              onSelectEntity={ent => {
                setInspectedEntity(ent);
                setActiveMainTab('graph');
              }}
            />
          )}

          {activeMainTab === 'taxonomy' && (
            <TaxonomyBrowser
              currentText={text}
              currentTaxonomy={taxonomy}
              onSelectTaxonomy={setTaxonomy}
            />
          )}
        </section>

        {/* Section Como Funciona (Editorial Explanatory Cards) */}
        <section id="section-como-funciona" className="pt-8 border-t border-[#E5E7EB] space-y-6">
          <div className="text-center space-y-2">
            <h3 className="font-serif text-2xl font-bold text-[#08121E]">
              Como o Graph Studio Opera a Extração
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
              Metodologia de três etapas baseada em ontologias científicas e modelos neurais de ponta.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-3 card-editorial-topbar">
              <div className="w-8 h-8 rounded-xl bg-[#1E5E3A]/10 text-[#1E5E3A] font-serif font-bold flex items-center justify-center text-sm">
                01
              </div>
              <h4 className="font-serif font-bold text-base text-[#08121E]">
                Reconhecimento de Entidades (NER)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Identifica e classifica nós fundamentais (pessoas, organizações, locais, tecnologias, conceitos e produtos) presentes no texto.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-3 card-editorial-topbar">
              <div className="w-8 h-8 rounded-xl bg-[#E5A93C]/15 text-[#92400E] font-serif font-bold flex items-center justify-center text-sm">
                02
              </div>
              <h4 className="font-serif font-bold text-base text-[#08121E]">
                Extração de Relações (OpenNRE)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Mapeia as arestas direcionadas com predição de confiança e extração de evidências citadas no próprio documento.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-3 card-editorial-topbar">
              <div className="w-8 h-8 rounded-xl bg-[#08121E]/10 text-[#08121E] font-serif font-bold flex items-center justify-center text-sm">
                03
              </div>
              <h4 className="font-serif font-bold text-base text-[#08121E]">
                Grafo Interativo & Exportação
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Renderiza em tempo real com D3.js e exporta os tripletos diretamente para Cypher (Neo4j), Turtle (RDF) ou JSON-LD.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Editorial Footer */}
      <footer className="mt-16 border-t border-[#E5E7EB] bg-white py-10 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-serif font-bold text-[#08121E] text-sm tracking-tight">
              Semântico
            </span>
            <span>•</span>
            <span>Graph Studio & Knowledge Engine</span>
          </div>

          <div className="flex items-center gap-6 text-slate-600">
            <a
              href="https://semantico.com.br/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#08121E] transition-colors"
            >
              Consultoria Semântico SEO
            </a>
            <a
              href="https://semantico.com.br/blog"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#08121E] transition-colors"
            >
              Blog
            </a>
            <a
              href="https://semantico.com.br/contato"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#08121E] transition-colors font-medium text-[#1E5E3A]"
            >
              Fale com um Especialista
            </a>
          </div>
        </div>
      </footer>

      {/* Entity Inspector Detail Modal */}
      <EntityDetailModal
        entity={inspectedEntity}
        onClose={() => setInspectedEntity(null)}
        allRelations={relations}
        onSelectConnectedEntity={id => {
          const found = entities.find(e => e.id === id);
          if (found) setInspectedEntity(found);
        }}
      />

      {/* Access Control & Subscription Modals */}
      <AuthModal />
      <PaywallModal />
      <AdminPanelModal />
    </div>
  );
}
