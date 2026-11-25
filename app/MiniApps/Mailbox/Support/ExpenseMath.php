<?php

namespace App\MiniApps\Mailbox\Support;

/**
 * The arithmetic of shared expenses, on whole minor units and with no database, so every rule
 * about who owes what can be tested on its own.
 */
final class ExpenseMath
{
    /**
     * Everyone gets the floor; the units left over go one each, starting at ($expenseId mod n)
     * among the participants in id order, so the same person isn't always the one paying more.
     *
     * @param  array<int, int>  $userIds
     * @return array<int, int> user id => share
     */
    public static function equalShares(int $amount, array $userIds, int $expenseId): array
    {
        $ids = array_values(array_unique($userIds));
        sort($ids);
        $n = count($ids);

        if ($n === 0) {
            return [];
        }

        $shares = array_fill_keys($ids, intdiv($amount, $n));

        for ($k = 0; $k < $amount % $n; $k++) {
            $shares[$ids[($expenseId + $k) % $n]]++;
        }

        return $shares;
    }

    /**
     * A short list of payments that clears the nets. Debtors and creditors each stand in user id
     * order and are paired off down the two lines, moving on from whoever reaches zero, so there
     * are at most n - 1 payments and the same nets always give the same ones. Each payment is where
     * a debtor's stretch of one line overlaps a creditor's stretch of the other, which is why
     * making one of them, in full or in part, leaves every other payment as it was.
     *
     * @param  array<int, int>  $nets
     * @return list<array{from: int, to: int, amount: int}>
     */
    public static function simplify(array $nets): array
    {
        ksort($nets);
        $debtors = array_filter($nets, fn (int $net): bool => $net < 0);
        $creditors = array_filter($nets, fn (int $net): bool => $net > 0);
        $payments = [];

        while ($debtors !== [] && $creditors !== []) {
            $debtor = array_key_first($debtors);
            $creditor = array_key_first($creditors);
            $amount = min(-$debtors[$debtor], $creditors[$creditor]);
            $payments[] = ['from' => $debtor, 'to' => $creditor, 'amount' => $amount];

            if (($debtors[$debtor] += $amount) === 0) {
                unset($debtors[$debtor]);
            }

            if (($creditors[$creditor] -= $amount) === 0) {
                unset($creditors[$creditor]);
            }
        }

        return $payments;
    }
}
