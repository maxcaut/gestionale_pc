-- =============================================================================
-- Fix RLS: rimuove policy permissive e blocca accesso anon
--
-- Sintomo: rowsecurity = true ma tutti vedono tutto.
-- Causa tipica: policy "Enable read access for all users" create dal dashboard
-- oppure grant SELECT ad anon senza policy restrittive.
-- =============================================================================

-- 1. Rimuovi TUTTE le policy esistenti sulle tabelle sensibili
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('volontari', 'mezzi', 'servizi', 'profiles')
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON %I.%I',
            pol.policyname,
            pol.schemaname,
            pol.tablename
        );
    END LOOP;
END $$;

-- 2. Forza RLS anche per il proprietario della tabella
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.volontari FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mezzi FORCE ROW LEVEL SECURITY;
ALTER TABLE public.servizi FORCE ROW LEVEL SECURITY;

-- 3. Funzioni helper (idempotente)
CREATE OR REPLACE FUNCTION public.is_master()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND ruolo = 'master'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_capo_squadra()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND ruolo = 'capo_squadra'
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_servizi()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_master() OR public.is_capo_squadra();
$$;

CREATE OR REPLACE FUNCTION public.my_associazione()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT associazione FROM public.profiles
    WHERE id = auth.uid()
      AND ruolo IN ('segreteria', 'capo_squadra')
    LIMIT 1;
$$;

-- 4. Blocca anon: solo utenti autenticati possono accedere via API
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.volontari FROM anon;
REVOKE ALL ON public.mezzi FROM anon;
REVOKE ALL ON public.servizi FROM anon;

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volontari TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mezzi TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.servizi TO authenticated;

-- 5. Policy profiles
CREATE POLICY "profiles_select"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid() OR public.is_master());

CREATE POLICY "profiles_insert_master"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_master());

CREATE POLICY "profiles_update_master"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (public.is_master())
    WITH CHECK (public.is_master());

CREATE POLICY "profiles_delete_master"
    ON public.profiles
    FOR DELETE
    TO authenticated
    USING (public.is_master());

-- 6. Policy volontari (solo master vede tutto; segreteria/capo solo la propria associazione)
CREATE POLICY "volontari_select"
    ON public.volontari
    FOR SELECT
    TO authenticated
    USING (
        public.is_master()
        OR (
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
    );

CREATE POLICY "volontari_insert"
    ON public.volontari
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_master()
        OR (
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
    );

CREATE POLICY "volontari_update"
    ON public.volontari
    FOR UPDATE
    TO authenticated
    USING (
        public.is_master()
        OR (
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
    )
    WITH CHECK (
        public.is_master()
        OR (
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
    );

CREATE POLICY "volontari_delete"
    ON public.volontari
    FOR DELETE
    TO authenticated
    USING (
        public.is_master()
        OR (
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
    );

-- 7. Policy mezzi
CREATE POLICY "mezzi_select"
    ON public.mezzi
    FOR SELECT
    TO authenticated
    USING (public.is_master() OR public.is_capo_squadra());

CREATE POLICY "mezzi_insert_master"
    ON public.mezzi
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_master());

CREATE POLICY "mezzi_update_master"
    ON public.mezzi
    FOR UPDATE
    TO authenticated
    USING (public.is_master())
    WITH CHECK (public.is_master());

CREATE POLICY "mezzi_delete_master"
    ON public.mezzi
    FOR DELETE
    TO authenticated
    USING (public.is_master());

-- 8. Policy servizi
CREATE POLICY "servizi_manage"
    ON public.servizi
    FOR ALL
    TO authenticated
    USING (public.can_manage_servizi())
    WITH CHECK (public.can_manage_servizi());
