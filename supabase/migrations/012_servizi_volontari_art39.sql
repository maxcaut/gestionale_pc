-- Art.39 per volontario assegnato all'intervento

ALTER TABLE public.servizi
    ADD COLUMN IF NOT EXISTS volontari_art39 jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.servizi.volontari_art39 IS 'Mappa volontario_id -> Si/No per art.39 sull''intervento';
