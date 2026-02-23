import { createKnex } from '@rajkumarganesan93/shared';
import type { Knex } from 'knex';

let _knex: Knex | undefined;

export function getKnex(): Knex {
  if (!_knex) {
    _knex = createKnex();
  }
  return _knex;
}
