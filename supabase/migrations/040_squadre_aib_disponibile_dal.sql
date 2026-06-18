-- Squadre A.I.B.: data e ora di inizio disponibilità

ALTER TABLE public.squadre_aib
    ADD COLUMN IF NOT EXISTS disponibile_dal TIMESTAMPTZ;
