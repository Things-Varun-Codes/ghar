<?php

namespace App\MiniApps\Mailbox\Controllers;

use App\MiniApps\Mailbox\Support\EntryTypes;
use App\MiniApps\Mailbox\Support\MailboxPeeks;
use App\MiniApps\Mailbox\Support\MailboxSummary;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MailboxController
{
    public function index(Request $request, MailboxPeeks $peeks): Response
    {
        return Inertia::render('MiniApps/Mailbox/Pages/Landing', [
            'types' => EntryTypes::enabled(),
            'mailboxSummary' => MailboxSummary::forUser($request->user()),
            'mailboxPeeks' => $peeks->forUser($request->user()),
        ]);
    }
}
