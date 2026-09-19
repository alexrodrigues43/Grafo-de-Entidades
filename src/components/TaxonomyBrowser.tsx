import React, { useState } from 'react';
import { TAXONOMIES } from '../data/taxonomies';
import { TaxonomyType } from '../types';
import { generateOpenNREPythonScript } from '../utils/graphExporters';
import {
  BookOpen,
  Code2,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface TaxonomyBrowserProps {
  currentText: string;
  currentTaxonomy: TaxonomyType;
  onSelectTaxonomy: (taxonomy: TaxonomyType) => void;
}

export const TaxonomyBrowser: React.FC<TaxonomyBrowserProps> = ({
  currentText,
  currentTaxonomy,
  onSelectTaxonomy
}) => {
  const [activeTab, setActiveTab] = useState<'taxonomies' | 'python'>('taxonomies');
  const [selectedTaxId, setSelectedTaxId] = useState<TaxonomyType>(currentTaxonomy);
  const [hasCopiedPython, setHasCopiedPython] = useState(false);

  const selectedTax = TAXONOMIES[selectedTaxId] || TAXONOMIES.wiki80;
  const pythonScript = generateOpenNREPythonScript(currentText, selectedTaxId);

  const handleCopyPython = async () => {
    try {
      await navigator.clipboard.writeText(pythonScript);
      setHasCopiedPython(true);
      setTimeout(() => setHasCopiedPython(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-800">
            OpenNRE Taxonomies & Python Code Generator
          </h2>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
          <button
            onClick={() => setActiveTab('taxonomies')}
            className={`px-3 py-1 rounded-md transition-all ${
              activeTab === 'taxonomies'
                ? 'bg-white text-slate-800 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Taxonomy Catalog
          </button>
          <button
            onClick={() => setActiveTab('python')}
            className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
              activeTab === 'python'
                ? 'bg-white text-slate-800 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>OpenNRE Python Script</span>
          </button>
        </div>
      </div>

      {activeTab === 'taxonomies' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Left Taxonomy Selector List */}
          <div className="space-y-1.5 md:border-r md:border-slate-100 md:pr-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Select Benchmark / Schema
            </span>
            {Object.values(TAXONOMIES).map(tax => (
              <button
                key={tax.id}
                onClick={() => {
                  setSelectedTaxId(tax.id as TaxonomyType);
                  onSelectTaxonomy(tax.id as TaxonomyType);
                }}
                className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs flex items-center justify-between ${
                  selectedTaxId === tax.id
                    ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-semibold shadow-2xs'
                    : 'border-slate-200/80 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div>
                  <div className="font-semibold">{tax.name}</div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    {tax.relationCount > 0 ? `${tax.relationCount} relations` : 'Custom schema'} • {tax.author}
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            ))}

            <div className="pt-3">
              <a
                href="https://github.com/thunlp/OpenNRE"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-medium"
              >
                <span>View THU-NLP OpenNRE on GitHub</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Right Relations Catalog */}
          <div className="md:col-span-2 space-y-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800">{selectedTax.name}</h3>
                <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold">
                  Author: {selectedTax.author}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">{selectedTax.description}</p>
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              <span className="text-xs font-semibold text-slate-700 block">
                Standard Relation Schemas ({selectedTax.defaultRelations.length} displayed):
              </span>
              {selectedTax.defaultRelations.map((rel, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                      {rel.relation}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Head: [{rel.headType.join(', ')}] → Tail: [{rel.tailType.join(', ')}]
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{rel.description}</p>
                  {rel.example && (
                    <p className="text-slate-500 italic text-[10px] bg-slate-50 p-1 rounded">
                      Example: &quot;{rel.example}&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Python Code Generator Tab */
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Terminal className="w-4 h-4 text-emerald-600" />
              <span>
                Run OpenNRE neural relation extraction locally in Python with PyTorch and BERT/RoBERTa:
              </span>
            </div>
            <button
              onClick={handleCopyPython}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
            >
              {hasCopiedPython ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-600 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Script</span>
                </>
              )}
            </button>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-emerald-300 max-h-[380px] overflow-y-auto leading-relaxed whitespace-pre-wrap select-all">
            {pythonScript}
          </div>
        </div>
      )}
    </div>
  );
};
