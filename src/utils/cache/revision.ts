import fs from 'fs';

const CACHE_REVISION = 1;
const CACHE_DIRECTORY = './cache/';
const CACHE_CONFIG_PATH = `${CACHE_DIRECTORY}config.json`;

interface CacheConfig {
  revision: number;
}

function initialCacheConfig(): CacheConfig {
  return {
    revision: CACHE_REVISION,
  }
}

function writeCacheConfig(config: CacheConfig) {
  fs.mkdirSync(CACHE_DIRECTORY, { recursive: true });
  fs.writeFileSync(CACHE_CONFIG_PATH, JSON.stringify(config, null, 2));
}

function readCacheConfig(): CacheConfig {
  if (fs.existsSync(CACHE_CONFIG_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(CACHE_CONFIG_PATH).toString()) as CacheConfig;
    } catch (ignored) { }
  }

  const config = initialCacheConfig();
  writeCacheConfig(config);
  return config;
}

function clearCache(): void {
  fs.rmSync(CACHE_DIRECTORY, { recursive: true, force: true });
}

export function verifyCacheRevision() {
  const config = readCacheConfig();
  if (config.revision !== CACHE_REVISION) {
    clearCache();
    writeCacheConfig({
      ...config,
      revision: CACHE_REVISION
    });
  }
}
