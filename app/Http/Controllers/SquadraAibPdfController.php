<?php

namespace App\Http\Controllers;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SquadraAibPdfController extends Controller
{
    public function export(Request $request)
    {
        $validated = $request->validate([
            'squadra' => 'required|array',
            'squadra.id' => 'required|string',
            'squadra.nome' => 'required|string',
            'squadra.associazione_appartenenza' => 'nullable|string',
            'squadra.stato' => 'nullable|string',
            'squadra.disponibile_fino' => 'nullable|string',
            'mezzi' => 'nullable|array',
            'mezzi.*.id' => 'nullable|string',
            'mezzi.*.modello' => 'nullable|string',
            'mezzi.*.targa' => 'nullable|string',
            'mezzi.*.tipo' => 'nullable|string',
            'mezzi.*.stato' => 'nullable|string',
            'equipaggio' => 'required|array',
            'equipaggio.*.id' => 'nullable|string',
            'equipaggio.*.nome' => 'required|string',
            'equipaggio.*.cognome' => 'required|string',
            'equipaggio.*.cf' => 'nullable|string',
            'equipaggio.*.ruolo' => 'nullable|string',
            'equipaggio.*.associazione_appartenenza' => 'nullable|string',
            'equipaggio.*.telefono' => 'nullable|string',
            'equipaggio.*.stato' => 'nullable|string',
        ]);

        $squadra = $validated['squadra'];
        $oggi = now()->timezone('Europe/Rome');
        $dataIntervento = [
            'completa' => $oggi->format('d/m/Y H:i'),
            'data' => $oggi->format('d/m/Y'),
            'ora' => $oggi->format('H:i'),
            'file' => $oggi->format('Y-m-d'),
            'giorno' => $oggi->format('d'),
            'mese' => $oggi->format('m'),
            'anno' => $oggi->format('Y'),
        ];

        $disponibileFino = trim((string) ($squadra['disponibile_fino'] ?? ''));
        $pdf = Pdf::loadView('pdf.squadra-aib', [
            'squadra' => $squadra,
            'mezzi' => $validated['mezzi'] ?? [],
            'equipaggio' => $validated['equipaggio'],
            'dataIntervento' => $dataIntervento,
            'protocollo' => '',
            'oraInizio' => '8:00',
            'oraFine' => $disponibileFino,
        ])->setPaper('a4', 'portrait');

        $filename = 'Squadra AIB-'.Str::slug($squadra['nome']).'-'.$dataIntervento['file'].'.pdf';

        return $pdf->download($filename);
    }
}
