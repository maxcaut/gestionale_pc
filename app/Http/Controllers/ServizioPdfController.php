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
            'template' => 'nullable|string|in:riepilogo-intervento,template_aib',
            'servizio' => 'required|array',
            'servizio.id' => 'required|string',
            'servizio.tipo' => 'required|string',
            'servizio.data' => 'required|string',
            'servizio.stato' => 'required|string',
            'servizio.tipologia_aib' => 'nullable|string',
            'servizio.note' => 'nullable|string',
            'servizio.richiedente' => 'nullable|string',
            'servizio.indirizzo' => 'nullable|string',
            'servizio.altriEnti' => 'nullable|string',
            'servizio.oraArrivoIncendio' => 'nullable|string',
            'servizio.oraFineIntervento' => 'nullable|string',
            'servizio.oraRientroSede' => 'nullable|string',
            'servizio.superficieCeduo' => 'nullable|array',
            'servizio.superficieAltoFusto' => 'nullable|array',
            'servizio.superficieNonBoscato' => 'nullable|array',
            'servizio.volontariIds' => 'nullable|array',
            'servizio.volontari_art39' => 'nullable|array',
            'servizio.carrelli_trainanti' => 'nullable|array',
            'servizio.carrelli_trainanti.*' => 'nullable|string',
            'mezzi' => 'nullable|array',
            'mezzi.*.id' => 'nullable|string',
            'mezzi.*.modello' => 'nullable|string',
            'mezzi.*.targa' => 'nullable|string',
            'mezzi.*.tipo' => 'nullable|string',
            'mezzi.*.stato' => 'nullable|string',
            'equipaggio' => 'required|array|min:1',
            'equipaggio.*.id' => 'nullable|string',
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

        $template = $validated['template'] ?? 'riepilogo-intervento';
        $dataIntervento = $this->formatDataIntervento($validated['servizio']['data']);
        $exportatoIl = now()->timezone('Europe/Rome')->format('d/m/Y H:i');

        if ($template === 'template_aib') {
            return $this->exportTemplateAib($validated, $dataIntervento);
        }

        $pdf = Pdf::loadView('pdf.riepilogo-intervento', [
            'servizio' => $validated['servizio'],
            'mezzi' => $validated['mezzi'] ?? [],
            'equipaggio' => $validated['equipaggio'],
            'dataIntervento' => $dataIntervento,
            'exportatoIl' => $exportatoIl,
        ])->setPaper('a4', 'landscape');

        $filename = 'Modello A - Presenze ODV-'.Str::slug($validated['servizio']['tipo']).'-'.$dataIntervento['file'].'.pdf';

        return $pdf->download($filename);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @param  array{completa: string, data: string, ora: string, file: string, giorno?: string, mese?: string, anno?: string}  $dataIntervento
     */
    private function exportTemplateAib(array $validated, array $dataIntervento)
    {
        $servizio = $validated['servizio'];
        $equipaggio = $validated['equipaggio'];
        $mezzi = $validated['mezzi'] ?? [];

        [$comune, $via] = $this->parseIndirizzo($servizio['indirizzo'] ?? '');
        $richiedente = $servizio['richiedente'] ?? 'SOPI';
        $richiedenteCode = match ($richiedente) {
            'SORU' => 'RU',
            'SOPI' => 'SO',
            default => 'AL',
        };

        $protocollo = sprintf(
            'PROT U %s%s/%s DEL %s',
            $this->protocolNumber($servizio['id']),
            $richiedenteCode,
            $dataIntervento['anno'] ?? date('Y'),
            $dataIntervento['data']
        );

        $dt = $this->parseDateTime($servizio['data']);
        $oraInizio = $this->formatOraPianificazione($servizio['data']);
        $oraArrivoIncendio = trim((string) ($servizio['oraArrivoIncendio'] ?? ''));
        $oraFineIntervento = trim((string) ($servizio['oraFineIntervento'] ?? ''));
        $oraRientro = trim((string) ($servizio['oraRientroSede'] ?? ''));
        $oraPartenza = $this->parseDateTime($servizio['data'])?->modify('+2 hours')->format('H:i') ?? '';

        if ($oraArrivoIncendio === '' && $dt) {
            $oraArrivoIncendio = $dt->modify('+30 minutes')->format('H:i');
        }
        if ($oraFineIntervento === '' && $dt) {
            $oraFineIntervento = $dt->modify('+30 minutes')->format('H:i');
        }
        if ($oraRientro === '' && $dt) {
            $oraRientro = $this->parseDateTime($servizio['data'])?->modify('+2 hours 23 minutes')->format('H:i') ?? '';
        }

        $noteParts = array_filter([
            $servizio['altriEnti'] ?? null,
            $servizio['note'] ?? null,
        ]);
        $noteOperative = implode(' — ', $noteParts);

        $primoVolontario = $equipaggio[0] ?? null;
        $firma = $primoVolontario
            ? trim(($primoVolontario['nome'] ?? '').' '.($primoVolontario['cognome'] ?? ''))
            : '';

        $pdf = Pdf::loadView('pdf.template_aib', [
            'servizio' => $servizio,
            'mezzi' => $mezzi,
            'equipaggio' => $equipaggio,
            'dataIntervento' => $dataIntervento,
            'protocollo' => $protocollo,
            'gruppo' => 'Gruppo Comunale Massa di Somma',
            'comune' => $comune,
            'via' => $via,
            'richiedenteLabel' => strtoupper($richiedente),
            'oraInizio' => $oraInizio,
            'oraArrivoIncendio' => $oraArrivoIncendio,
            'oraFineIntervento' => $oraFineIntervento,
            'oraPartenza' => $oraPartenza,
            'oraRientro' => $oraRientro,
            'superficieCeduo' => $servizio['superficieCeduo'] ?? [],
            'superficieAltoFusto' => $servizio['superficieAltoFusto'] ?? [],
            'superficieNonBoscato' => $servizio['superficieNonBoscato'] ?? [],
            'noteOperative' => $noteOperative,
            'firma' => $firma,
        ])->setPaper('a4', 'portrait');

        $filename = 'Modello AIB-'.Str::slug($servizio['tipo']).'-'.$dataIntervento['file'].'.pdf';

        return $pdf->download($filename);
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function parseIndirizzo(?string $indirizzo): array
    {
        $indirizzo = trim((string) $indirizzo);
        if ($indirizzo === '') {
            return ['', ''];
        }

        $parts = array_map('trim', explode(',', $indirizzo));
        if (count($parts) >= 2) {
            $comune = array_pop($parts);
            $via = implode(', ', $parts);

            return [strtoupper($comune), strtoupper($via)];
        }

        return ['', strtoupper($indirizzo)];
    }

    private function protocolNumber(string $servizioId): string
    {
        if (preg_match('/(\d+)/', $servizioId, $matches)) {
            return (string) ((int) substr($matches[1], -2) ?: 1);
        }

        return '1';
    }

    private function parseDateTime(string $raw): ?\DateTimeImmutable
    {
        try {
            return (new \DateTimeImmutable($raw))->setTimezone(new \DateTimeZone('Europe/Rome'));
        } catch (\Exception) {
            return null;
        }
    }

    /** Orario da "Data e Ora Pianificazione" (datetime-local), senza shift di fuso. */
    private function formatOraPianificazione(string $raw): string
    {
        $raw = trim($raw);
        if ($raw === '') {
            return '';
        }

        if (preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/i', $raw)) {
            return $this->parseDateTime($raw)?->format('H:i') ?? '';
        }

        if (preg_match('/^\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2})/', $raw, $matches)) {
            return $matches[1].':'.$matches[2];
        }

        return $this->parseDateTime($raw)?->format('H:i') ?? '';
    }

    /**
     * @return array{completa: string, data: string, ora: string, file: string, giorno: string, mese: string, anno: string}
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
                'giorno' => '',
                'mese' => '',
                'anno' => '',
            ];
        }

        return [
            'completa' => $dt->format('d/m/Y H:i'),
            'data' => $dt->format('d/m/Y'),
            'ora' => $dt->format('H:i'),
            'file' => $dt->format('Y-m-d'),
            'giorno' => $dt->format('j'),
            'mese' => $dt->format('n'),
            'anno' => $dt->format('Y'),
        ];
    }
}
