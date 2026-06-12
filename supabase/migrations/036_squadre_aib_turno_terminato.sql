-- Squadre A.I.B.: conserva lo storico dei turni terminati

ALTER TABLE public.squadre_aib
    DROP CONSTRAINT IF EXISTS squadre_aib_stato_check;

ALTER TABLE public.squadre_aib
    ADD CONSTRAINT squadre_aib_stato_check
    CHECK (stato IN ('Operativa', 'Non operativa', 'Turno Terminato'));
