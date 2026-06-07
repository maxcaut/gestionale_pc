-- Segreteria: mostra anche i servizi completati nella tab Attivita.

ALTER POLICY "servizi_segreteria_select"
    ON public.servizi
    USING (
        public.is_segreteria()
        AND stato IN ('Programmato', 'Completato')
    );
