import { DEFAULT_MENUS, MenuItem, RiggedConfig } from '@/types/lunch';

const MENUS_STORAGE_KEY = 'golagola_lunch_menus_v1';
const RIGGED_STORAGE_KEY = 'golagola_lunch_rigged_v1';
const SOUND_STORAGE_KEY = 'golagola_lunch_sound_v1';

export function getStoredMenus(): MenuItem[] {
  if (typeof window === 'undefined') return DEFAULT_MENUS;
  try {
    const raw = localStorage.getItem(MENUS_STORAGE_KEY);
    if (!raw) return DEFAULT_MENUS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load menus from storage:', e);
  }
  return DEFAULT_MENUS;
}

export function saveStoredMenus(menus: MenuItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MENUS_STORAGE_KEY, JSON.stringify(menus));
  } catch (e) {
    console.error('Failed to save menus:', e);
  }
}

export function getStoredRiggedConfig(): RiggedConfig {
  const defaultConfig: RiggedConfig = {
    enabled: false,
    targetMenuId: null,
    dramaticNearMiss: true,
  };
  if (typeof window === 'undefined') return defaultConfig;
  try {
    const raw = localStorage.getItem(RIGGED_STORAGE_KEY);
    if (raw) {
      return { ...defaultConfig, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to load rigged config:', e);
  }
  return defaultConfig;
}

export function saveStoredRiggedConfig(config: RiggedConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RIGGED_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save rigged config:', e);
  }
}

export function getStoredSound(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = localStorage.getItem(SOUND_STORAGE_KEY);
    return raw !== null ? JSON.parse(raw) : true;
  } catch {
    return true;
  }
}

export function saveStoredSound(enabled: boolean) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify(enabled));
  } catch {}
}

/**
 * Determines the target winner index based on the rigged config and menus.
 * Returns { targetIndex, isRigged, runnerUpIndex }
 */
export function decideWinner(
  menus: MenuItem[],
  riggedConfig: RiggedConfig
): { targetIndex: number; isRigged: boolean; runnerUpIndex: number } {
  if (menus.length === 0) {
    return { targetIndex: 0, isRigged: false, runnerUpIndex: 0 };
  }

  // Check if rigged target is set and exists in menus
  if (riggedConfig.enabled && riggedConfig.targetMenuId) {
    const foundIdx = menus.findIndex((m) => m.id === riggedConfig.targetMenuId);
    if (foundIdx !== -1) {
      // Pick an adjacent or random runner-up for suspenseful near-miss
      const runnerUpIdx = (foundIdx + (Math.random() > 0.5 ? 1 : menus.length - 1)) % menus.length;
      return {
        targetIndex: foundIdx,
        isRigged: true,
        runnerUpIndex: runnerUpIdx,
      };
    }
  }

  // Pure fair random
  const targetIndex = Math.floor(Math.random() * menus.length);
  const runnerUpIndex = (targetIndex + 1) % menus.length;
  return {
    targetIndex,
    isRigged: false,
    runnerUpIndex,
  };
}
