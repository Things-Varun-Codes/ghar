<?php

namespace Tests\Unit\Mailbox;

use App\MiniApps\Mailbox\Support\ExpenseMath;
use PHPUnit\Framework\TestCase;

class ExpenseMathTest extends TestCase
{
    public function test_an_equal_split_loses_nothing_and_differs_by_one_at_most(): void
    {
        $shares = ExpenseMath::equalShares(10000, [7, 3, 5], 1);

        $this->assertSame(10000, array_sum($shares));
        $this->assertSame(1, max($shares) - min($shares));
        $this->assertSame([3, 5, 7], array_keys($shares));
    }

    public function test_the_leftover_starts_at_the_expense_id_so_it_moves_around(): void
    {
        $this->assertSame([3 => 3334, 5 => 3333, 7 => 3333], ExpenseMath::equalShares(10000, [3, 5, 7], 0));
        $this->assertSame([3 => 3333, 5 => 3334, 7 => 3333], ExpenseMath::equalShares(10000, [3, 5, 7], 1));
        $this->assertSame([3 => 3334, 5 => 3333, 7 => 3334], ExpenseMath::equalShares(10001, [3, 5, 7], 2));
        $this->assertSame([3 => 1, 5 => 0], ExpenseMath::equalShares(1, [3, 5], 4));
    }

    public function test_debtors_and_creditors_are_paired_off_in_id_order(): void
    {
        $this->assertSame(
            [
                ['from' => 1, 'to' => 3, 'amount' => 7],
                ['from' => 1, 'to' => 4, 'amount' => 3],
                ['from' => 2, 'to' => 4, 'amount' => 3],
                ['from' => 2, 'to' => 5, 'amount' => 6],
            ],
            ExpenseMath::simplify([5 => 6, 4 => 6, 3 => 7, 2 => -9, 1 => -10]),
        );

        $this->assertSame([], ExpenseMath::simplify([1 => 0, 2 => 0]));
    }

    /** Matching the biggest debtor to the biggest creditor brought a 1-unit 1 -> 5 debt back here. */
    public function test_paying_one_suggestion_does_not_bring_the_pair_back(): void
    {
        $nets = [1 => -10, 2 => -9, 3 => 7, 4 => 6, 5 => 6];

        foreach (ExpenseMath::simplify($nets) as $paid) {
            $after = ExpenseMath::simplify(self::pay($nets, $paid, $paid['amount']));

            $this->assertSame([], self::between($after, $paid['from'], $paid['to']));
        }
    }

    public function test_random_ledgers_balance_and_settle_without_disturbing_other_debts(): void
    {
        mt_srand(20261125);

        for ($case = 0; $case < 400; $case++) {
            $members = range(1, mt_rand(2, 8));
            $groups = [];

            for ($g = 0, $groupCount = mt_rand(1, 3); $g < $groupCount; $g++) {
                $nets = self::nets($this->randomExpenses($members));
                $payments = ExpenseMath::simplify($nets);
                $groups[] = $nets;

                $this->assertSame(0, array_sum($nets));
                $this->assertLessThanOrEqual(count($members) - 1, count($payments));
                $this->assertSame($payments, ExpenseMath::simplify(array_reverse($nets, preserve_keys: true)));

                if ($payments !== []) {
                    $i = array_rand($payments);
                    $one = $payments[$i];
                    $others = $payments;
                    unset($others[$i]);

                    $this->assertSame(array_values($others), ExpenseMath::simplify(self::pay($nets, $one, $one['amount'])));

                    if ($one['amount'] > 1) {
                        $half = intdiv($one['amount'], 2);
                        $shrunk = $payments;
                        $shrunk[$i]['amount'] -= $half;

                        $this->assertSame($shrunk, ExpenseMath::simplify(self::pay($nets, $one, $half)));
                    }
                }

                foreach ($payments as $payment) {
                    $this->assertGreaterThan(0, $payment['amount']);
                    $nets = self::pay($nets, $payment, $payment['amount']);
                }

                $this->assertSame([], array_filter($nets));
            }

            // Settling up from the overview: every payment between two people, in every group.
            [$a, $b] = [$members[array_rand($members)], $members[array_rand($members)]];

            foreach ($groups as $nets) {
                foreach (self::between(ExpenseMath::simplify($nets), $a, $b) as $payment) {
                    $nets = self::pay($nets, $payment, $payment['amount']);
                }

                // No payment is left between them, so what they owe each other overall is nothing.
                $this->assertSame([], self::between(ExpenseMath::simplify($nets), $a, $b));
                $this->assertSame(0, array_sum($nets));
            }
        }
    }

    /**
     * @param  list<int>  $members
     * @return list<array{paid_by: int, amount: int, shares: array<int, int>}>
     */
    private function randomExpenses(array $members): array
    {
        $expenses = [];

        for ($id = 1, $count = mt_rand(1, 12); $id <= $count; $id++) {
            $amount = mt_rand(1, 500000);
            $participants = array_values(array_filter($members, fn (): bool => mt_rand(0, 2) > 0)) ?: [$members[0]];

            if (mt_rand(0, 1) === 1) {
                $shares = ExpenseMath::equalShares($amount, $participants, $id);
            } else {
                $shares = array_fill_keys($participants, 0);
                $shares[$participants[0]] = $amount;
            }

            $this->assertSame($amount, array_sum($shares));
            $expenses[] = ['paid_by' => $members[array_rand($members)], 'amount' => $amount, 'shares' => $shares];
        }

        return $expenses;
    }

    /**
     * @param  array<int, int>  $nets
     * @param  array{from: int, to: int, amount: int}  $payment
     * @return array<int, int>
     */
    private static function pay(array $nets, array $payment, int $amount): array
    {
        $nets[$payment['from']] += $amount;
        $nets[$payment['to']] -= $amount;

        return $nets;
    }

    /**
     * @param  list<array{from: int, to: int, amount: int}>  $payments
     * @return list<array{from: int, to: int, amount: int}>
     */
    private static function between(array $payments, int $a, int $b): array
    {
        return array_values(array_filter(
            $payments,
            fn (array $payment): bool => [$payment['from'], $payment['to']] === [$a, $b] || [$payment['from'], $payment['to']] === [$b, $a],
        ));
    }

    /**
     * What ExpenseBalances sums in SQL: what each person paid, less their shares.
     *
     * @param  list<array{paid_by: int, amount: int, shares: array<int, int>}>  $expenses
     * @return array<int, int>
     */
    private static function nets(array $expenses): array
    {
        $nets = [];

        foreach ($expenses as $expense) {
            $nets[$expense['paid_by']] = ($nets[$expense['paid_by']] ?? 0) + $expense['amount'];

            foreach ($expense['shares'] as $userId => $share) {
                $nets[$userId] = ($nets[$userId] ?? 0) - $share;
            }
        }

        return $nets;
    }
}
