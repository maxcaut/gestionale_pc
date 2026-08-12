# API esterna in sola lettura

Questa API consente a ogni utente valido di Supabase Auth di accedere con la
stessa email e password usata nell'app principale. Il token Supabase non viene
mai restituito al client esterno.

## Login

```http
POST /api/external/login
Content-Type: application/json

{
  "email": "utente@example.com",
  "password": "password"
}
```

Risposta:

```json
{
  "token": "token-cifrato",
  "token_type": "Bearer",
  "expires_at": "2026-08-12T12:30:00+02:00"
}
```

Il token scade dopo 30 minuti per impostazione predefinita. La durata e'
configurabile sul server con `EXTERNAL_READ_TOKEN_LIFETIME`.

## Lettura dati

```http
GET /api/external/data/servizi?limit=100&offset=0
Authorization: Bearer token-cifrato
Accept: application/json
```

`limit` puo' essere compreso tra 1 e 1000. `offset` deve essere almeno 0.

Risorse disponibili:

- `profiles`
- `volontari`
- `mezzi`
- `servizi`
- `squadre_aib`
- `associazioni`
- `magazzino_tipi_attrezzatura`
- `magazzino_attrezzature`
- `magazzino_prelievi`
- `magazzino_prelievi_righe`
- `protocollo_ingresso`
- `protocollo_associazione`
- `operatore_sala_turno`
- `sala_operativa_aree_intervento`

Non esistono endpoint `POST`, `PUT`, `PATCH` o `DELETE` per i dati.
`auth.users` non e' esposta: il login viene verificato internamente tramite
Supabase Auth.
