<?php

namespace App\Http\Controllers;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ServizioPdfController extends Controller
{
    public function export(Request $request)
    {
        $validated = $request->validate([
            'servizio' => 'required|array',
            'servizio.id' => 'required|string',
            'servizio.tipo' => 'required|string',
            'servizio.data' => 'required|string',
            'servizio.stato' => 'required|string',
            'servizio.note' => 'nullable|string',
            'servizio.volontariIds' => 'nullable|array',
            'mezzi' => 'nullable|array',
            'mezzi.*.modello' => 'nullable|string',
            'mezzi.*.targa' => 'nullable|string',
            'mezzi.*.tipo' => 'nullable|string',
            'mezzi.*.stato' => 'nullable|string',
            'equipaggio' => 'required|array|min:1',
            'equipaggio.*.nome' => 'required|string',
            'equipaggio.*.cognome' => 'required|string',
            'equipaggio.*.cf' => 'nullable|string',
            'equipaggio.*.ruolo' => 'nullable|string',
            'equipaggio.*.telefono' => 'nullable|string',
            'equipaggio.*.stato' => 'nullable|string',
        ]);

        if ($validated['servizio']['stato'] !== 'Completato') {
            return response()->json(['message' => 'Il PDF è disponibile solo per servizi completati.'], 422);
        }

        $dataIntervento = $this->formatDataIntervento($validated['servizio']['data']);
        $exportatoIl = now()->timezone('Europe/Rome')->format('d/m/Y H:i');

        $pdf = Pdf::loadView('pdf.riepilogo-intervento', [
            'servizio' => $validated['servizio'],
            'mezzi' => $validated['mezzi'] ?? [],
            'equipaggio' => $validated['equipaggio'],
            'dataIntervento' => $dataIntervento,
            'exportatoIl' => $exportatoIl,
        ])->setPaper('a4', 'portrait');

        $filename = 'riepilogo-intervento-'.Str::slug($validated['servizio']['tipo']).'-'.$dataIntervento['file'].'.pdf';

        return $pdf->download($filename);
    }

    /**
     * @return array{completa: string, data: string, ora: string, file: string}
     */
    private function formatDataIntervento(string $raw): array
    {
        try {
            $dt = new \DateTimeImmutable($raw);
            $dt = $dt->setTimezone(new \DateTimeZone('Europe/Rome'));
        } catch (\Exception) {
            return [
                'completa' => $raw,
                'data' => $raw,
                'ora' => '—',
                'file' => date('Y-m-d'),
            ];
        }

        return [
            'completa' => $dt->format('d/m/Y H:i'),
            'data' => $dt->format('d/m/Y'),
            'ora' => $dt->format('H:i'),
            'file' => $dt->format('Y-m-d'),
        ];
    }
}
