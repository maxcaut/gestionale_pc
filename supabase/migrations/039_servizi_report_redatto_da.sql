ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS nome TEXT,
    ADD COLUMN IF NOT EXISTS cognome TEXT;

COMMENT ON COLUMN public.profiles.nome IS 'Nome del profilo utente, usato anche per i report redatti';
COMMENT ON COLUMN public.profiles.cognome IS 'Cognome del profilo utente, usato anche per i report redatti';

ALTER TABLE public.servizi
    ADD COLUMN IF NOT EXISTS completato_da_profile_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS completato_da_nome TEXT,
    ADD COLUMN IF NOT EXISTS completato_da_cognome TEXT,
    ADD COLUMN IF NOT EXISTS completato_il TIMESTAMPTZ;

COMMENT ON COLUMN public.servizi.completato_da_profile_id IS 'Profilo utente che ha portato il servizio allo stato Completato';
COMMENT ON COLUMN public.servizi.completato_da_nome IS 'Snapshot del nome del profilo che ha completato il servizio';
COMMENT ON COLUMN public.servizi.completato_da_cognome IS 'Snapshot del cognome del profilo che ha completato il servizio';
COMMENT ON COLUMN public.servizi.completato_il IS 'Data e ora in cui il servizio e stato portato allo stato Completato';
