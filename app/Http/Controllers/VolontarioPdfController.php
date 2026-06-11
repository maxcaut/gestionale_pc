<?php

namespace App\Http\Controllers;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class VolontarioPdfController extends Controller
{
    public function export(Request $request)
    {
        $validated = $request->validate([
            'volontario' => 'required|array',
            'volontario.id' => 'required|string',
            'volontario.nome' => 'required|string',
            'volontario.cognome' => 'required|string',
            'volontario.cf' => 'nullable|string',
            'volontario.data_nascita' => 'nullable|string',
            'volontario.luogo_nascita' => 'nullable|string',
            'volontario.comune_residenza' => 'nullable|string',
            'volontario.via_residenza' => 'nullable|string',
            'volontario.telefono' => 'nullable|string',
            'volontario.email' => 'nullable|email',
            'volontario.ruolo' => 'nullable|string',
            'volontario.stato' => 'nullable|string',
            'volontario.associazione_appartenenza' => 'nullable|string',
            'volontario.censito' => 'required|boolean',
        ]);

        if ($validated['volontario']['censito'] === true) {
            return response()->json(['message' => 'Il PDF è disponibile solo per volontari non censiti.'], 422);
        }

        $volontario = $validated['volontario'];
        $pdf = Pdf::loadView('pdf.volontario-non-censito', [
            'volontario' => $volontario,
            'generatoIl' => now()->timezone('Europe/Rome')->format('d/m/Y H:i'),
        ])->setPaper('a4', 'portrait');

        $filename = 'volontario-non-censito-'.Str::slug(($volontario['cognome'] ?? '').' '.($volontario['nome'] ?? '')).'.pdf';

        return $pdf->download($filename);
    }
}
