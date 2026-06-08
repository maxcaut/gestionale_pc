ALTER TABLE public.volontari
    ADD COLUMN IF NOT EXISTS data_nascita DATE,
    ADD COLUMN IF NOT EXISTS luogo_nascita TEXT,
    ADD COLUMN IF NOT EXISTS comune_residenza TEXT,
    ADD COLUMN IF NOT EXISTS via_residenza TEXT,
    ADD COLUMN IF NOT EXISTS censito BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS matricola_regionale TEXT,
    ADD COLUMN IF NOT EXISTS qualifica_antincendio TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS qualifiche_coordinamento TEXT[] NOT NULL DEFAULT '{}';
