import { formatPlainDate } from '@/lib/dates';
import { formatMoney } from '@/MiniApps/Mailbox/lib/money';
import type { Person } from '@/types/person';

export type ExpenseActivity = {
    id: number;
    action: string;
    actor: Person;
    expense_id: number | null;
    /* Shaped by the action: see ExpenseLedger and ExpenseGroupsController. */
    data: Record<string, unknown> | unknown[] | null;
    at: string;
    can_restore: boolean;
};

type Snapshot = {
    title: string;
    amount: number;
    spent_on: string;
    paid_by_id: number;
    split_mode: string;
    category: string | null;
};

const list = new Intl.ListFormat('en', { type: 'conjunction' });

function changes(
    title: string,
    before: Partial<Snapshot>,
    after: Partial<Snapshot> & { shares?: unknown },
    who: (id: number) => string,
    categoryLabel: (key: string | null) => string,
): string {
    const named = `“${title}”`;
    const parts: string[] = [];

    if (after.title !== undefined) {
        parts.push(`renamed “${before.title}” to ${named}`);
    }

    if (after.amount !== undefined) {
        parts.push(
            `changed the amount of ${named} from ${formatMoney(before.amount ?? 0)} to ${formatMoney(after.amount)}`,
        );
    }

    if (after.spent_on !== undefined) {
        parts.push(
            `moved ${named} from ${formatPlainDate(before.spent_on)} to ${formatPlainDate(after.spent_on)}`,
        );
    }

    if (after.paid_by_id !== undefined) {
        parts.push(
            `changed who paid for ${named} from ${who(before.paid_by_id ?? 0)} to ${who(after.paid_by_id)}`,
        );
    }

    if (after.category !== undefined) {
        parts.push(
            `changed the category of ${named} from ${categoryLabel(before.category ?? null)} to ${categoryLabel(after.category)}`,
        );
    }

    // A new total moves every share with it: only a split changed on its own is news.
    if (
        after.split_mode !== undefined ||
        (after.shares !== undefined && after.amount === undefined)
    ) {
        parts.push(`changed how ${named} is split`);
    }

    return parts.length > 0 ? list.format(parts) : `edited ${named}`;
}

/*
 * One line of a group's activity as a sentence. `who` names a person mid-sentence: "you" for
 * the viewer, a first name for anyone else. `categoryLabel` names a category key, or none.
 */
export function describeActivity(
    activity: ExpenseActivity,
    who: (id: number) => string,
    categoryLabel: (key: string | null) => string,
): string {
    const data = (activity.data ?? {}) as Record<string, never>;
    const expense = `“${data.title}” (${formatMoney(data.amount ?? 0)})`;
    const people = (ids: number[] = []) => list.format(ids.map(who));

    const did = ((): string => {
        switch (activity.action) {
            case 'group.created':
                return 'started the group';
            case 'group.renamed':
                return `renamed the group from “${data.before}” to “${data.after}”`;
            case 'group.members_changed': {
                const { added = [], removed = [] } = data as {
                    added?: number[];
                    removed?: number[];
                };

                return list.format([
                    ...(added.length > 0 ? [`added ${people(added)}`] : []),
                    ...(removed.length > 0
                        ? [`removed ${people(removed)}`]
                        : []),
                ]);
            }
            case 'group.archived':
                return 'archived the group';
            case 'group.unarchived':
                return 'unarchived the group';
            case 'expense.created':
                return `added ${expense}`;
            case 'expense.deleted':
                return `deleted ${expense}`;
            case 'expense.restored':
                return `restored ${expense}`;
            case 'expense.updated':
                return changes(
                    data.title,
                    data.before,
                    data.after,
                    who,
                    categoryLabel,
                );
            case 'settlement.recorded':
                return activity.actor.id === data.from_id
                    ? `recorded paying ${who(data.to_id)} ${formatMoney(data.amount ?? 0)}`
                    : `recorded that ${who(data.from_id)} paid ${who(data.to_id)} ${formatMoney(data.amount ?? 0)}`;
            default:
                return 'made a change';
        }
    })();

    const actor = who(activity.actor.id);

    return `${actor.charAt(0).toUpperCase()}${actor.slice(1)} ${did}`;
}
