ALTER TABLE public.servizi
    ADD COLUMN IF NOT EXISTS volontari_mezzi jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.servizi.volontari_mezzi IS 'Mappa volontario_id -> mezzo_id per assegnazione equipaggio ai mezzi';
