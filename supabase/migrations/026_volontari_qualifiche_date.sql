ALTER TABLE public.volontari
    ADD COLUMN IF NOT EXISTS qualifica_antincendio_date jsonb NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS qualifiche_coordinamento_date jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.volontari.qualifica_antincendio_date IS 'Mappa qualifica antincendio -> data conseguimento';
COMMENT ON COLUMN public.volontari.qualifiche_coordinamento_date IS 'Mappa qualifica coordinamento -> data conseguimento';
