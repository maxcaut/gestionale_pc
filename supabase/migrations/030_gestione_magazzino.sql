-- Gestione Magazzino: tipi attrezzatura e attrezzature assegnate alle associazioni.

CREATE TABLE IF NOT EXISTS public.magazzino_tipi_attrezzatura (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.magazzino_attrezzature (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_attrezzatura TEXT NOT NULL,
    tipo_attrezzatura TEXT NOT NULL,
    numero_inventario TEXT NOT NULL,
    associazione_appartenenza TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT magazzino_attrezzature_numero_inventario_unique UNIQUE (numero_inventario),
    CONSTRAINT magazzino_attrezzature_tipo_fk
        FOREIGN KEY (tipo_attrezzatura)
        REFERENCES public.magazzino_tipi_attrezzatura(nome)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE OR REPLACE FUNCTION public.set_magazzino_attrezzature_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS magazzino_attrezzature_updated_at ON public.magazzino_attrezzature;
CREATE TRIGGER magazzino_attrezzature_updated_at
    BEFORE UPDATE ON public.magazzino_attrezzature
    FOR EACH ROW
    EXECUTE FUNCTION public.set_magazzino_attrezzature_updated_at();

INSERT INTO public.magazzino_tipi_attrezzatura (nome)
VALUES
    ('Tende'),
    ('Motopompe'),
    ('Gruppi elettrogeni'),
    ('Manichette antincendio da 45'),
    ('Manichette antincendio da 70'),
    ('Prolunghe elettriche'),
    ('Riduttori industriali -> civili'),
    ('Riduttori civili -> industriali')
ON CONFLICT (nome) DO NOTHING;

ALTER TABLE public.magazzino_tipi_attrezzatura ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magazzino_tipi_attrezzatura FORCE ROW LEVEL SECURITY;
ALTER TABLE public.magazzino_attrezzature ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magazzino_attrezzature FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.magazzino_tipi_attrezzatura TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.magazzino_attrezzature TO authenticated;

DROP POLICY IF EXISTS "magazzino_tipi_select_allowed" ON public.magazzino_tipi_attrezzatura;
CREATE POLICY "magazzino_tipi_select_allowed"
    ON public.magazzino_tipi_attrezzatura
    FOR SELECT
    TO authenticated
    USING (
        public.is_master()
        OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.ruolo = 'segreteria'
        )
    );

DROP POLICY IF EXISTS "magazzino_tipi_insert_allowed" ON public.magazzino_tipi_attrezzatura;
CREATE POLICY "magazzino_tipi_insert_allowed"
    ON public.magazzino_tipi_attrezzatura
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_master()
        OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.ruolo = 'segreteria'
        )
    );

DROP POLICY IF EXISTS "magazzino_tipi_delete_allowed" ON public.magazzino_tipi_attrezzatura;
CREATE POLICY "magazzino_tipi_delete_allowed"
    ON public.magazzino_tipi_attrezzatura
    FOR DELETE
    TO authenticated
    USING (
        public.is_master()
        OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.ruolo = 'segreteria'
        )
    );

DROP POLICY IF EXISTS "magazzino_attrezzature_select_allowed" ON public.magazzino_attrezzature;
CREATE POLICY "magazzino_attrezzature_select_allowed"
    ON public.magazzino_attrezzature
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

DROP POLICY IF EXISTS "magazzino_attrezzature_insert_allowed" ON public.magazzino_attrezzature;
CREATE POLICY "magazzino_attrezzature_insert_allowed"
    ON public.magazzino_attrezzature
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

DROP POLICY IF EXISTS "magazzino_attrezzature_update_allowed" ON public.magazzino_attrezzature;
CREATE POLICY "magazzino_attrezzature_update_allowed"
    ON public.magazzino_attrezzature
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

DROP POLICY IF EXISTS "magazzino_attrezzature_delete_allowed" ON public.magazzino_attrezzature;
CREATE POLICY "magazzino_attrezzature_delete_allowed"
    ON public.magazzino_attrezzature
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
