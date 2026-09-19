import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Entity, RelationTriplet, EntityType, RelationQualifier } from '../types';
import { getEntityColor, ENTITY_COLORS } from '../utils/colors';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Search,
  Filter,
  Download,
  Eye,
  EyeOff,
  Layers,
  ArrowRight,
  ShieldCheck,
  Tag,
  Clock,
  MapPin,
  Briefcase
} from 'lucide-react';

interface GraphCanvasProps {
  entities: Entity[];
  relations: RelationTriplet[];
  onSelectEntity?: (entity: Entity) => void;
  onSelectRelation?: (relation: RelationTriplet) => void;
  selectedEntityId?: string | null;
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  text: string;
  type: EntityType;
  confidence: number;
  degree: number;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  id: string;
  relation: string;
  relationLabel: string;
  confidence: number;
  evidence?: string;
  taxonomy: string;
  qualifiers?: RelationQualifier[];
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  entities,
  relations,
  onSelectEntity,
  onSelectRelation,
  selectedEntityId
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<Set<string>>(new Set());
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);
  const [showEdgeLabels, setShowEdgeLabels] = useState(true);
  const [chargeStrength, setChargeStrength] = useState(-350);

  // Compute node degrees
  const nodeDegrees = useMemo(() => {
    const degMap = new Map<string, number>();
    relations.forEach(r => {
      degMap.set(r.headId, (degMap.get(r.headId) || 0) + 1);
      degMap.set(r.tailId, (degMap.get(r.tailId) || 0) + 1);
    });
    return degMap;
  }, [relations]);

  // Unique entity types in the graph
  const availableTypes = useMemo(() => {
    return Array.from(new Set(entities.map(e => e.type)));
  }, [entities]);

  // Filtered nodes and links based on type filter
  const filteredData = useMemo(() => {
    const activeNodes = entities.filter(
      e => selectedTypeFilter.size === 0 || selectedTypeFilter.has(e.type)
    );
    const activeNodeIds = new Set(activeNodes.map(n => n.id));

    const activeLinks = relations.filter(
      r => activeNodeIds.has(r.headId) && activeNodeIds.has(r.tailId)
    );

    return { nodes: activeNodes, links: activeLinks };
  }, [entities, relations, selectedTypeFilter]);

  // Toggle type filter
  const toggleTypeFilter = (type: string) => {
    setSelectedTypeFilter(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const clearTypeFilter = () => {
    setSelectedTypeFilter(new Set());
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 550;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', '100%');

    // Create Main Group for Zoom
    const g = svg.append('g').attr('class', 'graph-container');

    // Define Arrow Marker for Directed Edges
    const defs = svg.append('defs');

    defs
      .append('marker')
      .attr('id', 'arrowhead-default')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 24) // offset for node radius
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#94A3B8');

    defs
      .append('marker')
      .attr('id', 'arrowhead-highlight')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 24)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 7)
      .attr('markerHeight', 7)
      .append('path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#1E5E3A');

    // Prepare D3 simulation data (deep copy to avoid mutating props)
    const simNodes: SimNode[] = filteredData.nodes.map(n => ({
      id: n.id,
      text: n.text,
      type: n.type,
      confidence: n.confidence || 0.95,
      degree: nodeDegrees.get(n.id) || 0
    }));

    const nodeMap = new Map(simNodes.map(n => [n.id, n]));

    const simLinks: SimLink[] = filteredData.links
      .filter(l => nodeMap.has(l.headId) && nodeMap.has(l.tailId))
      .map(l => ({
        id: l.id,
        source: l.headId,
        target: l.tailId,
        relation: l.relation,
        relationLabel: l.relationLabel || l.relation,
        confidence: l.confidence,
        evidence: l.evidence,
        taxonomy: l.taxonomy,
        qualifiers: l.qualifiers
      }));

    // Setup Force Simulation
    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(simLinks)
          .id(d => d.id)
          .distance(120)
      )
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => 28 + (d as SimNode).degree * 2.5));

    // Setup Zoom
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', event => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Draw Links (Lines)
    const linkGroup = g.append('g').attr('class', 'links');

    const link = linkGroup
      .selectAll<SVGLineElement, SimLink>('line')
      .data(simLinks)
      .enter()
      .append('line')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', d => Math.max(1.5, d.confidence * 2.5))
      .attr('stroke-opacity', 0.8)
      .attr('marker-end', 'url(#arrowhead-default)')
      .attr('class', 'transition-colors duration-150 cursor-pointer')
      .on('mouseenter', (event, d) => {
        setHoveredLinkId(d.id);
        d3.select(event.currentTarget)
          .attr('stroke', '#3b82f6')
          .attr('stroke-width', 3)
          .attr('marker-end', 'url(#arrowhead-highlight)');
      })
      .on('mouseleave', (event, d) => {
        setHoveredLinkId(null);
        d3.select(event.currentTarget)
          .attr('stroke', '#cbd5e1')
          .attr('stroke-width', Math.max(1.5, d.confidence * 2.5))
          .attr('marker-end', 'url(#arrowhead-default)');
      })
      .on('click', (event, d) => {
        const originalRel = relations.find(r => r.id === d.id);
        if (originalRel && onSelectRelation) {
          onSelectRelation(originalRel);
        }
      });

    // Draw Link Labels (Edge text)
    const linkLabelGroup = g.append('g').attr('class', 'link-labels');

    const linkText = linkLabelGroup
      .selectAll<SVGTextElement, SimLink>('text')
      .data(simLinks)
      .enter()
      .append('text')
      .attr('font-size', '10px')
      .attr('font-family', 'ui-sans-serif, system-ui, sans-serif')
      .attr('font-weight', '500')
      .attr('fill', '#64748b')
      .attr('text-anchor', 'middle')
      .attr('dy', -4)
      .attr('class', 'select-none pointer-events-none')
      .style('display', showEdgeLabels ? 'block' : 'none')
      .text(d => d.relationLabel || d.relation);

    // Draw Nodes (Circles + Icons + Text)
    const nodeGroup = g.append('g').attr('class', 'nodes');

    const node = nodeGroup
      .selectAll<SVGGElement, SimNode>('g')
      .data(simNodes)
      .enter()
      .append('g')
      .attr('class', 'cursor-grab active:cursor-grabbing')
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            // keep fixed or release
            d.fx = null;
            d.fy = null;
          })
      )
      .on('click', (event, d) => {
        const originalEnt = entities.find(e => e.id === d.id);
        if (originalEnt && onSelectEntity) {
          onSelectEntity(originalEnt);
        }
      })
      .on('mouseenter', (event, d) => {
        setHoveredNodeId(d.id);
        // Highlight connected links
        link.each(function (l) {
          const isConnected =
            (typeof l.source === 'object' && (l.source as SimNode).id === d.id) ||
            (typeof l.target === 'object' && (l.target as SimNode).id === d.id);
          if (isConnected) {
            d3.select(this)
              .attr('stroke', '#1E5E3A')
              .attr('stroke-width', 2.5)
              .attr('marker-end', 'url(#arrowhead-highlight)');
          } else {
            d3.select(this).attr('stroke-opacity', 0.2);
          }
        });
      })
      .on('mouseleave', () => {
        setHoveredNodeId(null);
        link.each(function (l) {
          d3.select(this)
            .attr('stroke', '#cbd5e1')
            .attr('stroke-width', Math.max(1.5, l.confidence * 2.5))
            .attr('stroke-opacity', 0.8)
            .attr('marker-end', 'url(#arrowhead-default)');
        });
      });

    // Outer Glow Ring for Selected / Hovered Node
    node
      .append('circle')
      .attr('r', d => 17 + Math.min(10, d.degree * 2))
      .attr('fill', 'transparent')
      .attr('stroke', d => {
        if (d.id === selectedEntityId) return '#E5A93C';
        return 'transparent';
      })
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', d => (d.id === selectedEntityId ? '4 2' : 'none'))
      .attr('class', 'outer-ring');

    // Main Node Circle (Styling from Design System: White with colored ring, or dark hub)
    node
      .append('circle')
      .attr('r', d => 15 + Math.min(8, d.degree * 1.5))
      .attr('fill', d => {
        // If highest degree or explicit hub, make it dark ink like 'Artigo' in screenshot
        const isHub = d.degree > 2 && d.degree === Math.max(...simNodes.map(n => n.degree));
        return isHub ? '#08121E' : '#FFFFFF';
      })
      .attr('stroke', d => {
        const isHub = d.degree > 2 && d.degree === Math.max(...simNodes.map(n => n.degree));
        return isHub ? '#08121E' : getEntityColor(d.type).hex;
      })
      .attr('stroke-width', 2.5)
      .attr('class', 'shadow-xs transition-transform duration-150');

    // Node Type Initial Badge / Letter
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('fill', d => {
        const isHub = d.degree > 2 && d.degree === Math.max(...simNodes.map(n => n.degree));
        return isHub ? '#FFFFFF' : getEntityColor(d.type).hex;
      })
      .attr('pointer-events', 'none')
      .text(d => (d.type ? d.type.charAt(0) : 'E'));

    // Node Label (Below Circle)
    node
      .append('text')
      .attr('dy', d => 26 + Math.min(8, d.degree * 1.5))
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('font-family', 'ui-sans-serif, system-ui, sans-serif')
      .attr('fill', '#08121E')
      .attr('class', 'select-none pointer-events-none drop-shadow-2xs')
      .text(d => (d.text.length > 22 ? d.text.slice(0, 20) + '...' : d.text));

    // Simulation Ticker
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as SimNode).x || 0)
        .attr('y1', d => (d.source as SimNode).y || 0)
        .attr('x2', d => (d.target as SimNode).x || 0)
        .attr('y2', d => (d.target as SimNode).y || 0);

      linkText
        .attr('x', d => (((d.source as SimNode).x || 0) + ((d.target as SimNode).x || 0)) / 2)
        .attr('y', d => (((d.source as SimNode).y || 0) + ((d.target as SimNode).y || 0)) / 2);

      node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [filteredData, selectedEntityId, showEdgeLabels, chargeStrength, nodeDegrees]);

  // Handle Zoom In / Out
  const handleZoom = (delta: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(250).call(zoomBehaviorRef.current.scaleBy, delta);
  };

  // Reset Zoom
  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(400).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  };

  // Search filter node highlight
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    if (!searchQuery.trim()) {
      svg.selectAll('.nodes g').attr('opacity', 1);
      svg.selectAll('.links line').attr('opacity', 1);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const matchedNodeIds = new Set<string>();

    svg.selectAll<SVGGElement, SimNode>('.nodes g').each(function (d) {
      const match = d.text.toLowerCase().includes(query) || d.type.toLowerCase().includes(query);
      if (match) {
        matchedNodeIds.add(d.id);
        d3.select(this).attr('opacity', 1);
      } else {
        d3.select(this).attr('opacity', 0.2);
      }
    });

    svg.selectAll<SVGLineElement, SimLink>('.links line').each(function (d) {
      const srcId = typeof d.source === 'object' ? (d.source as SimNode).id : (d.source as string);
      const tgtId = typeof d.target === 'object' ? (d.target as SimNode).id : (d.target as string);
      if (matchedNodeIds.has(srcId) || matchedNodeIds.has(tgtId)) {
        d3.select(this).attr('opacity', 1);
      } else {
        d3.select(this).attr('opacity', 0.1);
      }
    });
  }, [searchQuery]);

  // Download SVG
  const handleDownloadSvg = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `opennre-knowledge-graph-${Date.now()}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div
      id="graph-canvas-container"
      ref={containerRef}
      className="relative w-full h-[600px] bg-[#FAF9F6] bg-architectural-grid rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden flex flex-col"
    >
      {/* Top Floating Graph Toolbar */}
      <div
        id="graph-canvas-toolbar"
        className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none"
      >
        {/* Search Box */}
        <div className="pointer-events-auto flex items-center bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200 shadow-xs text-xs w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Buscar entidade no grafo..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent focus:outline-none text-[#08121E] placeholder:text-slate-400 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-slate-600 ml-1 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Action Controls */}
        <div className="pointer-events-auto flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-full border border-slate-200 shadow-xs text-xs">
          <button
            onClick={() => setShowEdgeLabels(!showEdgeLabels)}
            title={showEdgeLabels ? 'Ocultar rótulos das arestas' : 'Mostrar rótulos das arestas'}
            className={`p-1.5 rounded-full hover:bg-slate-100 transition-colors ${
              showEdgeLabels ? 'text-[#1E5E3A] font-semibold bg-[#1E5E3A]/10' : 'text-slate-500'
            }`}
          >
            {showEdgeLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <div className="w-[1px] h-4 bg-slate-200" />
          <button
            onClick={() => handleZoom(1.3)}
            title="Aproximar (Zoom In)"
            className="p-1.5 rounded-full text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleZoom(0.7)}
            title="Afastar (Zoom Out)"
            className="p-1.5 rounded-full text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            title="Resetar Visualização"
            className="p-1.5 rounded-full text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <div className="w-[1px] h-4 bg-slate-200" />
          <button
            onClick={handleDownloadSvg}
            title="Exportar Grafo em SVG Vetorial"
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#08121E] hover:bg-[#1A2533] text-white text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#E5A93C]" />
            <span>SVG</span>
          </button>
        </div>
      </div>

      {/* Hovered Relation Tooltip Card */}
      {hoveredLinkId && (() => {
        const hoveredRel = relations.find(r => r.id === hoveredLinkId);
        if (!hoveredRel) return null;
        return (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-md border border-blue-200 shadow-lg rounded-xl p-3 max-w-sm w-full text-xs pointer-events-none transition-all animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="font-semibold text-slate-800 truncate">{hoveredRel.headText}</span>
              <div className="flex items-center gap-1 text-blue-600 font-mono font-bold text-[10px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                <span>{hoveredRel.relation}</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </div>
              <span className="font-semibold text-slate-800 truncate">{hoveredRel.tailText}</span>
            </div>

            {hoveredRel.qualifiers && hoveredRel.qualifiers.length > 0 && (
              <div className="flex flex-wrap gap-1 my-1">
                {hoveredRel.qualifiers.map((q, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-[10px] text-indigo-900 font-medium"
                  >
                    <span className="font-semibold text-indigo-700">{q.key}:</span>
                    <span>{q.value}</span>
                  </span>
                ))}
              </div>
            )}

            {hoveredRel.evidence && (
              <p className="text-[11px] text-slate-600 italic bg-slate-50 p-1.5 rounded border border-slate-100 mt-1 line-clamp-2">
                &ldquo;{hoveredRel.evidence}&rdquo;
              </p>
            )}

            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 pt-1 border-t border-slate-100">
              <span className="text-emerald-600 font-medium flex items-center gap-0.5">
                <ShieldCheck className="w-3 h-3" />
                {((hoveredRel.confidence || 0.95) * 100).toFixed(0)}% confidence
              </span>
              <span>Click relation for details</span>
            </div>
          </div>
        );
      })()}

      {/* Type Filter Legend Bar (Bottom Floating) */}
      <div
        id="graph-type-legend"
        className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-200 shadow-sm text-xs pointer-events-auto"
      >
        <div className="flex items-center gap-1 text-slate-500 font-medium mr-1 shrink-0">
          <Filter className="w-3.5 h-3.5" />
          <span>Entity Types:</span>
        </div>
        {availableTypes.map(type => {
          const color = getEntityColor(type);
          const isSelected = selectedTypeFilter.has(type);
          const isFilteringActive = selectedTypeFilter.size > 0;
          return (
            <button
              key={type}
              onClick={() => toggleTypeFilter(type)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium transition-all ${
                isSelected
                  ? 'ring-2 ring-blue-500 font-semibold'
                  : isFilteringActive
                  ? 'opacity-40 hover:opacity-100'
                  : 'opacity-90 hover:opacity-100'
              } ${color.badge}`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color.hex }} />
              {type}
            </button>
          );
        })}
        {selectedTypeFilter.size > 0 && (
          <button
            onClick={clearTypeFilter}
            className="text-blue-600 hover:underline text-xs font-medium ml-auto"
          >
            Show All
          </button>
        )}
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing bg-slate-50/50"
      />

      {/* Empty State */}
      {entities.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 text-slate-400 p-4">
          <Layers className="w-12 h-12 mb-3 text-slate-300 stroke-[1.5]" />
          <p className="text-sm font-semibold text-slate-700">Nenhum Grafo de Conhecimento gerado ainda</p>
          <p className="text-xs text-slate-500 mt-1.5 max-w-md text-center leading-relaxed">
            Cole o texto do seu post de blog ou faça upload de um arquivo (.txt / .md) acima e clique em &quot;Extrair Relações & Grafo&quot; para iniciar a extração.
          </p>
        </div>
      )}
    </div>
  );
};
