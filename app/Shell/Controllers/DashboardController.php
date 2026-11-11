<?php

namespace App\Shell\Controllers;

use App\Shell\Services\DashboardSummaries;
use App\Shell\Support\MiniAppRegistry;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController
{
    public function index(Request $request, DashboardSummaries $summaries): Response
    {
        $user = $request->user();

        $slugs = array_column(MiniAppRegistry::visibleFor($user), 'slug');

        return Inertia::render('Shell/Pages/Dashboard', [
            'summaries' => $summaries->forUser($user, $slugs),
            'previews' => $summaries->previewsFor($user, $slugs),
        ]);
    }
}
