<?php

namespace App\MiniApps\History\Console;

use Illuminate\Console\Command;

class SendMorningMemories extends Command
{
    protected $signature = 'history:morning-memories';

    protected $description = "Push the morning digest of today's birthdays and memories, once per household day.";

    public function handle(): int
    {
        return Command::SUCCESS;
    }
}
