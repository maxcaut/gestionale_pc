-- Sostituisce l'elenco statico delle associazioni con l'anagrafica gestibile dall'app.
-- Le associazioni dei volontari esistenti devono essere presenti in public.associazioni.

BEGIN;

ALTER TABLE public.volontari
    DROP CONSTRAINT IF EXISTS volontari_associazione_appartenenza_check;

-- Consente di rieseguire lo script anche se la correzione è già stata applicata.
ALTER TABLE public.volontari
    DROP CONSTRAINT IF EXISTS volontari_associazione_appartenenza_fkey;

ALTER TABLE public.volontari
    ADD CONSTRAINT volontari_associazione_appartenenza_fkey
    FOREIGN KEY (associazione_appartenenza)
    REFERENCES public.associazioni (nome)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;

COMMIT;
