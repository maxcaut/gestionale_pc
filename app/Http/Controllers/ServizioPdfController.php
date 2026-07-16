<?php

namespace App\Http\Controllers;

use App\Support\PdfEmailDelivery;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Throwable;

class ServizioPdfController extends Controller
{
    public function export(Request $request)
    {
        $validated = $request->validate([
            'template' => 'nullable|string|in:riepilogo-intervento,template_aib,servizio-programmato,modello-3-2',
            'delivery' => 'nullable|string|in:download,email',
            'email' => 'required_if:delivery,email|array',
            'email.to' => 'required_if:delivery,email|email',
            'email.subject' => 'nullable|string|max:255',
            'email.body' => 'nullable|string|max:5000',
            'servizio' => 'required|array',
            'servizio.id' => 'required|string',
            'servizio.tipo' => 'required|string',
            'servizio.data' => 'required|string',
            'servizio.stato' => 'required|string',
            'servizio.tipologia_aib' => 'nullable|string',
            'servizio.note' => 'nullable|string',
            'servizio.richiedente' => 'nullable|string',
            'servizio.protocollo_regionale' => 'nullable|string',
            'servizio.indirizzo' => 'nullable|string',
            'servizio.latitudine' => 'nullable|numeric',
            'servizio.longitudine' => 'nullable|numeric',
            'servizio.altriEnti' => 'nullable|string',
            'servizio.oraArrivoIncendio' => 'nullable|string',
            'servizio.oraFineIntervento' => 'nullable|string',
            'servizio.oraRientroSede' => 'nullable|string',
            'servizio.superficieCeduo' => 'nullable|array',
            'servizio.superficieAltoFusto' => 'nullable|array',
            'servizio.superficieNonBoscato' => 'nullable|array',
            'servizio.completato_da_nome' => 'nullable|string',
            'servizio.completato_da_cognome' => 'nullable|string',
            'servizio.completato_da_telefono' => 'nullable|string',
            'servizio.volontariIds' => 'nullable|array',
            'servizio.volontari_art39' => 'nullable|array',
            'servizio.volontari_mezzi' => 'nullable|array',
            'servizio.volontari_conta_ore' => 'nullable|array',
            'servizio.volontari_in_report' => 'nullable|array',
            'servizio.responsabile_servizio_id' => 'nullable|string',
            'servizio.carrelli_trainanti' => 'nullable|array',
            'servizio.carrelli_trainanti.*' => 'nullable|string',
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

        $template = $validated['template'] ?? 'servizio-programmato';
        $dataIntervento = $this->formatDataIntervento($validated['servizio']['data']);

        if ($template === 'servizio-programmato') {
            if (($validated['delivery'] ?? 'download') === 'email') {
                return response()->json(['message' => 'Invio email disponibile solo per i modelli dei servizi completati.'], 422);
            }

            if (! in_array($validated['servizio']['stato'], ['Programmato', 'In corso'], true)) {
                return response()->json(['message' => 'Il PDF servizio programmato è disponibile solo per servizi programmati o in corso.'], 422);
            }

            if (
                $validated['servizio']['stato'] === 'Programmato'
                && ! $this->hasResponsabileServizioAssegnato(
                    $validated['equipaggio'],
                    $validated['servizio']['responsabile_servizio_id'] ?? null
                )
            ) {
                return response()->json(['message' => 'responsabile servizio non assegnato'], 422);
            }

            return $this->exportServizioProgrammato($validated, $dataIntervento);
        }

        if ($validated['servizio']['stato'] !== 'Completato') {
            return response()->json(['message' => 'I modelli consuntivi sono disponibili solo per servizi completati.'], 422);
        }

        $validated['equipaggio'] = $this->filterEquipaggioInReport(
            $validated['equipaggio'],
            $validated['servizio']['volontari_in_report'] ?? []
        );

        return match ($template) {
            'riepilogo-intervento' => $this->exportRiepilogoIntervento($validated, $dataIntervento),
            'template_aib' => $this->exportTemplateAib($validated, $dataIntervento),
            'modello-3-2' => $this->exportModello32($validated, $dataIntervento),
        };
    }

    /**
     * @param  array<int, array<string, mixed>>  $equipaggio
     */
    private function hasResponsabileServizioAssegnato(array $equipaggio, mixed $responsabileId): bool
    {
        $responsabileId = trim((string) $responsabileId);
        if ($responsabileId === '') {
            return false;
        }

        foreach ($equipaggio as $volontario) {
            if ((string) ($volontario['id'] ?? '') === $responsabileId) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<int, array<string, mixed>>  $equipaggio
     * @param  array<string, mixed>  $volontariInReport
     * @return array<int, array<string, mixed>>
     */
    private function filterEquipaggioInReport(array $equipaggio, array $volontariInReport): array
    {
        return array_values(array_filter($equipaggio, static function (array $volontario) use ($volontariInReport): bool {
            $id = (string) ($volontario['id'] ?? '');

            return $id === '' || ! self::isVolontarioFlagNo($volontariInReport[$id] ?? null);
        }));
    }

    private static function isVolontarioFlagNo(mixed $value): bool
    {
        return strtolower(trim((string) $value)) === 'no';
    }

    /**
     * @param  array<string, mixed>  $validated
     * @param  array{completa: string, data: string, ora: string, file: string, giorno?: string, mese?: string, anno?: string}  $dataIntervento
     */
    private function exportServizioProgrammato(array $validated, array $dataIntervento)
    {
        $exportatoIl = now()->timezone('Europe/Rome')->format('d/m/Y H:i');

        $pdf = Pdf::loadView('pdf.servizio-programmato', [
            'servizio' => $validated['servizio'],
            'mezzi' => $validated['mezzi'] ?? [],
            'equipaggio' => $validated['equipaggio'],
            'dataIntervento' => $dataIntervento,
            'exportatoIl' => $exportatoIl,
        ])->setPaper('a4', 'landscape');

        $filename = 'Servizio programmato-'.Str::slug($validated['servizio']['tipo']).'-'.$dataIntervento['file'].'.pdf';

        return $pdf->download($filename);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @param  array{completa: string, data: string, ora: string, file: string, giorno?: string, mese?: string, anno?: string}  $dataIntervento
     */
    private function exportRiepilogoIntervento(array $validated, array $dataIntervento)
    {
        $pdf = Pdf::loadView('pdf.riepilogo-intervento', [
            'servizio' => $validated['servizio'],
            'mezzi' => $validated['mezzi'] ?? [],
            'equipaggio' => $validated['equipaggio'],
            'dataIntervento' => $dataIntervento,
        ])->setPaper('a4', 'landscape');

        $filename = 'Riepilogo intervento-'.Str::slug($validated['servizio']['tipo']).'-'.$dataIntervento['file'].'.pdf';

        return $this->deliverPdf($pdf, $filename, $validated);
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

        $caposquadraNome = trim((string) ($servizio['completato_da_nome'] ?? ''));
        $caposquadraCognome = trim((string) ($servizio['completato_da_cognome'] ?? ''));
        $caposquadra = [
            'nome' => $caposquadraNome,
            'cognome' => $caposquadraCognome,
            'telefono' => $this->resolveCaposquadraTelefono($caposquadraNome, $caposquadraCognome, $servizio, $equipaggio),
        ];
        $caposquadraAssociazione = $this->resolveCaposquadraAssociazione($caposquadraNome, $caposquadraCognome, $equipaggio);
        $firma = trim($caposquadraNome.' '.$caposquadraCognome);
        $reportRedattoDa = trim(
            $caposquadraNome.' '.$caposquadraCognome
        );

        $pdf = Pdf::loadView('pdf.template_aib', [
            'servizio' => $servizio,
            'mezzi' => $mezzi,
            'equipaggio' => $equipaggio,
            'dataIntervento' => $dataIntervento,
            'protocollo' => $protocollo,
            'gruppo' => $caposquadraAssociazione,
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
            'caposquadra' => $caposquadra,
            'firma' => $firma,
            'reportRedattoDa' => $reportRedattoDa,
        ])->setPaper('a4', 'portrait');

        $filename = 'Modello AIB-'.Str::slug($servizio['tipo']).'-'.$dataIntervento['file'].'.pdf';

        return $this->deliverPdf($pdf, $filename, $validated);
    }

    /**
     * @param  array<string, mixed>  $servizio
     */
    private function resolveCaposquadraTelefono(string $nome, string $cognome, array $servizio, array $equipaggio): string
    {
        $telefono = trim((string) ($servizio['completato_da_telefono'] ?? ''));
        if ($telefono !== '' || $nome === '' || $cognome === '') {
            return $telefono;
        }

        $nomeMatch = $this->normalizePersonMatchValue($nome);
        $cognomeMatch = $this->normalizePersonMatchValue($cognome);
        foreach ($equipaggio as $volontario) {
            if (! is_array($volontario)) {
                continue;
            }

            if (
                $this->normalizePersonMatchValue($volontario['nome'] ?? '') === $nomeMatch
                && $this->normalizePersonMatchValue($volontario['cognome'] ?? '') === $cognomeMatch
            ) {
                return trim((string) ($volontario['telefono'] ?? ''));
            }
        }

        $serviceKey = (string) config('services.supabase.service_role_key');
        $url = rtrim((string) config('services.supabase.url'), '/');
        if ($serviceKey === '' || $url === '') {
            return '';
        }

        try {
            $response = Http::withHeaders([
                'apikey' => $serviceKey,
                'Authorization' => 'Bearer '.$serviceKey,
            ])->get($url.'/rest/v1/volontari', [
                'select' => 'nome,cognome,telefono',
                'limit' => '200',
            ]);
        } catch (Throwable $exception) {
            report($exception);

            return '';
        }

        if (! $response->successful()) {
            return '';
        }

        foreach ($response->json() ?: [] as $volontario) {
            if (! is_array($volontario)) {
                continue;
            }

            if (
                $this->normalizePersonMatchValue($volontario['nome'] ?? '') === $nomeMatch
                && $this->normalizePersonMatchValue($volontario['cognome'] ?? '') === $cognomeMatch
            ) {
                return trim((string) ($volontario['telefono'] ?? ''));
            }
        }

        return '';
    }

    /**
     * @param  array<int, array<string, mixed>>  $equipaggio
     */
    private function resolveCaposquadraAssociazione(string $nome, string $cognome, array $equipaggio): string
    {
        if ($nome === '' || $cognome === '') {
            return '';
        }

        $nomeMatch = $this->normalizePersonMatchValue($nome);
        $cognomeMatch = $this->normalizePersonMatchValue($cognome);
        foreach ($equipaggio as $volontario) {
            if (! is_array($volontario)) {
                continue;
            }

            if (
                $this->normalizePersonMatchValue($volontario['nome'] ?? '') === $nomeMatch
                && $this->normalizePersonMatchValue($volontario['cognome'] ?? '') === $cognomeMatch
            ) {
                return trim((string) ($volontario['associazione_appartenenza'] ?? ''));
            }
        }

        $serviceKey = (string) config('services.supabase.service_role_key');
        $url = rtrim((string) config('services.supabase.url'), '/');
        if ($serviceKey === '' || $url === '') {
            return '';
        }

        try {
            $response = Http::withHeaders([
                'apikey' => $serviceKey,
                'Authorization' => 'Bearer '.$serviceKey,
            ])->get($url.'/rest/v1/volontari', [
                'select' => 'nome,cognome,associazione_appartenenza',
                'limit' => '200',
            ]);
        } catch (Throwable $exception) {
            report($exception);

            return '';
        }

        if (! $response->successful()) {
            return '';
        }

        foreach ($response->json() ?: [] as $volontario) {
            if (! is_array($volontario)) {
                continue;
            }

            if (
                $this->normalizePersonMatchValue($volontario['nome'] ?? '') === $nomeMatch
                && $this->normalizePersonMatchValue($volontario['cognome'] ?? '') === $cognomeMatch
            ) {
                return trim((string) ($volontario['associazione_appartenenza'] ?? ''));
            }
        }

        return '';
    }

    private function normalizePersonMatchValue(mixed $value): string
    {
        return strtolower(trim((string) preg_replace('/\s+/', ' ', (string) $value)));
    }

    /**
     * @param  array<string, mixed>  $validated
     * @param  array{completa: string, data: string, ora: string, file: string, giorno?: string, mese?: string, anno?: string}  $dataIntervento
     */
    private function exportModello32(array $validated, array $dataIntervento)
    {
        $pdf = Pdf::loadView('pdf.modello-3-2', [
            'servizio' => $validated['servizio'],
            'mezzi' => $validated['mezzi'] ?? [],
            'equipaggio' => $validated['equipaggio'],
            'dataIntervento' => $dataIntervento,
        ])->setPaper('a4', 'portrait');

        $filename = 'Modello 3.2-'.Str::slug($validated['servizio']['tipo']).'-'.$dataIntervento['file'].'.pdf';

        return $this->deliverPdf($pdf, $filename, $validated);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function deliverPdf(mixed $pdf, string $filename, array $validated)
    {
        if (($validated['delivery'] ?? 'download') !== 'email') {
            return $pdf->download($filename);
        }

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
