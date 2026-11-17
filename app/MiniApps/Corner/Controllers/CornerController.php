<?php

namespace App\MiniApps\Corner\Controllers;

use App\MiniApps\Corner\Models\CornerList;
use App\MiniApps\Corner\Support\CornerSummary;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CornerController
{
    public function index(Request $request): Response
    {
        return Inertia::render('MiniApps/Corner/Pages/Landing', [
            'lists' => CornerSummary::build($request->user()),
            'can' => ['create' => $request->user()->can('create', CornerList::class)],
        ]);
    }
}
