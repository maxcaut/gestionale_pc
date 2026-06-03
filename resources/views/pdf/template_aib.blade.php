<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <title>CONVENZIONE SUPPORTO AIB 2024</title>
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
            border: 1px solid #000000;
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
        .header-text { width: 70%; }
        .header-logo-right { width: 15%; }

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

<div class="container">

    <table class="header-table">
        <tr>
            <td class="header-logo-left">
                <img src="$logoSx" alt="">
            </td>
            <td class="header-text">
                <h1>Giunta Regionale della Campania</h1>
                <h2>Direzione Generale Lavori Pubblici e Protezione Civile</h2>
                <h3>STAFF Emergenza e post-emergenza</h3>
            </td>
            <td class="header-logo-right">
                <img src="$logoDx" alt="">
            </td>
        </tr>
    </table>

    <div class="main-title">
        CONVENZIONE SUPPORTO AIB 2024 – TIPOLOGIA L – RAPPORTO ATTIVITA'
    </div>

    <div class="info-line">
        OdV: ______________________________________________________________________________________
    </div>
    <div class="info-line">
        Coordinamento: <span style="font-size: 10px;">COORDINAMENTO TERRITORIALE AREA VESUVIANA "VESUVIUS"</span> Convenzione prot ............del..........
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
                <td class="input-space-sm"></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
            </tr>
        </tbody>
    </table>

    <table class="form-table">
        <tbody>
            <tr>
                <th style="width: 35%;">Intervento richiesto da<br>(specificare se SOPI o SORU)</th>
                <td style="width: 20%;" class="input-space-md"></td>
                <th style="width: 10%;">Alle ore</th>
                <td style="width: 12%;"></td>
                <th style="width: 13%;">Ora arrivo<br>sull'incendio</th>
                <td style="width: 10%;"></td>
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
                <td class="input-space-sm"></td>
                <td></td>
            </tr>
            <tr>
                <th class="col-center"></th>
                <th>Cognome Nome – Operatore Volontario</th>
                <th>Recapito Telefonico</th>
            </tr>
            <tr>
                <td class="col-center">2</td>
                <td class="input-space-sm"></td>
                <td></td>
            </tr>
            <tr>
                <td class="col-center">3</td>
                <td class="input-space-sm"></td>
                <td></td>
            </tr>
            <tr>
                <td class="col-center">4</td>
                <td class="input-space-sm"></td>
                <td></td>
            </tr>
            <tr>
                <td class="col-center">5</td>
                <td class="input-space-sm"></td>
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
                    Matricinato <span class="dotted-line">............</span><br>
                    Composto <span class="dotted-line">.............</span><br>
                    Degradato <span class="dotted-line">............</span><br>
                    Macchia <span class="dotted-line">..............</span>
                </td>
                <td style="line-height: 1.5; padding: 6px 4px;">
                    Resinoso <span class="dotted-line">.............</span><br>
                    Latifoglie <span class="dotted-line">............</span><br>
                    Misto <span class="dotted-line">................</span><br>
                    Rimboschimento <span class="dotted-line">....</span>
                </td>
                <td style="line-height: 1.5; padding: 6px 4px;">
                    Cespugliato <span class="dotted-line">...........</span><br>
                    Pascolo <span class="dotted-line">...............</span><br>
                    Seminativo <span class="dotted-line">............</span><br>
                    Incolto <span class="dotted-line">...............</span>
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
                <td class="input-space-sm"><span style="margin-left: 5px;">1</span></td>
                <td></td>
            </tr>
            <tr>
                <td class="input-space-sm"><span style="margin-left: 5px;">2</span></td>
                <td></td>
            </tr>
        </tbody>
    </table>

    <table class="form-table" style="margin-bottom: 5px;">
        <thead>
            <tr>
                <th style="width: 70%; font-weight: bold;" class="section-title">Considerazioni e Note <span style="font-weight: normal; text-transform: none;">(relazione sintetica sul servizio erogato)</span></th>
                <th style="width: 30%; font-size: 10px; class="section-title">Orario Di Fine<br>Intervento</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="height: 30px;"></td>
                <td style="height: 30px;"></td>
            </tr>
            <tr>
                <td rowspan="2