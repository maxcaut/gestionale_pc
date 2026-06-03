-- Ruolo sala_operativa: accesso solo Sala Operativa (servizi CRUD),
-- lettura di tutti i volontari (senza insert/update/delete), lettura mezzi

-- 1. Estendi vincoli tabella profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_ruolo_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profili_associazione_ruolo;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_ruolo_check
    CHECK (ruolo IN ('segreteria', 'master', 'capo_squadra', 'sala_operativa'));

ALTER TABLE public.profiles
    ADD CONSTRAINT profili_associazione_ruolo CHECK (
        ruolo IN ('master', 'sala_operativa')
        OR (
            ruolo IN ('segreteria', 'capo_squadra')
            AND associazione IS NOT NULL
            AND length(trim(associazione)) > 0
        )
    );

-- 2. Funzioni helper
CREATE OR REPLACE FUNCTION public.is_sala_operativa()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND ruolo = 'sala_operativa'
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_servizi()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_master() OR public.is_capo_squadra() OR public.is_sala_operativa();
$$;

-- 3. Volontari: sala_operativa può leggere tutti, non scrivere
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
    );

-- 4. Mezzi: lettura per sala_operativa (assegnazione missioni)
DROP POLICY IF EXISTS "mezzi_select" ON public.mezzi;
CREATE POLICY "mezzi_select"
    ON public.mezzi
    FOR SELECT
    TO authenticated
    USING (
        public.is_master()
        OR public.is_capo_squadra()
        OR public.is_sala_operativa()
    );
