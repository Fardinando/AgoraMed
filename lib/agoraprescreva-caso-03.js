'use strict';

const rules = require('../js/agoraprescreva-caso-03-rules');
const catalog = new Map(rules.catalog.map(item => [item.id, item]));
const fields = ['name', 'concentration', 'dose', 'unit', 'route', 'volume', 'duration', 'frequency', 'instructions'];

function safeText(value, limit) {
  return typeof value === 'string' ? value.slice(0, limit) : '';
}

function prepararCaso03(state) {
  if (!state || !Array.isArray(state.items) || state.items.length > 40) return null;
  const items = [];
  for (const input of state.items) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || typeof input.id !== 'string') return null;
    const reference = catalog.get(input.id);
    if (!reference || (input.type && input.type !== reference.type)) return null;
    const item = { id: reference.id, name: reference.name, type: reference.type };
    for (const field of fields) {
      if (field in input && typeof input[field] !== 'string') return null;
      if (field in input) item[field] = safeText(input[field], field === 'instructions' ? 500 : 160);
    }
    items.push(item);
  }

  const startedAt = typeof state.startedAt === 'string' && Number.isFinite(Date.parse(state.startedAt))
    ? new Date(state.startedAt).toISOString()
    : null;
  const safeState = { caseId: '03', startedAt, items };
  const evaluated = rules.evaluate(safeState);
  return {
    estado: safeState,
    resultado: {
      caseId: '03', score: evaluated.score, safe: evaluated.safe,
      critical: evaluated.critical, counts: evaluated.counts,
      groupScores: evaluated.groupScores, items: evaluated.items,
    },
  };
}

module.exports = { prepararCaso03 };
