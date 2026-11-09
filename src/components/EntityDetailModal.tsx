import React, { useEffect } from 'react';
import { Entity, RelationTriplet, SupportedLang } from '../types';
import { getEntityColor } from '../utils/colors';
import { getTranslations } from '../lib/i18n';
import { ArrowRight, ArrowLeft, ExternalLink, ShieldCheck, Copy, Check, Tag, Globe, Sparkles } from 'lucide-react';

interface EntityDetailModalProps {
  entity: Entity | null;
  onClose: () => void;
  allRelations: RelationTriplet[];
  onSelectConnectedEntity: (entityId: string) => void;
  uiLang?: SupportedLang;
}

export const EntityDetailModal: React.FC<EntityDetailModalProps> = ({
  entity,
  onClose,
  allRelations,
  onSelectConnectedEntity,
  uiLang = 'pt'
}) => {
  const t = getTranslations(uiLang);
  const [hasCopied, setHasCopied] = React.useState(false);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && entity) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [entity, onClose]);

  if (!entity) return null;

  const color = getEntityColor(entity.type);

  // Incoming and Outgoing relations
  const outgoing = allRelations.filter(r => r.headId === entity.id);
  const incoming = allRelations.filter(r => r.tailId === entity.id);

  const handleCopyCypher = () => {
    const cypher = `MATCH (n { id: '${entity.id}' })-[r]-(m) RETURN n, r, m;`;
    navigator.clipboard.writeText(cypher);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="entity-detail-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0"
              style={{ backgroundColor: color.hex }}
              aria-hidden="true"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 id="entity-detail-modal-title" className="text-base font-bold text-slate-900">{entity.text}</h3>
                {entity.wikidataId && (
                  <a
                    href={`https://www.wikidata.org/wiki/${entity.wikidataId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-700 font-mono font-medium hover:bg-emerald-100 transition-colors min-h-[36px]"
                    title={t.detailModal.viewWikidata}
                  >
                    <Globe className="w-3 h-3" aria-hidden="true" />
                    <span>{entity.wikidataId}</span>
                    <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-60" aria-hidden="true" />
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${color.badge}`}>
                  {entity.type}
                </span>
                <span className="text-[11px] font-mono text-slate-400">ID: {entity.id}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label={t.detailModal.close}
          >
            ✕
          </button>
        </div>

        {/* Confidence & Degree */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block">{t.detailModal.confidence}</span>
            <span className="font-bold text-emerald-600 mt-0.5 block">
              {((entity.confidence || 0.95) * 100).toFixed(0)}%
            </span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block">{t.detailModal.degree}</span>
            <span className="font-bold text-blue-600 mt-0.5 block">
              {outgoing.length + incoming.length} {t.detailModal.relationsUnit}
            </span>
          </div>
        </div>

        {/* Wikontic-style Deduplicated Aliases */}
        {entity.aliases && entity.aliases.length > 0 && (
          <div className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-200 text-xs">
            <span className="text-slate-600 font-semibold block mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-slate-500" aria-hidden="true" />
              {t.detailModal.aliasesTitle}
            </span>
            <div className="flex flex-wrap gap-1">
              {entity.aliases.map((alias, aIdx) => (
                <span
                  key={aIdx}
                  className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 text-[11px] font-medium"
                >
                  {alias}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Outgoing Relations */}
        <div className="space-y-1.5 text-xs">
          <span className="font-bold text-slate-700 block">
            {t.detailModal.outgoingTitle} ({outgoing.length})
          </span>
          {outgoing.length === 0 ? (
            <p className="text-slate-400 text-xs italic">{t.detailModal.noOutgoing}</p>
          ) : (
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
              {outgoing.map(r => (
                <div
                  key={r.id}
                  className="flex flex-col p-2 bg-slate-50 rounded border border-slate-200 gap-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
                        {r.relation}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400" aria-hidden="true" />
                      <button
                        type="button"
                        onClick={() => onSelectConnectedEntity(r.tailId)}
                        className="font-semibold text-blue-600 hover:underline cursor-pointer min-h-[36px] flex items-center"
                      >
                        {r.tailText}
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {((r.confidence || 0.95) * 100).toFixed(0)}%
                    </span>
                  </div>
                  {r.qualifiers && r.qualifiers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {r.qualifiers.map((q, qIdx) => (
                        <span
                          key={qIdx}
                          className="px-1.5 py-0.2 rounded bg-indigo-50 border border-indigo-200 text-[9px] text-indigo-800 font-mono"
                        >
                          {q.key}: {q.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incoming Relations */}
        <div className="space-y-1.5 text-xs">
          <span className="font-bold text-slate-700 block">
            {t.detailModal.incomingTitle} ({incoming.length})
          </span>
          {incoming.length === 0 ? (
            <p className="text-slate-400 text-xs italic">{t.detailModal.noIncoming}</p>
          ) : (
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
              {incoming.map(r => (
                <div
                  key={r.id}
                  className="flex flex-col p-2 bg-slate-50 rounded border border-slate-200 gap-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectConnectedEntity(r.headId)}
                        className="font-semibold text-blue-600 hover:underline cursor-pointer min-h-[36px] flex items-center"
                      >
                        {r.headText}
                      </button>
                      <ArrowLeft className="w-3 h-3 text-slate-400" aria-hidden="true" />
                      <span className="font-mono font-semibold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
                        {r.relation}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {((r.confidence || 0.95) * 100).toFixed(0)}%
                    </span>
                  </div>
                  {r.qualifiers && r.qualifiers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {r.qualifiers.map((q, qIdx) => (
                        <span
                          key={qIdx}
                          className="px-1.5 py-0.2 rounded bg-indigo-50 border border-indigo-200 text-[9px] text-indigo-800 font-mono"
                        >
                          {q.key}: {q.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Cypher Query Copy */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleCopyCypher}
            className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 font-medium cursor-pointer min-h-[44px]"
          >
            {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
            <span>{hasCopied ? t.detailModal.copiedCypher : t.detailModal.copyCypher}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium cursor-pointer min-h-[44px]"
          >
            {t.detailModal.close}
          </button>
        </div>
      </div>
    </div>
  );
};
