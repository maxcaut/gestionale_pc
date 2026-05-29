<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="utf-8">
    <title>Riepilogo intervento — {{ $servizio['tipo'] }}</title>
    <style>
        /* Template PDF: personalizza loghi, colori e testi qui */
        @page { margin: 28mm 22mm 24mm 22mm; }
        * { box-sizing: border-box; }
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 10pt;
            color: #1e293b;
            line-height: 1.45;
        }
        .header {
            border-bottom: 2px solid #d97706;
            padding-bottom: 12px;
            margin-bottom: 20px;
        }
        .logo-placeholder {
            width: 80px;
            height: 50px;
            border: 1px dashed #94a3b8;
            text-align: center;
            font-size: 7pt;
            color: #64748b;
            line-height: 50px;
            float: left;
            margin-right: 16px;
        }
        .org-name {
            font-size: 11pt;
            font-weight: bold;
            color: #0f172a;
            margin: 0 0 2px 0;
        }
        .org-sub {
            font-size: 8pt;
            color: #64748b;
            margin: 0;
        }
        h1 {
            clear: both;
            font-size: 16pt;
            color: #0f172a;
            margin: 18px 0 4px 0;
            letter-spacing: 0.02em;
        }
        .doc-meta {
            font-size: 8pt;
            color: #64748b;
            margin-bottom: 18px;
        }
        .section {
            margin-bottom: 16px;
        }
        .section-title {
            font-size: 9pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #b45309;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
            margin-bottom: 8px;
        }
        table.data {
            width: 100%;
            border-collapse: collapse;
        }
        table.data th,
        table.data td {
            text-align: left;
            padding: 6px 8px;
            vertical-align: top;
            border: 1px solid #e2e8f0;
        }
        table.data th {
            width: 32%;
            background: #f8fafc;
            font-weight: bold;
            font-size: 9pt;
            color: #475569;
        }
        table.data td {
            font-size: 10pt;
        }
        table.equipaggio {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
        }
        table.equipaggio th {
            background: #0f172a;
            color: #fff;
            padding: 7px 8px;
            text-align: left;
            font-size: 8pt;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        table.equipaggio td {
            padding: 6px 8px;
            border: 1px solid #e2e8f0;
        }
        table.equipaggio tr:nth-child(even) td {
            background: #f8fafc;
        }
        .note-box {
            border: 1px solid #e2e8f0;
            background: #f8fafc;
            padding: 10px 12px;
            min-height: 48px;
            white-space: pre-wrap;
        }
        .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            font-size: 7pt;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
        }
        .badge-completato {
            display: inline-block;
            background: #ecfdf5;
            color: #047857;
            border: 1px solid #a7f3d0;
            padding: 2px 8px;
            font-size: 8pt;
            font-weight: bold;
            border-radius: 4px;
        }

        .logo-ente{
            height: 100px;
            width: 100px;
        }
    </style>
</head>
<body>
    <div class="header">
        <img src="data:image/png;base64,{{ base64_encode(file_get_contents(public_path('img/logo-regione.png'))) }}" alt="Logo" class="logo-ente">
        <p class="org-name">Protezione Civile — Coordinamento Vesuvius</p>
        <p class="org-sub">Registro missioni e servizi di protezione civile</p>
    </div>

    <h1>Riepilogo intervento</h1>
    <p class="doc-meta">
        Documento generato il {{ $exportatoIl }} &nbsp;|&nbsp;
        ID registrazione: <strong>{{ $servizio['id'] }}</strong>
    </p>

    <div class="section">
        <div class="section-title">Dati dell'intervento</div>
        <table class="data">
            <tr>
                <th>Tipologia servizio / intervento</th>
                <td><strong>{{ $servizio['tipo'] }}</strong></td>
            </tr>
            <tr>
                <th>Data intervento</th>
                <td>{{ $dataIntervento['data'] }}</td>
            </tr>
            <tr>
                <th>Ora intervento</th>
                <td>{{ $dataIntervento['ora'] }}</td>
            </tr>
            <tr>
                <th>Data e ora (completa)</th>
                <td>{{ $dataIntervento['completa'] }}</td>
            </tr>
            <tr>
                <th>Stato servizio</th>
                <td><span class="badge-completato">{{ $servizio['stato'] }}</span></td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Note operative</div>
        <div class="note-box">{{ $servizio['note'] ?? 'Nessuna nota operativa aggiuntiva.' }}</div>
    </div>

    <div class="section">
        <div class="section-title">Mezzi assegnati ({{ count($mezzi) }})</div>
        @if (count($mezzi) > 0)
            <table class="equipaggio">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Modello</th>
                        <th>Targa</th>
                        <th>Tipologia</th>
                        <th>Stato</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($mezzi as $index => $mezzo)
                        <tr>
                            <td>{{ $index + 1 }}</td>
                            <td>{{ $mezzo['modello'] ?? '—' }}</td>
                            <td>{{ $mezzo['targa'] ?? '—' }}</td>
                            <td>{{ $mezzo['tipo'] ?? '—' }}</td>
                            <td>{{ $mezzo['stato'] ?? '—' }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @else
            <p>Nessun mezzo associato a questo intervento.</p>
        @endif
    </div>

    <div class="section">
        <div class="section-title">Equipaggio volontari ({{ count($equipaggio) }})</div>
        <table class="equipaggio">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Cognome e nome</th>
                    <th>Codice fiscale</th>
                    <th>Ruolo</th>
                    <th>Telefono</th>
                    <th>Stato</th>
                </tr>
            </thead>
            <tbody>
                @foreach ($equipaggio as $index => $volontario)
                    <tr>
                        <td>{{ $index + 1 }}</td>
                        <td>{{ $volontario['cognome'] }} {{ $volontario['nome'] }}</td>
                        <td>{{ $volontario['cf'] ?? '—' }}</td>
                        <td>{{ $volontario['ruolo'] ?? '—' }}</td>
                        <td>{{ $volontario['telefono'] ?? '—' }}</td>
                        <td>{{ $volontario['stato'] ?? '—' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Riepilogo numerico</div>
        <table class="data">
            <tr>
                <th>Volontari in equipaggio</th>
                <td>{{ count($equipaggio) }}</td>
            </tr>
            <tr>
                <th>Mezzi impiegati</th>
                <td>{{ count($mezzi) > 0 ? collect($mezzi)->map(fn ($m) => ($m['modello'] ?? '—').' ('.($m['targa'] ?? '—').')')->implode('; ') : 'Nessuno' }}</td>
            </tr>
        </table>
    </div>

    <div class="footer">
        Riepilogo intervento — {{ $servizio['tipo'] }} — {{ $dataIntervento['completa'] }}
        &nbsp;|&nbsp; Pagina generata automaticamente dal gestionale PC
    </div>
</body>
</html>
