-- Squadre A.I.B.: composizione per associazione e assegnazione agli interventi AIB

CREATE TABLE IF NOT EXISTS public.squadre_aib (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    associazione_appartenenza TEXT NOT NULL,
    mezzi_ids TEXT[] NOT NULL CHECK (cardinality(mezzi_ids) > 0),
    volontari_ids TEXT[] NOT NULL CHECK (cardinality(volontari_ids) > 0),
    stato TEXT NOT NULL DEFAULT 'Operativa' CHECK (stato IN ('Operativa', 'Non operativa')),
    disponibile_fino TIME,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_squadra_aib_associazione()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM unnest(NEW.mezzi_ids) AS mezzo_id
        LEFT JOIN public.mezzi m ON m.id = mezzo_id
        WHERE m.id IS NULL OR m.associazione_appartenenza IS DISTINCT FROM NEW.associazione_appartenenza
    ) THEN
        RAISE EXCEPTION 'I mezzi della squadra AIB devono appartenere alla stessa associazione';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM unnest(NEW.volontari_ids) AS volontario_id
        LEFT JOIN public.volontari v ON v.id = volontario_id
        WHERE v.id IS NULL OR v.associazione_appartenenza IS DISTINCT FROM NEW.associazione_appartenenza
    ) THEN
        RAISE EXCEPTION 'I volontari della squadra AIB devono appartenere alla stessa associazione';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_squadra_aib_associazione_trigger ON public.squadre_aib;
CREATE TRIGGER validate_squadra_aib_associazione_trigger
    BEFORE INSERT OR UPDATE ON public.squadre_aib
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_squadra_aib_associazione();

ALTER TABLE public.servizi
    ADD COLUMN IF NOT EXISTS squadre_aib_ids TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.squadre_aib ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "squadre_aib_select" ON public.squadre_aib;
CREATE POLICY "squadre_aib_select"
    ON public.squadre_aib
    FOR SELECT
    USING (
        public.is_master()
        OR public.is_sala_operativa()
        OR associazione_appartenenza = public.my_associazione()
    );

DROP POLICY IF EXISTS "squadre_aib_insert" ON public.squadre_aib;
CREATE POLICY "squadre_aib_insert"
    ON public.squadre_aib
    FOR INSERT
    WITH CHECK (
        public.is_master()
        OR (
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
    );

DROP POLICY IF EXISTS "squadre_aib_update" ON public.squadre_aib;
CREATE POLICY "squadre_aib_update"
    ON public.squadre_aib
    FOR UPDATE
    USING (
        public.is_master()
        OR associazione_appartenenza = public.my_associazione()
    )
    WITH CHECK (
        public.is_master()
        OR associazione_appartenenza = public.my_associazione()
    );

DROP POLICY IF EXISTS "squadre_aib_delete" ON public.squadre_aib;
CREATE POLICY "squadre_aib_delete"
    ON public.squadre_aib
    FOR DELETE
    USING (
        public.is_master()
        OR associazione_appartenenza = public.my_associazione()
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.squadre_aib TO authenticated;
