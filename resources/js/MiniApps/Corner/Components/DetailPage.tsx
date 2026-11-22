import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { formatPlainDate } from '@/lib/dates';
import { DoneGlyph } from '@/MiniApps/Corner/Components/DoneMark';
import type { MentionedInRef } from '@/MiniApps/Corner/Components/MentionedInList';
import MentionedInList from '@/MiniApps/Corner/Components/MentionedInList';
import type { UseItemActionsReturn } from '@/MiniApps/Corner/Hooks/useItemActions';
import { CORNER_ROOM } from '@/MiniApps/Corner/Layouts/CornerLayout';
import type { DoneMark } from '@/MiniApps/Corner/lib/done-by';
import type { DoneIcon, ItemPermissions } from '@/MiniApps/Corner/lib/types';
import type { BackTarget } from '@/Shell/Components/BackChevron';
import Page from '@/Shell/Components/Page';
import PersonAvatar from '@/Shell/Components/PersonAvatar';
import type { Auth } from '@/types/auth';
import type { Person } from '@/types/person';

type DetailPageProps = {
    title: string;
    back: BackTarget;
    can: ItemPermissions;
    addedBy: Person;
    doneBy: DoneMark[];
    mentionedIn: MentionedInRef[];
    hero?: ReactNode;
    body?: ReactNode;
    externalCta?: ReactNode;
    isDone: boolean;
    /* The list's word for done; the toggle's pressed state says whether it is. */
    doneLabel: string;
    doneIcon: DoneIcon;
    itemActions: UseItemActionsReturn;
    onEdit: () => void;
};

export default function DetailPage({
    title,
    back,
    can,
    addedBy,
    doneBy,
    mentionedIn,
    hero,
    body,
    externalCta,
    isDone,
    doneLabel,
    doneIcon,
    itemActions,
    onEdit,
}: DetailPageProps) {
    const viewerId = usePage<{ auth: Auth }>().props.auth.user?.id ?? null;

    return (
        <Page tier="app" title={title} room={CORNER_ROOM} back={back}>
            <div className="corner-detail">
                <div className="corner-detail-grid">
                    <div className="corner-detail-main">
                        <article className="corner-detail-article">
                            {hero}
                            <div className="corner-detail-body">
                                {body}

                                <p className="corner-detail-meta corner-added-by">
                                    <PersonAvatar person={addedBy} size={24} />
                                    {addedBy.name}
                                </p>

                                {doneBy.length > 0 && (
                                    <ul className="corner-done-by-list">
                                        {doneBy.map((mark) => (
                                            <li
                                                key={mark.person.id}
                                                className="corner-detail-meta corner-done-by"
                                            >
                                                <PersonAvatar
                                                    person={mark.person}
                                                    size={24}
                                                />
                                                {doneLabel} by{' '}
                                                {mark.person.id === viewerId
                                                    ? 'you'
                                                    : mark.person.name}{' '}
                                                on{' '}
                                                {formatPlainDate(mark.on, {
                                                    intl: {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    },
                                                })}
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                <div className="corner-detail-actions">
                                    {externalCta}

                                    <Toggle
                                        className="corner-done-toggle shell-press"
                                        pressed={isDone}
                                        onPressedChange={
                                            itemActions.handleToggleDone
                                        }
                                        aria-disabled={
                                            itemActions.isTogglePending ||
                                            undefined
                                        }
                                    >
                                        <DoneGlyph
                                            icon={doneIcon}
                                            done={isDone}
                                            size={16}
                                        />
                                        {doneLabel}
                                    </Toggle>

                                    {can.update && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="corner-detail-action shell-press"
                                            onClick={onEdit}
                                        >
                                            Edit
                                        </Button>
                                    )}
                                    {can.delete && (
                                        // No confirm: the removal waits five seconds behind an Undo.
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="corner-detail-action corner-detail-action--destructive shell-press"
                                            onClick={itemActions.handleDelete}
                                        >
                                            Remove
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </article>
                    </div>

                    <MentionedInList mentionedIn={mentionedIn} />
                </div>
            </div>
        </Page>
    );
}
