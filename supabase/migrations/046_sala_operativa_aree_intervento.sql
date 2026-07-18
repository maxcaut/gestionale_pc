-- Aree disegnate sulla mappa della Sala Operativa, con foto private.

CREATE TABLE IF NOT EXISTS public.sala_operativa_aree_intervento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    servizio_id TEXT REFERENCES public.servizi(id) ON DELETE SET NULL,
    descrizione TEXT NOT NULL,
    geometria JSONB NOT NULL,
    foto JSONB NOT NULL DEFAULT '[]'::JSONB,
    created_by UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT sala_operativa_aree_descrizione_not_blank CHECK (length(trim(descrizione)) > 0),
    CONSTRAINT sala_operativa_aree_geometria_polygon CHECK (
        geometria->>'type' = 'Polygon'
        AND jsonb_typeof(geometria->'coordinates') = 'array'
    ),
    CONSTRAINT sala_operativa_aree_foto_array CHECK (jsonb_typeof(foto) = 'array')
);

CREATE INDEX IF NOT EXISTS sala_operativa_aree_servizio_idx
    ON public.sala_operativa_aree_intervento (servizio_id);

CREATE INDEX IF NOT EXISTS sala_operativa_aree_created_at_idx
    ON public.sala_operativa_aree_intervento (created_at DESC);

CREATE OR REPLACE FUNCTION public.set_sala_operativa_area_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sala_operativa_aree_updated_at ON public.sala_operativa_aree_intervento;
CREATE TRIGGER sala_operativa_aree_updated_at
    BEFORE UPDATE ON public.sala_operativa_aree_intervento
    FOR EACH ROW
    EXECUTE FUNCTION public.set_sala_operativa_area_updated_at();

ALTER TABLE public.sala_operativa_aree_intervento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sala_operativa_aree_intervento FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sala_operativa_aree_intervento TO authenticated;

DROP POLICY IF EXISTS "sala_operativa_aree_select" ON public.sala_operativa_aree_intervento;
CREATE POLICY "sala_operativa_aree_select"
    ON public.sala_operativa_aree_intervento
    FOR SELECT
    TO authenticated
    USING (public.is_master() OR public.is_super_user() OR public.is_sala_operativa() OR public.is_capo_squadra());

DROP POLICY IF EXISTS "sala_operativa_aree_insert" ON public.sala_operativa_aree_intervento;
CREATE POLICY "sala_operativa_aree_insert"
    ON public.sala_operativa_aree_intervento
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (public.is_master() OR public.is_super_user() OR public.is_sala_operativa())
        AND created_by = auth.uid()
    );

DROP POLICY IF EXISTS "sala_operativa_aree_update" ON public.sala_operativa_aree_intervento;
CREATE POLICY "sala_operativa_aree_update"
    ON public.sala_operativa_aree_intervento
    FOR UPDATE
    TO authenticated
    USING (public.is_master() OR public.is_super_user() OR public.is_sala_operativa())
    WITH CHECK (public.is_master() OR public.is_super_user() OR public.is_sala_operativa());

DROP POLICY IF EXISTS "sala_operativa_aree_delete" ON public.sala_operativa_aree_intervento;
CREATE POLICY "sala_operativa_aree_delete"
    ON public.sala_operativa_aree_intervento
    FOR DELETE
    TO authenticated
    USING (public.is_master() OR public.is_super_user() OR public.is_sala_operativa());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'sala-operativa-aree-foto',
    'sala-operativa-aree-foto',
    false,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "sala_operativa_aree_foto_select" ON storage.objects;
CREATE POLICY "sala_operativa_aree_foto_select"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'sala-operativa-aree-foto'
        AND (public.is_master() OR public.is_super_user() OR public.is_sala_operativa() OR public.is_capo_squadra())
    );

DROP POLICY IF EXISTS "sala_operativa_aree_foto_insert" ON storage.objects;
CREATE POLICY "sala_operativa_aree_foto_insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'sala-operativa-aree-foto'
        AND (public.is_master() OR public.is_super_user() OR public.is_sala_operativa())
    );

DROP POLICY IF EXISTS "sala_operativa_aree_foto_update" ON storage.objects;
CREATE POLICY "sala_operativa_aree_foto_update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'sala-operativa-aree-foto'
        AND (public.is_master() OR public.is_super_user() OR public.is_sala_operativa())
    )
    WITH CHECK (
        bucket_id = 'sala-operativa-aree-foto'
        AND (public.is_master() OR public.is_super_user() OR public.is_sala_operativa())
    );

DROP POLICY IF EXISTS "sala_operativa_aree_foto_delete" ON storage.objects;
CREATE POLICY "sala_operativa_aree_foto_delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'sala-operativa-aree-foto'
        AND (public.is_master() OR public.is_super_user() OR public.is_sala_operativa())
    );
