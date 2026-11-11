// RTL only auto-registers cleanup with Vitest globals on, which are off here.
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
    cleanup();
});
