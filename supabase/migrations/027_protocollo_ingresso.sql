-- Protocollo in ingresso: tabella record + bucket Storage privato.

CREATE SEQUENCE IF NOT EXISTS public.protocollo_ingresso_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE IF NOT EXISTS public.protocollo_ingresso (
    id TEXT PRIMARY KEY DEFAULT ('C.V.-I.-' || lpad(nextval('public.protocollo_ingresso_seq')::TEXT, 6, '0')),
    protocollo_esterno TEXT,
    data_memorizzazione DATE NOT NULL,
    file_path TEXT NOT NULL DEFAULT '',
    file_name TEXT NOT NULL,
    file_mime_type TEXT,
    file_size BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT protocollo_ingresso_id_format CHECK (id ~ '^C\.V\.-I\.-[0-9]{6}$')
);

ALTER TABLE public.protocollo_ingresso
    ALTER COLUMN id SET DEFAULT ('C.V.-I.-' || lpad(nextval('public.protocollo_ingresso_seq')::TEXT, 6, '0'));

CREATE OR REPLACE FUNCTION public.set_protocollo_ingresso_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protocollo_ingresso_updated_at ON public.protocollo_ingresso;
CREATE TRIGGER protocollo_ingresso_updated_at
    BEFORE UPDATE ON public.protocollo_ingresso
    FOR EACH ROW
    EXECUTE FUNCTION public.set_protocollo_ingresso_updated_at();

ALTER TABLE public.protocollo_ingresso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocollo_ingresso FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.protocollo_ingresso TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.protocollo_ingresso_seq TO authenticated;

DROP POLICY IF EXISTS "protocollo_ingresso_select_master" ON public.protocollo_ingresso;
CREATE POLICY "protocollo_ingresso_select_master"
    ON public.protocollo_ingresso
    FOR SELECT
    TO authenticated
    USING (public.is_master());

DROP POLICY IF EXISTS "protocollo_ingresso_insert_master" ON public.protocollo_ingresso;
CREATE POLICY "protocollo_ingresso_insert_master"
    ON public.protocollo_ingresso
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_master());

DROP POLICY IF EXISTS "protocollo_ingresso_update_master" ON public.protocollo_ingresso;
CREATE POLICY "protocollo_ingresso_update_master"
    ON public.protocollo_ingresso
    FOR UPDATE
    TO authenticated
    USING (public.is_master())
    WITH CHECK (public.is_master());

DROP POLICY IF EXISTS "protocollo_ingresso_delete_master" ON public.protocollo_ingresso;
CREATE POLICY "protocollo_ingresso_delete_master"
    ON public.protocollo_ingresso
    FOR DELETE
    TO authenticated
    USING (public.is_master());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'protocollo-ingresso',
    'protocollo-ingresso',
    false,
    NULL,
    NULL
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "protocollo_ingresso_storage_select" ON storage.objects;
CREATE POLICY "protocollo_ingresso_storage_select"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'protocollo-ingresso'
        AND public.is_master()
    );

DROP POLICY IF EXISTS "protocollo_ingresso_storage_insert" ON storage.objects;
CREATE POLICY "protocollo_ingresso_storage_insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'protocollo-ingresso'
        AND public.is_master()
    );

DROP POLICY IF EXISTS "protocollo_ingresso_storage_update" ON storage.objects;
CREATE POLICY "protocollo_ingresso_storage_update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'protocollo-ingresso'
        AND public.is_master()
    )
    WITH CHECK (
        bucket_id = 'protocollo-ingresso'
        AND public.is_master()
    );

DROP POLICY IF EXISTS "protocollo_ingresso_storage_delete" ON storage.objects;
CREATE POLICY "protocollo_ingresso_storage_delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'protocollo-ingresso'
        AND public.is_master()
    );
