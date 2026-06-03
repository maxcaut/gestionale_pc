-- Mezzi: stesso criterio dei volontari (segreteria/capo solo la propria associazione; master tutto; sala_operativa lettura globale)

ALTER TABLE public.mezzi
    ADD COLUMN IF NOT EXISTS associazione_appartenenza TEXT;

DROP POLICY IF EXISTS "mezzi_select" ON public.mezzi;
DROP POLICY IF EXISTS "mezzi_insert_master" ON public.mezzi;
DROP POLICY IF EXISTS "mezzi_update_master" ON public.mezzi;
DROP POLICY IF EXISTS "mezzi_delete_master" ON public.mezzi;

CREATE POLICY "mezzi_select"
    ON public.mezzi
    FOR SELECT
    TO authenticated
    USING (
        public.is_master()
        OR public.is_sala_operativa()
        OR (
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
    );

CREATE POLICY "mezzi_insert"
    ON public.mezzi
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_master()
        OR (
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
    );

CREATE POLICY "mezzi_update"
    ON public.mezzi
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

CREATE POLICY "mezzi_delete"
    ON public.mezzi
    FOR DELETE
    TO authenticated
    USING (
        public.is_master()
        OR (
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
    );
