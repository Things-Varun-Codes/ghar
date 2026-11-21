<?php

namespace App\Shell\Controllers;

use App\Shell\Services\PlaceSearch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PlaceSearchController
{
    public function search(Request $request, PlaceSearch $places): JsonResponse
    {
        $validated = $request->validate(['q' => ['required', 'string', 'min:2', 'max:100']]);

        return response()->json(['results' => $places->search($validated['q'])]);
    }
}
