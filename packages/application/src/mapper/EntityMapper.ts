import type { ColumnMap } from '@rajkumarganesan93/domain';

/**
 * Convert camelCase to snake_case.
 * Handles consecutive uppercase letters (acronyms) correctly:
 *   "myURL"  → "my_url"
 *   "createdAt" → "created_at"
 */
function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * Get DB column name for entity property. Uses ColumnMap if provided, else snake_case.
 */
function getColumnName(entityProp: string, columnMap?: ColumnMap): string {
  if (columnMap && columnMap[entityProp]) {
    return columnMap[entityProp];
  }
  return toSnakeCase(entityProp);
}

/**
 * Get entity property name from DB column. Reverse lookup in ColumnMap, else snake_case to camelCase.
 */
function getEntityProp(columnName: string, columnMap?: ColumnMap): string {
  if (columnMap) {
    const entry = Object.entries(columnMap).find(([, col]) => col === columnName);
    if (entry) return entry[0];
  }
  return columnName.replace(/_([a-z\d])/g, (_, letter: string) => letter.toUpperCase());
}

/**
 * Convert DB row to entity. Outputs object with camelCase properties only.
 */
export function toEntity<T = Record<string, unknown>>(
  row: Record<string, unknown>,
  columnMap?: ColumnMap
): T {
  const entity: Record<string, unknown> = {};
  for (const [col, value] of Object.entries(row)) {
    const prop = getEntityProp(col, columnMap);
    entity[prop] = value;
  }
  return entity as T;
}

/**
 * Convert entity to DB row. Input entity has camelCase; output has DB column names.
 */
export function toRow<T extends object>(
  entity: T,
  columnMap?: ColumnMap
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [prop, value] of Object.entries(entity)) {
    const col = getColumnName(prop, columnMap);
    row[col] = value;
  }
  return row;
}
