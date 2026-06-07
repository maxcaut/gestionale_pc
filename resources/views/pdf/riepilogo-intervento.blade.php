<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="utf-8">
    <title>Modello A — Presenze ODV</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 0; 
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 11pt;
            color: #000;
            line-height: 1.2;
            background: #fff;
        }

        table, .mezzi-wrap {
            width: 92% !important;
            margin-left: 4% !important;
            margin-right: 4% !important;
            border-collapse: collapse;
            table-layout: fixed;
        }

        .spacer-top {
            height: 12mm;
            width: 100%;
        }

        td, th {
            border: 1px solid #000;
            vertical-align: middle;
            padding: 3px 4px;
        }

        .header-box td {
            height: 23mm;
            padding: 4px 6px;
        }

        .header-box .logo-slot-sx {
            width: 18%;
            text-align: center;
            border-right: none !important; 
        }

        .header-box .logo-slot-dx {
            width: 18%;
            text-align: center;
            border-left: none !important; 
        }

        .header-box .header-text {
            width: 64%;
            text-align: center; /* SPAZIO INSERITO QUI: Garantisce la centratura di tutte le righe di testo */
            font-size: 12pt;
            line-height: 1.35;
            border-left: none !important;
            border-right: none !important;
        }

        .header-box .logo-slot-sx img,
        .header-box .logo-slot-dx img {
            max-height: 20mm;
            max-width: 100%;
        }

        .header-box .header-text .staff {
            font-weight: bold;
            display: inline-block; /* Aiuta la resa grafica della centratura su motori PDF datati */
        }

        .header-box {
            margin-bottom: 4mm !important; 
        }

        .giorno-row td {
            height: 9mm;
            text-align: right;
            font-size: 13pt;
            padding-right: 8px;
        }

        .giorno-row {
            margin-bottom: 5mm !important; 
        }

        .section-title td {
            text-align: center;
            font-size: 13pt;
            padding: 4px 6px;
            height: 8mm;
        }
        .col-header th {
            background: #d9d9d9;
            text-align: center;
            font-weight: normal;
            font-size: 11pt;
            height: 8mm;
            padding: 3px 2px;
        }
        .col-header .art39 {
            font-size: 9pt;
            line-height: 1.1;
        }

        .data-row td {
            text-align: center;
            font-size: 11pt;
            height: 7.3mm;
        }
        .data-row .col-n {
            width: 4%;
        }

        .blocco-tabella { 
            page-break-inside: auto; 
            margin-bottom: 6mm; 
        }

        .mezzi-wrap {
            margin-top: 0;
            margin-bottom: 6mm; 
        }

        .firme-table {
            margin-top: 6mm; 
            page-break-inside: avoid;
        }
        .firme-table td {
            vertical-align: top;
            text-align: center;
            font-size: 11pt;
            padding: 6px 8px;
            height: 28mm;
        }
        .firme-table .firma-sx {
            width: 42%;
        }
        .firme-table .firma-dx {
            width: 58%;
        }
        .firme-table .firma-linea {
            margin-top: 14mm;
            font-size: 11pt;
            letter-spacing: 0.5px;
        }

        .page-break {
            page-break-before: always;
        }
        .blocco-continuazione {
            page-break-inside: avoid;
        }
       .protocollo {
            position: fixed;
            top: 4mm;
            left: 8mm;
            
            font-size: 10px;
            border: 2px solid red;
            padding: 4px 8px;
            border-radius: 4px;
        }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
    </style>
</head>
<body>
    @php
        $dateParts = explode('/', $dataIntervento['data'] ?? '');
        $giorno = $dateParts[0] ?? '________';
        $mese = $dateParts[1] ?? '________';
        $anno = $dateParts[2] ?? '____________';
        $volontari = array_values($equipaggio);
        $veicoli = array_values($mezzi ?? []);

        $logoSx = public_path('img/modello-logo-0.png');
        $logoDx = public_path('img/modello-logo-1.png');

        $maxPrimaPagina = 7;  
        $maxAltrePagine = 11; 
        
        $pagineVolontari = [];
        if (count($volontari) === 0) {
            $pagineVolontari = [[]];
        } else {
            $pagineVolontari[] = array_slice($volontari, 0, $maxPrimaPagina);
            $resto = array_slice($volontari, $maxPrimaPagina);
            foreach (array_chunk($resto, $maxAltrePagine) as $chunk) {
                $pagineVolontari[] = $chunk;
            }
        }
        $offsetNumerazione = 0;
    @endphp

    @foreach ($pagineVolontari as $paginaIndex => $volontariPagina)
        @if ($paginaIndex > 0)
            <div class="page-break"></div>
        @endif

        <div class="spacer-top"></div>

        @if ($paginaIndex === 0)
            <table class="header-box">
                <tr>
                    <td class="logo-slot-sx">
                        @if (is_file($logoSx))
                            <img src="{{ $logoSx }}" alt="">
                        @endif
                    </td>
                    <td class="header-text">
                        Giunta Regionale della Campania<br>
                        Direzione Generale 18 - Lavori Pubblici e Protezione Civile<br>
                        <span class="staff">STAFF Protezione Civile Emergenza e Post-Emergenza</span>
                    </td>
                    <td class="logo-slot-dx">
                        @if (is_file($logoDx))
                            <img src="{{ $logoDx }}" alt="">
                        @endif
                    </td>
                </tr>
            </table>

            <table class="giorno-row">
                <tr>
                    <td>GIORNO DI IMPIEGO {{ $giorno }}/{{ $mese }}/{{ $anno }}</td>
                </tr>
            </table>
        @endif

        <div class="blocco-tabella {{ $paginaIndex > 0 ? 'blocco-continuazione' : '' }}">
            <table class="volontari">
                @if ($paginaIndex === 0)
                    <tr class="section-title">
                        <td colspan="6">ELENCO DEI VOLONTARI IMPIEGATI</td>
                    </tr>
                @else
                    <tr class="section-title">
                        <td colspan="6">ELENCO DEI VOLONTARI IMPIEGATI (continua)</td>
                    </tr>
                @endif
                <thead>
                    <tr class="col-header">
                        <th class="col-n">N.</th>
                        <th style="width:19%">COGNOME</th>
                        <th style="width:20%">NOME</th>
                        <th style="width:27%">CODICE FISCALE</th>
                        <th style="width:23%">FIRMA AUTOGRAFA</th>
                        <th class="art39" style="width:7%">ART.39<br>SI /NO</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($volontariPagina as $volontario)
                        @php $numeroRiga = $offsetNumerazione + $loop->iteration; @endphp
                        <tr class="data-row">
                            <td class="col-n">{{ $numeroRiga }}</td>
                            <td>{{ $volontario['cognome'] ?? '' }}</td>
                            <td>{{ $volontario['nome'] ?? '' }}</td>
                            <td>{{ $volontario['cf'] ?? '' }}</td>
                            <td>&nbsp;</td>
                            <td>{{ $volontario['art39'] ?? $volontario['art_39'] ?? (($servizio['volontari_art39'] ?? [])[$volontario['id'] ?? ''] ?? '') }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        @php $offsetNumerazione += count($volontariPagina); @endphp
    @endforeach

    <div class="mezzi-wrap">
        <table class="mezzi" style="width:100% !important; margin:0 !important;">
            <tr class="section-title">
                <td colspan="3">ELENCO DEI VEICOLI ASSOCIATIVI UTILIZZATI</td>
            </tr>
            <thead>
                <tr class="col-header">
                    <th style="width:31%">TIPO</th>
                    <th style="width:41%">MODELLO</th>
                    <th style="width:28%">TARGA</th>
                </tr>
            </thead>
            <tbody>
                @forelse ($veicoli as $veicolo)
                    <tr class="data-row">
                        <td>{{ $veicolo['tipo'] ?? '' }}</td>
                        <td>{{ $veicolo['modello'] ?? '' }}</td>
                        <td>{{ $veicolo['targa'] ?? '' }}</td>
                    </tr>
                @empty
                    <tr class="data-row">
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    <table class="firme-table">
        <tr>
            <td class="firma-sx">
                FIRMA LEGALE RAPPRESENTANTE ODV
                <div class="firma-linea">__________________________________</div>
            </td>
            <td class="firma-dx">
                TIMBRO E FIRMA REFERENTE AUTORITÀ DI PROTEZIONE CIVILE (o dal<br>
                soggetto a ciò incaricato) individuato nella nota di Attivazione
                <div class="firma-linea">___________________________________</div>
            </td>
        </tr>
    </table>

    <div class="protocollo">protocollo {{ $servizio['id'] ?? '' }}</div>
</body>
</html>
