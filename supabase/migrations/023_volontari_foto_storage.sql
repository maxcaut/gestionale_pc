-- Foto volontari su Supabase Storage.
-- Bucket privato: l'app mostra le immagini tramite URL firmati temporanei.

ALTER TABLE public.volontari
    ADD COLUMN IF NOT EXISTS foto_path TEXT;

COMMENT ON COLUMN public.volontari.foto_path IS 'Path della foto nel bucket Storage volontari-foto';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'volontari-foto',
    'volontari-foto',
    false,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.can_read_volontario(volontario_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.volontari v
        WHERE v.id = volontario_id
          AND (
            public.is_master()
            OR public.is_sala_operativa()
            OR (
                public.my_associazione() IS NOT NULL
                AND v.associazione_appartenenza = public.my_associazione()
            )
            OR (
                public.is_capo_squadra()
                AND EXISTS (
                    SELECT 1
                    FROM public.servizi s
                    WHERE v.id = ANY (s.volontari_ids)
                )
            )
          )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_volontario(volontario_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.volontari v
        WHERE v.id = volontario_id
          AND (
            public.is_master()
            OR (
                public.my_associazione() IS NOT NULL
                AND v.associazione_appartenenza = public.my_associazione()
            )
          )
    );
$$;

DROP POLICY IF EXISTS "volontari_foto_select" ON storage.objects;
CREATE POLICY "volontari_foto_select"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'volontari-foto'
        AND public.can_read_volontario((storage.foldername(name))[1])
    );

DROP POLICY IF EXISTS "volontari_foto_insert" ON storage.objects;
CREATE POLICY "volontari_foto_insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'volontari-foto'
        AND public.can_manage_volontario((storage.foldername(name))[1])
    );

DROP POLICY IF EXISTS "volontari_foto_update" ON storage.objects;
CREATE POLICY "volontari_foto_update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'volontari-foto'
        AND public.can_manage_volontario((storage.foldername(name))[1])
    )
    WITH CHECK (
        bucket_id = 'volontari-foto'
        AND public.can_manage_volontario((storage.foldername(name))[1])
    );

DROP POLICY IF EXISTS "volontari_foto_delete" ON storage.objects;
CREATE POLICY "volontari_foto_delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'volontari-foto'
        AND (
            public.can_manage_volontario((storage.foldername(name))[1])
            OR NOT EXISTS (
                SELECT 1
                FROM public.volontari v
                WHERE v.id = (storage.foldername(name))[1]
            )
        )
    );
