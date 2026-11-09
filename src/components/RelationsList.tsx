import React, { useState, useMemo, useEffect } from 'react';
import { RelationTriplet, Entity, EntityType, RelationQualifier, SupportedLang } from '../types';
import { getEntityColor } from '../utils/colors';
import { getTranslations } from '../lib/i18n';
import {
  ArrowRight,
  Trash2,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  Quote,
  Layers,
  Sparkles,
  Tag,
  Clock,
  MapPin,
  Briefcase
} from 'lucide-react';

interface RelationsListProps {
  relations: RelationTriplet[];
  entities: Entity[];
  onDeleteRelation: (id: string) => void;
  onAddRelation: (newRel: RelationTriplet) => void;
  onSelectEntity?: (entity: Entity) => void;
  uiLang?: SupportedLang;
}

export const RelationsList: React.FC<RelationsListProps> = ({
  relations,
  entities,
  onDeleteRelation,
  onAddRelation,
  onSelectEntity,
  uiLang = 'pt'
}) => {
  const t = getTranslations(uiLang);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRelationType, setSelectedRelationType] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAddModalOpen) {
        setIsAddModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen]);

  // New Relation Form State
  const [newHeadText, setNewHeadText] = useState('');
  const [newHeadType, setNewHeadType] = useState<EntityType>('Organization');
  const [newRelationSlug, setNewRelationSlug] = useState('founded_by');
  const [newTailText, setNewTailText] = useState('');
  const [newTailType, setNewTailType] = useState<EntityType>('Person');
  const [newEvidence, setNewEvidence] = useState('');
  const [newQualifierKey, setNewQualifierKey] = useState('');
  const [newQualifierValue, setNewQualifierValue] = useState('');

  // Available unique relation types
  const relationTypes = useMemo(() => {
    return Array.from(new Set(relations.map(r => r.relation)));
  }, [relations]);

  // Filtered relations
  const filteredRelations = useMemo(() => {
    return relations.filter(r => {
      const matchSearch =
        !searchQuery.trim() ||
        r.headText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.tailText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.relation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.evidence && r.evidence.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.qualifiers && r.qualifiers.some(q => q.key.toLowerCase().includes(searchQuery.toLowerCase()) || q.value.toLowerCase().includes(searchQuery.toLowerCase())));

      const matchType = selectedRelationType === 'ALL' || r.relation === selectedRelationType;

      return matchSearch && matchType;
    });
  }, [relations, searchQuery, selectedRelationType]);

  const handleCreateRelation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHeadText.trim() || !newTailText.trim() || !newRelationSlug.trim()) return;

    const headId = newHeadText.trim().toLowerCase().replace(/[^\w]/g, '_');
    const tailId = newTailText.trim().toLowerCase().replace(/[^\w]/g, '_');

    const qualifiers: RelationQualifier[] = [];
    if (newQualifierKey.trim() && newQualifierValue.trim()) {
      qualifiers.push({
        key: newQualifierKey.trim().toLowerCase(),
        value: newQualifierValue.trim()
      });
    }

    const created: RelationTriplet = {
      id: `manual_rel_${Date.now()}`,
      headId,
      headText: newHeadText.trim(),
      headType: newHeadType,
      tailId,
      tailText: newTailText.trim(),
      tailType: newTailType,
      relation: newRelationSlug.trim().toLowerCase().replace(/[\s-]+/g, '_'),
      relationLabel: newRelationSlug
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
      taxonomy: 'semantic_seo',
      confidence: 1.0,
      evidence: newEvidence.trim() || 'Manually annotated relation by user.',
      direction: 'DIRECTED',
      qualifiers: qualifiers.length > 0 ? qualifiers : undefined
    };

    onAddRelation(created);

    // Reset Form
    setNewHeadText('');
    setNewTailText('');
    setNewEvidence('');
    setNewQualifierKey('');
    setNewQualifierValue('');
    setIsAddModalOpen(false);
  };

  const renderQualifierIcon = (key: string) => {
    const k = key.toLowerCase();
    if (k.includes('time') || k.includes('year') || k.includes('date')) return <Clock className="w-2.5 h-2.5 text-amber-600" aria-hidden="true" />;
    if (k.includes('loc') || k.includes('place') || k.includes('city') || k.includes('country')) return <MapPin className="w-2.5 h-2.5 text-emerald-600" aria-hidden="true" />;
    if (k.includes('role') || k.includes('job') || k.includes('position') || k.includes('title')) return <Briefcase className="w-2.5 h-2.5 text-purple-600" aria-hidden="true" />;
    return <Tag className="w-2.5 h-2.5 text-blue-600" aria-hidden="true" />;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-800">
            {t.triplets.title} ({relations.length})
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="text"
              placeholder={t.triplets.searchPlaceholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-base sm:text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48 min-h-[36px]"
            />
          </div>

          {/* Relation Type Dropdown */}
          <select
            value={selectedRelationType}
            onChange={e => setSelectedRelationType(e.target.value)}
            className="px-2.5 py-1.5 text-base sm:text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none min-h-[36px]"
          >
            <option value="ALL">{t.triplets.filterAll} ({relations.length})</option>
            {relationTypes.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          {/* Add Manual Relation Button */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t.triplets.btnAddRelation}</span>
          </button>
        </div>
      </div>

      {/* Relations Cards Grid */}
      {filteredRelations.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">
          {relations.length === 0
            ? t.triplets.empty
            : t.triplets.emptySearch}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
          {filteredRelations.map(rel => {
            const headColor = getEntityColor(rel.headType);
            const tailColor = getEntityColor(rel.tailType);
            const confPct = ((rel.confidence || 0.95) * 100).toFixed(0);

            return (
              <div
                key={rel.id}
                className="group relative flex flex-col justify-between p-3 bg-slate-50/70 hover:bg-white rounded-lg border border-slate-200/90 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                {/* Top Triplet Representation */}
                <div className="flex items-center justify-between gap-2">
                  {/* Head Entity */}
                  <button
                    type="button"
                    onClick={() => {
                      const ent = entities.find(e => e.id === rel.headId);
                      if (ent && onSelectEntity) onSelectEntity(ent);
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-semibold transition-all hover:scale-105 cursor-pointer min-h-[36px] ${headColor.badge}`}
                    title={`Type: ${rel.headType}`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: headColor.hex }}
                      aria-hidden="true"
                    />
                    <span className="truncate max-w-[120px]">{rel.headText}</span>
                  </button>

                  {/* Relation Center Indicator */}
                  <div className="flex flex-col items-center shrink-0 px-2">
                    <span className="text-[10px] font-mono font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
                      {rel.relation}
                    </span>
                    <div className="flex items-center gap-1 text-slate-400 mt-0.5">
                      <div className="w-8 h-[1.5px] bg-slate-300" />
                      <ArrowRight className="w-3 h-3 text-slate-500" aria-hidden="true" />
                    </div>
                  </div>

                  {/* Tail Entity */}
                  <button
                    type="button"
                    onClick={() => {
                      const ent = entities.find(e => e.id === rel.tailId);
                      if (ent && onSelectEntity) onSelectEntity(ent);
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-semibold transition-all hover:scale-105 cursor-pointer min-h-[36px] ${tailColor.badge}`}
                    title={`Type: ${rel.tailType}`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: tailColor.hex }}
                      aria-hidden="true"
                    />
                    <span className="truncate max-w-[120px]">{rel.tailText}</span>
                  </button>
                </div>

                {/* Edge Qualifiers Badges */}
                {rel.qualifiers && rel.qualifiers.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {rel.qualifiers.map((q, qIdx) => (
                      <span
                        key={qIdx}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50/80 border border-indigo-200/80 text-[10px] text-indigo-900 font-medium"
                        title={q.wikidataProperty ? `Wikidata Prop: ${q.wikidataProperty}` : undefined}
                      >
                        {renderQualifierIcon(q.key)}
                        <span className="font-semibold text-indigo-700">{q.key}:</span>
                        <span>{q.value}</span>
                        {q.wikidataProperty && (
                          <span className="text-[9px] text-indigo-400 font-mono">({q.wikidataProperty})</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {/* Evidence Snippet */}
                {rel.evidence && (
                  <div className="mt-2 text-[11px] text-slate-600 italic bg-white/80 p-1.5 rounded border border-slate-100 line-clamp-2">
                    &ldquo;{rel.evidence}&rdquo;
                  </div>
                )}

                {/* Bottom Metadata & Delete Action */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                      {confPct}% {t.graph.confidence}
                    </span>
                    <span className="font-mono text-slate-400">[{rel.taxonomy || 'wiki80'}]</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteRelation(rel.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-1.5 rounded cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title={t.triplets.thActions}
                    aria-label={t.triplets.thActions}
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Manual Relation Modal */}
      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-relation-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
          onClick={e => {
            if (e.target === e.currentTarget) setIsAddModalOpen(false);
          }}
        >
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 id="add-relation-modal-title" className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-600" aria-hidden="true" />
                {t.triplets.modalTitle}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer p-1 min-h-[36px] min-w-[36px] flex items-center justify-center"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRelation} className="space-y-3 text-xs">
              {/* Head Entity Input */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label htmlFor="input-head-entity" className="font-semibold text-slate-700 block mb-1">
                    {t.triplets.headLabel}
                  </label>
                  <input
                    id="input-head-entity"
                    type="text"
                    required
                    placeholder="e.g. OpenAI, Alan Turing"
                    value={newHeadText}
                    onChange={e => setNewHeadText(e.target.value)}
                    className="w-full px-2.5 py-2 text-base sm:text-xs border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="select-head-type" className="font-semibold text-slate-700 block mb-1">Type</label>
                  <select
                    id="select-head-type"
                    value={newHeadType}
                    onChange={e => setNewHeadType(e.target.value as EntityType)}
                    className="w-full px-2 py-2 text-base sm:text-xs border border-slate-200 rounded-lg text-slate-800 bg-white"
                  >
                    <option value="Organization">Organization</option>
                    <option value="Person">Person</option>
                    <option value="Location">Location</option>
                    <option value="Technology">Technology</option>
                    <option value="Product">Product</option>
                    <option value="Concept">Concept</option>
                  </select>
                </div>
              </div>

              {/* Relation Slug */}
              <div>
                <label htmlFor="input-relation-predicate" className="font-semibold text-slate-700 block mb-1">
                  {t.triplets.relationLabel}
                </label>
                <input
                  id="input-relation-predicate"
                  type="text"
                  required
                  placeholder="e.g. founded_by, developer_of, headquarters_location"
                  value={newRelationSlug}
                  onChange={e => setNewRelationSlug(e.target.value)}
                  className="w-full px-2.5 py-2 text-base sm:text-xs border border-slate-200 rounded-lg text-slate-800 font-mono"
                />
              </div>

              {/* Tail Entity Input */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label htmlFor="input-tail-entity" className="font-semibold text-slate-700 block mb-1">
                    {t.triplets.tailLabel}
                  </label>
                  <input
                    id="input-tail-entity"
                    type="text"
                    required
                    placeholder="e.g. Sam Altman, London"
                    value={newTailText}
                    onChange={e => setNewTailText(e.target.value)}
                    className="w-full px-2.5 py-2 text-base sm:text-xs border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label htmlFor="select-tail-type" className="font-semibold text-slate-700 block mb-1">Type</label>
                  <select
                    id="select-tail-type"
                    value={newTailType}
                    onChange={e => setNewTailType(e.target.value as EntityType)}
                    className="w-full px-2 py-2 text-base sm:text-xs border border-slate-200 rounded-lg text-slate-800 bg-white"
                  >
                    <option value="Person">Person</option>
                    <option value="Organization">Organization</option>
                    <option value="Location">Location</option>
                    <option value="Technology">Technology</option>
                    <option value="Product">Product</option>
                    <option value="Concept">Concept</option>
                  </select>
                </div>
              </div>

              {/* Edge Qualifier (Wikontic support) */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                <div>
                  <label htmlFor="input-qualifier-key" className="font-semibold text-slate-700 block mb-1">
                    {t.triplets.qualifiersLabel} Key
                  </label>
                  <input
                    id="input-qualifier-key"
                    type="text"
                    placeholder="e.g. time, role, condition"
                    value={newQualifierKey}
                    onChange={e => setNewQualifierKey(e.target.value)}
                    className="w-full px-2.5 py-2 text-base sm:text-xs border border-slate-200 rounded-lg text-slate-800 bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="input-qualifier-val" className="font-semibold text-slate-700 block mb-1">
                    {t.triplets.qualifiersLabel} Value
                  </label>
                  <input
                    id="input-qualifier-val"
                    type="text"
                    placeholder="e.g. 2026, CEO, in Brazil"
                    value={newQualifierValue}
                    onChange={e => setNewQualifierValue(e.target.value)}
                    className="w-full px-2.5 py-2 text-base sm:text-xs border border-slate-200 rounded-lg text-slate-800 bg-white"
                  />
                </div>
              </div>

              {/* Evidence / Sentence */}
              <div>
                <label htmlFor="textarea-evidence" className="font-semibold text-slate-700 block mb-1">
                  {t.triplets.evidenceLabel}
                </label>
                <textarea
                  id="textarea-evidence"
                  rows={2}
                  placeholder="Sentence or source passage justifying this relationship..."
                  value={newEvidence}
                  onChange={e => setNewEvidence(e.target.value)}
                  className="w-full px-2.5 py-2 text-base sm:text-xs border border-slate-200 rounded-lg text-slate-800 resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium cursor-pointer min-h-[44px]"
                >
                  {t.triplets.btnCancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs cursor-pointer min-h-[44px]"
                >
                  {t.triplets.btnSave}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
