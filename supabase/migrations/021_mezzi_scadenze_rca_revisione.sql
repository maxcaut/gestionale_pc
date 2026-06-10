ALTER TABLE public.mezzi
    ADD COLUMN IF NOT EXISTS scadenza_rca DATE,
    ADD COLUMN IF NOT EXISTS scadenza_revisione DATE;
