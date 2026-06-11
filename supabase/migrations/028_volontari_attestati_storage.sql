-- Attestati qualifiche coordinamento volontari su Supabase Storage.
-- Bucket privato: file PDF o immagini associati agli attestati selezionati.

ALTER TABLE public.volontari
    ADD COLUMN IF NOT EXISTS qualifiche_coordinamento_files JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.volontari.qualifiche_coordinamento_files IS 'Mappa qualifica coordinamento -> path attestato nel bucket Storage volontari-attestati';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'volontari-attestati',
    'volontari-attestati',
    false,
    10485760,
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "volontari_attestati_select" ON storage.objects;
CREATE POLICY "volontari_attestati_select"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'volontari-attestati'
        AND public.can_read_volontario((storage.foldername(name))[1])
    );

DROP POLICY IF EXISTS "volontari_attestati_insert" ON storage.objects;
CREATE POLICY "volontari_attestati_insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'volontari-attestati'
        AND public.can_manage_volontario((storage.foldername(name))[1])
    );

DROP POLICY IF EXISTS "volontari_attestati_update" ON storage.objects;
CREATE POLICY "volontari_attestati_update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'volontari-attestati'
        AND public.can_manage_volontario((storage.foldername(name))[1])
    )
    WITH CHECK (
        bucket_id = 'volontari-attestati'
        AND public.can_manage_volontario((storage.foldername(name))[1])
    );

DROP POLICY IF EXISTS "volontari_attestati_delete" ON storage.objects;
CREATE POLICY "volontari_attestati_delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'volontari-attestati'
        AND (
            public.can_manage_volontario((storage.foldername(name))[1])
            OR NOT EXISTS (
                SELECT 1
                FROM public.volontari v
                WHERE v.id = (storage.foldername(name))[1]
            )
        )
    );
