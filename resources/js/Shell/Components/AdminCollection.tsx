import type { Key, ReactNode } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

/**
 * Where a column goes on a phone card. The card reads: the title (with any subtitle under it),
 * then every other part in column order, then the row's actions.
 *
 * - `title` / `subtitle`: the card's heading lines.
 * - `meta`: a line of small text, after `label: ` when one is given.
 * - `row`: the label on the left, the value on the right (a switch, say).
 * - `block`: the value as it is.
 * - `hidden`: not on the card.
 *
 * `render` replaces the column's cell on the card.
 */
export type AdminCardPart<T> =
    | 'hidden'
    | {
          as: 'title' | 'subtitle' | 'meta' | 'row' | 'block';
          label?: string;
          className?: string;
          render?: (row: T) => ReactNode;
      };

export type AdminColumn<T> = {
    header: string;
    cell: (row: T) => ReactNode;
    className?: string;
    /** A `title` on the cell and the card part, for values that truncate. */
    tooltip?: (row: T) => string;
    card: AdminCardPart<T>;
};

type Props<T> = {
    columns: AdminColumn<T>[];
    rows: T[];
    rowKey: (row: T) => Key;
    actions: {
        cell: (row: T) => ReactNode;
        cellClassName?: string;
        card: (row: T) => ReactNode;
    };
    tableClassName?: string;
    /** `ul` when the cards should read as a list. */
    cardsAs?: 'div' | 'ul';
};

/** An admin list: a table from 760px of container width, cards below it. */
export default function AdminCollection<T>({
    columns,
    rows,
    rowKey,
    actions,
    tableClassName,
    cardsAs = 'div',
}: Props<T>) {
    const Cards = cardsAs;
    const Card = cardsAs === 'ul' ? 'li' : 'div';

    const title = columns.find(
        (c) => c.card !== 'hidden' && c.card.as === 'title',
    );
    const subtitles = columns.filter(
        (c) => c.card !== 'hidden' && c.card.as === 'subtitle',
    );
    const body = columns.filter(
        (c) =>
            c.card !== 'hidden' &&
            c.card.as !== 'title' &&
            c.card.as !== 'subtitle',
    );

    const part = (column: AdminColumn<T>, row: T) => {
        if (column.card === 'hidden') {
            return null;
        }

        const { as, label, className, render } = column.card;
        const value = (render ?? column.cell)(row);
        const tooltip = column.tooltip?.(row);
        const key = column.header;

        switch (as) {
            case 'title':
                return (
                    <p
                        key={key}
                        className={cn('os-admin-strong', className)}
                        title={tooltip}
                    >
                        {value}
                    </p>
                );
            case 'subtitle':
                return (
                    <p
                        key={key}
                        className={cn('os-admin-meta', className)}
                        title={tooltip}
                    >
                        {value}
                    </p>
                );
            case 'meta':
                return (
                    <p
                        key={key}
                        className={cn('os-admin-meta', className)}
                        title={tooltip}
                    >
                        {label && <>{label}: </>}
                        {value}
                    </p>
                );
            case 'row':
                return (
                    <div
                        key={key}
                        className={cn(
                            className,
                            'flex min-h-11 items-center justify-between',
                        )}
                        title={tooltip}
                    >
                        <span className="os-admin-meta">
                            {label ?? column.header}
                        </span>
                        {value}
                    </div>
                );
            case 'block':
                return (
                    <div key={key} className={className} title={tooltip}>
                        {value}
                    </div>
                );
        }
    };

    return (
        <div className="@container">
            <div className="os-admin-surface hidden overflow-x-auto border @min-[760px]:block">
                <Table className={tableClassName}>
                    <TableHeader>
                        <TableRow>
                            {columns.map((column) => (
                                <TableHead key={column.header}>
                                    {column.header}
                                </TableHead>
                            ))}
                            <TableHead className="os-admin-sticky-actions text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={rowKey(row)}>
                                {columns.map((column) => (
                                    <TableCell
                                        key={column.header}
                                        className={column.className}
                                        title={column.tooltip?.(row)}
                                    >
                                        {column.cell(row)}
                                    </TableCell>
                                ))}
                                <TableCell
                                    className={cn(
                                        'os-admin-sticky-actions',
                                        actions.cellClassName,
                                    )}
                                >
                                    {actions.cell(row)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Cards className="flex flex-col gap-3 @min-[760px]:hidden">
                {rows.map((row) => (
                    <Card
                        key={rowKey(row)}
                        className="os-admin-surface border p-4"
                    >
                        {subtitles.length > 0 ? (
                            <div className="mb-3">
                                {title && part(title, row)}
                                {subtitles.map((c) => part(c, row))}
                            </div>
                        ) : (
                            title && part(title, row)
                        )}
                        {body.map((c) => part(c, row))}
                        {actions.card(row)}
                    </Card>
                ))}
            </Cards>
        </div>
    );
}
