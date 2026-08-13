<?php

namespace App\Http\Controllers;

use App\Services\ArgoXRadioState;
use Illuminate\Http\JsonResponse;

class ArgoXRadioController extends Controller
{
    public function __construct(private readonly ArgoXRadioState $state) {}

    public function __invoke(): JsonResponse
    {
        $snapshot = $this->state->snapshot();

        if ($snapshot === null) {
            return response()->json([
                'radios' => [],
                'total' => 0,
                'with_position' => 0,
                'online' => 0,
                'connected' => false,
                'updated_at' => now()->toIso8601String(),
                'unavailable' => true,
            ], 503);
        }

        return response()->json($snapshot);
    }
}
