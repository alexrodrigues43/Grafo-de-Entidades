import { Entity, RelationTriplet } from '../types';

export function sanitizeSlug(str: string): string {
  return str
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s-]+/g, '_');
}

export function sanitizeRelationType(relation: string): string {
  return relation
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function escapeString(str: string): string {
  return (str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

export function exportToCypher(
  entities: Entity[],
  relations: RelationTriplet[],
  options: { useMerge?: boolean; addConstraints?: boolean } = {}
): string {
  const { useMerge = true, addConstraints = true } = options;
  const op = useMerge ? 'MERGE' : 'CREATE';

  const lines: string[] = [
    `// ==========================================`,
    `// OpenNRE Knowledge Graph Export - Neo4j Cypher`,
    `// Generated: ${new Date().toISOString()}`,
    `// Total Nodes: ${entities.length} | Total Relations: ${relations.length}`,
    `// ==========================================`,
    ``
  ];

  if (addConstraints) {
    lines.push(`// --- 1. Indexes & Constraints ---`);
    const uniqueTypes = Array.from(new Set(entities.map(e => e.type)));
    uniqueTypes.forEach(type => {
      lines.push(`CREATE CONSTRAINT IF NOT EXISTS FOR (n:\`${type}\`) REQUIRE n.id IS UNIQUE;`);
    });
    lines.push(``);
  }

  lines.push(`// --- 2. Create Nodes ---`);
  entities.forEach((entity, index) => {
    const safeId = sanitizeSlug(entity.id || `node_${index}`);
    const safeText = escapeString(entity.text);
    const safeType = entity.type || 'Entity';
    const conf = entity.confidence !== undefined ? entity.confidence.toFixed(2) : '1.0';
    const wikidataProp = entity.wikidataId ? `, wikidataId: '${escapeString(entity.wikidataId)}'` : '';
    const aliasesProp = entity.aliases && entity.aliases.length > 0
      ? `, aliases: [${entity.aliases.map(a => `'${escapeString(a)}'`).join(', ')}]`
      : '';
    lines.push(
      `${op} (n_${safeId}:\`${safeType}\` { id: '${safeId}', name: '${safeText}', confidence: ${conf}${wikidataProp}${aliasesProp} });`
    );
  });

  lines.push(``);
  lines.push(`// --- 3. Create Relations & Edge Qualifiers ---`);
  relations.forEach(rel => {
    const safeHeadId = sanitizeSlug(rel.headId);
    const safeTailId = sanitizeSlug(rel.tailId);
    const relType = sanitizeRelationType(rel.relation || 'RELATED_TO');
    const safeEvidence = escapeString(rel.evidence || '');
    const conf = rel.confidence !== undefined ? rel.confidence.toFixed(2) : '0.95';
    const taxonomy = rel.taxonomy || 'opennre';

    // Qualifiers formatting
    let qualifiersProp = '';
    if (rel.qualifiers && rel.qualifiers.length > 0) {
      const qProps = rel.qualifiers.map(q => `${sanitizeSlug(q.key)}: '${escapeString(q.value)}'`).join(', ');
      qualifiersProp = `, ${qProps}`;
    }

    lines.push(
      `MATCH (h { id: '${safeHeadId}' }), (t { id: '${safeTailId}' })` +
        `\n${op} (h)-[r:\`${relType}\` { ` +
        `confidence: ${conf}, ` +
        `taxonomy: '${taxonomy}', ` +
        `evidence: '${safeEvidence}'${qualifiersProp} ` +
        `}]->(t);`
    );
  });

  return lines.join('\n');
}

export function exportToTurtle(entities: Entity[], relations: RelationTriplet[]): string {
  const lines: string[] = [
    `@prefix ex: <http://example.org/opennre/> .`,
    `@prefix schema: <http://schema.org/> .`,
    `@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .`,
    `@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .`,
    `@prefix wd: <http://www.wikidata.org/entity/> .`,
    `@prefix wdt: <http://www.wikidata.org/prop/direct/> .`,
    `@prefix opennre: <http://opennre.thunlp.org/ontology/> .`,
    ``,
    `# ==========================================`,
    `# OpenNRE Knowledge Graph - RDF Turtle (.ttl)`,
    `# ==========================================`,
    ``,
    `# --- Entities (Nodes) ---`
  ];

  entities.forEach((entity, index) => {
    const slug = sanitizeSlug(entity.id || `entity_${index}`);
    const label = escapeString(entity.text);
    const type = entity.type || 'Thing';
    lines.push(`ex:${slug} a schema:${type}, opennre:Entity ;`);
    lines.push(`    rdfs:label "${label}"^^xsd:string ;`);
    lines.push(`    opennre:entityType "${type}"^^xsd:string ;`);
    if (entity.wikidataId) {
      lines.push(`    rdfs:seeAlso wd:${sanitizeSlug(entity.wikidataId)} ;`);
    }
    if (entity.aliases && entity.aliases.length > 0) {
      entity.aliases.forEach(alias => {
        lines.push(`    schema:alternateName "${escapeString(alias)}"^^xsd:string ;`);
      });
    }
    lines.push(`    opennre:confidence "${(entity.confidence ?? 1.0).toFixed(2)}"^^xsd:decimal .`);
    lines.push(``);
  });

  lines.push(`# --- Relations & Edge Qualifiers ---`);
  relations.forEach(rel => {
    const headSlug = sanitizeSlug(rel.headId);
    const tailSlug = sanitizeSlug(rel.tailId);
    const relPredicate = sanitizeSlug(rel.relation || 'related_to');
    const conf = rel.confidence !== undefined ? rel.confidence.toFixed(2) : '0.95';
    const evidence = escapeString(rel.evidence || '');

    lines.push(`ex:${headSlug} opennre:${relPredicate} ex:${tailSlug} .`);
    lines.push(`[ a opennre:RelationStatement ;`);
    lines.push(`  opennre:subject ex:${headSlug} ;`);
    lines.push(`  opennre:predicate opennre:${relPredicate} ;`);
    lines.push(`  opennre:object ex:${tailSlug} ;`);
    lines.push(`  opennre:confidence "${conf}"^^xsd:decimal ;`);
    lines.push(`  opennre:evidence "${evidence}"^^xsd:string ;`);
    lines.push(`  opennre:taxonomy "${rel.taxonomy || 'wiki80'}"^^xsd:string ;`);
    if (rel.qualifiers && rel.qualifiers.length > 0) {
      rel.qualifiers.forEach(q => {
        lines.push(`  opennre:qualifier [ opennre:key "${escapeString(q.key)}" ; opennre:value "${escapeString(q.value)}" ] ;`);
      });
    }
    lines.push(`] .`);
    lines.push(``);
  });

  return lines.join('\n');
}

export function exportToJsonLd(entities: Entity[], relations: RelationTriplet[]): string {
  const jsonLd = {
    '@context': {
      '@vocab': 'http://schema.org/',
      'opennre': 'http://opennre.thunlp.org/ontology/',
      'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
      'xsd': 'http://www.w3.org/2001/XMLSchema#',
      'wd': 'http://www.wikidata.org/entity/'
    },
    '@graph': entities.map(entity => {
      const outgoingRelations = relations
        .filter(r => r.headId === entity.id)
        .map(r => ({
          '@type': 'opennre:Relation',
          'predicate': r.relation,
          'target': `http://example.org/opennre/${sanitizeSlug(r.tailId)}`,
          'targetName': r.tailText,
          'confidence': r.confidence,
          'evidence': r.evidence,
          'taxonomy': r.taxonomy,
          'qualifiers': r.qualifiers && r.qualifiers.length > 0 ? r.qualifiers : undefined
        }));

      return {
        '@id': `http://example.org/opennre/${sanitizeSlug(entity.id)}`,
        '@type': entity.type,
        'name': entity.text,
        'alternateName': entity.aliases && entity.aliases.length > 0 ? entity.aliases : undefined,
        'sameAs': entity.wikidataId ? `http://www.wikidata.org/entity/${entity.wikidataId}` : undefined,
        'confidence': entity.confidence || 1.0,
        'relations': outgoingRelations.length > 0 ? outgoingRelations : undefined
      };
    })
  };

  return JSON.stringify(jsonLd, null, 2);
}

export function exportToGraphML(entities: Entity[], relations: RelationTriplet[]): string {
  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<graphml xmlns="http://graphml.graphdrawing.org/xmlns"`,
    `         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"`,
    `         xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">`,
    `  <key id="d_name" for="node" attr.name="name" attr.type="string"/>`,
    `  <key id="d_type" for="node" attr.name="type" attr.type="string"/>`,
    `  <key id="d_conf" for="node" attr.name="confidence" attr.type="double"/>`,
    `  <key id="e_label" for="edge" attr.name="label" attr.type="string"/>`,
    `  <key id="e_conf" for="edge" attr.name="confidence" attr.type="double"/>`,
    `  <key id="e_evidence" for="edge" attr.name="evidence" attr.type="string"/>`,
    `  <key id="e_taxonomy" for="edge" attr.name="taxonomy" attr.type="string"/>`,
    `  <graph id="OpenNRE_Graph" edgedefault="directed">`
  ];

  entities.forEach(entity => {
    const safeId = sanitizeSlug(entity.id);
    const safeName = entity.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeType = entity.type;
    const conf = entity.confidence !== undefined ? entity.confidence.toFixed(2) : '1.0';

    lines.push(`    <node id="${safeId}">`);
    lines.push(`      <data key="d_name">${safeName}</data>`);
    lines.push(`      <data key="d_type">${safeType}</data>`);
    lines.push(`      <data key="d_conf">${conf}</data>`);
    lines.push(`    </node>`);
  });

  relations.forEach((rel, idx) => {
    const sourceId = sanitizeSlug(rel.headId);
    const targetId = sanitizeSlug(rel.tailId);
    const label = rel.relation.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const conf = rel.confidence !== undefined ? rel.confidence.toFixed(2) : '0.95';
    const evidence = (rel.evidence || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const tax = rel.taxonomy || 'wiki80';

    lines.push(`    <edge id="e${idx}" source="${sourceId}" target="${targetId}">`);
    lines.push(`      <data key="e_label">${label}</data>`);
    lines.push(`      <data key="e_conf">${conf}</data>`);
    lines.push(`      <data key="e_evidence">${evidence}</data>`);
    lines.push(`      <data key="e_taxonomy">${tax}</data>`);
    lines.push(`    </edge>`);
  });

  lines.push(`  </graph>`);
  lines.push(`</graphml>`);

  return lines.join('\n');
}

export function exportToGremlin(entities: Entity[], relations: RelationTriplet[]): string {
  const lines: string[] = [
    `// ==========================================`,
    `// OpenNRE Knowledge Graph Export - Apache TinkerPop Gremlin`,
    `// Compatible with AWS Neptune, Azure Cosmos DB, JanusGraph`,
    `// ==========================================`,
    ``
  ];

  entities.forEach(entity => {
    const id = sanitizeSlug(entity.id);
    const name = escapeString(entity.text);
    const type = entity.type;
    lines.push(
      `g.addV('${type}').property('id', '${id}').property('name', '${name}').property('confidence', ${entity.confidence || 1.0}).iterate()`
    );
  });

  lines.push(``);
  relations.forEach(rel => {
    const headId = sanitizeSlug(rel.headId);
    const tailId = sanitizeSlug(rel.tailId);
    const relLabel = sanitizeRelationType(rel.relation);
    const evidence = escapeString(rel.evidence || '');
    const conf = rel.confidence !== undefined ? rel.confidence.toFixed(2) : '0.95';

    lines.push(
      `g.V().has('id', '${headId}').as('h').V().has('id', '${tailId}').addE('${relLabel}').from('h').property('confidence', ${conf}).property('evidence', '${evidence}').property('taxonomy', '${rel.taxonomy || 'wiki80'}').iterate()`
    );
  });

  return lines.join('\n');
}

export function exportToCsvNodes(entities: Entity[]): string {
  const lines: string[] = [`id:ID,name,type:LABEL,confidence:float`];
  entities.forEach(e => {
    const id = sanitizeSlug(e.id);
    const name = `"${e.text.replace(/"/g, '""')}"`;
    const type = e.type;
    const conf = e.confidence !== undefined ? e.confidence.toFixed(2) : '1.0';
    lines.push(`${id},${name},${type},${conf}`);
  });
  return lines.join('\n');
}

export function exportToCsvEdges(relations: RelationTriplet[]): string {
  const lines: string[] = [`:START_ID,:END_ID,:TYPE,confidence:float,evidence,taxonomy`];
  relations.forEach(r => {
    const startId = sanitizeSlug(r.headId);
    const endId = sanitizeSlug(r.tailId);
    const type = sanitizeRelationType(r.relation);
    const conf = r.confidence !== undefined ? r.confidence.toFixed(2) : '0.95';
    const evidence = `"${(r.evidence || '').replace(/"/g, '""')}"`;
    const tax = r.taxonomy || 'wiki80';
    lines.push(`${startId},${endId},${type},${conf},${evidence},${tax}`);
  });
  return lines.join('\n');
}

export function generateOpenNREPythonScript(
  text: string,
  taxonomy: string = 'wiki80'
): string {
  return `"""
OpenNRE Inference Script (Python)
THU-NLP Neural Relation Extraction Toolkit
GitHub: https://github.com/thunlp/OpenNRE

Installation:
    pip install opennre torch transformers
"""

import opennre
import json

# 1. Load Pretrained OpenNRE Model
# OpenNRE provides pretrained BERT/CNN/RoBERTa checkpoints on Wiki80, TACRED & FewRel
model_name = 'wiki80_bert_entity'  # Options: 'wiki80_bert_entity', 'wiki80_cnn_softmax', 'tacred_bert_entity'
print(f"Loading OpenNRE model '{model_name}'...")
model = opennre.get_model(model_name)

# 2. Input Sentence & Entities
# In OpenNRE, relation extraction operates on (sentence, head_span, tail_span)
text = """${text.replace(/"""/g, '\\"\\"\\"')}"""

# Example inference on candidate entity pair:
# (Replace with detected entities)
example_head = {'name': 'OpenNRE', 'pos': [15, 22]}
example_tail = {'name': 'THU-NLP', 'pos': [45, 52]}

print("\\nRunning OpenNRE Relation Extraction...")
result = model.infer({
    'text': text,
    'h': example_head,
    't': example_tail
})

print(f"Predicted Relation : {result[0]}")
print(f"Confidence Score   : {result[1]:.4f}")

# Exporting Triplet to Knowledge Graph JSON format
triplet = {
    "head": example_head['name'],
    "relation": result[0],
    "tail": example_tail['name'],
    "confidence": float(result[1]),
    "framework": "OpenNRE"
}

print("\\nExtracted Knowledge Graph Triplet:")
print(json.dumps(triplet, indent=2, ensure_ascii=False))
`;
}
