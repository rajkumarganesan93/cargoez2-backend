import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { InjectKnex } from '@cargoez/shared';

export interface MyPermissionsResult {
  roles: string[];
  modules: Array<{
    code: string;
    name: string;
    icon: string | null;
    screens: Array<{
      code: string;
      name: string;
      operations: string[];
    }>;
  }>;
}

@Injectable()
export class GetMyPermissionsUseCase {
  constructor(@InjectKnex() private readonly knex: Knex) {}

  async execute(roleNames: string[]): Promise<MyPermissionsResult> {
    const rows = await this.knex('role_permissions as rp')
      .join('roles as r', 'r.id', 'rp.role_id')
      .join('permissions as p', 'p.id', 'rp.permission_id')
      .join('modules as m', 'm.id', 'p.module_id')
      .join('screens as s', 's.id', 'p.screen_id')
      .join('operations as o', 'o.id', 'p.operation_id')
      .whereIn('r.name', roleNames)
      .where('r.is_active', true)
      .where('m.is_active', true)
      .where('s.is_active', true)
      .select(
        'm.code as module_code',
        'm.name as module_name',
        'm.icon as module_icon',
        'm.sort_order as module_sort',
        's.code as screen_code',
        's.name as screen_name',
        's.sort_order as screen_sort',
        'o.code as operation_code',
      )
      .orderBy(['m.sort_order', 's.sort_order', 'o.code']);

    const moduleMap = new Map<string, {
      code: string;
      name: string;
      icon: string | null;
      sort: number;
      screens: Map<string, { code: string; name: string; sort: number; operations: Set<string> }>;
    }>();

    for (const row of rows) {
      if (!moduleMap.has(row.module_code)) {
        moduleMap.set(row.module_code, {
          code: row.module_code,
          name: row.module_name,
          icon: row.module_icon,
          sort: row.module_sort,
          screens: new Map(),
        });
      }
      const mod = moduleMap.get(row.module_code)!;
      if (!mod.screens.has(row.screen_code)) {
        mod.screens.set(row.screen_code, {
          code: row.screen_code,
          name: row.screen_name,
          sort: row.screen_sort,
          operations: new Set(),
        });
      }
      mod.screens.get(row.screen_code)!.operations.add(row.operation_code);
    }

    const modules = Array.from(moduleMap.values())
      .sort((a, b) => a.sort - b.sort)
      .map((mod) => ({
        code: mod.code,
        name: mod.name,
        icon: mod.icon,
        screens: Array.from(mod.screens.values())
          .sort((a, b) => a.sort - b.sort)
          .map((screen) => ({
            code: screen.code,
            name: screen.name,
            operations: Array.from(screen.operations).sort(),
          })),
      }));

    return { roles: roleNames, modules };
  }
}
