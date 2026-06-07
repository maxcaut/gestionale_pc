-- Tipologia AIB: L = Lotta attiva, P = Pattugliamento

ALTER TABLE public.servizi
    ADD COLUMN IF NOT EXISTS tipologia_aib text;

COMMENT ON COLUMN public.servizi.tipologia_aib IS 'Tipologia AIB: L = Lotta attiva, P = Pattugliamento';
