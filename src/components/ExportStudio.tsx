import React, { useState, useMemo } from 'react';
import { Entity, RelationTriplet, ExportFormat } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  exportToCypher,
  exportToTurtle,
  exportToJsonLd,
  exportToGraphML,
  exportToGremlin,
  exportToCsvNodes,
  exportToCsvEdges
} from '../utils/graphExporters';
import {
  Database,
  Copy,
  Check,
  Download,
  Share2,
  FileCode,
  Layers,
  Settings2,
  ExternalLink
} from 'lucide-react';

interface ExportStudioProps {
  entities: Entity[];
  relations: RelationTriplet[];
}

export const ExportStudio: React.FC<ExportStudioProps> = ({ entities, relations }) => {
  const [activeFormat, setActiveFormat] = useState<ExportFormat>('cypher');
  const [useMergeCypher, setUseMergeCypher] = useState(true);
  const [addConstraintsCypher, setAddConstraintsCypher] = useState(true);
  const [hasCopied, setHasCopied] = useState(false);

  // Generate Export Code based on active format
  const exportData = useMemo(() => {
    switch (activeFormat) {
      case 'cypher':
        return {
          content: exportToCypher(entities, relations, {
            useMerge: useMergeCypher,
            addConstraints: addConstraintsCypher
          }),
          extension: 'cypher',
          mime: 'text/plain',
          title: 'Neo4j Cypher Query (.cypher)',
          description:
            'Execute directly in Neo4j Browser, Neo4j AuraDB, or via official Neo4j Python/Node.js Drivers.'
        };
      case 'turtle':
        return {
          content: exportToTurtle(entities, relations),
          extension: 'ttl',
          mime: 'text/turtle',
          title: 'RDF / Turtle Semantic Graph (.ttl)',
          description:
            'W3C Standard Semantic Web format compatible with Apache Jena, GraphDB, Stardog, and RDF4J.'
        };
      case 'jsonld':
        return {
          content: exportToJsonLd(entities, relations),
          extension: 'jsonld',
          mime: 'application/ld+json',
          title: 'JSON-LD Linked Data (.jsonld)',
          description:
            'W3C JSON-LD format for knowledge graphs, search engine indexing, and Schema.org interoperability.'
        };
      case 'graphml':
        return {
          content: exportToGraphML(entities, relations),
          extension: 'graphml',
          mime: 'application/xml',
          title: 'GraphML XML Schema (.graphml)',
          description:
            'Standard graph interchange format compatible with Gephi, Cytoscape, yEd, and NetworkX (Python).'
        };
      case 'gremlin':
        return {
          content: exportToGremlin(entities, relations),
          extension: 'gremlin',
          mime: 'text/plain',
          title: 'Apache TinkerPop Gremlin (.gremlin)',
          description:
            'Compatible with Amazon Neptune, Azure Cosmos DB (Gremlin API), JanusGraph, and Apache TinkerPop.'
        };
      case 'csv-nodes':
        return {
          content: exportToCsvNodes(entities),
          extension: 'csv',
          mime: 'text/csv',
          title: 'Neo4j Bulk Import: Nodes (nodes.csv)',
          description:
            'CSV formatted with header metadata for neo4j-admin import and LOAD CSV scripts.'
        };
      case 'csv-edges':
        return {
          content: exportToCsvEdges(relations),
          extension: 'csv',
          mime: 'text/csv',
          title: 'Neo4j Bulk Import: Relationships (edges.csv)',
          description:
            'CSV formatted with START_ID, END_ID, and TYPE for high-throughput batch imports.'
        };
    }
  }, [activeFormat, entities, relations, useMergeCypher, addConstraintsCypher]);

  const { guardAction } = useAuth();

  // Copy to Clipboard
  const handleCopy = async () => {
    guardAction(async () => {
      try {
        await navigator.clipboard.writeText(exportData.content);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy', err);
      }
    }, 'a exportação de scripts de grafo');
  };

  // Download file
  const handleDownload = () => {
    guardAction(() => {
      const blob = new Blob([exportData.content], { type: exportData.mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `semantico-graph-${activeFormat}-${Date.now()}.${exportData.extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }, 'o download de arquivos do grafo');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-800">
            Graph Database Export Studio
          </h2>
        </div>

        {/* Formats Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          <button
            onClick={() => setActiveFormat('cypher')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeFormat === 'cypher'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Neo4j (Cypher)
          </button>
          <button
            onClick={() => setActiveFormat('turtle')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeFormat === 'turtle'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            RDF Turtle (.ttl)
          </button>
          <button
            onClick={() => setActiveFormat('jsonld')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeFormat === 'jsonld'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            JSON-LD
          </button>
          <button
            onClick={() => setActiveFormat('graphml')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeFormat === 'graphml'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            GraphML (Gephi)
          </button>
          <button
            onClick={() => setActiveFormat('gremlin')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeFormat === 'gremlin'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Gremlin
          </button>
          <button
            onClick={() => setActiveFormat('csv-nodes')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeFormat === 'csv-nodes'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            CSV Nodes
          </button>
          <button
            onClick={() => setActiveFormat('csv-edges')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeFormat === 'csv-edges'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            CSV Edges
          </button>
        </div>
      </div>

      {/* Description & Target Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
        <div>
          <span className="font-semibold text-slate-800">{exportData.title}</span>
          <p className="text-slate-500 mt-0.5">{exportData.description}</p>
        </div>

        {/* Options for Cypher */}
        {activeFormat === 'cypher' && (
          <div className="flex items-center gap-3 shrink-0 pt-1 sm:pt-0">
            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                checked={useMergeCypher}
                onChange={e => setUseMergeCypher(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Use MERGE (Idempotent)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                checked={addConstraintsCypher}
                onChange={e => setAddConstraintsCypher(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Add Unique Constraints</span>
            </label>
          </div>
        )}
      </div>

      {/* Code Viewer Box */}
      <div className="relative rounded-lg border border-slate-800 bg-slate-950 overflow-hidden font-mono text-xs shadow-inner">
        {/* Code Box Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-slate-400">
          <div className="flex items-center gap-2">
            <FileCode className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-300 font-semibold">{exportData.extension.toUpperCase()} Export Script</span>
            <span className="text-[10px] text-slate-500">
              ({entities.length} nodes, {relations.length} relations)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-sans font-medium transition-colors"
            >
              {hasCopied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-sans font-medium transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>Download .{exportData.extension}</span>
            </button>
          </div>
        </div>

        {/* Code Content */}
        <pre className="p-4 text-emerald-300/90 max-h-[380px] overflow-y-auto leading-relaxed whitespace-pre-wrap select-all font-mono">
          {exportData.content || '// No entities or relations extracted yet.'}
        </pre>
      </div>
    </div>
  );
};
