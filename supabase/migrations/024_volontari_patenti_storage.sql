-- Patenti volontari su Supabase Storage.
-- Bucket privato: file PDF o immagini associati alle patenti selezionate.

ALTER TABLE public.volontari
    ADD COLUMN IF NOT EXISTS patenti TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS patenti_files JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.volontari.patenti IS 'Elenco patenti possedute dal volontario';
COMMENT ON COLUMN public.volontari.patenti_files IS 'Mappa patente -> path file nel bucket Storage volontari-patenti';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'volontari-patenti',
    'volontari-patenti',
    false,
    10485760,
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "volontari_patenti_select" ON storage.objects;
CREATE POLICY "volontari_patenti_select"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'volontari-patenti'
        AND public.can_read_volontario((storage.foldername(name))[1])
    );

DROP POLICY IF EXISTS "volontari_patenti_insert" ON storage.objects;
CREATE POLICY "volontari_patenti_insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'volontari-patenti'
        AND public.can_manage_volontario((storage.foldername(name))[1])
    );

DROP POLICY IF EXISTS "volontari_patenti_update" ON storage.objects;
CREATE POLICY "volontari_patenti_update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'volontari-patenti'
        AND public.can_manage_volontario((storage.foldername(name))[1])
    )
    WITH CHECK (
        bucket_id = 'volontari-patenti'
        AND public.can_manage_volontario((storage.foldername(name))[1])
    );

DROP POLICY IF EXISTS "volontari_patenti_delete" ON storage.objects;
CREATE POLICY "volontari_patenti_delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'volontari-patenti'
        AND (
            public.can_manage_volontario((storage.foldername(name))[1])
            OR NOT EXISTS (
                SELECT 1
                FROM public.volontari v
                WHERE v.id = (storage.foldername(name))[1]
            )
        )
    );
