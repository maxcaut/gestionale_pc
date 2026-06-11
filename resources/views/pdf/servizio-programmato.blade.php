<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="utf-8">
    <title>Servizio programmato</title>
    <style>
        @page { size: A4 landscape; margin: 7mm; }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            font-family: DejaVu Serif, serif;
            color: #000;
            background: #fff;
            font-size: 12px;
            line-height: 1.15;
        }
        .sheet {
            width: 100%;
            border: 4px solid #f00;
        }
        .top {
            position: relative;
            min-height: 56px;
            padding: 10px 58px 6px;
            text-align: center;
            border-bottom: 3px solid #f00;
            font-weight: bold;
        }
        .logo {
            position: absolute;
            top: 4px;
            width: 65px;
            height: 65px;
            object-fit: contain;
        }
        .logo-left { left: 10px; }
        .logo-right { right: 10px; width: 80px; }
        .ente { font-size: 14px; text-transform: uppercase; }
        .coord { margin-top: 6px; font-size: 14px; }
        .bar {
            text-align: center;
            font-weight: bold;
            border-bottom: 2px solid #000;
            background: #9bc2e6;
            padding: 2px 8px;
        }
        .bar-title {
            color: #f00;
            border-bottom: 1px solid #000;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        th, td {
            border: 2px solid #000;
            padding: 2px 4px;
            vertical-align: middle;
        }
        th {
            font-weight: bold;
            text-align: left;
            background: #fff;
        }
        .date-head, .date-cell {
            width: 23%;
            text-align: center;
            font-weight: bold;
        }
        .num-head, .num {
            width: 7%;
            text-align: center;
            background: #ff0;
            font-weight: bold;
        }
        .operator { width: 28%; }
        .odv { width: 23%; }
        .role { width: 23%; }
        .vehicle { width: 26%; text-align: center; }
        .operator-name { font-weight: normal; }
        .operator-name.responsabile { color: #f00; }
        .odv.responsabile { color: #f00; }
        .date-cell {
            border-left: 4px solid #000;
            border-right: 2px solid #000;
            font-size: 12px;
            line-height: 1.25;
        }
        .vehicle-cell {
            text-align: center;
            line-height: 1.25;
        }
        .empty-row td { height: 18px; }
    </style>
</head>
<body>
@php
    $logoSx = public_path('img/modello-logo-0.png');
    $logoDx = public_path('img/modello-logo-1.png');
    $volontari = array_values($equipaggio ?? []);
    $veicoli = array_values($mezzi ?? []);
    $volontariMezzi = $servizio['volontari_mezzi'] ?? [];
    $indirizzo = trim((string) ($servizio['indirizzo'] ?? ''));
    $titolo = trim((string) ($servizio['tipo'] ?? ''));
    if ($indirizzo !== '') {
        $titolo = trim($titolo.' - '.$indirizzo);
    }

    $isResponsabile = static function (array $volontario): bool {
        $ruolo = strtolower((string) ($volontario['ruolo'] ?? ''));
        return str_contains($ruolo, 'responsabile')
            || str_contains($ruolo, 'coordinatore')
            || str_contains($ruolo, 'capo');
    };

    $responsabili = array_values(array_filter($volontari, $isResponsabile));
    if (count($responsabili) === 0 && count($volontari) > 0) {
        $responsabili = [$volontari[0]];
    }
    $responsabileLabel = implode(' - ', array_map(
        static fn ($v) => trim(($v['cognome'] ?? '').' '.($v['nome'] ?? '')),
        $responsabili
    ));

    $veicoliById = [];
    foreach ($veicoli as $veicolo) {
        if (!empty($veicolo['id'])) {
            $veicoliById[$veicolo['id']] = $veicolo;
        }
    }

    $groups = [];
    foreach ($veicoli as $veicolo) {
        $groups[$veicolo['id'] ?? ('mezzo_'.count($groups))] = [
            'mezzo' => $veicolo,
            'operatori' => [],
        ];
    }

    $fallbackMezzoId = array_key_first($groups);
    foreach ($volontari as $volontario) {
        $mezzoId = $volontariMezzi[$volontario['id'] ?? ''] ?? $fallbackMezzoId ?? 'senza_mezzo';
        if (!isset($groups[$mezzoId])) {
            $groups[$mezzoId] = [
                'mezzo' => $veicoliById[$mezzoId] ?? null,
                'operatori' => [],
            ];
        }
        $groups[$mezzoId]['operatori'][] = $volontario;
    }

    if (count($groups) === 0) {
        $groups['senza_mezzo'] = ['mezzo' => null, 'operatori' => []];
    }

    $totalRows = 0;
    foreach ($groups as $group) {
        $totalRows += max(1, count($group['operatori']));
    }

    $mezzoLabel = static function (?array $mezzo): string {
        if (!$mezzo) {
            return '';
        }
        return trim(($mezzo['modello'] ?? '').(($mezzo['targa'] ?? '') !== '' ? ' '.$mezzo['targa'] : ''));
    };
@endphp

<div class="sheet">
    <div class="top">
        @if (is_file($logoSx))
            <img class="logo logo-left" src="{{ $logoSx }}" alt="">
        @endif
        @if (is_file($logoDx))
            <img class="logo logo-right" src="{{ $logoDx }}" alt="">
        @endif
        <div class="ente">REGIONE CAMPANIA - PROTEZIONE CIVILE</div>
        <div class="coord">COORDINAMENTO TERRITORIALE AREA VESUVIANA "VESUVIUS"</div>
    </div>

    <div class="bar bar-title">{{ $titolo }}</div>
    <div class="bar">Responsabile del Servizio {{ $responsabileLabel }}</div>

    <table>
        <thead>
            <tr>
                <th class="date-head">Giorni ed orari</th>
                <th class="num-head">&nbsp;</th>
                <th class="operator">OPERATORI</th>
                <th class="odv">ODV</th>
                <th class="role">&nbsp;</th>
                <th class="vehicle">Automezzo</th>
            </tr>
        </thead>
        <tbody>
            @php $numero = 1; $datePrinted = false; @endphp
            @foreach ($groups as $group)
                @php
                    $operatori = $group['operatori'];
                    $rowspan = max(1, count($operatori));
                @endphp
                @forelse ($operatori as $volontario)
                    @php $responsabile = $isResponsabile($volontario); @endphp
                    <tr>
                        @if (!$datePrinted)
                            <td class="date-cell" rowspan="{{ $totalRows }}">
                                {{ $dataIntervento['data'] ?? '' }} h {{ $dataIntervento['ora'] ?? '' }}
                                @if ($indirizzo !== '')
                                    <br>{{ $indirizzo }}
                                @endif
                            </td>
                            @php $datePrinted = true; @endphp
                        @endif
                        <td class="num">{{ $numero }}</td>
                        <td class="operator-name {{ $responsabile ? 'responsabile' : '' }}">
                            {{ trim(($volontario['cognome'] ?? '').' '.($volontario['nome'] ?? '')) }}
                        </td>
                        <td class="odv {{ $responsabile ? 'responsabile' : '' }}">{{ $volontario['associazione_appartenenza'] ?? '' }}</td>
                        <td>{{ $volontario['ruolo'] ?? '' }}</td>
                        @if ($loop->first)
                            <td class="vehicle-cell" rowspan="{{ $rowspan }}">{{ $mezzoLabel($group['mezzo']) }}</td>
                        @endif
                    </tr>
                    @php $numero++; @endphp
                @empty
                    <tr class="empty-row">
                        @if (!$datePrinted)
                            <td class="date-cell" rowspan="{{ $totalRows }}">
                                {{ $dataIntervento['data'] ?? '' }} h {{ $dataIntervento['ora'] ?? '' }}
                                @if ($indirizzo !== '')
                                    <br>{{ $indirizzo }}
                                @endif
                            </td>
                            @php $datePrinted = true; @endphp
                        @endif
                        <td class="num">{{ $numero }}</td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                        <td class="vehicle-cell">{{ $mezzoLabel($group['mezzo']) }}</td>
                    </tr>
                    @php $numero++; @endphp
                @endforelse
            @endforeach
        </tbody>
    </table>
</div>
</body>
</html>
