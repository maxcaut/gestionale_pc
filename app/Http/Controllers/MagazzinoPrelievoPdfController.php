<?php

namespace App\Http\Controllers;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MagazzinoPrelievoPdfController extends Controller
{
    public function export(Request $request)
    {
        $validated = $request->validate([
            'prelievo' => 'required|array',
            'prelievo.id' => 'required|string',
            'prelievo.data_prelievo' => 'required|string',
            'prelievo.consegnato_a' => 'required|string',
            'prelievo.associazione_appartenenza' => 'nullable|string',
            'prelievo.stato' => 'required|string|in:aperto,completato',
            'righe' => 'required|array|min:1',
            'righe.*.nome_attrezzatura' => 'required|string',
            'righe.*.associazione_appartenenza' => 'nullable|string',
            'righe.*.tipo_attrezzatura' => 'nullable|string',
            'righe.*.numero_inventario' => 'nullable|string',
            'righe.*.quantita' => 'required|integer|min:1',
        ]);

        if ($validated['prelievo']['stato'] !== 'aperto') {
            return response()->json(['message' => 'La bolla è disponibile solo per prelievi aperti.'], 422);
        }

        $dataPrelievo = $this->formatDate($validated['prelievo']['data_prelievo']);
        $exportatoIl = now()->timezone('Europe/Rome')->format('d/m/Y H:i');

        $pdf = Pdf::loadView('pdf.bolla-prelievo-magazzino', [
            'prelievo' => $validated['prelievo'],
            'righe' => $validated['righe'],
            'dataPrelievo' => $dataPrelievo,
            'exportatoIl' => $exportatoIl,
        ])->setPaper('a4', 'landscape');

        $filename = 'Bolla prelievo-'.Str::slug($validated['prelievo']['consegnato_a']).'-'.$dataPrelievo['file'].'.pdf';

        return $pdf->download($filename);
    }

    /**
     * @return array{display: string, file: string}
     */
    private function formatDate(string $raw): array
    {
        try {
            $date = new \DateTimeImmutable($raw);

            return [
                'display' => $date->format('d/m/Y'),
                'file' => $date->format('Y-m-d'),
            ];
        } catch (\Exception) {
            return [
                'display' => $raw,
                'file' => date('Y-m-d'),
            ];
        }
    }
}
