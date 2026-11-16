<?php

namespace App\MiniApps\Corner\Controllers;

use App\MiniApps\Corner\Support\CornerSummary;
use Inertia\Inertia;
use Inertia\Response;

class CornerController
{
    public function index(): Response
    {
        return Inertia::render('MiniApps/Corner/Pages/Landing', [
            'cornerSummary' => CornerSummary::build(),
        ]);
    }
}
