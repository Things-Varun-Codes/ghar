/** "1 moment", "3 moments"; pass `many` when adding an s isn't the plural. */
export function count(n: number, one: string, many = `${one}s`): string {
    return `${n} ${n === 1 ? one : many}`;
}
