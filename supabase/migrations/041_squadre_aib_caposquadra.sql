-- Squadre A.I.B.: caposquadra scelto tra i volontari della squadra

ALTER TABLE public.squadre_aib
    ADD COLUMN IF NOT EXISTS caposquadra_id TEXT;

COMMENT ON COLUMN public.squadre_aib.caposquadra_id IS 'Volontario scelto come caposquadra della squadra A.I.B.';

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

    IF NEW.caposquadra_id IS NOT NULL
        AND btrim(NEW.caposquadra_id) <> ''
        AND NOT (NEW.caposquadra_id = ANY (NEW.volontari_ids))
    THEN
        RAISE EXCEPTION 'Il caposquadra deve essere uno dei volontari della squadra AIB';
    END IF;

    RETURN NEW;
END;
$$;
