-- Capo squadra: può leggere i mezzi della propria associazione e quelli assegnati ai servizi

DROP POLICY IF EXISTS "mezzi_select" ON public.mezzi;

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
        OR (
            public.is_capo_squadra()
            AND EXISTS (
                SELECT 1 FROM public.servizi s
                WHERE mezzi.id = ANY (s.mezzi_ids)
            )
        )
    );
