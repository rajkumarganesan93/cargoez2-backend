interface CacheEntry {
  permissions: Array<{ key: string; conditions: Record<string, any> | null }>;
  expiresAt: number;
}

const TTL_MS = 5 * 60 * 1000;

export class PermissionCache {
  private static cache = new Map<string, CacheEntry>();

  static buildKey(roles: string[]): string {
    return [...roles].sort().join(',');
  }

  static get(roles: string[]): Array<{ key: string; conditions: Record<string, any> | null }> | null {
    const key = this.buildKey(roles);
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.permissions;
  }

  static set(roles: string[], permissions: Array<{ key: string; conditions: Record<string, any> | null }>): void {
    const key = this.buildKey(roles);
    this.cache.set(key, { permissions, expiresAt: Date.now() + TTL_MS });
  }

  static invalidate(): void {
    this.cache.clear();
  }

  static invalidateForRoles(roles: string[]): void {
    const keysToDelete: string[] = [];
    for (const [cacheKey] of this.cache) {
      const cachedRoles = cacheKey.split(',');
      if (roles.some((r) => cachedRoles.includes(r))) {
        keysToDelete.push(cacheKey);
      }
    }
    keysToDelete.forEach((k) => this.cache.delete(k));
  }
}
