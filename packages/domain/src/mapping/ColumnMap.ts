/**
 * Column mapping: entity property (camelCase) -> DB column name.
 * Entity properties are always camelCase; mapper converts row (db) <-> entity.
 *
 * Example: { name: 'usr_nm', email: 'usr_em', createdAt: 'crt_at' }
 * When no alias: snake_case is used (createdAt -> created_at)
 */
export type ColumnMap = Record<string, string>;
