import { router, usePage } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formSubmitOptions } from '@/lib/mutation';
import { MOMENT_ONLY } from '@/MiniApps/History/lib/momentVisit';
import { relativeTime } from '@/MiniApps/History/lib/relativeTime';
import type { EventComment, HistoryEvent } from '@/MiniApps/History/lib/types';
import comments from '@/routes/apps/our-history/events/comments';
import PersonAvatar from '@/Shell/Components/PersonAvatar';

/* EventComment::MAX_LENGTH */
export const COMMENT_MAX_LENGTH = 2000;

export const SOMEONE = 'Someone';

type Props = {
    event: HistoryEvent;
    /* Held by the sheet, so an unsent comment survives Edit and feeds the draft gate. */
    draft: string;
    onDraftChange: (draft: string) => void;
    onDelete: (comment: EventComment) => void;
};

export default function CommentsSection({
    event,
    draft,
    onDraftChange,
    onDelete,
}: Props) {
    const fieldId = useId();
    const errorId = `${fieldId}-error`;
    const [posting, setPosting] = useState(false);
    // The server's answer to the last post shows until the comment is changed.
    const [edited, setEdited] = useState(true);
    const bodyError = usePage().props.errors?.body;
    const error = !edited && bodyError ? bodyError : null;
    const blank = draft.trim() === '';

    const post = () => {
        if (blank || posting) {
            return;
        }

        setEdited(false);
        router.post(
            comments.store(event.id).url,
            { body: draft },
            {
                ...MOMENT_ONLY,
                ...formSubmitOptions({
                    component: 'History/CommentsSection',
                    action: 'comment.store',
                    isShownField: (key) => key === 'body',
                    message: "Couldn't post that comment. Try again.",
                    onSuccess: () => onDraftChange(''),
                }),
                onStart: () => setPosting(true),
                onFinish: () => setPosting(false),
            },
        );
    };

    return (
        <section
            className="history-comments"
            aria-labelledby={`${fieldId}-head`}
        >
            <h3 id={`${fieldId}-head`} className="history-section-title">
                Comments
                {event.comments.length > 0 && (
                    <span className="history-section-count">
                        {' · '}
                        {event.comments.length}
                    </span>
                )}
            </h3>

            {event.comments.length > 0 && (
                <ol className="history-comment-list">
                    {event.comments.map((comment) => {
                        const name = comment.author?.name ?? SOMEONE;

                        return (
                            <li key={comment.id} className="history-comment">
                                <PersonAvatar
                                    person={
                                        comment.author ?? {
                                            name: SOMEONE,
                                            avatar_url: null,
                                        }
                                    }
                                    size={32}
                                    className="history-comment-face"
                                />
                                <div className="history-comment-main">
                                    <p className="history-comment-meta">
                                        <span className="history-comment-author">
                                            {name}
                                        </span>
                                        <time dateTime={comment.created_at}>
                                            {relativeTime(comment.created_at)}
                                        </time>
                                    </p>
                                    <p className="history-comment-body">
                                        {comment.body}
                                    </p>
                                </div>
                                {comment.can.delete && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="history-comment-delete"
                                        aria-label={`Delete the comment from ${name}`}
                                        onClick={() => onDelete(comment)}
                                    >
                                        <Trash2
                                            aria-hidden="true"
                                            size={18}
                                            strokeWidth={1.5}
                                        />
                                    </Button>
                                )}
                            </li>
                        );
                    })}
                </ol>
            )}

            <form
                className="history-comment-form"
                onSubmit={(e) => {
                    e.preventDefault();
                    post();
                }}
            >
                <label htmlFor={fieldId} className="history-field-label">
                    Add a comment
                </label>
                <Textarea
                    id={fieldId}
                    value={draft}
                    maxLength={COMMENT_MAX_LENGTH}
                    rows={2}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    onChange={(e) => {
                        onDraftChange(e.target.value);
                        setEdited(true);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            post();
                        }
                    }}
                    className="history-comment-input"
                />
                {error && (
                    <p
                        id={errorId}
                        role="alert"
                        className="mt-2 text-(length:--text-small) text-(--history-destructive)"
                    >
                        {error}
                    </p>
                )}
                <div className="history-comment-actions">
                    <Button
                        type="submit"
                        variant="outline"
                        disabled={blank || posting}
                        className="history-btn-post h-auto shadow-none"
                    >
                        {posting ? 'Posting…' : 'Post comment'}
                    </Button>
                </div>
            </form>
        </section>
    );
}
