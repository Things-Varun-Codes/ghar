import type { Auth } from '@/types/auth';
import type { MiniApp } from '@/types/miniapp';

declare module 'react' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- an augmentation must repeat React's type parameter
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

/*
 * sharedPageProps — mirrors what app/Http/Middleware/HandleInertiaRequests::share()
 * actually returns. Update both sides together when the shape changes.
 */
declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            miniApps: MiniApp[];
            [key: string]: unknown;
        };
    }
}
