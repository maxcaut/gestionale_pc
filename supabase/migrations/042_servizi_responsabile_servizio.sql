ALTER TABLE public.servizi
    ADD COLUMN IF NOT EXISTS responsabile_servizio_id TEXT;

COMMENT ON COLUMN public.servizi.responsabile_servizio_id IS 'Volontario assegnato come responsabile del servizio programmato';
