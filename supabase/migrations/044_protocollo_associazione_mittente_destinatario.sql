ALTER TABLE public.protocollo_associazione
    ADD COLUMN IF NOT EXISTS mittente TEXT,
    ADD COLUMN IF NOT EXISTS destinatario TEXT;

DROP POLICY IF EXISTS "protocollo_associazione_delete" ON public.protocollo_associazione;
CREATE POLICY "protocollo_associazione_delete"
    ON public.protocollo_associazione
    FOR DELETE
    TO authenticated
    USING (public.is_master());

DROP POLICY IF EXISTS "protocollo_associazione_storage_delete" ON storage.objects;
CREATE POLICY "protocollo_associazione_storage_delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'protocollo-associazione'
        AND public.is_master()
    );
