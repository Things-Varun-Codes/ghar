// RTL only auto-registers cleanup with Vitest globals on, which are off here.
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom has no getEntriesByType, and under the vmThreads pool Node's performance
// isn't there to fill the gap. Inertia reads it on import; with no navigation
// entry it assumes a plain navigation, as it does in Node.
if (typeof window.performance.getEntriesByType !== 'function') {
    window.performance.getEntriesByType = () => [];
}

afterEach(() => {
    cleanup();
});
