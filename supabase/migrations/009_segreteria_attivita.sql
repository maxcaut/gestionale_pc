-- Segreteria: lettura servizi pianificati/completati e aggiornamento solo assegnazione mezzi/volontari

CREATE OR REPLACE FUNCTION public.is_segreteria()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND ruolo = 'segreteria'
    );
$$;

CREATE POLICY "servizi_segreteria_select"
    ON public.servizi
    FOR SELECT
    TO authenticated
    USING (
        public.is_segreteria()
        AND stato IN ('Programmato', 'Completato')
    );

CREATE POLICY "servizi_segreteria_assign"
    ON public.servizi
    FOR UPDATE
    TO authenticated
    USING (
        public.is_segreteria()
        AND stato = 'Programmato'
    )
    WITH CHECK (
        public.is_segreteria()
        AND stato = 'Programmato'
    );
