import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { runWithContext, RequestContext } from './request-context';

@Injectable()
export class ContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const user = request.user;

    const requestId = uuidv4();
    response.setHeader('X-Request-Id', requestId);

    const ctx: RequestContext = {
      requestId,
      userId: user?.preferred_username || user?.sub || undefined,
      userEmail: user?.email || undefined,
      roles: user?.realm_access?.roles || [],
      tenantId: request.headers['x-tenant-id'] || undefined,
      timestamp: new Date(),
    };

    return new Observable((subscriber) => {
      runWithContext(ctx, () => {
        next.handle().subscribe({
          next: (val) => subscriber.next(val),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
