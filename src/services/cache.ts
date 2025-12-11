// Note: fs and path imports moved to function scope to prevent bundling issues in Workers
import { CACHE_CONFIG, ENV_DEFAULTS, CONTENT_FILTER } from '../config/constants';

// Helper to dynamically import Node.js modules (only used in Node.js environment)
async function getNodeModules() {
  const fs = await import('fs');
  const path = await import('path');
  return { fs: fs.default, path: path.default };
}

// Synchronous version for sync functions
function getNodeModulesSync() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path');
  return { fs, path };
}

/**
 * Configuration used to generate cache
 * Used to invalidate cache when config changes
 */
interface CacheConfig {
  storyLimit: number;
  timeWindowHours: number;
  summaryMaxLength: number;
  contentFilterEnabled: boolean;
  contentFilterSensitivity: string;
}

/**
 * Structure of processed story data (matches ProcessedStory in index.ts)
 */
export interface CachedStory {
  rank: number;
  titleChinese: string;
  titleEnglish: string;
  score: number;
  url: string;
  time: string;
  timestamp: number; // Unix timestamp for filtering and sorting
  description: string;
  commentSummary: string | null;
}

/**
 * Cache file structure
 */
export interface CacheData {
  /** Unix timestamp when cache was created */
  timestamp: number;
  /** Configuration used to generate this cache */
  config: CacheConfig;
  /** The cached processed stories */
  stories: CachedStory[];
}

/**
 * Result of cache check
 */
export interface CacheResult {
  /** Whether cache was hit */
  hit: boolean;
  /** Cached stories if hit, null otherwise */
  stories: CachedStory[] | null;
  /** Reason for cache miss (if any) */
  reason?: string;
}

/**
 * Get the cache directory path (relative to project root)
 */
function getCacheDir(): string {
  const { path } = getNodeModulesSync();
  return path.join(process.cwd(), CACHE_CONFIG.CACHE_DIR);
}

/**
 * Get the full cache file path
 */
function getCachePath(): string {
  const { path } = getNodeModulesSync();
  return path.join(getCacheDir(), CACHE_CONFIG.CACHE_FILE);
}

/**
 * Ensure cache directory exists
 */
function ensureCacheDir(): void {
  const { fs } = getNodeModulesSync();
  const cacheDir = getCacheDir();
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
}

/**
 * Get cache TTL in milliseconds from environment or default
 */
function getCacheTTL(): number {
  const ttlMinutes = parseInt(
    process.env.CACHE_TTL_MINUTES || String(ENV_DEFAULTS.CACHE_TTL_MINUTES),
    10
  );
  return (isNaN(ttlMinutes) || ttlMinutes <= 0 ? ENV_DEFAULTS.CACHE_TTL_MINUTES : ttlMinutes) * 60 * 1000;
}

/**
 * Check if caching is enabled
 */
export function isCacheEnabled(): boolean {
  const envValue = process.env.CACHE_ENABLED;
  if (envValue === undefined) {
    return ENV_DEFAULTS.CACHE_ENABLED;
  }
  return envValue.toLowerCase() !== 'false';
}

/**
 * Read cache from file
 * Returns null if cache doesn't exist or is corrupted
 */
function readCache(): CacheData | null {
  const { fs } = getNodeModulesSync();
  const cachePath = getCachePath();
  
  if (!fs.existsSync(cachePath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(cachePath, 'utf-8');
    const data = JSON.parse(content) as CacheData;
    
    // Basic validation
    if (!data.timestamp || !data.config || !Array.isArray(data.stories)) {
      console.warn('⚠️  Cache file has invalid format, ignoring');
      return null;
    }
    
    return data;
  } catch (error) {
    console.warn(`⚠️  Failed to read cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    // Delete corrupted cache file
    try {
      fs.unlinkSync(cachePath);
      console.warn('⚠️  Deleted corrupted cache file');
    } catch {
      // Ignore deletion errors
    }
    return null;
  }
}

/**
 * Write cache to file
 * Logs warning on failure but doesn't throw
 */
export function writeCache(stories: CachedStory[], config: CacheConfig): void {
  if (!isCacheEnabled()) {
    return;
  }
  
  try {
    const { fs } = getNodeModulesSync();
    ensureCacheDir();
    
    const cacheData: CacheData = {
      timestamp: Date.now(),
      config,
      stories,
    };
    
    const cachePath = getCachePath();
    fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2), 'utf-8');
    console.log(`📦 Cache saved (${stories.length} stories)`);
  } catch (error) {
    console.warn(`⚠️  Failed to write cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    // Continue without caching - don't throw
  }
}

/**
 * Check if cache is valid and return cached data if so
 * @param currentConfig - Current configuration to compare against cached config
 * @returns CacheResult with hit status and stories
 */
export function checkCache(currentConfig: CacheConfig): CacheResult {
  if (!isCacheEnabled()) {
    return { hit: false, stories: null, reason: 'Cache disabled' };
  }
  
  const cache = readCache();
  
  if (!cache) {
    return { hit: false, stories: null, reason: 'No cache found' };
  }
  
  // Check TTL
  const ttl = getCacheTTL();
  const age = Date.now() - cache.timestamp;
  
  if (age > ttl) {
    const ageMinutes = Math.round(age / 60000);
    const ttlMinutes = Math.round(ttl / 60000);
    return { 
      hit: false, 
      stories: null, 
      reason: `Cache expired (age: ${ageMinutes}min, TTL: ${ttlMinutes}min)` 
    };
  }
  
  // Check config match
  if (
    cache.config.storyLimit !== currentConfig.storyLimit ||
    cache.config.timeWindowHours !== currentConfig.timeWindowHours ||
    cache.config.summaryMaxLength !== currentConfig.summaryMaxLength
  ) {
    return { 
      hit: false, 
      stories: null, 
      reason: 'Configuration changed' 
    };
  }
  
  // Cache hit!
  const ageMinutes = Math.round(age / 60000);
  console.log(`📦 Using cached data (${cache.stories.length} stories, ${ageMinutes}min old)`);
  
  return { hit: true, stories: cache.stories };
}

/**
 * Clear the cache file
 */
export function clearCache(): void {
  const { fs } = getNodeModulesSync();
  const cachePath = getCachePath();
  
  if (fs.existsSync(cachePath)) {
    try {
      fs.unlinkSync(cachePath);
      console.log('🗑️  Cache cleared');
    } catch (error) {
      console.warn(`⚠️  Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Get cache info for display
 */
export function getCacheInfo(): { exists: boolean; age?: number; storyCount?: number } {
  const cache = readCache();
  
  if (!cache) {
    return { exists: false };
  }
  
  return {
    exists: true,
    age: Math.round((Date.now() - cache.timestamp) / 60000), // age in minutes
    storyCount: cache.stories.length,
  };
}
