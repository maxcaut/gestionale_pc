-- Squadre A.I.B.: scadenza disponibilita automatica

ALTER TABLE public.squadre_aib
    ADD COLUMN IF NOT EXISTS disponibile_fino TIME;
