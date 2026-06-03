-- =============================================================================
-- Coordinamento Vesuvius — Profili utente + RLS volontari
-- Eseguire nel SQL Editor di Supabase (Dashboard → SQL → New query → Run)
-- =============================================================================

-- 1. Colonna associazione sui volontari (se mancante)
ALTER TABLE public.volontari
    ADD COLUMN IF NOT EXISTS associazione_appartenenza TEXT;

-- 2. Tabella profili (collegata ad auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    email TEXT,
    ruolo TEXT NOT NULL CHECK (ruolo IN ('segreteria', 'master')),
    associazione TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT profili_segreteria_con_associazione CHECK (
        ruolo = 'master'
        OR (ruolo = 'segreteria' AND associazione IS NOT NULL AND length(trim(associazione)) > 0)
    )
);

CREATE INDEX IF NOT EXISTS idx_profiles_ruolo ON public.profiles (ruolo);

-- 3. Funzioni helper per le policy (security definer)
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

CREATE OR REPLACE FUNCTION public.my_associazione()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT associazione FROM public.profiles
    WHERE id = auth.uid() AND ruolo = 'segreteria'
    LIMIT 1;
$$;

-- 4. RLS su profiles (ogni utente legge solo il proprio profilo)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Solo service_role / SQL Editor possono inserire/aggiornare profili (vedi guida setup)

-- 5. RLS su volontari
ALTER TABLE public.volontari ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "volontari_select" ON public.volontari;
CREATE POLICY "volontari_select"
    ON public.volontari
    FOR SELECT
    TO authenticated
    USING (
        public.is_master()
        OR associazione_appartenenza = public.my_associazione()
    );

DROP POLICY IF EXISTS "volontari_insert" ON public.volontari;
CREATE POLICY "volontari_insert"
    ON public.volontari
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_master()
        OR (
            associazione_appartenenza = public.my_associazione()
            AND public.my_associazione() IS NOT NULL
        )
    );

DROP POLICY IF EXISTS "volontari_update" ON public.volontari;
CREATE POLICY "volontari_update"
    ON public.volontari
    FOR UPDATE
    TO authenticated
    USING (
        public.is_master()
        OR associazione_appartenenza = public.my_associazione()
    )
    WITH CHECK (
        public.is_master()
        OR associazione_appartenenza = public.my_associazione()
    );

DROP POLICY IF EXISTS "volontari_delete" ON public.volontari;
CREATE POLICY "volontari_delete"
    ON public.volontari
    FOR DELETE
    TO authenticated
    USING (
        public.is_master()
        OR associazione_appartenenza = public.my_associazione()
    );

-- 6. Mezzi e servizi: solo master (segreteria non accede)
ALTER TABLE public.mezzi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servizi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mezzi_master_only" ON public.mezzi;
CREATE POLICY "mezzi_master_only"
    ON public.mezzi
    FOR ALL
    TO authenticated
    USING (public.is_master())
    WITH CHECK (public.is_master());

DROP POLICY IF EXISTS "servizi_master_only" ON public.servizi;
CREATE POLICY "servizi_master_only"
    ON public.servizi
    FOR ALL
    TO authenticated
    USING (public.is_master())
    WITH CHECK (public.is_master());

-- 7. Grant (authenticated deve poter usare le tabelle con RLS)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volontari TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mezzi TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.servizi TO authenticated;
