<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <title>Modello 3.2</title>
    <style>
        @page { size: A4; margin: 7mm 14mm 8mm; }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            color: #000;
            background: #fff;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11.5px;
            line-height: 1.12;
        }

        .page {
            width: 100%;
            position: relative;
        }

        .page + .page {
            page-break-before: always;
        }

        .model-title {
            position: absolute;
            top: 30px;
            right: 0;
            font-size: 18px;
            font-weight: 700;
        }

        .logo-wrap {
            text-align: center;
        }

        .logo {
            display: block;
            width: 82px;
            height: 82px;
            margin: 0 0 28px;
        }

        .main-title {
            text-align: center;
            font-size: 15px;
            font-weight: 700;
            margin-bottom: 5px;
        }

        .subtitle {
            text-align: center;
            font-size: 12px;
            font-weight: 700;
            margin-bottom: 16px;
        }

        .field-row {
            display: table;
            width: 100%;
            margin-bottom: 10px;
            table-layout: fixed;
        }

        .field-row.tight {
            margin-bottom: 9px;
        }

        .field {
            display: table-cell;
            vertical-align: bottom;
            white-space: nowrap;
        }

        .field + .field {
            padding-left: 6px;
        }

        .label {
            font-weight: 700;
        }

        .line {
            display: inline-block;
            border-bottom: 1px solid #000;
            height: 12px;
            vertical-align: bottom;
        }

        .line.evento { width: 78%; }
        .line.organizzazione { width: 80%; }
        .line.appartenenza { width: 48%; }
        .line.comune { width: 45%; }
        .line.provincia { width: 34%; }
        .line.conducente { width: 42%; }
        .line.mezzo { width: 48%; }
        .line.targa { width: 25%; }
        .line.localita { width: 72%; }
        .line.data-partenza { width: 28%; }
        .line.km-partenza { width: 34%; }
        .line.data-rientro { width: 23%; }
        .line.km-rientro { width: 30%; }
        .line.totale-km { width: 27%; }
        .line.note { width: 86%; }
        .line.amount { width: 165px; }
        .line.small { width: 42px; }
        .line.attrezzatura { width: 52%; }

        .prefilled {
            font-weight: 400;
        }

        .value {
            display: inline-block;
            padding-left: 3px;
            font-weight: 400;
            white-space: nowrap;
            max-width: 100%;
            overflow: hidden;
        }

        .bullet-row {
            margin: 13px 0 7px;
            font-weight: 700;
        }

        .bullet {
            display: inline-block;
            width: 20px;
            font-size: 15px;
            vertical-align: top;
        }

        .bullet-text {
            display: inline-block;
            width: 94%;
            vertical-align: top;
        }

        .indent {
            margin-left: 29px;
        }

        .separator {
            border: 0;
            border-top: 2px solid #000;
            margin: 18px 0 7px 29px;
        }

        .expense-list {
            margin: 0 0 17px 50px;
            padding: 0;
            list-style-type: none;
            font-size: 11.5px;
            line-height: 1.16;
        }

        .expense-list li {
            margin-bottom: 6px;
            text-align: justify;
        }

        .expense-list .dash {
            display: inline-block;
            width: 18px;
            margin-left: -18px;
        }

        .note-section {
            margin: 13px 0 0;
            font-size: 11.5px;
            line-height: 1.16;
            text-align: justify;
        }

        .note-section .nb {
            display: block;
            font-weight: 700;
            text-decoration: underline;
            margin-bottom: 4px;
        }

        .signature-driver {
            width: 310px;
            margin: 24px 80px 18px auto;
            text-align: center;
            font-size: 15px;
            font-style: italic;
        }

        .signature-driver .dots,
        .signature-legal .dots {
            display: block;
            font-style: normal;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }

        .declaration-title {
            text-align: center;
            font-weight: 700;
            font-style: italic;
            margin-bottom: 4px;
        }

        .declaration {
            font-family: "Times New Roman", Times, serif;
            font-size: 11.2px;
            line-height: 1.03;
            font-style: italic;
            text-align: justify;
        }

        .declaration u {
            font-weight: 700;
        }

        .signature-legal {
            width: 350px;
            margin: 13px 64px 18px auto;
            text-align: center;
            font-size: 14px;
            font-style: italic;
        }

        .footer-note {
            font-size: 8.5px;
            line-height: 1.02;
            margin-top: 0;
        }

        .nowrap {
            white-space: nowrap;
        }
    </style>
</head>
<body>
@php
    $logo = public_path('img/modello-3-2-logo.jpeg');
    $servizio = $servizio ?? [];
    $veicoli = array_values($mezzi ?? []);
@endphp
@foreach ($veicoli as $mezzo)
<div class="page">
    <div class="model-title">Modello 3.2</div>

    <div class="logo-wrap">
        @if (is_file($logo))
            <img src="{{ $logo }}" alt="" class="logo">
        @endif
    </div>

    <div class="main-title">SCHEDA DI RILEVAZIONE UTILIZZO DEI MEZZI IMPIEGATI</div>
    <div class="subtitle">RIMBORSO DEL CARBURANTE E DEI PEDAGGI AUTOSTRADALI (per ciascun mezzo)</div>

    <div class="field-row">
        <div class="field">
            <span class="label">EVENTO/EMERGENZA</span><span class="line evento"><span class="value">{{ $servizio['tipo'] ?? '' }}</span></span>
        </div>
    </div>

    <div class="field-row">
        <div class="field">
            <span class="label">ORGANIZZAZIONE:</span><span class="line organizzazione"></span>
        </div>
    </div>

    <div class="field-row">
        <div class="field">
            <span class="label">ORGANIZZAZIONE NAZIONALE DI APPARTENENZA:</span>
            <span class="line appartenenza"><span class="prefilled">Regione Campania</span></span>
        </div>
    </div>

    <div class="field-row">
        <div class="field" style="width: 56%;">
            <span class="label">COMUNE:</span><span class="line comune"></span>
        </div>
        <div class="field" style="width: 44%;">
            <span class="label">PROVINCIA:</span><span class="line provincia"></span>
        </div>
    </div>

    <div class="bullet-row">
        <span class="bullet">&bull;</span>
        <span class="bullet-text">
            TIPOLOGIA MEZZO ASSOCIATIVO (MARCA E MODELLO):
            <span class="line mezzo"><span class="value">{{ $mezzo['tipo'] ?? '' }} - {{ $mezzo['modello'] ?? '' }}</span></span>
        </span>
    </div>

    <div class="field-row indent">
        <div class="field">
            <span class="label">TARGA:</span><span class="line targa"><span class="value">{{ $mezzo['targa'] ?? '' }}</span></span>
        </div>
    </div>

    <div class="field-row indent">
        <div class="field">
            <span class="label">LOCALITA DELL&rsquo;INTERVENTO</span><span class="line localita"></span>
        </div>
    </div>

    <div class="field-row indent">
        <div class="field" style="width: 50%;">
            <span class="label">DATA PARTENZA:</span><span class="line data-partenza"></span>
        </div>
        <div class="field" style="width: 50%;">
            <span class="label">KM ALLA PARTENZA:</span><span class="line km-partenza"></span>
        </div>
    </div>

    <div class="field-row indent">
        <div class="field" style="width: 50%;">
            <span class="label">DATA RIENTRO IN SEDE:</span><span class="line data-rientro"></span>
        </div>
        <div class="field" style="width: 50%;">
            <span class="label">KM AL RIENTRO IN SEDE:</span><span class="line km-rientro"></span>
        </div>
    </div>

    <div class="field-row indent">
        <div class="field">
            <span class="label">TOTALE KM PERCORSI</span><span class="line totale-km"></span>
        </div>
    </div>

    <div class="field-row indent tight">
        <div class="field">
            <span class="label">Note:</span><span class="line note"></span>
        </div>
    </div>

    <hr class="separator">

    <ul class="expense-list">
        <li><span class="dash">-</span>Rimborso del carburante per un importo complessivo di &euro;.<span class="line amount"></span>per n.<span class="line small"></span>rifornimenti effettuati come da documentazione giustificativa conservata in originale presso la sede dell&rsquo;Organizzazione di volontariato <i>(fatture, scontrini o estratti conto Carte Carburante, da cui si evinca in maniera oggettiva e univoca il luogo, la data e l&rsquo;ora del rifornimento, i litri erogati e l&rsquo;importo speso).</i></li>
        <li><span class="dash">-</span>Rimborso pedaggio autostradale per un importo complessivo di &euro;.<span class="line amount"></span>per n.<span class="line small"></span>ricevute conservate in originale presso la sede dell&rsquo;Organizzazione di volontariato <i>(gli scontrini o gli estratti conto Telepass).</i></li>
    </ul>

    <div class="bullet-row" style="margin-top: 13px;">
        <span class="bullet">&bull;</span>
        <span class="bullet-text">RIMBORSO CARBURANTE PER LE ATTREZZATURE IMPIEGATE - CARBURANTE (IMBARCAZIONI, GENERATORI, TORRI FARO, ...)</span>
    </div>

    <div class="field-row indent">
        <div class="field">
            <span class="label">TIPOLOGIA ATTREZZATURA (MARCA E MODELLO):</span><span class="line attrezzatura"></span>
        </div>
    </div>

    <ul class="expense-list" style="margin-bottom: 0;">
        <li><span class="dash">-</span>Rimborso del carburante per un importo complessivo di &euro;.<span class="line amount"></span>per n.<span class="line small"></span>rifornimenti effettuati come da documentazione conservata in originale presso la sede dell&rsquo;Organizzazione di volontariato <i>(fatture, scontrini o estratti conto Carte Carburante, da cui si evinca in maniera oggettiva e univoca il luogo, la data e l&rsquo; ora del rifornimento, i litri erogati e l&rsquo;importo speso).</i></li>
    </ul>

    <div class="note-section">
        <span class="nb">N.B.</span>
        La documentazione giustificativa di ciascuna spesa rendicontata dovr&agrave; essere conservata in originale presso la sede dell&rsquo;Organizzazione di volontariato, al fine di renderne possibile l&rsquo;esibizione in qualsiasi momento per eventuali controlli o per la trasmissione in copia conforme su richiesta della Regione Campania.
    </div>

    <div class="signature-driver">
        <span class="dots">....................................................</span>
        Il Conducente del Mezzo
    </div>

    <div class="declaration-title">Dichiarazione Sostitutiva dell&rsquo;Atto di Notoriet&agrave; (Art. 47 D.P.R. 28 dicembre 2000, n. 445)</div>
    <div class="declaration">
        Il/la Sottoscritto <u>Piccolo Giuseppe</u> nato a <u>Cercola (NA)</u> il <u>31/07/1968</u> residente a <u>Vitulazio (CE)</u> in <u>Viale KENNEDY 45</u> in qualit&agrave; di <u>Rappresentante Legale</u> dell&rsquo;Associazione di Volontariato <u>Coordinamento Territoriale Area Vesuviana &ldquo;Vesuvius</u> &rdquo;consapevole delle sanzioni penali, nel caso di dichiarazione non veritiere, di formazione o uso di atti falsi richiamate dall&rsquo;art. 76 delD.P.R.445 del 28 dicembre 2000, CHIEDE, ai sensi dell&rsquo;art. 40 del D.lgs. 1/2018 il reintegro delle spese per i carburanti e i pedaggi autostradali sopra dichiarate.
    </div>

    <div class="signature-legal">
        <span class="dots">....................................................</span>
        (firma del legale rappresentante)
    </div>

    <div class="footer-note">
        Ai sensi dell&rsquo;art.71 comma 1, del DPR 445/00 il Dipartimento della Protezione Civile avr&agrave; facolt&agrave; di effettuare accurati controlli sia a campione sia nei casi in cui vi siano fondati dubbi sulla veridicit&agrave; delle dichiarazioni rese dal richiedente in autocertificazione, anche dopo aver erogato il beneficio.<br>
        A tal fine il richiedente dovr&agrave; produrre tutta la documentazione che sar&agrave; richiesta.
    </div>
</div>
@endforeach
</body>
</html>
