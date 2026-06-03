-- Capo squadra: può leggere i volontari della propria associazione e quelli assegnati ai servizi

DROP POLICY IF EXISTS "volontari_select" ON public.volontari;

CREATE POLICY "volontari_select"
    ON public.volontari
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
                WHERE volontari.id = ANY (s.volontari_ids)
            )
        )
    );
