-- Art.39 globale sull'intervento

ALTER TABLE public.servizi
    ADD COLUMN IF NOT EXISTS art39 TEXT NOT NULL DEFAULT 'Si'
    CHECK (art39 IN ('Si', 'No'));

COMMENT ON COLUMN public.servizi.art39 IS 'Abilita gestione Art.39 per volontario assegnato al servizio';
