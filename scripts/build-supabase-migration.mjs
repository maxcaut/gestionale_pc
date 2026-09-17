import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const migrations = new URL('supabase/migrations/', root);
const files = readdirSync(migrations).filter(name => /^\d+.*\.sql$/.test(name)).sort();

// db.txt contiene lo schema precedente alle migration. Le colonne aggiunte
// successivamente restano nelle migration originali, inclusi i relativi vincoli.
const base = `CREATE TABLE public.volontari (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    cognome TEXT NOT NULL,
    cf TEXT NOT NULL UNIQUE,
    ruolo TEXT NOT NULL,
    telefono TEXT NOT NULL,
    stato TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.mezzi (
    id TEXT PRIMARY KEY,
    modello TEXT NOT NULL,
    targa TEXT NOT NULL UNIQUE,
    tipo TEXT NOT NULL,
    stato TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.servizi (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL,
    data TEXT NOT NULL,
    mezzi_ids TEXT[] NOT NULL DEFAULT '{}',
    volontari_ids TEXT[] NOT NULL DEFAULT '{}',
    note TEXT,
    stato TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Campi usati da resources/js/app.js, assenti dalle migration storiche.
    latitudine DOUBLE PRECISION,
    longitudine DOUBLE PRECISION,
    indirizzo_intervento TEXT,
    altri_enti_coinvolti TEXT
);`;

const sections = files.map(name => {
    const original = readFileSync(new URL(name, migrations), 'utf8');
    // La 048 ha una propria transazione: la inglobiamo nella transazione unica.
    const sql = original.replace(/^(?:BEGIN|COMMIT);[ \t]*$/gm, '').trimEnd();
    return `-- ============================================================================
-- supabase/migrations/${name}
-- ============================================================================
${sql}`;
});

const output = new URL('supabase/migration_unica_supabase.sql', root);
writeFileSync(output, `-- Coordinamento Vesuvius: installazione completa su un NUOVO progetto Supabase.
-- Generato con: node scripts/build-supabase-migration.mjs
-- Include lo schema iniziale e tutti i ${files.length} file delle migration storiche.
-- La numerazione arriva a 048; 006, 030 e 041 hanno due file ciascuno.
-- Eseguire una sola volta nel SQL Editor come postgres, su database applicativo vuoto.
-- Supabase deve avere gia predisposto auth, storage e i ruoli anon/authenticated/service_role.
-- Non eseguire anche le migration individuali su questa nuova istanza.
-- Non importa utenti, record operativi o file dalla vecchia istanza.

BEGIN;
SET LOCAL search_path = public, extensions;

${base}

${sections.join('\n\n')}

COMMIT;
`);
console.log(`Generato ${fileURLToPath(output)}: ${files.length} migration incluse.`);
