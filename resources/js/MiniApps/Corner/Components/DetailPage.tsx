import { CheckCircle2, Circle } from 'lucide-react';
import type { ReactNode } from 'react';

import { Toggle } from '@/components/ui/toggle';
import type { MentionedInRef } from '@/MiniApps/Corner/Components/MentionedInList';
import MentionedInList from '@/MiniApps/Corner/Components/MentionedInList';
import type {
    ItemPermissions,
    UseItemActionsReturn,
} from '@/MiniApps/Corner/Hooks/useItemActions';
import HeartMark from '@/Shell/Components/HeartMark';
import Page from '@/Shell/Components/Page';

type DetailPageProps = {
    title: string;
    can: ItemPermissions;
    addedByName: string;
    metaSuffix?: ReactNode;
    mentionedIn: MentionedInRef[];
    hero?: () => ReactNode;
    body?: () => ReactNode;
    externalCta?: () => ReactNode;
    isDone: boolean;
    doneLabel: { active: string; done: string };
    doneIcon?: 'check' | 'heart';
    itemActions: UseItemActionsReturn;
};

export default function DetailPage({
    title,
    can,
    addedByName,
    metaSuffix,
    mentionedIn,
    hero,
    body,
    externalCta,
    isDone,
    doneLabel,
    doneIcon = 'check',
    itemActions,
}: DetailPageProps) {
    return (
        <Page tier="app" title={title} backChevron>
            <div className="corner-detail-grid">
                <div className="corner-detail-main">
                    <article className="corner-detail-article">
                        {hero?.()}
                        {body?.()}

                        <p className="corner-detail-meta">
                            Added by {addedByName}
                            {metaSuffix && <> · {metaSuffix}</>}
                        </p>

                        <div className="corner-detail-actions">
                            {externalCta?.()}

                            <Toggle
                                className="corner-done-toggle"
                                pressed={isDone}
                                onPressedChange={itemActions.handleToggleDone}
                            >
                                {doneIcon === 'heart' ? (
                                    <HeartMark size={16} filled={isDone} />
                                ) : isDone ? (
                                    <CheckCircle2
                                        aria-hidden="true"
                                        size={16}
                                        strokeWidth={2}
                                    />
                                ) : (
                                    <Circle
                                        aria-hidden="true"
                                        size={16}
                                        strokeWidth={2}
                                    />
                                )}
                                {isDone ? doneLabel.done : doneLabel.active}
                            </Toggle>

                            {can.update && (
                                <button
                                    type="button"
                                    className="corner-detail-action"
                                    onClick={itemActions.handleEdit}
                                >
                                    Edit
                                </button>
                            )}
                            {can.delete && (
                                <button
                                    type="button"
                                    className="corner-detail-action"
                                    onClick={itemActions.handleDelete}
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    </article>
                </div>

                <MentionedInList mentionedIn={mentionedIn} />
            </div>
        </Page>
    );
}
