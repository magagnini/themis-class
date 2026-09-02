/**
 * userCache.js — Cache global de sessão/perfil do usuário
 * 
 * Elimina queries redundantes ao Supabase em cada página/componente.
 * O perfil é carregado UMA VEZ no login e reutilizado em toda a app
 * via sessionStorage + listeners.
 */

import { supabase } from './supabase';

const CACHE_KEY = 'themis_user_profile';

export function getCachedProfile() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Expirar cache após 30 minutos
    if (Date.now() - parsed._cachedAt > 30 * 60 * 1000) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setCachedProfile(profile) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...profile, _cachedAt: Date.now() }));
  } catch {}
}

export function clearCachedProfile() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {}
}

/**
 * Retorna perfil do usuário logado.
 * - Se o cache estiver válido, devolve instantaneamente sem query.
 * - Se não, busca no banco e guarda no cache.
 */
export async function getUserProfile() {
  // Verificar cache primeiro
  const cached = getCachedProfile();
  if (cached) return cached;

  // Buscar sessão + perfil
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, email, role, school_id, active')
    .eq('id', session.user.id)
    .single();

  if (!profile) return null;

  setCachedProfile(profile);
  return profile;
}
