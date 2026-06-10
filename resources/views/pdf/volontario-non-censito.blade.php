<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: DejaVu Sans, sans-serif;
            color: #111827;
            font-size: 12px;
            line-height: 1.4;
        }

        h1 {
            font-size: 20px;
            margin: 0 0 18px;
            text-transform: uppercase;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th,
        td {
            border: 1px solid #d1d5db;
            padding: 8px;
            text-align: left;
            vertical-align: top;
        }

        th {
            width: 32%;
            background: #f3f4f6;
            font-weight: bold;
        }

        .footer {
            margin-top: 24px;
            font-size: 10px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <h1>Volontario non censito</h1>

    <table>
        <tr>
            <th>Nominativo</th>
            <td>{{ trim(($volontario['nome'] ?? '').' '.($volontario['cognome'] ?? '')) }}</td>
        </tr>
        <tr>
            <th>Codice fiscale</th>
            <td>{{ $volontario['cf'] ?? '' }}</td>
        </tr>
        <tr>
            <th>Data e luogo di nascita</th>
            <td>{{ $volontario['data_nascita'] ?? '' }} {{ $volontario['luogo_nascita'] ?? '' }}</td>
        </tr>
        <tr>
            <th>Residenza</th>
            <td>{{ trim(($volontario['via_residenza'] ?? '').' '.($volontario['comune_residenza'] ?? '')) }}</td>
        </tr>
        <tr>
            <th>Telefono</th>
            <td>{{ $volontario['telefono'] ?? '' }}</td>
        </tr>
        <tr>
            <th>Ruolo</th>
            <td>{{ $volontario['ruolo'] ?? '' }}</td>
        </tr>
        <tr>
            <th>Stato</th>
            <td>{{ $volontario['stato'] ?? '' }}</td>
        </tr>
        <tr>
            <th>Associazione</th>
            <td>{{ $volontario['associazione_appartenenza'] ?? '' }}</td>
        </tr>
    </table>

    <div class="footer">Generato il {{ $generatoIl }}</div>
</body>
</html>
