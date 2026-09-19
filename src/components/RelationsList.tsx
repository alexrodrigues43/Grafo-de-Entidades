import React, { useState, useMemo } from 'react';
import { RelationTriplet, Entity, EntityType, RelationQualifier } from '../types';
import { getEntityColor } from '../utils/colors';
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
}

export const RelationsList: React.FC<RelationsListProps> = ({
  relations,
  entities,
  onDeleteRelation,
  onAddRelation,
  onSelectEntity
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRelationType, setSelectedRelationType] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
      taxonomy: 'custom',
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
    if (k.includes('time') || k.includes('year') || k.includes('date')) return <Clock className="w-2.5 h-2.5 text-amber-600" />;
    if (k.includes('loc') || k.includes('place') || k.includes('city') || k.includes('country')) return <MapPin className="w-2.5 h-2.5 text-emerald-600" />;
    if (k.includes('role') || k.includes('job') || k.includes('position') || k.includes('title')) return <Briefcase className="w-2.5 h-2.5 text-purple-600" />;
    return <Tag className="w-2.5 h-2.5 text-blue-600" />;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-800">
            Extracted Triplets & Relations ({relations.length})
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter relations/qualifiers..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
            />
          </div>

          {/* Relation Type Dropdown */}
          <select
            value={selectedRelationType}
            onChange={e => setSelectedRelationType(e.target.value)}
            className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none"
          >
            <option value="ALL">All Relations ({relations.length})</option>
            {relationTypes.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          {/* Add Manual Relation Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Triplet</span>
          </button>
        </div>
      </div>

      {/* Relations Cards Grid */}
      {filteredRelations.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-sm">
          {relations.length === 0
            ? 'No relations extracted yet. Run the extraction engine above.'
            : 'No relations match your current search/filter.'}
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
                    onClick={() => {
                      const ent = entities.find(e => e.id === rel.headId);
                      if (ent && onSelectEntity) onSelectEntity(ent);
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-semibold transition-all hover:scale-105 ${headColor.badge}`}
                    title={`Type: ${rel.headType}`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: headColor.hex }}
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
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                    </div>
                  </div>

                  {/* Tail Entity */}
                  <button
                    onClick={() => {
                      const ent = entities.find(e => e.id === rel.tailId);
                      if (ent && onSelectEntity) onSelectEntity(ent);
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-semibold transition-all hover:scale-105 ${tailColor.badge}`}
                    title={`Type: ${rel.tailType}`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: tailColor.hex }}
                    />
                    <span className="truncate max-w-[120px]">{rel.tailText}</span>
                  </button>
                </div>

                {/* Edge Qualifiers Badges (Wikontic Support) */}
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
                      <ShieldCheck className="w-3 h-3" />
                      {confPct}% confidence
                    </span>
                    <span className="font-mono text-slate-400">[{rel.taxonomy || 'wiki80'}]</span>
                  </div>

                  <button
                    onClick={() => onDeleteRelation(rel.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-1 rounded"
                    title="Delete false positive triplet"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Manual Relation Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-600" />
                Add Knowledge Graph Triplet
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRelation} className="space-y-3 text-xs">
              {/* Head Entity Input */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Head Entity (Subject)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. OpenAI, Alan Turing"
                    value={newHeadText}
                    onChange={e => setNewHeadText(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Type</label>
                  <select
                    value={newHeadType}
                    onChange={e => setNewHeadType(e.target.value as EntityType)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-800 bg-white"
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
                <label className="font-semibold text-slate-700 block mb-1">
                  Relation Predicate (snake_case)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. founded_by, developer_of, headquarters_location"
                  value={newRelationSlug}
                  onChange={e => setNewRelationSlug(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 font-mono"
                />
              </div>

              {/* Tail Entity Input */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Tail Entity (Object)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sam Altman, London"
                    value={newTailText}
                    onChange={e => setNewTailText(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Type</label>
                  <select
                    value={newTailType}
                    onChange={e => setNewTailType(e.target.value as EntityType)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-800 bg-white"
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
                  <label className="font-semibold text-slate-700 block mb-1">
                    Edge Qualifier Key (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. time, role, condition"
                    value={newQualifierKey}
                    onChange={e => setNewQualifierKey(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-800 bg-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Qualifier Value
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2026, CEO, in Brazil"
                    value={newQualifierValue}
                    onChange={e => setNewQualifierValue(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-800 bg-white"
                  />
                </div>
              </div>

              {/* Evidence / Sentence */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Contextual Evidence (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Sentence or source passage justifying this relationship..."
                  value={newEvidence}
                  onChange={e => setNewEvidence(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Add to Graph
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
