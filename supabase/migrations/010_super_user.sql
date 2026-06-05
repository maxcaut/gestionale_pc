-- Ruolo super_user: accesso completo (stessi permessi RLS del master su tutte le tabelle)

-- 1. Estendi vincoli tabella profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_ruolo_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profili_associazione_ruolo;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_ruolo_check
    CHECK (ruolo IN ('segreteria', 'master', 'capo_squadra', 'sala_operativa', 'super_user'));

ALTER TABLE public.profiles
    ADD CONSTRAINT profili_associazione_ruolo CHECK (
        ruolo IN ('master', 'sala_operativa', 'super_user')
        OR (
            ruolo IN ('segreteria', 'capo_squadra')
            AND associazione IS NOT NULL
            AND length(trim(associazione)) > 0
        )
    );

-- 2. Helper: super_user condivide i permessi RLS del master
CREATE OR REPLACE FUNCTION public.is_super_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND ruolo = 'super_user'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_master()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND ruolo IN ('master', 'super_user')
    );
$$;
