import { z } from 'zod';

/**
 * Pagination schema for list endpoints
 */
export const paginationSchema = z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        nextCursor?: string;
        hasMore: boolean;
        count: number;
    };
}
