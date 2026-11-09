import React, { useState, useCallback, useEffect } from 'react';
import { Entity, RelationTriplet, TaxonomyType, TextOptimizationAnalysis, AuthSession, SupportedLang } from './types';
import { Navbar } from './components/Navbar';
import { TextInputSection } from './components/TextInputSection';
import { GraphCanvas } from './components/GraphCanvas';
import { RelationsList } from './components/RelationsList';
import { TaxonomyBrowser } from './components/TaxonomyBrowser';
import { GraphMetrics } from './components/GraphMetrics';
import { EntityDetailModal } from './components/EntityDetailModal';
import { TextOptimizationReport } from './components/TextOptimizationReport';
import { useAuth } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { PaywallModal } from './components/PaywallModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { incrementUserUsage, updateUserUiLang } from './lib/firebase';
import { getInitialUiLang, saveStoredUiLang, getTranslations } from './lib/i18n';
import {
  Network,
  ListFilter,
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

  // i18n UI Language & Content Language Dual Control
  const [uiLang, setUiLang] = useState<SupportedLang>(() => getInitialUiLang());
  const [contentLang, setContentLang] = useState<SupportedLang>(() => getInitialUiLang());
  const t = getTranslations(uiLang);

  // Sync uiLang with user profile in centralDb
  useEffect(() => {
    if (profile?.uiLang && ['pt', 'en', 'es'].includes(profile.uiLang)) {
      setUiLang(profile.uiLang);
      saveStoredUiLang(profile.uiLang);
    }
  }, [profile?.uiLang]);

  const handleLanguageChange = useCallback((newLang: SupportedLang) => {
    setUiLang(newLang);
    saveStoredUiLang(newLang);
    if (user?.uid) {
      updateUserUiLang(user.uid, newLang);
    }
  }, [user?.uid]);

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
  const [taxonomy, setTaxonomy] = useState<TaxonomyType>('semantic_seo');
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
    'graph' | 'triplets' | 'analytics' | 'taxonomy' | 'optimizer'
  >('graph');

  // Selected Entity for Detail Modal
  const [inspectedEntity, setInspectedEntity] = useState<Entity | null>(null);

  // Core API Extraction Function
  const handleExtractRelationsWithText = useCallback(
    async (textToExtract: string, overrideToken?: string) => {
      if (!textToExtract.trim()) return;

      if (!domainContext.trim()) {
        setErrorMessage(t.toasts.contextRequired);
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
            confidenceThreshold,
            language: contentLang
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
        setErrorMessage(err?.message || t.toasts.extractError);
      } finally {
        setIsLoading(false);
      }
    },
    [domainContext, taxonomy, customRelations, confidenceThreshold, session?.token, user, openPaywall, contentLang]
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
          setErrorMessage(t.toasts.contextRequired);
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
            taxonomy,
            language: contentLang
          })
        });

        if (response.status === 401) {
          openPaywall('A otimização de conectividade é restrita a assinantes.');
          return;
        }

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error || t.toasts.optimizeError);
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
        setErrorMessage(err?.message || t.toasts.optimizeError);
      } finally {
        setIsOptimizing(false);
      }
    }, 'o Otimizador Editorial Semântico');
  }, [text, domainContext, entities, relations, taxonomy, session?.token, user, guardAction, openPaywall, contentLang]);

  // Apply Optimized Text in 1 Click
  const handleApplyOptimizedText = useCallback(
    async (optimizedText: string) => {
      setText(optimizedText);
      setActiveMainTab('graph');
      setSuccessToast(t.toasts.appliedSuccess);

      await handleExtractRelationsWithText(optimizedText);

      setTimeout(() => {
        setSuccessToast(null);
      }, 6000);
    },
    [handleExtractRelationsWithText, t.toasts.appliedSuccess]
  );

  // Replace Granular Snippet in Editor
  const handleReplaceSnippet = useCallback(
    (originalSnippet: string, newSnippet: string): boolean => {
      if (!originalSnippet || !newSnippet) return false;
      const cleanOrig = originalSnippet.trim();
      const cleanNew = newSnippet.trim();

      // Direct match
      if (text.includes(cleanOrig)) {
        const updated = text.replace(cleanOrig, cleanNew);
        setText(updated);
        setSuccessToast(t.toasts.snippetReplaced);
        setTimeout(() => setSuccessToast(null), 3500);
        return true;
      }

      // Case-insensitive match fallback
      const lowerText = text.toLowerCase();
      const lowerOrig = cleanOrig.toLowerCase();
      const idx = lowerText.indexOf(lowerOrig);
      if (idx !== -1) {
        const matchedOrig = text.slice(idx, idx + cleanOrig.length);
        const updated = text.replace(matchedOrig, cleanNew);
        setText(updated);
        setSuccessToast(t.toasts.snippetReplaced);
        setTimeout(() => setSuccessToast(null), 3500);
        return true;
      }

      // Match without punctuation at ends
      const trimmedOrig = cleanOrig.replace(/^[.,;:!?"']+|[.,;:!?"']+$/g, '').trim();
      if (trimmedOrig.length > 5 && text.includes(trimmedOrig)) {
        const updated = text.replace(trimmedOrig, cleanNew);
        setText(updated);
        setSuccessToast(t.toasts.snippetReplaced);
        setTimeout(() => setSuccessToast(null), 3500);
        return true;
      }

      setErrorMessage(t.toasts.snippetNotFound);
      setTimeout(() => setErrorMessage(null), 5000);
      return false;
    },
    [text, t.toasts.snippetReplaced, t.toasts.snippetNotFound]
  );

  // Insert Suggested Snippet at End of Text (for Topical Gaps)
  const handleInsertSnippetAtEnd = useCallback(
    (snippetToInsert: string): boolean => {
      if (!snippetToInsert) return false;
      const cleanSnippet = snippetToInsert.trim();
      const updated = text.trim() ? `${text.trim()}\n\n${cleanSnippet}` : cleanSnippet;
      setText(updated);
      setSuccessToast(t.toasts.gapInserted);
      setTimeout(() => setSuccessToast(null), 3500);
      return true;
    },
    [text, t.toasts.gapInserted]
  );

  // When session is authenticated
  const handleAuthenticated = (newSession: AuthSession) => {
    setSession(newSession);
    setAuthError(null);
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
      {/* Skip Link for Keyboard Accessibility (WCAG 2.2 AA) */}
      <a
        href="#main-content"
        className="skip-link sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#08121E] focus:text-white focus:rounded-lg focus:shadow-xl focus:font-bold"
      >
        {uiLang === 'en' ? 'Skip to main content' : uiLang === 'es' ? 'Saltar al contenido principal' : 'Pular para o conteúdo principal'}
      </a>

      {/* Top Navigation */}
      <Navbar
        totalEntities={entities.length}
        totalRelations={relations.length}
        session={session}
        onLogout={handleLogout}
        uiLang={uiLang}
        onLanguageChange={handleLanguageChange}
      />

      {/* Main Container */}
      <main id="main-content" role="main" tabIndex={-1} className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 focus:outline-none">
        {/* Editorial Section Hero Header (matching Semântico Design System) */}
        <section id="section-problema" className="text-center max-w-3xl mx-auto space-y-3 pt-2 pb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1E5E3A]/10 border border-[#1E5E3A]/20 text-[#1E5E3A] text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1E5E3A]" aria-hidden="true" />
            {t.hero.badge}
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#08121E] leading-tight">
            {t.hero.title}
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {t.hero.subtitle}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5A93C]" aria-hidden="true" />
              {t.hero.pillSeo}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1E5E3A]" aria-hidden="true" />
              {t.hero.pillD3}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#08121E]" aria-hidden="true" />
              {t.hero.pillAi}
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
            contentLang={contentLang}
            onChangeContentLang={setContentLang}
            uiLang={uiLang}
          />
        </section>

        {/* Status Bar / Model Telemetry & AI Optimization Trigger */}
        {executionStats && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 shadow-2xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 font-bold text-[#08121E]">
                <Sparkles className="w-3.5 h-3.5 text-[#E5A93C]" aria-hidden="true" />
                {t.telemetry.pipeline} {executionStats.model}
              </span>
              <span>•</span>
              <span>{t.telemetry.latency} {executionStats.timeMs}ms</span>
              <span>•</span>
              <span>{t.telemetry.taxonomy} {taxonomy.toUpperCase()}</span>
              <span>•</span>
              <div className="flex items-center gap-2 font-mono text-[#1E5E3A] font-semibold">
                <span>{entities.length} {t.nav.nodesLabel}</span>
                <span>|</span>
                <span>{relations.length} {t.nav.relationsLabel}</span>
              </div>
            </div>

            {/* Quick AI Connectivity Optimizer Trigger */}
            <button
              id="btn-quick-optimize-text"
              type="button"
              onClick={handleRunTextOptimization}
              disabled={isOptimizing || !text.trim()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#08121E] hover:bg-[#1A2533] text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer min-h-[44px]"
              title={t.optimizer.btnRunAnalysis}
            >
              {isOptimizing ? (
                <>
                  <div className="w-3 h-3 border-2 border-[#E5A93C] border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  <span>{t.optimizer.btnAnalyzing}</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5 text-[#E5A93C]" aria-hidden="true" />
                  <span>{t.optimizer.btnRunAnalysis}</span>
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
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer min-h-[44px] ${
                activeMainTab === 'graph'
                  ? 'border-[#08121E] text-[#08121E] bg-white rounded-t-xl shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-[#08121E] hover:bg-slate-50'
              }`}
            >
              <Network className={`w-4 h-4 ${activeMainTab === 'graph' ? 'text-[#1E5E3A]' : ''}`} aria-hidden="true" />
              <span>{t.tabs.graph}</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#1E5E3A]/10 text-[#1E5E3A] text-[10px] font-bold">
                {entities.length}
              </span>
            </button>

            {/* AI Text & Connectivity Optimizer Tab */}
            <button
              id="tab-btn-optimizer"
              onClick={() => setActiveMainTab('optimizer')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer min-h-[44px] ${
                activeMainTab === 'optimizer'
                  ? 'border-[#E5A93C] text-[#08121E] bg-white rounded-t-xl shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-[#08121E] hover:bg-amber-50/40'
              }`}
            >
              <Wand2 className="w-4 h-4 text-[#E5A93C]" aria-hidden="true" />
              <span>{t.tabs.optimizer}</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#E5A93C]/20 text-[#92400E] text-[10px] font-extrabold">
                {optimizationReport ? `${optimizationReport.connectivityScore}%` : 'AI'}
              </span>
            </button>

            <button
              onClick={() => setActiveMainTab('triplets')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer min-h-[44px] ${
                activeMainTab === 'triplets'
                  ? 'border-[#08121E] text-[#08121E] bg-white rounded-t-xl shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ListFilter className="w-4 h-4 text-slate-700" aria-hidden="true" />
              <span>{t.tabs.triplets}</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                {relations.length}
              </span>
            </button>

            <button
              onClick={() => setActiveMainTab('analytics')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer min-h-[44px] ${
                activeMainTab === 'analytics'
                  ? 'border-[#1E5E3A] text-[#1E5E3A] bg-white rounded-t-xl shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-[#1E5E3A]" aria-hidden="true" />
              <span>{t.tabs.analytics}</span>
            </button>

            <button
              onClick={() => setActiveMainTab('taxonomy')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer min-h-[44px] ${
                activeMainTab === 'taxonomy'
                  ? 'border-[#E5A93C] text-[#92400E] bg-white rounded-t-xl shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-amber-50/40'
              }`}
            >
              <BookOpen className="w-4 h-4 text-[#E5A93C]" aria-hidden="true" />
              <span>{t.tabs.taxonomy}</span>
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
                uiLang={uiLang}
              />
            </div>
          )}

          {activeMainTab === 'optimizer' && (
            <TextOptimizationReport
              currentText={text}
              domainContext={domainContext}
              entities={entities}
              relations={relations}
              analysis={optimizationReport}
              isLoading={isOptimizing}
              onRunAnalysis={handleRunTextOptimization}
              onApplyOptimizedText={handleApplyOptimizedText}
              onReplaceSnippet={handleReplaceSnippet}
              onInsertSnippet={handleInsertSnippetAtEnd}
              uiLang={uiLang}
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
              uiLang={uiLang}
            />
          )}

          {activeMainTab === 'analytics' && (
            <GraphMetrics
              text={text}
              domainContext={domainContext}
              entities={entities}
              relations={relations}
              onSelectEntity={ent => {
                setInspectedEntity(ent);
                setActiveMainTab('graph');
              }}
              uiLang={uiLang}
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
              {t.howItWorks.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
              {t.howItWorks.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-3 card-editorial-topbar">
              <div className="w-8 h-8 rounded-xl bg-[#1E5E3A]/10 text-[#1E5E3A] font-serif font-bold flex items-center justify-center text-sm">
                {t.howItWorks.step1Number}
              </div>
              <h4 className="font-serif font-bold text-base text-[#08121E]">
                {t.howItWorks.step1Title}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t.howItWorks.step1Desc}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-3 card-editorial-topbar">
              <div className="w-8 h-8 rounded-xl bg-[#E5A93C]/15 text-[#92400E] font-serif font-bold flex items-center justify-center text-sm">
                {t.howItWorks.step2Number}
              </div>
              <h4 className="font-serif font-bold text-base text-[#08121E]">
                {t.howItWorks.step2Title}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t.howItWorks.step2Desc}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-3 card-editorial-topbar">
              <div className="w-8 h-8 rounded-xl bg-[#08121E]/10 text-[#08121E] font-serif font-bold flex items-center justify-center text-sm">
                {t.howItWorks.step3Number}
              </div>
              <h4 className="font-serif font-bold text-base text-[#08121E]">
                {t.howItWorks.step3Title}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t.howItWorks.step3Desc}
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
            <span>{t.footer.tagline}</span>
          </div>

          <div className="flex items-center gap-6 text-slate-600">
            <a
              href={t.navLinks.consulting}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#08121E] transition-colors"
            >
              {t.footer.consulting}
            </a>
            <a
              href={t.navLinks.blog}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#08121E] transition-colors"
            >
              {t.nav.blog}
            </a>
            <a
              href={t.navLinks.contact}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#08121E] transition-colors font-medium text-[#1E5E3A]"
            >
              {t.footer.contactExpert}
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
        uiLang={uiLang}
      />

      {/* Access Control & Subscription Modals */}
      <AuthModal />
      <PaywallModal />
      <AdminPanelModal />
    </div>
  );
}
