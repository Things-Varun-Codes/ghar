import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * How far this checkout's ports sit from the defaults: the `SERVER_PORT` that
 * scripts/worktree-setup.sh gives a worktree (8001-8099) minus 8000. The main
 * checkout and CI have none, so they keep 8000, 8765 and 8877.
 *
 * @param {string} root
 */
export function portOffset(root) {
    let env;

    try {
        env = readFileSync(path.join(root, '.env'), 'utf8');
    } catch {
        return 0; // No .env yet: the defaults.
    }

    const port = Number(/^SERVER_PORT=(\d+)\s*$/m.exec(env)?.[1]);

    return port > 8000 && port < 8100 ? port - 8000 : 0;
}
