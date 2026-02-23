# @cargoez2/api

API response builder functions for consistent JSON response formatting across all services.

## Installation

```bash
npm install @cargoez2/api
```

## What's included

| Export              | Type     | Purpose                                     |
| ------------------- | -------- | ------------------------------------------- |
| `success(data?, message?)` | function | Build a success response            |
| `error(message, statusCode?, stack?)` | function | Build an error response   |
| `successPaginated(items, meta)` | function | Build a paginated success response |
| `ApiSuccessResponse` | type   | Re-exported from @cargoez2/domain           |
| `ApiErrorResponse`   | type   | Re-exported from @cargoez2/domain           |
| `ApiResponse`        | type   | Re-exported from @cargoez2/domain           |
| `PaginatedResult`    | type   | Re-exported from @cargoez2/domain           |

## Usage

### Success response

```typescript
import { success } from '@cargoez2/api';

// In a controller:
const user = await createUserUseCase.execute(input);
return res.status(201).json(success(user));
// Response: { success: true, data: { id: '...', name: '...' }, timestamp: '...' }

// With message only:
return res.status(200).json(success(undefined, 'User deleted successfully'));
// Response: { success: true, message: 'User deleted successfully', timestamp: '...' }
```

### Error response

```typescript
import { error } from '@cargoez2/api';

// In a controller:
if (!req.body.email) {
  return res.status(400).json(error('Email is required', 400));
}
// Response: { success: false, error: 'Email is required', statusCode: 400, timestamp: '...' }
```

### Paginated response

```typescript
import { successPaginated } from '@cargoez2/api';

// In a controller after fetching paginated data:
const result = await getAllProductsUseCase.execute({ pagination: { page: 1, limit: 20 } });
return res.status(200).json(successPaginated(result.items, result.meta));
// Response:
// {
//   success: true,
//   data: {
//     items: [...],
//     meta: { total: 150, page: 1, limit: 20, totalPages: 8 }
//   },
//   timestamp: '...'
// }
```

### Standard response shapes

All APIs in the platform return one of these shapes:

```typescript
// Success
{
  success: true,
  data?: T,
  message?: string,
  timestamp: string
}

// Error
{
  success: false,
  error: string,
  statusCode: number,
  timestamp: string,
  stack?: string  // only in non-production
}
```

## Dependencies

- `@cargoez2/domain` -- response type definitions
