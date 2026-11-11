<?php

namespace App\MiniApps\Mailbox\Controllers;

use App\MiniApps\Mailbox\Support\MailboxSummary;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MailboxController
{
    public function index(Request $request): Response
    {
        return Inertia::render('MiniApps/Mailbox/Pages/Landing', [
            'mailboxSummary' => MailboxSummary::forUser($request->user()),
        ]);
    }
}
