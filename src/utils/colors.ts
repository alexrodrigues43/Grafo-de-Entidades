import { EntityType } from '../types';

export interface TypeColorConfig {
  bg: string;
  text: string;
  border: string;
  hex: string;
  badge: string;
}

export const SEMANTICO_BRAND = {
  ink: '#08121E',
  forest: '#1E5E3A',
  gold: '#E5A93C',
  ochre: '#D97706',
  paper: '#FAF9F6',
  white: '#FFFFFF',
  slate: '#64748B',
  darkSlate: '#1E293B',
  border: '#E5E7EB',
  // Backwards compatibility keys
  black: '#08121E',
  darkPurple: '#08121E',
  charcoal: '#1E293B',
  deepWine: '#1E5E3A',
  yellow: '#E5A93C',
  brightYellow: '#F2B842',
  magenta: '#BE185D',
  blue: '#2563EB',
  green: '#1E5E3A',
  cyan: '#0D9488'
};

export const ENTITY_COLORS: Record<EntityType, TypeColorConfig> = {
  Person: {
    bg: 'bg-amber-50',
    text: 'text-[#D97706]',
    border: 'border-[#E5A93C]',
    hex: '#D97706', // Warm Amber
    badge: 'bg-[#E5A93C]/15 text-[#92400E] border-[#E5A93C]/40'
  },
  Organization: {
    bg: 'bg-blue-50',
    text: 'text-[#1D4ED8]',
    border: 'border-[#2563EB]/40',
    hex: '#2563EB', // Royal Blue
    badge: 'bg-[#2563EB]/10 text-[#1D4ED8] border-[#2563EB]/30'
  },
  Location: {
    bg: 'bg-emerald-50',
    text: 'text-[#1E5E3A]',
    border: 'border-[#1E5E3A]',
    hex: '#1E5E3A', // Forest Green (Entidade A in screenshot)
    badge: 'bg-[#1E5E3A]/15 text-[#1E5E3A] border-[#1E5E3A]/40'
  },
  Country: {
    bg: 'bg-teal-50',
    text: 'text-[#0F766E]',
    border: 'border-[#0D9488]',
    hex: '#0D9488', // Teal
    badge: 'bg-[#0D9488]/15 text-[#0F766E] border-[#0D9488]/30'
  },
  Product: {
    bg: 'bg-rose-50',
    text: 'text-[#BE123C]',
    border: 'border-[#F43F5E]',
    hex: '#E11D48', // Crimson Rose
    badge: 'bg-[#F43F5E]/10 text-[#BE123C] border-[#F43F5E]/30'
  },
  Technology: {
    bg: 'bg-indigo-50',
    text: 'text-[#4338CA]',
    border: 'border-[#6366F1]/40',
    hex: '#4F46E5', // Indigo
    badge: 'bg-[#6366F1]/15 text-[#4338CA] border-[#6366F1]/30'
  },
  Concept: {
    bg: 'bg-amber-50/80',
    text: 'text-[#B45309]',
    border: 'border-[#E5A93C]',
    hex: '#E5A93C', // Warm Gold (Conceito B in screenshot)
    badge: 'bg-[#E5A93C]/20 text-[#92400E] border-[#E5A93C]/50'
  },
  Event: {
    bg: 'bg-orange-50',
    text: 'text-[#C2410C]',
    border: 'border-[#F97316]',
    hex: '#EA580C',
    badge: 'bg-[#F97316]/15 text-[#C2410C] border-[#F97316]/30'
  },
  Date: {
    bg: 'bg-slate-50',
    text: 'text-[#475569]',
    border: 'border-[#94A3B8]',
    hex: '#64748B',
    badge: 'bg-[#64748B]/15 text-[#334155] border-[#64748B]/30'
  },
  Work: {
    bg: 'bg-purple-50',
    text: 'text-[#7E22CE]',
    border: 'border-[#A855F7]/50',
    hex: '#9333EA',
    badge: 'bg-[#A855F7]/15 text-[#7E22CE] border-[#A855F7]/30'
  },
  Award: {
    bg: 'bg-yellow-50',
    text: 'text-[#A16207]',
    border: 'border-[#E5A93C]',
    hex: '#E5A93C',
    badge: 'bg-[#E5A93C]/20 text-[#854D0E] border-[#E5A93C]/40'
  },
  Biomedical: {
    bg: 'bg-emerald-50',
    text: 'text-[#1E5E3A]',
    border: 'border-[#1E5E3A]',
    hex: '#1E5E3A',
    badge: 'bg-[#1E5E3A]/15 text-[#1E5E3A] border-[#1E5E3A]/30'
  },
  Other: {
    bg: 'bg-slate-100',
    text: 'text-[#08121E]',
    border: 'border-[#08121E]/30',
    hex: '#08121E', // Midnight Ink (Artigo node in screenshot)
    badge: 'bg-[#08121E]/10 text-[#08121E] border-[#08121E]/20'
  }
};

export function getEntityColor(type: string): TypeColorConfig {
  const normalized = (type || 'Other') as EntityType;
  return ENTITY_COLORS[normalized] || ENTITY_COLORS.Other;
}

