import { ApiError } from '@/lib/api/utils';
function getRateLimitStore() {
    const globalStore = globalThis;
    globalStore.__pocketquadRateLimitStore ??= new Map();
    globalStore.__pocketquadRateLimitSweepCounter ??= 0;
    return globalStore;
}
function getRequestIdentifier(request) {
    const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const realIp = request.headers.get('x-real-ip')?.trim();
    const cfIp = request.headers.get('cf-connecting-ip')?.trim();
    const userAgent = request.headers.get('user-agent')?.trim();
    return forwardedFor || realIp || cfIp || userAgent || 'anonymous';
}
function sweepExpiredEntries(globalStore, now) {
    const store = globalStore.__pocketquadRateLimitStore;
    if (!store)
        return;
    globalStore.__pocketquadRateLimitSweepCounter =
        (globalStore.__pocketquadRateLimitSweepCounter ?? 0) + 1;
    const shouldSweep = store.size >= 500 || (globalStore.__pocketquadRateLimitSweepCounter ?? 0) % 50 === 0;
    if (!shouldSweep) {
        return;
    }
    for (const [key, state] of store.entries()) {
        if (state.resetAt <= now) {
            store.delete(key);
        }
    }
}
export function assertRateLimit(options) {
    const globalStore = getRateLimitStore();
    const store = globalStore.__pocketquadRateLimitStore;
    const now = Date.now();
    sweepExpiredEntries(globalStore, now);
    const identifier = options.identifier?.trim() || getRequestIdentifier(options.request);
    const bucketKey = `${options.key}:${identifier}`;
    const existing = store.get(bucketKey);
    if (!existing || existing.resetAt <= now) {
        const resetAt = now + options.windowMs;
        store.set(bucketKey, { count: 1, resetAt });
        return {
            limit: options.limit,
            remaining: Math.max(0, options.limit - 1),
            resetAt,
        };
    }
    if (existing.count >= options.limit) {
        const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
        throw new ApiError(429, options.message ?? 'Too many requests. Please wait a moment and try again.', {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': options.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(existing.resetAt / 1000).toString(),
        });
    }
    existing.count += 1;
    store.set(bucketKey, existing);
    return {
        limit: options.limit,
        remaining: Math.max(0, options.limit - existing.count),
        resetAt: existing.resetAt,
    };
}
export function withRateLimitHeaders(response, rateLimit) {
    response.headers.set('X-RateLimit-Limit', rateLimit.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimit.resetAt / 1000).toString());
    return response;
}
