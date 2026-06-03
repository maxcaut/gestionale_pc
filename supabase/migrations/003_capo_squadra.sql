-- Ruolo capo_squadra: Sala operativa (servizi CRUD), lettura mezzi e volontari della propria associazione

-- 1. Estendi vincoli tabella profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_ruolo_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profili_segreteria_con_associazione;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_ruolo_check
    CHECK (ruolo IN ('segreteria', 'master', 'capo_squadra'));

ALTER TABLE public.profiles
    ADD CONSTRAINT profili_associazione_ruolo CHECK (
        ruolo = 'master'
        OR (
            ruolo IN ('segreteria', 'capo_squadra')
            AND associazione IS NOT NULL
            AND length(trim(associazione)) > 0
        )
    );

-- 2. Funzioni helper
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
    WHERE id = auth.uid() AND ruolo IN ('segreteria', 'capo_squadra')
    LIMIT 1;
$$;

-- 3. Volontari: capo_squadra può solo leggere la propria associazione
DROP POLICY IF EXISTS "volontari_select" ON public.volontari;
CREATE POLICY "volontari_select"
    ON public.volontari
    FOR SELECT
    TO authenticated
    USING (
        public.is_master()
        OR associazione_appartenenza = public.my_associazione()
    );

-- 4. Mezzi: lettura per capo_squadra, scrittura solo master
DROP POLICY IF EXISTS "mezzi_master_only" ON public.mezzi;

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

-- 5. Servizi: master e capo_squadra
DROP POLICY IF EXISTS "servizi_master_only" ON public.servizi;

CREATE POLICY "servizi_manage"
    ON public.servizi
    FOR ALL
    TO authenticated
    USING (public.can_manage_servizi())
    WITH CHECK (public.can_manage_servizi());
