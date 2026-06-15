<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <title>CONVENZIONE SUPPORTO AIB 2026</title>
    <style>
        /* Reset e ottimizzazione spazi per singola pagina */
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: Arial, sans-serif;
            background-color: #ffffff;
            color: #000000;
            font-size: 11px; /* Leggermente ridotto per garantire la singola pagina */
            line-height: 1.2;
            padding: 10px;
        }

        .container {
            max-width: 750px;
            margin: 0 auto;
            /*border: 1px solid #000000;*/
            padding: 10px;
        }

        /* Header */
        .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }

        .header-table td {
            border: 1px solid #000000;
            text-align: center;
            vertical-align: middle;
            padding: 5px;
        }

        .header-logo-left { width: 15%; }
        .header-logo-sx { width: 120px; }
        .header-text { width: 70%; }
        .header-logo-right { width: 15%; }
        .header-logo-dx { width: 120px; }

        .header-text h1 {
            font-size: 14px;
            margin-bottom: 2px;
            font-weight: normal;
        }
        .header-text h2 {
            font-size: 11px;
            margin-bottom: 2px;
            font-weight: normal;
        }
        .header-text h3 {
            font-size: 11px;
            font-weight: bold;
        }

        /* Titolo Centrale */
        .main-title {
            text-align: center;
            font-weight: bold;
            font-size: 13px;
            text-decoration: underline;
            margin-bottom: 10px;
        }

        /* Righe di testo */
        .info-line {
            margin-bottom: 6px;
            font-size: 11px;
        }

        /* Tabelle generali del modulo */
        .form-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
        }

        .form-table th, .form-table td {
            border: 1px solid #000000;
            padding: 4px 5px;
            text-align: left;
            vertical-align: middle;
        }

        .form-table th {
            background-color: #d9d9d9;
            font-weight: normal;
        }

        .section-title {
            background-color: #d9d9d9;
            text-align: center;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 11px;
            padding: 5px;
        }

        /* Allineamenti e altezze specifiche per input */
        .col-center { text-align: center !important; }
        
        .input-space-sm { height: 18px; }
        .input-space-md { height: 22px; }
        
        .dotted-line { 
            letter-spacing: 1px;
        }

        /* Footer layout */
        .footer-section {
            margin-top: 10px;
            font-size: 11px;
        }

        .report-redatto {
            margin-top: 8px;
            font-size: 11px;
            font-weight: bold;
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

        /* Forzatura stampa su singola pagina senza margini browser */
        @media print {
            @page {
                size: A4;
                margin: 8mm;
            }
            body {
                padding: 0;
            }
            .container {
                border: 1px solid #000000;
                max-width: 100%;
            }
        }
    </style>
</head>
<body>
    @php
        $protocolloRegionale = trim((string) ($servizio['protocollo_regionale'] ?? $servizio['protocolloRegionale'] ?? ''));
    @endphp
    <div class="protocollo">
        <div>Protocollo Coordinamento Vesuvius: {{ $servizio['id'] ?? '' }}</div>
        @if ($protocolloRegionale !== '')
            <div>Protocollo Regionale: {{ $protocolloRegionale }}</div>
        @endif
    </div>
@php
        $giorno = $dataIntervento['giorno'] ?? '________';
        $mese = $dataIntervento['mese'] ?? '________';
        $anno = $dataIntervento['anno'] ?? '____________';
        $volontari = array_values($equipaggio ?? []);
        $veicoli = array_values($mezzi ?? []);
        $veicoliById = [];
        foreach ($veicoli as $veicolo) {
            if (!empty($veicolo['id'])) {
                $veicoliById[$veicolo['id']] = $veicolo;
            }
        }
        $carrelliTrainanti = $servizio['carrelli_trainanti'] ?? [];
        $mezzoLabel = static function (?array $veicolo) use ($veicoliById, $carrelliTrainanti): string {
            if (!$veicolo) {
                return '';
            }

            $label = (string) ($veicolo['modello'] ?? '');
            if (($veicolo['tipo'] ?? '') !== 'Carrello appendice') {
                return $label;
            }

            $trainanteId = $carrelliTrainanti[$veicolo['id'] ?? ''] ?? null;
            $trainante = $trainanteId ? ($veicoliById[$trainanteId] ?? null) : null;
            if (!$trainante) {
                return $label;
            }

            $trainanteLabel = trim(($trainante['modello'] ?? '').' ['.($trainante['targa'] ?? '').']');
            return trim($label.' - Trainante: '.$trainanteLabel);
        };
        $ceduo = $superficieCeduo ?? [];
        $altoFusto = $superficieAltoFusto ?? [];
        $nonBoscato = $superficieNonBoscato ?? [];

        $logoSx = public_path('img/modello-logo-0.png');
        $logoDx = public_path('img/modello-logo-1.png');

        $aibVal = static function (array $group, string $key): string {
            $value = trim((string) ($group[$key] ?? ''));
            return $value !== '' ? $value : '............';
        };

        $nomeVolontario = static function (?array $volontario): string {
            if (!$volontario) {
                return '';
            }
            return trim(($volontario['cognome'] ?? '').' '.($volontario['nome'] ?? ''));
        };
        $normalizzaNomePersona = static function (?string $value): string {
            return strtolower(trim(preg_replace('/\s+/', ' ', (string) $value)));
        };
        $caposquadraNome = trim((string) ($caposquadra['nome'] ?? ''));
        $caposquadraCognome = trim((string) ($caposquadra['cognome'] ?? ''));
        $caposquadraLabel = trim($caposquadraCognome.' '.$caposquadraNome);
        $caposquadraTelefono = trim((string) ($caposquadra['telefono'] ?? ''));
        $operatori = array_values(array_filter($volontari, static function (array $volontario) use ($normalizzaNomePersona, $caposquadraNome, $caposquadraCognome): bool {
            if ($caposquadraNome === '' || $caposquadraCognome === '') {
                return true;
            }

            return $normalizzaNomePersona($volontario['nome'] ?? '') !== $normalizzaNomePersona($caposquadraNome)
                || $normalizzaNomePersona($volontario['cognome'] ?? '') !== $normalizzaNomePersona($caposquadraCognome);
        }));
    @endphp

<div class="container">

    <table class="header-table">
        <tr>
            <td class="header-logo-left">
            @if (is_file($logoSx))
                    <img src="{{ $logoSx }}" alt="" class="header-logo-sx">
                @endif
            </td>
            <td class="header-text">
                <h1>Giunta Regionale della Campania</h1>
                <h2>Direzione Generale Lavori Pubblici e Protezione Civile</h2>
                <h3>STAFF Emergenza e post-emergenza</h3>
            </td>
            <td class="header-logo-right">
                @if (is_file($logoDx))
                    <img src="{{ $logoDx }}" alt="" class="header-logo-dx">
                @endif
            </td>
        </tr>
    </table>

    <div class="main-title">
        CONVENZIONE SUPPORTO AIB 2024 – TIPOLOGIA {{ $servizio['tipologia_aib'] ?? '' }} – RAPPORTO ATTIVITA'
    </div>

    <div class="info-line">
        OdV: {{ $gruppo ?? '' }}
    </div>
    <div class="info-line">
        Coordinamento: <span style="font-size: 10px;">COORDINAMENTO TERRITORIALE AREA VESUVIANA "VESUVIUS"</span>
    </div>

    <table class="form-table">
        <thead>
            <tr>
                <th style="width: 10%;">Giorno</th>
                <th style="width: 10%;">Mese</th>
                <th style="width: 10%;">Anno</th>
                <th style="width: 25%;">Comune</th>
                <th style="width: 45%;">Località ( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="input-space-sm">{{ $giorno }}</td>
                <td>{{ $mese }}</td>
                <td>{{ $anno }}</td>
                <td>{{ $comune ?? '' }}</td>
                <td>{{ $via ?? '' }}</td>
            </tr>
        </tbody>
    </table>

    <table class="form-table">
        <tbody>
            <tr>
                <th style="width: 35%;">Intervento richiesto da<br>(specificare se SOPI o SORU)</th>
                <td style="width: 20%;" class="input-space-md">{{ $richiedenteLabel ?? '' }}</td>
                <th style="width: 10%;">Alle ore</th>
                <td style="width: 12%;">{{ $oraInizio ?? '' }}</td>
                <th style="width: 13%;">Ora arrivo<br>sull'incendio</th>
                <td style="width: 10%;">{{ $oraArrivoIncendio ?? '' }}</td>
            </tr>
        </tbody>
    </table>

    <table class="form-table">
        <thead>
            <tr>
                <th colspan="3" class="section-title">Composizione Squadra Intervenuta</th>
            </tr>
            <tr>
                <th style="width: 5%;" class="col-center"></th>
                <th style="width: 65%;">Cognome Nome – Responsabile Capo Squadra</th>
                <th style="width: 30%;">Recapito Telefonico</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="col-center">1</td>
                <td class="input-space-sm">{{ $caposquadraLabel }}</td>
                <td>{{ $caposquadraTelefono }}</td>
            </tr>
            <tr>
                <th class="col-center"></th>
                <th>Cognome Nome – Operatore Volontario</th>
                <th>Recapito Telefonico</th>
            </tr>
            <tr>
                <td class="col-center">2</td>
                <td class="input-space-sm">{{ $nomeVolontario($operatori[0] ?? null) }}</td>
                <td></td>
            </tr>
            <tr>
                <td class="col-center">3</td>
                <td class="input-space-sm">{{ $nomeVolontario($operatori[1] ?? null) }}</td>
                <td></td>
            </tr>
            <tr>
                <td class="col-center">4</td>
                <td class="input-space-sm">{{ $nomeVolontario($operatori[2] ?? null) }}</td>
                <td></td>
            </tr>
            <tr>
                <td class="col-center">5</td>
                <td class="input-space-sm">{{ $nomeVolontario($operatori[3] ?? null) }}</td>
                <td></td>
            </tr>
        </tbody>
    </table>

    <table class="form-table">
        <thead>
            <tr>
                <th colspan="4" class="section-title">Superfici Percorse dal Fuoco unità di misura (ha)</th>
            </tr>
            <tr>
                <th style="width: 25%;" class="col-center"><strong>CEDUO</strong></th>
                <th style="width: 25%;" class="col-center"><strong>ALTO FUSTO</strong></th>
                <th style="width: 25%;" class="col-center"><strong>NON BOSCATO</strong></th>
                <th style="width: 25%;" class="col-center"><strong>ALTRO</strong></th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="line-height: 1.5; padding: 6px 4px;">
                    Matricinato <span class="dotted-line">{{ $aibVal($ceduo, 'matricianato') }}</span><br>
                    Composto <span class="dotted-line">{{ $aibVal($ceduo, 'compostato') }}</span><br>
                    Degradato <span class="dotted-line">{{ $aibVal($ceduo, 'degradato') }}</span><br>
                    Macchia <span class="dotted-line">{{ $aibVal($ceduo, 'macchia') }}</span>
                </td>
                <td style="line-height: 1.5; padding: 6px 4px;">
                    Resinoso <span class="dotted-line">{{ $aibVal($altoFusto, 'resinoso') }}</span><br>
                    Latifoglie <span class="dotted-line">{{ $aibVal($altoFusto, 'latifoglie') }}</span><br>
                    Misto <span class="dotted-line">{{ $aibVal($altoFusto, 'misto') }}</span><br>
                    Rimboschimento <span class="dotted-line">{{ $aibVal($altoFusto, 'rimboschimento') }}</span>
                </td>
                <td style="line-height: 1.5; padding: 6px 4px;">
                    Cespugliato <span class="dotted-line">{{ $aibVal($nonBoscato, 'cespugliato') }}</span><br>
                    Pascolo <span class="dotted-line">{{ $aibVal($nonBoscato, 'pascolo') }}</span><br>
                    Seminativo <span class="dotted-line">{{ $aibVal($nonBoscato, 'seminativo') }}</span><br>
                    Incolto <span class="dotted-line">{{ $aibVal($nonBoscato, 'incolto') }}</span>
                </td>
                <td></td>
            </tr>
        </tbody>
    </table>

    <table class="form-table">
        <thead>
            <tr>
                <th style="width: 70%;" class="section-title">Automezzo Utilizzato</th>
                <th style="width: 30%;" class="section-title">Targa</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="input-space-sm"><span style="margin-left: 5px;">1</span> {{ $mezzoLabel($veicoli[0] ?? null) }}</td>
                <td>{{ $veicoli[0]['targa'] ?? '' }}</td>
            </tr>
            <tr>
                <td class="input-space-sm"><span style="margin-left: 5px;">2</span> {{ $mezzoLabel($veicoli[1] ?? null) }}</td>
                <td>{{ $veicoli[1]['targa'] ?? '' }}</td>
            </tr>
        </tbody>
    </table>

    <table class="form-table" style="margin-bottom: 5px;">
        <thead>
            <tr>
                <th style="width: 70%; font-weight: bold;" class="section-title">Considerazioni e Note <span style="font-weight: normal; text-transform: none;">(relazione sintetica sul servizio erogato)</span></th>
                <th style="width: 30%; font-size: 10px;" class="section-title">Orario Di Fine<br>Intervento</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td rowspan="2" style="vertical-align: top; min-height: 50px;">{{ $noteOperative ?? '' }}</td>
                <td style="height: 30px;" class="col-center">{{ $oraFineIntervento ?? '' }}</td>
            </tr>
            
        </tbody>
    </table>

    <table class="form-table footer-section">
        <thead>
            <tr>
                <th style="width: 50%;" class="section-title">Orario Di Rientro in Sede ODV</th>
                <th style="width: 50%;" class="section-title">Firma Capo Squadra</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="col-center input-space-sm">{{ $oraRientro ?? '' }}</td>
                <td class="col-center input-space-sm">{{ $firma ?? '' }}</td>
            </tr>
        </tbody>
    </table>

    <div class="report-redatto">
        Report redatto da: {{ $reportRedattoDa ?? '' }}
    </div>

</div>


</body>
</html>
