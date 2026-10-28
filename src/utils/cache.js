import NodeCache from 'node-cache';

const cache = new NodeCache({
  stdTTL: 300, // 5 minutes default
  checkperiod: 60, // check for expired keys every minute
  useClones: false
});

export function getCache(key) {
  return cache.get(key);
}

export function setCache(key, value, ttl = 300) {
  return cache.set(key, value, ttl);
}

export function deleteCache(key) {
  return cache.del(key);
}

export function flushCache() {
  return cache.flushAll();
}

export default cache;
