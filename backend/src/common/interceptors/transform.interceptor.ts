import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If the response already has the standard shape, return as-is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Standard success response
        return {
          success: true,
          data: data?.data !== undefined ? data.data : data,
          message: data?.message,
          meta: data?.meta,
        };
      }),
    );
  }
}
