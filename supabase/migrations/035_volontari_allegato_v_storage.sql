-- ALLEGATO V volontari su Supabase Storage.
-- Bucket privato: file PDF o immagini associati all'ALLEGATO V.

ALTER TABLE public.volontari
    ADD COLUMN IF NOT EXISTS allegato_v_path TEXT;

COMMENT ON COLUMN public.volontari.allegato_v_path IS 'Path dell''ALLEGATO V nel bucket Storage volontari-allegato-v';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'volontari-allegato-v',
    'volontari-allegato-v',
    false,
    10485760,
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "volontari_allegato_v_select" ON storage.objects;
CREATE POLICY "volontari_allegato_v_select"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'volontari-allegato-v'
        AND public.can_read_volontario((storage.foldername(name))[1])
    );

DROP POLICY IF EXISTS "volontari_allegato_v_insert" ON storage.objects;
CREATE POLICY "volontari_allegato_v_insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'volontari-allegato-v'
        AND public.can_manage_volontario((storage.foldername(name))[1])
    );

DROP POLICY IF EXISTS "volontari_allegato_v_update" ON storage.objects;
CREATE POLICY "volontari_allegato_v_update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'volontari-allegato-v'
        AND public.can_manage_volontario((storage.foldername(name))[1])
    )
    WITH CHECK (
        bucket_id = 'volontari-allegato-v'
        AND public.can_manage_volontario((storage.foldername(name))[1])
    );

DROP POLICY IF EXISTS "volontari_allegato_v_delete" ON storage.objects;
CREATE POLICY "volontari_allegato_v_delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'volontari-allegato-v'
        AND (
            public.can_manage_volontario((storage.foldername(name))[1])
            OR NOT EXISTS (
                SELECT 1
                FROM public.volontari v
                WHERE v.id = (storage.foldername(name))[1]
            )
        )
    );
