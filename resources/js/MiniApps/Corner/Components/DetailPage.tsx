import type { ReactNode } from 'react';

import { Toggle } from '@/components/ui/toggle';
import { DoneGlyph } from '@/MiniApps/Corner/Components/DoneMark';
import type { MentionedInRef } from '@/MiniApps/Corner/Components/MentionedInList';
import MentionedInList from '@/MiniApps/Corner/Components/MentionedInList';
import type {
    ItemPermissions,
    UseItemActionsReturn,
} from '@/MiniApps/Corner/Hooks/useItemActions';
import { CORNER_ROOM } from '@/MiniApps/Corner/Layouts/CornerLayout';
import type { DoneIcon } from '@/MiniApps/Corner/lib/types';
import type { BackTarget } from '@/Shell/Components/BackChevron';
import Page from '@/Shell/Components/Page';

type DetailPageProps = {
    title: string;
    back: BackTarget;
    can: ItemPermissions;
    addedByName: string;
    mentionedIn: MentionedInRef[];
    hero?: ReactNode;
    body?: ReactNode;
    externalCta?: ReactNode;
    isDone: boolean;
    /* The list's word for done; the toggle's pressed state says whether it is. */
    doneLabel: string;
    doneIcon: DoneIcon;
    itemActions: UseItemActionsReturn;
};

export default function DetailPage({
    title,
    back,
    can,
    addedByName,
    mentionedIn,
    hero,
    body,
    externalCta,
    isDone,
    doneLabel,
    doneIcon,
    itemActions,
}: DetailPageProps) {
    return (
        <Page tier="app" title={title} room={CORNER_ROOM} back={back}>
            <div className="corner-detail">
                <div className="corner-detail-grid">
                    <div className="corner-detail-main">
                        <article className="corner-detail-article">
                            {hero}
                            {body}

                            <p className="corner-detail-meta">
                                Added by {addedByName}
                            </p>

                            <div className="corner-detail-actions">
                                {externalCta}

                                <Toggle
                                    className="corner-done-toggle shell-press"
                                    pressed={isDone}
                                    onPressedChange={
                                        itemActions.handleToggleDone
                                    }
                                    aria-disabled={
                                        itemActions.isTogglePending || undefined
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
                                    <button
                                        type="button"
                                        className="corner-detail-action shell-press"
                                        onClick={itemActions.handleEdit}
                                    >
                                        Edit
                                    </button>
                                )}
                                {can.delete && (
                                    <button
                                        type="button"
                                        className="corner-detail-action corner-detail-action--destructive shell-press"
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
            </div>
        </Page>
    );
}
