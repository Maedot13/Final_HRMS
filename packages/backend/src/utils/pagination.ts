import { PaginatedResponse, PaginationParams } from '../schemas/pagination.schema';
import { prisma } from '../lib/prisma';

/**
 * Helper to implement cursor-based pagination
 */
export const paginate = async <T>(
    model: any,
    params: PaginationParams,
    where: any = {},
    orderBy: any = { id: 'desc' },
    include?: any
): Promise<PaginatedResponse<T>> => {
    const limit = params.limit || 20;
    const cursor = params.cursor ? { id: parseInt(params.cursor) } : undefined;

    const items = await model.findMany({
        where,
        orderBy,
        take: limit + 1, // Fetch one extra to check if there are more
        cursor,
        skip: cursor ? 1 : 0, // Skip the cursor itself
        include,
    });

    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id.toString() : undefined;

    return {
        data: data as T[],
        pagination: {
            nextCursor,
            hasMore,
            count: data.length,
        },
    };
};
