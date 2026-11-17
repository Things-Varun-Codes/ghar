import * as Sentry from '@sentry/react';
import { Icon } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { IconPaths } from '@/Shell/linkables/lucide';
import {
    iconNode,
    iconPathsIfLoaded,
    loadIconPaths,
} from '@/Shell/linkables/lucide';

const FALLBACK = 'bookmark';

type Props = Omit<LucideProps, 'ref' | 'name'> & {
    name: string | null | undefined;
};

/*
 * A lucide icon by name. The drawings arrive as one chunk the first time any icon is needed;
 * until then a box of the icon's size holds its place, so nothing moves when it draws.
 */
export default function LinkableIcon({ name, size = 24, ...props }: Props) {
    const [data, setData] = useState<IconPaths | null>(iconPathsIfLoaded);

    useEffect(() => {
        if (data !== null) {
            return;
        }

        let live = true;

        loadIconPaths()
            .then((loaded) => {
                if (live) {
                    setData(loaded);
                }
            })
            // The reserved box stays empty; the next icon on the page tries the chunk again.
            .catch((error: unknown) => {
                Sentry.captureException(error, {
                    tags: {
                        component: 'Shell/LinkableIcon',
                        action: 'load-icons',
                    },
                });
            });

        return () => {
            live = false;
        };
    }, [data]);

    const node =
        data && (iconNode(data, name || FALLBACK) ?? iconNode(data, FALLBACK));

    if (!node) {
        return (
            <span
                aria-hidden="true"
                style={{ display: 'inline-block', width: size, height: size }}
            />
        );
    }

    return <Icon iconNode={node} aria-hidden size={size} {...props} />;
}
