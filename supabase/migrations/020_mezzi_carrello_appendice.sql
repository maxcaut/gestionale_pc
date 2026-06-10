ALTER TABLE public.servizi
    ADD COLUMN IF NOT EXISTS carrelli_trainanti JSONB NOT NULL DEFAULT '{}';

ALTER TABLE public.mezzi
    DROP COLUMN IF EXISTS mezzo_trainante_id;
