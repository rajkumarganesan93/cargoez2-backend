export interface AbacContext {
  userId: string;
  tenantId?: string;
  roles: string[];
  department?: string;
  [key: string]: any;
}

export interface AbacResult {
  allowed: boolean;
  filters?: Record<string, any>;
}

export class AbacEvaluator {
  static evaluate(conditions: Record<string, any> | null, context: AbacContext, requestData?: Record<string, any>): AbacResult {
    if (!conditions) return { allowed: true };

    const filters: Record<string, any> = {};

    if (conditions['tenant_isolation'] && context.tenantId) {
      filters['tenant_id'] = context.tenantId;
    }

    if (conditions['ownership_only']) {
      filters['created_by'] = context.userId;
    }

    if (conditions['department'] && Array.isArray(conditions['department'])) {
      if (!context.department || !conditions['department'].includes(context.department)) {
        return { allowed: false };
      }
    }

    if (conditions['max_amount'] != null && requestData) {
      const amount = requestData['amount'] ?? requestData['total'] ?? 0;
      if (Number(amount) > Number(conditions['max_amount'])) {
        return { allowed: false };
      }
    }

    if (conditions['time_window']) {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const currentTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      const { from, to } = conditions['time_window'];
      if (currentTime < from || currentTime > to) {
        return { allowed: false };
      }
    }

    if (conditions['custom_rules'] && Array.isArray(conditions['custom_rules'])) {
      for (const rule of conditions['custom_rules']) {
        if (!requestData) continue;
        const fieldValue = requestData[rule.field];
        const result = this.evaluateRule(rule.operator, fieldValue, rule.values);
        if (!result) return { allowed: false };
      }
    }

    return { allowed: true, filters: Object.keys(filters).length > 0 ? filters : undefined };
  }

  private static evaluateRule(operator: string, fieldValue: any, values: any[]): boolean {
    switch (operator) {
      case 'eq': return fieldValue === values[0];
      case 'ne': return fieldValue !== values[0];
      case 'in': return values.includes(fieldValue);
      case 'not_in': return !values.includes(fieldValue);
      case 'gt': return Number(fieldValue) > Number(values[0]);
      case 'gte': return Number(fieldValue) >= Number(values[0]);
      case 'lt': return Number(fieldValue) < Number(values[0]);
      case 'lte': return Number(fieldValue) <= Number(values[0]);
      default: return true;
    }
  }
}
