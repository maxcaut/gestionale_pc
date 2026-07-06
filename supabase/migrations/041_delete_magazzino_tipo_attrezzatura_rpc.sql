-- RPC sicura per cancellare un tipo attrezzatura anche con RLS attiva.

CREATE OR REPLACE FUNCTION public.delete_magazzino_tipo_attrezzatura(p_tipo_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile public.profiles%ROWTYPE;
    v_nome TEXT;
BEGIN
    SELECT *
    INTO v_profile
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_profile.ruolo IS NULL OR v_profile.ruolo NOT IN ('master', 'super_user', 'segreteria') THEN
        RAISE EXCEPTION 'Non autorizzato a eliminare tipi attrezzatura.'
            USING ERRCODE = '42501';
    END IF;

    SELECT nome
    INTO v_nome
    FROM public.magazzino_tipi_attrezzatura
    WHERE id = p_tipo_id;

    IF v_nome IS NULL THEN
        RAISE EXCEPTION 'Tipo attrezzatura non trovato.'
            USING ERRCODE = 'P0002';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.magazzino_attrezzature
        WHERE tipo_attrezzatura = v_nome
    ) THEN
        RAISE EXCEPTION 'Questa categoria ha almeno 1 item associato.'
            USING ERRCODE = '23503';
    END IF;

    DELETE FROM public.magazzino_tipi_attrezzatura
    WHERE id = p_tipo_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_magazzino_tipo_attrezzatura(UUID) TO authenticated;
