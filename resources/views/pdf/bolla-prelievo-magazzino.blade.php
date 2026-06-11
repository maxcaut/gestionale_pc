<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="utf-8">
    <title>Bolla prelievo magazzino</title>
    <style>
        @page { size: A4 portrait; margin: 14mm; }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            font-family: DejaVu Sans, sans-serif;
            color: #111827;
            background: #fff;
            font-size: 12px;
            line-height: 1.35;
        }
        .header {
            border-bottom: 2px solid #111827;
            padding-bottom: 14px;
            margin-bottom: 18px;
            display: table;
            width: 100%;
        }
        .header-text {
            display: table-cell;
            vertical-align: middle;
        }
        .title {
            margin: 0 0 5px;
            font-size: 24px;
            text-transform: uppercase;
            letter-spacing: .5px;
        }
        .subtitle {
            margin: 0;
            color: #4b5563;
            font-size: 12px;
        }
        .meta {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
        }
        .meta td {
            width: 50%;
            border: 1px solid #d1d5db;
            padding: 9px 10px;
            vertical-align: top;
        }
        .label {
            display: block;
            color: #6b7280;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 3px;
        }
        .value {
            font-size: 13px;
            font-weight: bold;
        }
        table.items {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        .items th,
        .items td {
            border: 1px solid #111827;
            padding: 8px;
            vertical-align: top;
        }
        .items th {
            background: #e5e7eb;
            text-align: left;
            font-size: 10px;
            text-transform: uppercase;
        }
        .qty {
            width: 70px;
            text-align: center;
            font-weight: bold;
        }
        .signature {
            margin-top: 34px;
            width: 100%;
        }
        .signature td {
            width: 50%;
            padding-top: 30px;
            text-align: center;
        }
        .line {
            border-top: 1px solid #111827;
            padding-top: 6px;
            display: inline-block;
            min-width: 210px;
            font-size: 10px;
            text-transform: uppercase;
            color: #4b5563;
        }
        .footer {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            color: #6b7280;
            font-size: 9px;
            text-align: right;
        }
        .logo{
            height: 60px;
            width: 60px;
            
            display: table-cell;
            vertical-align: middle;
        }
    </style>
</head>
<body>
    <div class="header">
        <img class="logo" src="img/logo-regione.png" alt="">
        <div class="header-text">
            <h1 class="title">Bolla di prelievo</h1>
            <p class="subtitle">Transazione magazzino aperta</p>
        </div>
    </div>

    <table class="meta">
        <tr>
            <td>
                <span class="label">Data prelievo</span>
                <span class="value">{{ $dataPrelievo['display'] }}</span>
            </td>
            <td>
                <span class="label">Consegnato a</span>
                <span class="value">{{ $prelievo['consegnato_a'] }}</span>
            </td>
        </tr>
        <tr>
            <td>
                <span class="label">Associazione</span>
                <span class="value">{{ $prelievo['associazione_appartenenza'] ?? '-' }}</span>
            </td>
            <td>
                <span class="label">Stato</span>
                <span class="value">Aperto</span>
            </td>
        </tr>
    </table>

    <table class="items">
        <thead>
            <tr>
                <th>Attrezzatura</th>
                <th>Tipo</th>
                <th>Numero inventario</th>
                <th class="qty">Quantità</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($righe as $riga)
                <tr>
                    <td>{{ $riga['nome_attrezzatura'] }}</td>
                    <td>{{ $riga['tipo_attrezzatura'] ?? '-' }}</td>
                    <td>{{ $riga['numero_inventario'] ?? '-' }}</td>
                    <td class="qty">{{ $riga['quantita'] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table class="signature">
        <tr>
            <td><span class="line">Firma consegna</span></td>
            <td><span class="line">Firma ricevente</span></td>
        </tr>
    </table>

    <div class="footer">Generato il {{ $exportatoIl }}</div>
</body>
</html>
