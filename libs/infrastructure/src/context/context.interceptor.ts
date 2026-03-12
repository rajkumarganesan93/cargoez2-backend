import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { runWithContext, RequestContext } from './request-context';

@Injectable()
export class ContextInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // Use the context set by ContextGuard, or create a minimal one
    const ctx: RequestContext = request.requestContext || {
      requestId: uuidv4(),
      userId: request.user?.sub || request.user?.preferred_username,
      userEmail: request.user?.email,
      permissions: [],
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
