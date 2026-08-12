ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS active_session_id TEXT;

CREATE OR REPLACE FUNCTION public.claim_active_session(p_session_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL OR NULLIF(trim(p_session_id), '') IS NULL THEN
        RAISE EXCEPTION 'Sessione non valida';
    END IF;

    UPDATE public.profiles
    SET active_session_id = p_session_id
    WHERE id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profilo non configurato';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_active_session(p_session_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND active_session_id = p_session_id
    );
$$;

REVOKE ALL ON FUNCTION public.claim_active_session(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_session(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_active_session(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_session(TEXT) TO authenticated;
