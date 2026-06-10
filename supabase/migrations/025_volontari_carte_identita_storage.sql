-- Carte d'identita volontari su Supabase Storage.
-- Bucket privato: file PDF o immagini associati alla carta d'identita.

ALTER TABLE public.volontari
    ADD COLUMN IF NOT EXISTS carta_identita_path TEXT;

COMMENT ON COLUMN public.volontari.carta_identita_path IS 'Path della carta d''identita nel bucket Storage volontari-carte-identita';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'volontari-carte-identita',
    'volontari-carte-identita',
    false,
    10485760,
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "volontari_carte_identita_select" ON storage.objects;
CREATE POLICY "volontari_carte_identita_select"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'volontari-carte-identita'
        AND public.can_read_volontario((storage.foldername(name))[1])
    );

DROP POLICY IF EXISTS "volontari_carte_identita_insert" ON storage.objects;
CREATE POLICY "volontari_carte_identita_insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'volontari-carte-identita'
        AND public.can_manage_volontario((storage.foldername(name))[1])
    );

DROP POLICY IF EXISTS "volontari_carte_identita_update" ON storage.objects;
CREATE POLICY "volontari_carte_identita_update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'volontari-carte-identita'
        AND public.can_manage_volontario((storage.foldername(name))[1])
    )
    WITH CHECK (
        bucket_id = 'volontari-carte-identita'
        AND public.can_manage_volontario((storage.foldername(name))[1])
    );

DROP POLICY IF EXISTS "volontari_carte_identita_delete" ON storage.objects;
CREATE POLICY "volontari_carte_identita_delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'volontari-carte-identita'
        AND (
            public.can_manage_volontario((storage.foldername(name))[1])
            OR NOT EXISTS (
                SELECT 1
                FROM public.volontari v
                WHERE v.id = (storage.foldername(name))[1]
            )
        )
    );
