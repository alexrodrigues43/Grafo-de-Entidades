import React, { useMemo } from 'react';
import { Entity, RelationTriplet } from '../types';
import { getEntityColor } from '../utils/colors';
import {
  BarChart3,
  Network,
  GitFork,
  CheckCircle2,
  TrendingUp,
  Award
} from 'lucide-react';

interface GraphMetricsProps {
  entities: Entity[];
  relations: RelationTriplet[];
  onSelectEntity?: (entity: Entity) => void;
}

export const GraphMetrics: React.FC<GraphMetricsProps> = ({
  entities,
  relations,
  onSelectEntity
}) => {
  // Degree Centrality / Top Connected Entities
  const topCentralEntities = useMemo(() => {
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

    return Array.from(degMap.values())
      .map(item => ({
        ...item,
        totalDegree: item.inDegree + item.outDegree
      }))
      .sort((a, b) => b.totalDegree - a.totalDegree)
      .slice(0, 8);
  }, [entities, relations]);

  // Relation Type Distribution
  const relationDistribution = useMemo(() => {
    const countMap = new Map<string, number>();
    relations.forEach(r => {
      countMap.set(r.relation, (countMap.get(r.relation) || 0) + 1);
    });
    return Array.from(countMap.entries())
      .map(([relation, count]) => ({ relation, count }))
      .sort((a, b) => b.count - a.count);
  }, [relations]);

  // Graph Density & Stats
  const density =
    entities.length > 1 ? (2 * relations.length) / (entities.length * (entities.length - 1)) : 0;
  const avgConfidence =
    relations.length > 0
      ? (relations.reduce((acc, r) => acc + r.confidence, 0) / relations.length) * 100
      : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <BarChart3 className="w-4 h-4 text-blue-600" />
        <h2 className="text-sm font-semibold text-slate-800">
          Knowledge Graph Analytics & Centrality
        </h2>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <span className="text-slate-500 font-medium block">Total Entities</span>
          <span className="text-lg font-bold text-slate-800 mt-0.5 block">{entities.length}</span>
          <span className="text-[10px] text-slate-400">Nodes in graph</span>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <span className="text-slate-500 font-medium block">Total Relations</span>
          <span className="text-lg font-bold text-blue-600 mt-0.5 block">{relations.length}</span>
          <span className="text-[10px] text-slate-400">Directed edges</span>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <span className="text-slate-500 font-medium block">Avg Confidence</span>
          <span className="text-lg font-bold text-emerald-600 mt-0.5 block">
            {avgConfidence.toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-400">Neural extraction score</span>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <span className="text-slate-500 font-medium block">Graph Density</span>
          <span className="text-lg font-bold text-indigo-600 mt-0.5 block">
            {density.toFixed(3)}
          </span>
          <span className="text-[10px] text-slate-400">Connectivity ratio</span>
        </div>
      </div>

      {/* Two Column Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Top Central Hub Entities */}
        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>Top Hub Entities (Degree Centrality)</span>
            </h3>
            <span className="text-[10px] text-slate-400">In + Out edges</span>
          </div>

          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {topCentralEntities.length === 0 ? (
              <p className="text-slate-400 text-center py-4">No entities to rank.</p>
            ) : (
              topCentralEntities.map((item, idx) => {
                const color = getEntityColor(item.entity.type);
                return (
                  <div
                    key={item.entity.id}
                    onClick={() => onSelectEntity && onSelectEntity(item.entity)}
                    className="flex items-center justify-between p-2 bg-white rounded border border-slate-200 hover:border-blue-300 hover:shadow-2xs transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-400 w-4 text-center">{idx + 1}.</span>
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="font-semibold text-slate-800 truncate max-w-[130px]">
                        {item.entity.text}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border ${color.badge}`}>
                        {item.entity.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
                      <span title="Outgoing relations">Out: {item.outDegree}</span>
                      <span>•</span>
                      <span title="Incoming relations">In: {item.inDegree}</span>
                      <span className="font-bold text-blue-600 bg-blue-50 px-1 rounded">
                        {item.totalDegree} deg
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Relation Type Frequency */}
        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
              <GitFork className="w-3.5 h-3.5 text-blue-500" />
              <span>Relation Predicate Distribution</span>
            </h3>
            <span className="text-[10px] text-slate-400">{relationDistribution.length} types</span>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {relationDistribution.length === 0 ? (
              <p className="text-slate-400 text-center py-4">No relations to display.</p>
            ) : (
              relationDistribution.map(item => {
                const maxCount = relations.length || 1;
                const pct = (item.count / maxCount) * 100;
                return (
                  <div key={item.relation} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono font-medium text-slate-700">{item.relation}</span>
                      <span className="font-bold text-slate-800">
                        {item.count} <span className="text-slate-400 font-normal">({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
