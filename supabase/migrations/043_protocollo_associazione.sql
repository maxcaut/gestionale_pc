-- Protocollo associazione: registri in ingresso/uscita per singola associazione.

CREATE SEQUENCE IF NOT EXISTS public.protocollo_associazione_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE TABLE IF NOT EXISTS public.protocollo_associazione (
    id TEXT PRIMARY KEY DEFAULT ('C.V.-A.-' || lpad(nextval('public.protocollo_associazione_seq')::TEXT, 6, '0')),
    tipo TEXT NOT NULL CHECK (tipo IN ('ingresso', 'uscita')),
    protocollo_esterno TEXT,
    data_memorizzazione DATE NOT NULL,
    oggetto TEXT,
    associazione_appartenenza TEXT NOT NULL,
    file_path TEXT NOT NULL DEFAULT '',
    file_name TEXT NOT NULL,
    file_mime_type TEXT,
    file_size BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT protocollo_associazione_id_format CHECK (id ~ '^C\.V\.-A\.-[0-9]{6}$'),
    CONSTRAINT protocollo_associazione_associazione_not_blank CHECK (length(trim(associazione_appartenenza)) > 0)
);

ALTER TABLE public.protocollo_associazione
    ALTER COLUMN id SET DEFAULT ('C.V.-A.-' || lpad(nextval('public.protocollo_associazione_seq')::TEXT, 6, '0'));

CREATE OR REPLACE FUNCTION public.set_protocollo_associazione_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protocollo_associazione_updated_at ON public.protocollo_associazione;
CREATE TRIGGER protocollo_associazione_updated_at
    BEFORE UPDATE ON public.protocollo_associazione
    FOR EACH ROW
    EXECUTE FUNCTION public.set_protocollo_associazione_updated_at();

CREATE INDEX IF NOT EXISTS protocollo_associazione_associazione_idx
    ON public.protocollo_associazione (associazione_appartenenza);

CREATE INDEX IF NOT EXISTS protocollo_associazione_tipo_created_idx
    ON public.protocollo_associazione (tipo, created_at DESC);

ALTER TABLE public.protocollo_associazione ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocollo_associazione FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.protocollo_associazione TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.protocollo_associazione_seq TO authenticated;

DROP POLICY IF EXISTS "protocollo_associazione_select" ON public.protocollo_associazione;
CREATE POLICY "protocollo_associazione_select"
    ON public.protocollo_associazione
    FOR SELECT
    TO authenticated
    USING (
        public.is_master()
        OR (
            public.is_segreteria()
            AND
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
    );

DROP POLICY IF EXISTS "protocollo_associazione_insert" ON public.protocollo_associazione;
CREATE POLICY "protocollo_associazione_insert"
    ON public.protocollo_associazione
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_master()
        OR (
            public.is_segreteria()
            AND
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
    );

DROP POLICY IF EXISTS "protocollo_associazione_update" ON public.protocollo_associazione;
CREATE POLICY "protocollo_associazione_update"
    ON public.protocollo_associazione
    FOR UPDATE
    TO authenticated
    USING (
        public.is_master()
        OR (
            public.is_segreteria()
            AND
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
    )
    WITH CHECK (
        public.is_master()
        OR (
            public.is_segreteria()
            AND
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
    );

DROP POLICY IF EXISTS "protocollo_associazione_delete" ON public.protocollo_associazione;
CREATE POLICY "protocollo_associazione_delete"
    ON public.protocollo_associazione
    FOR DELETE
    TO authenticated
    USING (
        public.is_master()
        OR (
            public.is_segreteria()
            AND
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
    );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'protocollo-associazione',
    'protocollo-associazione',
    false,
    NULL,
    NULL
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "protocollo_associazione_storage_select" ON storage.objects;
CREATE POLICY "protocollo_associazione_storage_select"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'protocollo-associazione'
        AND (
            public.is_master()
            OR (
                public.is_segreteria()
                AND EXISTS (
                    SELECT 1
                    FROM public.protocollo_associazione p
                    WHERE (
                        p.file_path = name
                        OR p.id = (storage.foldername(name))[1]
                    )
                      AND p.associazione_appartenenza = public.my_associazione()
                )
            )
        )
    );

DROP POLICY IF EXISTS "protocollo_associazione_storage_insert" ON storage.objects;
CREATE POLICY "protocollo_associazione_storage_insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'protocollo-associazione'
        AND (
            public.is_master()
            OR (
                public.is_segreteria()
                AND EXISTS (
                    SELECT 1
                    FROM public.protocollo_associazione p
                    WHERE p.id = (storage.foldername(name))[1]
                      AND p.associazione_appartenenza = public.my_associazione()
                )
            )
        )
    );

DROP POLICY IF EXISTS "protocollo_associazione_storage_update" ON storage.objects;
CREATE POLICY "protocollo_associazione_storage_update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'protocollo-associazione'
        AND public.is_master()
    )
    WITH CHECK (
        bucket_id = 'protocollo-associazione'
        AND public.is_master()
    );

DROP POLICY IF EXISTS "protocollo_associazione_storage_delete" ON storage.objects;
CREATE POLICY "protocollo_associazione_storage_delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'protocollo-associazione'
        AND (
            public.is_master()
            OR (
                public.is_segreteria()
                AND EXISTS (
                    SELECT 1
                    FROM public.protocollo_associazione p
                    WHERE (
                        p.file_path = name
                        OR p.id = (storage.foldername(name))[1]
                    )
                      AND p.associazione_appartenenza = public.my_associazione()
                )
            )
        )
    );
