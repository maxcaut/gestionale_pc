-- Gestione Magazzino: quantità disponibili e transazioni di prelievo/rientro.

ALTER TABLE public.magazzino_attrezzature
    ADD COLUMN IF NOT EXISTS quantita INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.magazzino_attrezzature
    DROP CONSTRAINT IF EXISTS magazzino_attrezzature_quantita_check;

ALTER TABLE public.magazzino_attrezzature
    ADD CONSTRAINT magazzino_attrezzature_quantita_check CHECK (quantita >= 0);

CREATE TABLE IF NOT EXISTS public.magazzino_prelievi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_prelievo DATE NOT NULL,
    consegnato_a TEXT NOT NULL,
    stato TEXT NOT NULL DEFAULT 'aperto',
    associazione_appartenenza TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT magazzino_prelievi_stato_check CHECK (stato IN ('aperto', 'completato'))
);

CREATE TABLE IF NOT EXISTS public.magazzino_prelievi_righe (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prelievo_id UUID NOT NULL REFERENCES public.magazzino_prelievi(id) ON DELETE CASCADE,
    attrezzatura_id UUID NOT NULL REFERENCES public.magazzino_attrezzature(id) ON DELETE RESTRICT,
    quantita INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT magazzino_prelievi_righe_quantita_check CHECK (quantita > 0)
);

CREATE OR REPLACE FUNCTION public.set_magazzino_prelievi_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS magazzino_prelievi_updated_at ON public.magazzino_prelievi;
CREATE TRIGGER magazzino_prelievi_updated_at
    BEFORE UPDATE ON public.magazzino_prelievi
    FOR EACH ROW
    EXECUTE FUNCTION public.set_magazzino_prelievi_updated_at();

ALTER TABLE public.magazzino_prelievi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magazzino_prelievi FORCE ROW LEVEL SECURITY;
ALTER TABLE public.magazzino_prelievi_righe ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magazzino_prelievi_righe FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.magazzino_prelievi TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.magazzino_prelievi_righe TO authenticated;

DROP POLICY IF EXISTS "magazzino_prelievi_select_allowed" ON public.magazzino_prelievi;
CREATE POLICY "magazzino_prelievi_select_allowed"
    ON public.magazzino_prelievi
    FOR SELECT
    TO authenticated
    USING (
        public.is_master()
        OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.ruolo = 'segreteria'
              AND p.associazione = associazione_appartenenza
        )
    );

DROP POLICY IF EXISTS "magazzino_prelievi_insert_allowed" ON public.magazzino_prelievi;
CREATE POLICY "magazzino_prelievi_insert_allowed"
    ON public.magazzino_prelievi
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_master()
        OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.ruolo = 'segreteria'
              AND p.associazione = associazione_appartenenza
        )
    );

DROP POLICY IF EXISTS "magazzino_prelievi_update_allowed" ON public.magazzino_prelievi;
CREATE POLICY "magazzino_prelievi_update_allowed"
    ON public.magazzino_prelievi
    FOR UPDATE
    TO authenticated
    USING (
        public.is_master()
        OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.ruolo = 'segreteria'
              AND p.associazione = associazione_appartenenza
        )
    )
    WITH CHECK (
        public.is_master()
        OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.ruolo = 'segreteria'
              AND p.associazione = associazione_appartenenza
        )
    );

DROP POLICY IF EXISTS "magazzino_prelievi_delete_allowed" ON public.magazzino_prelievi;
CREATE POLICY "magazzino_prelievi_delete_allowed"
    ON public.magazzino_prelievi
    FOR DELETE
    TO authenticated
    USING (
        public.is_master()
        OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.ruolo = 'segreteria'
              AND p.associazione = associazione_appartenenza
        )
    );

DROP POLICY IF EXISTS "magazzino_prelievi_righe_select_allowed" ON public.magazzino_prelievi_righe;
CREATE POLICY "magazzino_prelievi_righe_select_allowed"
    ON public.magazzino_prelievi_righe
    FOR SELECT
    TO authenticated
    USING (
        public.is_master()
        OR EXISTS (
            SELECT 1
            FROM public.magazzino_prelievi mp
            JOIN public.profiles p ON p.id = auth.uid()
            WHERE mp.id = prelievo_id
              AND p.ruolo = 'segreteria'
              AND p.associazione = mp.associazione_appartenenza
        )
    );

DROP POLICY IF EXISTS "magazzino_prelievi_righe_insert_allowed" ON public.magazzino_prelievi_righe;
CREATE POLICY "magazzino_prelievi_righe_insert_allowed"
    ON public.magazzino_prelievi_righe
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_master()
        OR EXISTS (
            SELECT 1
            FROM public.magazzino_prelievi mp
            JOIN public.magazzino_attrezzature ma ON ma.id = attrezzatura_id
            JOIN public.profiles p ON p.id = auth.uid()
            WHERE mp.id = prelievo_id
              AND p.ruolo = 'segreteria'
              AND p.associazione = mp.associazione_appartenenza
              AND ma.associazione_appartenenza = mp.associazione_appartenenza
        )
    );

DROP POLICY IF EXISTS "magazzino_prelievi_righe_update_allowed" ON public.magazzino_prelievi_righe;
CREATE POLICY "magazzino_prelievi_righe_update_allowed"
    ON public.magazzino_prelievi_righe
    FOR UPDATE
    TO authenticated
    USING (
        public.is_master()
        OR EXISTS (
            SELECT 1
            FROM public.magazzino_prelievi mp
            JOIN public.profiles p ON p.id = auth.uid()
            WHERE mp.id = prelievo_id
              AND p.ruolo = 'segreteria'
              AND p.associazione = mp.associazione_appartenenza
        )
    )
    WITH CHECK (
        public.is_master()
        OR EXISTS (
            SELECT 1
            FROM public.magazzino_prelievi mp
            JOIN public.magazzino_attrezzature ma ON ma.id = attrezzatura_id
            JOIN public.profiles p ON p.id = auth.uid()
            WHERE mp.id = prelievo_id
              AND p.ruolo = 'segreteria'
              AND p.associazione = mp.associazione_appartenenza
              AND ma.associazione_appartenenza = mp.associazione_appartenenza
        )
    );

DROP POLICY IF EXISTS "magazzino_prelievi_righe_delete_allowed" ON public.magazzino_prelievi_righe;
CREATE POLICY "magazzino_prelievi_righe_delete_allowed"
    ON public.magazzino_prelievi_righe
    FOR DELETE
    TO authenticated
    USING (
        public.is_master()
        OR EXISTS (
            SELECT 1
            FROM public.magazzino_prelievi mp
            JOIN public.profiles p ON p.id = auth.uid()
            WHERE mp.id = prelievo_id
              AND p.ruolo = 'segreteria'
              AND p.associazione = mp.associazione_appartenenza
        )
    );
