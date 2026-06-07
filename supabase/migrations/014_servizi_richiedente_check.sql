-- Allinea il vincolo richiedente alle voci del menu "Nuova missione".

ALTER TABLE public.servizi
    ADD COLUMN IF NOT EXISTS richiedente text;

ALTER TABLE public.servizi
    DROP CONSTRAINT IF EXISTS servizi_richiedente_check;

ALTER TABLE public.servizi
    ADD CONSTRAINT servizi_richiedente_check
    CHECK (
        richiedente IS NULL
        OR richiedente IN (
            'SORU',
            'SOPI',
            'COORDINAMENTO VESUVIUS',
            'COMUNE',
            'ENTE ESTERNO',
            'FF.OO.',
            'V.V.F.',
            'PRIVATO',
            'ALTRO COORDINAMENTO'
        )
    );
