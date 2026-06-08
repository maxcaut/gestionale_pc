-- Segreteria: consente di vedere anche i servizi in corso.
-- Serve alla view Squadre A.I.B. per mostrare le assegnazioni attive.

ALTER POLICY "servizi_segreteria_select"
    ON public.servizi
    USING (
        public.is_segreteria()
        AND stato IN ('Programmato', 'Pianificato', 'In corso', 'Completato')
    );
