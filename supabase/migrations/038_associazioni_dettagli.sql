-- Dettagli anagrafici delle associazioni gestibili.

ALTER TABLE public.associazioni
    ADD COLUMN IF NOT EXISTS legale_rappresentante TEXT,
    ADD COLUMN IF NOT EXISTS recapito_telefonico TEXT,
    ADD COLUMN IF NOT EXISTS mail_pec TEXT;

ALTER TABLE public.associazioni
    DROP CONSTRAINT IF EXISTS associazioni_legale_rappresentante_not_blank;

ALTER TABLE public.associazioni
    ADD CONSTRAINT associazioni_legale_rappresentante_not_blank
    CHECK (legale_rappresentante IS NULL OR length(trim(legale_rappresentante)) > 0);
