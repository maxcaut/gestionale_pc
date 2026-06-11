<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <title>Squadra A.I.B.</title>
    <style>
        @page { size: A4; margin: 10mm; }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            color: #000;
            background: #fff;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 13px;
            line-height: 1.15;
        }

        .page {
            width: 100%;
        }

        .header {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 22px;
        }

        .header td {
            border: 0;
            vertical-align: top;
        }

        .logo-cell {
            width: 18%;
            text-align: center;
        }

        .title-cell {
            width: 64%;
            text-align: center;
            padding-top: 26px;
        }

        .protocol {
            text-align: right;
            font-size: 13px;
            margin-bottom: 10px;
        }

        .logo-left {
            width: 82px;
        }

        .logo-right {
            width: 92px;
        }

        .org-title {
            font-size: 22px;
            font-weight: 400;
            line-height: 1.05;
        }

        .service-title {
            font-size: 20px;
            font-weight: 700;
            margin-top: 2px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        td, th {
            border: 1px solid #333;
            padding: 6px 8px;
            vertical-align: middle;
        }

        th {
            font-weight: 400;
            text-align: center;
        }

        .meta-table {
            margin: 0 auto 18px;
            width: 92%;
        }

        .period-table {
            margin-bottom: 19px;
        }

        .section-title {
            border: 0;
            font-weight: 700;
            text-align: center;
            padding: 0 0 12px;
        }

        .details-table {
            margin-bottom: 31px;
        }

        .details-table th,
        .details-table td {
            text-align: center;
            font-size: 14px;
            padding: 7px 8px;
        }

        .details-table .index-col {
            width: 8%;
        }

        .details-table .name-col {
            width: 53%;
        }

        .details-table .role-col {
            width: 18%;
        }

        .details-table .phone-col {
            width: 21%;
        }

        .team-label {
            width: 44px;
            padding: 0;
            text-align: center;
        }

        .vertical {
            display: block;
            font-size: 20px;
            font-weight: 700;
            line-height: 1;
            white-space: nowrap;
            transform: rotate(-90deg);
        }

        .patrol-table {
            margin-bottom: 31px;
        }

        .patrol-title,
        .vehicle-title {
            font-size: 16px;
            font-weight: 700;
            text-align: center;
        }

        .vehicle-table th,
        .vehicle-table td {
            text-align: center;
        }

        .vehicle-title {
            font-size: 19px;
        }

        .vehicle-head {
            font-size: 16px;
            font-weight: 700;
        }

        .signature {
            margin-top: 88px;
            margin-left: 58%;
            text-align: center;
            font-size: 15px;
        }

        .signature strong {
            display: block;
            margin-bottom: 28px;
        }

        .footer {
            position: fixed;
            left: 10mm;
            right: 10mm;
            bottom: 7mm;
            text-align: center;
            font-size: 10px;
            font-weight: 700;
            line-height: 1.08;
        }

        .footer-logos {
            margin-bottom: 4px;
        }

        .footer-logo {
            width: 28px;
            height: 28px;
            object-fit: contain;
            margin: 0 2px;
        }

        .logo-right2{
            width: 38px;
        }

        .footer-line {
            border-top: 1px solid #999;
            margin: 0 38px 5px;
        }

        .link {
            color: #0645ad;
            text-decoration: underline;
            font-weight: 400;
        }
    </style>
</head>
<body>
@php
    $logoSx = public_path('img/modello-logo-0.png');
    $logoDx = public_path('img/modello-logo-1.png');
    $logoRegione = public_path('img/logo-regione.png');

    $rows = array_values($equipaggio ?? []);
    $maxRows = max(5, count($rows));
    $mezziRows = array_values($mezzi ?? []);
    $maxMezziRows = max(1, count($mezziRows));

    $formatName = static function (?array $volontario): string {
        if (!$volontario) {
            return '';
        }

        return trim(($volontario['nome'] ?? '').' '.($volontario['cognome'] ?? ''));
    };

    $roleLabel = static function (?array $volontario): string {
        $ruolo = strtoupper(trim((string) ($volontario['ruolo'] ?? '')));
        if ($ruolo === '') {
            return '';
        }

        return str_contains($ruolo, 'CAPO') ? 'CS' : $ruolo;
    };

    $protocollo = trim((string) ($protocollo ?? ''));
    $associazione = trim((string) ($squadra['associazione_appartenenza'] ?? ''));
    $data = $dataIntervento['data'] ?? '';
    $oraInizio = trim((string) ($oraInizio ?? ''));
    $oraFine = trim((string) ($oraFine ?? ''));
    $fasciaOraria = trim($oraInizio.($oraInizio !== '' && $oraFine !== '' ? ' - ' : '').$oraFine);
@endphp
<div class="page">
    <table class="header">
        <tr>
            <td class="logo-cell">
                @if (is_file($logoSx))
                    <img src="{{ $logoSx }}" alt="" class="logo-left">
                @endif
            </td>
            <td class="title-cell">
                <div class="org-title">Coordinamento Territoriale di Protezione Civile</div>
                <div class="org-title">Area Vesuviana "Vesuvius"</div>
                <div class="service-title">SERVIZIO SALA OPERATIVA</div>
            </td>
            <td class="logo-cell">
                <div class="protocol">{{ $protocollo }}</div>
                @if (is_file($logoDx))
                    <img src="{{ $logoDx }}" alt="" class="logo-right">
                @endif
            </td>
        </tr>
    </table>

    <table class="meta-table">
        <tr>
            <td colspan="2">ODV: {{ $associazione }}</td>
        </tr>
        <tr>
            <td style="width: 36%;">TELEFONO:</td>
            <td>EMAIL:</td>
        </tr>
    </table>

    <table class="period-table">
        <tr>
            <th>Periodo di non pericolosita'</th>
            <th>Massima Pericolosita'</th>
            <th>Data</th>
            <th>Fascia oraria garantita</th>
        </tr>
        <tr>
            <td style="height: 30px; text-align: center;"></td>
            <td style="text-align: center;">{{ ($squadra['stato'] ?? '') === 'Operativa' ? 'X' : '' }}</td>
            <td style="text-align: center;">{{ $data }}</td>
            <td style="text-align: center;">{{ $fasciaOraria }}</td>
        </tr>
    </table>

    <div class="section-title">DETTAGLI SQUADRA A.I.B.</div>
    <table class="details-table">
        <tr>
            <th class="index-col">nm.</th>
            <th class="name-col">Operatore</th>
            <th class="role-col">Qualifica</th>
            <th class="phone-col">Cellulare</th>
        </tr>
        @for ($i = 0; $i < $maxRows; $i++)
            @php $volontario = $rows[$i] ?? null; @endphp
            <tr>
                @if ($i === 0)
                    <td class="team-label" rowspan="{{ $maxRows }}"><span class="vertical">{{ strtoupper($squadra['nome'] ?? 'SQUADRA') }}</span></td>
                @endif
                <td>{{ $formatName($volontario) }}</td>
                <td>{{ $roleLabel($volontario) }}</td>
                <td>{{ $volontario['telefono'] ?? '' }}</td>
            </tr>
        @endfor
    </table>

    <table class="patrol-table">
        <tr>
            <td colspan="2" class="patrol-title">ZONA DI PATTUGLIAMENTO A.I.B.</td>
        </tr>
        <tr>
            <td style="width: 26%; text-align: center;">{{ strtoupper($squadra['nome'] ?? '') }}</td>
            <td></td>
        </tr>
    </table>

    <table class="vehicle-table">
        <tr>
            <td colspan="3" class="vehicle-title">AUTOMEZZO IN USO</td>
            <td colspan="2" class="vehicle-title">APPARATI IN DOTAZIONE</td>
        </tr>
        <tr>
            <th class="vehicle-head">MARCA</th>
            <th class="vehicle-head">MODELLO</th>
            <th class="vehicle-head">TARGA</th>
            <th class="vehicle-head">RADIO</th>
            <th class="vehicle-head">APR</th>
        </tr>
        @for ($i = 0; $i < $maxMezziRows; $i++)
            @php $mezzo = $mezziRows[$i] ?? null; @endphp
            <tr>
                <td>{{ $mezzo['tipo'] ?? '' }}</td>
                <td>{{ $mezzo['modello'] ?? '' }}</td>
                <td>{{ $mezzo['targa'] ?? '' }}</td>
                <td></td>
                <td></td>
            </tr>
        @endfor
    </table>

    <div class="signature">
        <strong>Il Legale Rappresentante dell'ETS</strong>
        <span></span>
    </div>
</div>

<div class="footer">
    <div class="footer-logos">
        @if (is_file($logoSx))
            <img src="{{ $logoSx }}" alt="" class="footer-logo">
        @endif
        @if (is_file($logoRegione))
            <img src="{{ $logoRegione }}" alt="" class="footer-logo">
        @endif
        @if (is_file($logoDx))
            <img src="{{ $logoDx }}" alt="" class="footer-logo logo-right2">
        @endif
    </div>
    <div class="footer-line"></div>
    <div>COORDINAMENTO TERRITORIALE AREA VESUVIANA "VESUVIUS"</div>
    <div>Sede Legale: Piazza Libertà,5 -80040 Cercola (Na) Tel 081 2581212 CF 95273790634</div>
    <div>ISCRITTO ALL' ELENCO TERRITORIALE DEL VOLONTARIATO DI P.C. AL N.389 CON DECRETO N°11 DEL 19/04/19</div>
    <div>E- Mail <span class="link">coordinamento.vesuvius@outlook.it</span> &nbsp; pec. <span class="link">coordinamento.vesuvius@pec.it</span></div>
</div>
</body>
</html>
