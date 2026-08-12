<?php

namespace App\Http\Controllers;

use App\Support\PdfEmailDelivery;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Throwable;

class SquadraAibPdfController extends Controller
{
    public function export(Request $request)
    {
        $validated = $request->validate([
            'delivery' => 'nullable|string|in:download,email',
            'email' => 'required_if:delivery,email|array',
            'email.to' => 'required_if:delivery,email|email',
            'email.subject' => 'nullable|string|max:255',
            'email.body' => 'nullable|string|max:5000',
            'squadra' => 'required|array',
            'squadra.id' => 'required|string',
            'squadra.nome' => 'required|string',
            'squadra.associazione_appartenenza' => 'nullable|string',
            'squadra.legale_rappresentante' => 'nullable|string',
            'squadra.caposquadra_id' => 'nullable|string',
            'squadra.stato' => 'nullable|string',
            'squadra.disponibile_dal' => 'nullable|date',
            'squadra.disponibile_fino' => ['nullable', 'date_format:H:i,H:i:s'],
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
        $equipaggio = $validated['equipaggio'];
        $caposquadraId = trim((string) ($squadra['caposquadra_id'] ?? ''));
        if ($caposquadraId !== '') {
            foreach ($equipaggio as $index => $volontario) {
                if (($volontario['id'] ?? '') === $caposquadraId) {
                    array_splice($equipaggio, $index, 1);
                    array_unshift($equipaggio, $volontario);
                    break;
                }
            }
        }
        $disponibileDal = trim((string) ($squadra['disponibile_dal'] ?? ''));
        $dataProgrammata = $disponibileDal !== ''
            ? Carbon::parse($disponibileDal)->timezone('Europe/Rome')
            : now()->timezone('Europe/Rome');
        $dataIntervento = [
            'completa' => $dataProgrammata->format('d/m/Y H:i'),
            'data' => $dataProgrammata->format('d/m/Y'),
            'ora' => $dataProgrammata->format('H:i'),
            'file' => $dataProgrammata->format('Y-m-d'),
            'giorno' => $dataProgrammata->format('d'),
            'mese' => $dataProgrammata->format('m'),
            'anno' => $dataProgrammata->format('Y'),
        ];

        $disponibileFino = trim((string) ($squadra['disponibile_fino'] ?? ''));
        $oraFine = $disponibileFino !== ''
            ? Carbon::parse($disponibileFino, 'Europe/Rome')->format('H:i')
            : '';
        $pdf = Pdf::loadView('pdf.squadra-aib', [
            'squadra' => $squadra,
            'mezzi' => $validated['mezzi'] ?? [],
            'equipaggio' => $equipaggio,
            'dataIntervento' => $dataIntervento,
            'protocollo' => '',
            'oraInizio' => $dataIntervento['ora'],
            'oraFine' => $oraFine,
        ])->setPaper('a4', 'portrait');

        $filename = 'Squadra AIB-'.Str::slug($squadra['nome']).'-'.$dataIntervento['file'].'.pdf';

        if (($validated['delivery'] ?? 'download') === 'email') {
            try {
                PdfEmailDelivery::send($pdf, $filename, $validated['email']);
            } catch (Throwable $exception) {
                report($exception);

                return response()->json([
                    'message' => 'Errore invio email: '.$exception->getMessage(),
                ], 502);
            }

            return response()->json([
                'message' => 'Invio email avviato. Il PDF verrà inviato a breve.',
                'filename' => $filename,
            ], 202);
        }

        return $pdf->download($filename);
    }
}
