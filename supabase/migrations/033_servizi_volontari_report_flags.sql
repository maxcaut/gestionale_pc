ALTER TABLE public.servizi
    ADD COLUMN IF NOT EXISTS volontari_conta_ore jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS volontari_in_report jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.servizi.volontari_conta_ore IS 'Mappa volontario_id -> Si/No per includere il servizio nelle statistiche ore del volontario';
COMMENT ON COLUMN public.servizi.volontari_in_report IS 'Mappa volontario_id -> Si/No per includere il volontario nei report consuntivi';
