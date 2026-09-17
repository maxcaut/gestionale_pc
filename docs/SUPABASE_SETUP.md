# Setup Supabase — ruoli segreteria / master

## 1. Esegui le migration SQL

### Nuova istanza: un solo script

Su un **nuovo progetto Supabase**, apri **SQL → New query**, incolla tutto il
contenuto di [`supabase/migration_unica_supabase.sql`](../supabase/migration_unica_supabase.sql)
ed eseguilo come `postgres`. Non serve eseguire prima `db.txt` o dopo i singoli
file in `supabase/migrations`.

Lo script crea le tabelle iniziali e applica tutti i **51 file SQL**, dalla 001
alla 048 (006, 030 e 041 hanno due file ciascuno), in un'unica transazione.
Include ruoli e policy RLS, volontari e documenti, mezzi, servizi e report,
squadre AIB, magazzino e RPC di prelievo/rientro, associazioni, protocolli,
operatore di turno, aree sulla mappa e sessione attiva unica. Crea anche tutti
gli otto bucket Storage privati con le rispettive policy. Le colonne delle
coordinate, dell'indirizzo e degli enti coinvolti nei servizi, usate dall'app
ma assenti dalle migration storiche, sono comprese nello schema iniziale.

Usalo una sola volta, con le tabelle applicative ancora assenti. Occorre un
progetto Supabase con Authentication e Storage già predisposti: lo script
non installa questi servizi su un server PostgreSQL generico. In caso di
errore, la transazione annulla tutte le modifiche.

La nuova istanza parte senza utenti e dati operativi: crea il primo utente
master seguendo i punti 2 e 3. Per trasferire anche i dati precedenti occorre
una copia separata di utenti, record e file Storage.

Sul nuovo host configura `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
e `SUPABASE_SERVICE_ROLE_KEY` con i valori del **nuovo** progetto, poi rigenera
gli asset con `npm run build` e aggiorna la cache di configurazione Laravel
con `php artisan config:cache`. Le migration Laravel in `database/migrations`
restano separate da questo script Supabase; se il nuovo host usa un database
Laravel vuoto per utenti, cache o job, esegui anche `php artisan migrate --force`.

Per rigenerare il file unico dopo modifiche alle migration:

```bash
node scripts/build-supabase-migration.mjs
```

### Istanza esistente: migration individuali

1. Apri il progetto su [Supabase](https://supabase.com) → **SQL** → **New query**.
2. Incolla ed esegui `supabase/migrations/001_profiles_rls_volontari.sql`.
3. Incolla ed esegui `supabase/migrations/002_profiles_admin_rls.sql` (schermata **Utenti** nell’app).
4. Incolla ed esegui `supabase/migrations/003_capo_squadra.sql` (ruolo **Capo Squadra** / Sala operativa).
5. Esegui anche le migration successive in ordine numerico, inclusa `supabase/migrations/023_volontari_foto_storage.sql` per bucket Storage e foto volontari.

Aggiungi nel `.env` Laravel la chiave **service_role** (Settings → API → `service_role`, solo server):

```env
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Verifica in **Table Editor** che esista la tabella `profiles`, che su `volontari` ci siano `associazione_appartenenza` e `foto_path`, e che in **Storage** esista il bucket privato `volontari-foto`.

## 2. Crea gli utenti in Authentication

**Authentication** → **Users** → **Add user** → **Create new user**

- Inserisci email e password.
- Spunta **Auto Confirm User** (così possono accedere subito).

Copia l’**UUID** dell’utente (colonna id nella lista utenti).

## 3. Collega ogni utente al profilo (ruolo + associazione)

Nel **SQL Editor**, per ogni utente:

### Utente master (vede tutto)

```sql
INSERT INTO public.profiles (id, email, ruolo, associazione)
VALUES (
    'INCOLLA-UUID-UTENTE',
    'master@esempio.it',
    'master',
    NULL
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    ruolo = EXCLUDED.ruolo,
    associazione = EXCLUDED.associazione;
```

### Utente segreteria (solo la propria associazione)

Il valore `associazione` deve essere **identico** a una voce del select volontario nell’app, ad esempio:

- `G.C. Massa di Somma`
- `G.C. Cercola`
- `Cobra 2`
- `G.C. Sant'Anastasia`
- `Save Me`
- `NVPC Pomigliano`

```sql
INSERT INTO public.profiles (id, email, ruolo, associazione)
VALUES (
    'INCOLLA-UUID-UTENTE',
    'segreteria.massa@esempio.it',
    'segreteria',
    'G.C. Massa di Somma'
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    ruolo = EXCLUDED.ruolo,
    associazione = EXCLUDED.associazione;
```

## 4. Variabili Laravel / Vite

Nel file `.env` del progetto:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...   # chiave anon / publishable
```

Usa la **anon key** (Settings → API → `anon` `public`). Con RLS attivo e utente loggato, le query rispettano i permessi.

## 5. Comportamento atteso

| Ruolo       | Volontari                         | Mezzi / Servizi / Dashboard globale |
|------------|-----------------------------------|-------------------------------------|
| **master** | Tutti (CRUD)                      | Accesso completo                    |
| **segreteria** | Solo della propria associazione (CRUD) | Nascosti; dashboard solo personale |

## 6. Problemi comuni

| Sintomo | Soluzione |
|--------|-----------|
| Login ok ma messaggio “profilo non configurato” | Inserisci riga in `profiles` con l’UUID corretto |
| Segreteria non vede volontari | Controlla che `associazione` nel profilo coincida con `associazione_appartenenza` sui record |
| Errore permessi su mezzi/servizi come segreteria | Normale: quel ruolo non carica quelle tabelle |
| Modifica profilo da app | Non prevista: aggiorna da SQL Editor o Dashboard |

## 7. Volontari già presenti senza associazione

Se i record in `volontari` non hanno `associazione_appartenenza`, le segreterie non li vedranno. Assegna l’associazione (come master, da SQL):

```sql
UPDATE public.volontari
SET associazione_appartenenza = 'G.C. Massa di Somma'
WHERE associazione_appartenenza IS NULL;
```

## 8. Aggiornare un profilo esistente

```sql
UPDATE public.profiles
SET ruolo = 'segreteria', associazione = 'G.C. Cercola'
WHERE email = 'utente@esempio.it';
```
