-- ============================================================================
-- supabase/migrations/001_profiles_rls_volontari.sql
-- ============================================================================
-- =============================================================================
-- Coordinamento Vesuvius — Profili utente + RLS volontari
-- Eseguire nel SQL Editor di Supabase (Dashboard → SQL → New query → Run)
-- =============================================================================

-- 1. Colonna associazione sui volontari (se mancante)
ALTER TABLE public.volontari
    ADD COLUMN IF NOT EXISTS associazione_appartenenza TEXT;

-- 2. Tabella profili (collegata ad auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    email TEXT,
    ruolo TEXT NOT NULL CHECK (ruolo IN ('segreteria', 'master')),
    associazione TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT profili_segreteria_con_associazione CHECK (
        ruolo = 'master'
        OR (ruolo = 'segreteria' AND associazione IS NOT NULL AND length(trim(associazione)) > 0)
    )
);

CREATE INDEX IF NOT EXISTS idx_profiles_ruolo ON public.profiles (ruolo);

-- 3. Funzioni helper per le policy (security definer)
CREATE OR REPLACE FUNCTION public.is_master()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND ruolo = 'master'
    );
$$;

CREATE OR REPLACE FUNCTION public.my_associazione()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT associazione FROM public.profiles
    WHERE id = auth.uid() AND ruolo = 'segreteria'
    LIMIT 1;
$$;

-- 4. RLS su profiles (ogni utente legge solo il proprio profilo)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Solo service_role / SQL Editor possono inserire/aggiornare profili (vedi guida setup)

-- 5. RLS su volontari
ALTER TABLE public.volontari ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "volontari_select" ON public.volontari;
CREATE POLICY "volontari_select"
    ON public.volontari
    FOR SELECT
    TO authenticated
    USING (
        public.is_master()
        OR associazione_appartenenza = public.my_associazione()
    );

DROP POLICY IF EXISTS "volontari_insert" ON public.volontari;
CREATE POLICY "volontari_insert"
    ON public.volontari
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_master()
        OR (
            associazione_appartenenza = public.my_associazione()
            AND public.my_associazione() IS NOT NULL
        )
    );

DROP POLICY IF EXISTS "volontari_update" ON public.volontari;
CREATE POLICY "volontari_update"
    ON public.volontari
    FOR UPDATE
    TO authenticated
    USING (
        public.is_master()
        OR associazione_appartenenza = public.my_associazione()
    )
    WITH CHECK (
        public.is_master()
        OR associazione_appartenenza = public.my_associazione()
    );

DROP POLICY IF EXISTS "volontari_delete" ON public.volontari;
CREATE POLICY "volontari_delete"
    ON public.volontari
    FOR DELETE
    TO authenticated
    USING (
        public.is_master()
        OR associazione_appartenenza = public.my_associazione()
    );

-- 6. Mezzi e servizi: solo master (segreteria non accede)
ALTER TABLE public.mezzi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servizi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mezzi_master_only" ON public.mezzi;
CREATE POLICY "mezzi_master_only"
    ON public.mezzi
    FOR ALL
    TO authenticated
    USING (public.is_master())
    WITH CHECK (public.is_master());

DROP POLICY IF EXISTS "servizi_master_only" ON public.servizi;
CREATE POLICY "servizi_master_only"
    ON public.servizi
    FOR ALL
    TO authenticated
    USING (public.is_master())
    WITH CHECK (public.is_master());

-- 7. Grant (authenticated deve poter usare le tabelle con RLS)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volontari TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mezzi TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.servizi TO authenticated;


-- ============================================================================
-- supabase/migrations/002_profiles_admin_rls.sql
-- ============================================================================
-- Permette ai master di gestire tutti i profili dall'app (schermata Admin)

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

CREATE POLICY "profiles_select"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid() OR public.is_master());

CREATE POLICY "profiles_insert_master"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_master());

CREATE POLICY "profiles_update_master"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (public.is_master())
    WITH CHECK (public.is_master());

CREATE POLICY "profiles_delete_master"
    ON public.profiles
    FOR DELETE
    TO authenticated
    USING (public.is_master());


-- ============================================================================
-- supabase/migrations/003_capo_squadra.sql
-- ============================================================================
-- Ruolo capo_squadra: Sala operativa (servizi CRUD), lettura mezzi e volontari della propria associazione

-- 1. Estendi vincoli tabella profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_ruolo_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profili_segreteria_con_associazione;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_ruolo_check
    CHECK (ruolo IN ('segreteria', 'master', 'capo_squadra'));

ALTER TABLE public.profiles
    ADD CONSTRAINT profili_associazione_ruolo CHECK (
        ruolo = 'master'
        OR (
            ruolo IN ('segreteria', 'capo_squadra')
            AND associazione IS NOT NULL
            AND length(trim(associazione)) > 0
        )
    );

-- 2. Funzioni helper
CREATE OR REPLACE FUNCTION public.is_capo_squadra()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND ruolo = 'capo_squadra'
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_servizi()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_master() OR public.is_capo_squadra();
$$;

CREATE OR REPLACE FUNCTION public.my_associazione()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT associazione FROM public.profiles
    WHERE id = auth.uid() AND ruolo IN ('segreteria', 'capo_squadra')
    LIMIT 1;
$$;

-- 3. Volontari: capo_squadra può solo leggere la propria associazione
DROP POLICY IF EXISTS "volontari_select" ON public.volontari;
CREATE POLICY "volontari_select"
    ON public.volontari
    FOR SELECT
    TO authenticated
    USING (
        public.is_master()
        OR associazione_appartenenza = public.my_associazione()
    );

-- 4. Mezzi: lettura per capo_squadra, scrittura solo master
DROP POLICY IF EXISTS "mezzi_master_only" ON public.mezzi;

CREATE POLICY "mezzi_select"
    ON public.mezzi
    FOR SELECT
    TO authenticated
    USING (public.is_master() OR public.is_capo_squadra());

CREATE POLICY "mezzi_insert_master"
    ON public.mezzi
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_master());

CREATE POLICY "mezzi_update_master"
    ON public.mezzi
    FOR UPDATE
    TO authenticated
    USING (public.is_master())
    WITH CHECK (public.is_master());

CREATE POLICY "mezzi_delete_master"
    ON public.mezzi
    FOR DELETE
    TO authenticated
    USING (public.is_master());

-- 5. Servizi: master e capo_squadra
DROP POLICY IF EXISTS "servizi_master_only" ON public.servizi;

CREATE POLICY "servizi_manage"
    ON public.servizi
    FOR ALL
    TO authenticated
    USING (public.can_manage_servizi())
    WITH CHECK (public.can_manage_servizi());


-- ============================================================================
-- supabase/migrations/004_fix_rls_permissive_policies.sql
-- ============================================================================
-- =============================================================================
-- Fix RLS: rimuove policy permissive e blocca accesso anon
--
-- Sintomo: rowsecurity = true ma tutti vedono tutto.
-- Causa tipica: policy "Enable read access for all users" create dal dashboard
-- oppure grant SELECT ad anon senza policy restrittive.
-- =============================================================================

-- 1. Rimuovi TUTTE le policy esistenti sulle tabelle sensibili
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('volontari', 'mezzi', 'servizi', 'profiles')
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON %I.%I',
            pol.policyname,
            pol.schemaname,
            pol.tablename
        );
    END LOOP;
END $$;

-- 2. Forza RLS anche per il proprietario della tabella
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.volontari FORCE ROW LEVEL SECURITY;
ALTER TABLE public.mezzi FORCE ROW LEVEL SECURITY;
ALTER TABLE public.servizi FORCE ROW LEVEL SECURITY;

-- 3. Funzioni helper (idempotente)
CREATE OR REPLACE FUNCTION public.is_master()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND ruolo = 'master'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_capo_squadra()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND ruolo = 'capo_squadra'
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_servizi()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_master() OR public.is_capo_squadra();
$$;

CREATE OR REPLACE FUNCTION public.my_associazione()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT associazione FROM public.profiles
    WHERE id = auth.uid()
      AND ruolo IN ('segreteria', 'capo_squadra')
    LIMIT 1;
$$;

-- 4. Blocca anon: solo utenti autenticati possono accedere via API
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.volontari FROM anon;
REVOKE ALL ON public.mezzi FROM anon;
REVOKE ALL ON public.servizi FROM anon;

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volontari TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mezzi TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.servizi TO authenticated;

-- 5. Policy profiles
CREATE POLICY "profiles_select"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid() OR public.is_master());

CREATE POLICY "profiles_insert_master"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_master());

CREATE POLICY "profiles_update_master"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (public.is_master())
    WITH CHECK (public.is_master());

CREATE POLICY "profiles_delete_master"
    ON public.profiles
    FOR DELETE
    TO authenticated
    USING (public.is_master());

-- 6. Policy volontari (solo master vede tutto; segreteria/capo solo la propria associazione)
CREATE POLICY "volontari_select"
    ON public.volontari
    FOR SELECT
    TO authenticated
    USING (
        public.is_master()
        OR (
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
    );

CREATE POLICY "volontari_insert"
    ON public.volontari
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_master()
        OR (
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
    );

CREATE POLICY "volontari_update"
    ON public.volontari
    FOR UPDATE
    TO authenticated
    USING (
        public.is_master()
        OR (
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
    )
    WITH CHECK (
        public.is_master()
        OR (
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
    );

CREATE POLICY "volontari_delete"
    ON public.volontari
    FOR DELETE
    TO authenticated
    USING (
        public.is_master()
        OR (
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
    );

-- 7. Policy mezzi
CREATE POLICY "mezzi_select"
    ON public.mezzi
    FOR SELECT
    TO authenticated
    USING (public.is_master() OR public.is_capo_squadra());

CREATE POLICY "mezzi_insert_master"
    ON public.mezzi
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_master());

CREATE POLICY "mezzi_update_master"
    ON public.mezzi
    FOR UPDATE
    TO authenticated
    USING (public.is_master())
    WITH CHECK (public.is_master());

CREATE POLICY "mezzi_delete_master"
    ON public.mezzi
    FOR DELETE
    TO authenticated
    USING (public.is_master());

-- 8. Policy servizi
CREATE POLICY "servizi_manage"
    ON public.servizi
    FOR ALL
    TO authenticated
    USING (public.can_manage_servizi())
    WITH CHECK (public.can_manage_servizi());


-- ============================================================================
-- supabase/migrations/005_sala_operativa.sql
-- ============================================================================
-- Ruolo sala_operativa: accesso solo Sala Operativa (servizi CRUD),
-- lettura di tutti i volontari (senza insert/update/delete), lettura mezzi

-- 1. Estendi vincoli tabella profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_ruolo_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profili_associazione_ruolo;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_ruolo_check
    CHECK (ruolo IN ('segreteria', 'master', 'capo_squadra', 'sala_operativa'));

ALTER TABLE public.profiles
    ADD CONSTRAINT profili_associazione_ruolo CHECK (
        ruolo IN ('master', 'sala_operativa')
        OR (
            ruolo IN ('segreteria', 'capo_squadra')
            AND associazione IS NOT NULL
            AND length(trim(associazione)) > 0
        )
    );

-- 2. Funzioni helper
CREATE OR REPLACE FUNCTION public.is_sala_operativa()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND ruolo = 'sala_operativa'
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_servizi()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_master() OR public.is_capo_squadra() OR public.is_sala_operativa();
$$;

-- 3. Volontari: sala_operativa può leggere tutti, non scrivere
DROP POLICY IF EXISTS "volontari_select" ON public.volontari;
CREATE POLICY "volontari_select"
    ON public.volontari
    FOR SELECT
    TO authenticated
    USING (
        public.is_master()
        OR public.is_sala_operativa()
        OR (
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
    );

-- 4. Mezzi: lettura per sala_operativa (assegnazione missioni)
DROP POLICY IF EXISTS "mezzi_select" ON public.mezzi;
CREATE POLICY "mezzi_select"
    ON public.mezzi
    FOR SELECT
    TO authenticated
    USING (
        public.is_master()
        OR public.is_capo_squadra()
        OR public.is_sala_operativa()
    );


-- ============================================================================
-- supabase/migrations/006_mezzi_segreteria.sql
-- ============================================================================
-- Mezzi: stesso criterio dei volontari (segreteria/capo solo la propria associazione; master tutto; sala_operativa lettura globale)

ALTER TABLE public.mezzi
    ADD COLUMN IF NOT EXISTS associazione_appartenenza TEXT;

ALTER TABLE public.servizi
    ADD COLUMN IF NOT EXISTS carrelli_trainanti JSONB NOT NULL DEFAULT '{}';

DROP POLICY IF EXISTS "mezzi_select" ON public.mezzi;
DROP POLICY IF EXISTS "mezzi_insert_master" ON public.mezzi;
DROP POLICY IF EXISTS "mezzi_update_master" ON public.mezzi;
DROP POLICY IF EXISTS "mezzi_delete_master" ON public.mezzi;

CREATE POLICY "mezzi_select"
    ON public.mezzi
    FOR SELECT
    TO authenticated
    USING (
        public.is_master()
        OR public.is_sala_operativa()
        OR (
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
    );

CREATE POLICY "mezzi_insert"
    ON public.mezzi
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_master()
        OR (
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
    );

CREATE POLICY "mezzi_update"
    ON public.mezzi
    FOR UPDATE
    TO authenticated
    USING (
        public.is_master()
        OR (
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
    )
    WITH CHECK (
        public.is_master()
        OR (
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
    );

CREATE POLICY "mezzi_delete"
    ON public.mezzi
    FOR DELETE
    TO authenticated
    USING (
        public.is_master()
        OR (
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
    );


-- ============================================================================
-- supabase/migrations/006_servizi_aib_fields.sql
-- ============================================================================
-- Campi opzionali per interventi Antincendio Boschivo (tabella servizi)

ALTER TABLE public.servizi
    ADD COLUMN IF NOT EXISTS ora_arrivo_incendio text,
    ADD COLUMN IF NOT EXISTS ora_fine_intervento text,
    ADD COLUMN IF NOT EXISTS ora_rientro_sede text,
    ADD COLUMN IF NOT EXISTS superficie_ceduo jsonb,
    ADD COLUMN IF NOT EXISTS superficie_alto_fusto jsonb,
    ADD COLUMN IF NOT EXISTS superficie_non_boscato jsonb;

COMMENT ON COLUMN public.servizi.ora_arrivo_incendio IS 'Orario arrivo sull''incendio (HH:MM), solo AIB';
COMMENT ON COLUMN public.servizi.ora_fine_intervento IS 'Orario fine intervento (HH:MM), solo AIB';
COMMENT ON COLUMN public.servizi.ora_rientro_sede IS 'Orario rientro in sede (HH:MM), solo AIB';
COMMENT ON COLUMN public.servizi.superficie_ceduo IS 'Superficie ceduo: matricianato, compostato, degradato, macchia (valori testo, es. ha)';
COMMENT ON COLUMN public.servizi.superficie_alto_fusto IS 'Superficie alto fusto: resinoso, latifoglie, misto, rimboschimento';
COMMENT ON COLUMN public.servizi.superficie_non_boscato IS 'Superficie non boscato: cespugliato, pascolo, seminativo, incolto';


-- ============================================================================
-- supabase/migrations/007_capo_squadra_mezzi_servizi.sql
-- ============================================================================
-- Capo squadra: può leggere i mezzi della propria associazione e quelli assegnati ai servizi

DROP POLICY IF EXISTS "mezzi_select" ON public.mezzi;

CREATE POLICY "mezzi_select"
    ON public.mezzi
    FOR SELECT
    TO authenticated
    USING (
        public.is_master()
        OR public.is_sala_operativa()
        OR (
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
        OR (
            public.is_capo_squadra()
            AND EXISTS (
                SELECT 1 FROM public.servizi s
                WHERE mezzi.id = ANY (s.mezzi_ids)
            )
        )
    );


-- ============================================================================
-- supabase/migrations/008_capo_squadra_volontari_servizi.sql
-- ============================================================================
-- Capo squadra: può leggere i volontari della propria associazione e quelli assegnati ai servizi

DROP POLICY IF EXISTS "volontari_select" ON public.volontari;

CREATE POLICY "volontari_select"
    ON public.volontari
    FOR SELECT
    TO authenticated
    USING (
        public.is_master()
        OR public.is_sala_operativa()
        OR (
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
        OR (
            public.is_capo_squadra()
            AND EXISTS (
                SELECT 1 FROM public.servizi s
                WHERE volontari.id = ANY (s.volontari_ids)
            )
        )
    );


-- ============================================================================
-- supabase/migrations/009_segreteria_attivita.sql
-- ============================================================================
-- Segreteria: lettura servizi pianificati/completati e aggiornamento solo assegnazione mezzi/volontari

CREATE OR REPLACE FUNCTION public.is_segreteria()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND ruolo = 'segreteria'
    );
$$;

CREATE POLICY "servizi_segreteria_select"
    ON public.servizi
    FOR SELECT
    TO authenticated
    USING (
        public.is_segreteria()
        AND stato IN ('Programmato', 'Completato')
    );

CREATE POLICY "servizi_segreteria_assign"
    ON public.servizi
    FOR UPDATE
    TO authenticated
    USING (
        public.is_segreteria()
        AND stato = 'Programmato'
    )
    WITH CHECK (
        public.is_segreteria()
        AND stato = 'Programmato'
    );


-- ============================================================================
-- supabase/migrations/010_super_user.sql
-- ============================================================================
-- Ruolo super_user: accesso completo (stessi permessi RLS del master su tutte le tabelle)

-- 1. Estendi vincoli tabella profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_ruolo_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profili_associazione_ruolo;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_ruolo_check
    CHECK (ruolo IN ('segreteria', 'master', 'capo_squadra', 'sala_operativa', 'super_user'));

ALTER TABLE public.profiles
    ADD CONSTRAINT profili_associazione_ruolo CHECK (
        ruolo IN ('master', 'sala_operativa', 'super_user')
        OR (
            ruolo IN ('segreteria', 'capo_squadra')
            AND associazione IS NOT NULL
            AND length(trim(associazione)) > 0
        )
    );

-- 2. Helper: super_user condivide i permessi RLS del master
CREATE OR REPLACE FUNCTION public.is_super_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND ruolo = 'super_user'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_master()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND ruolo IN ('master', 'super_user')
    );
$$;


-- ============================================================================
-- supabase/migrations/011_servizi_tipologia_aib.sql
-- ============================================================================
-- Tipologia AIB: L = Lotta attiva, P = Pattugliamento

ALTER TABLE public.servizi
    ADD COLUMN IF NOT EXISTS tipologia_aib text;

COMMENT ON COLUMN public.servizi.tipologia_aib IS 'Tipologia AIB: L = Lotta attiva, P = Pattugliamento';


-- ============================================================================
-- supabase/migrations/012_servizi_volontari_art39.sql
-- ============================================================================
-- Art.39 per volontario assegnato all'intervento

ALTER TABLE public.servizi
    ADD COLUMN IF NOT EXISTS volontari_art39 jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.servizi.volontari_art39 IS 'Mappa volontario_id -> Si/No per art.39 sull''intervento';


-- ============================================================================
-- supabase/migrations/013_segreteria_attivita_completati.sql
-- ============================================================================
-- Segreteria: mostra anche i servizi completati nella tab Attivita.

ALTER POLICY "servizi_segreteria_select"
    ON public.servizi
    USING (
        public.is_segreteria()
        AND stato IN ('Programmato', 'Completato')
    );


-- ============================================================================
-- supabase/migrations/014_servizi_richiedente_check.sql
-- ============================================================================
-- Allinea il vincolo richiedente alle voci del menu "Nuova missione".

ALTER TABLE public.servizi
    ADD COLUMN IF NOT EXISTS richiedente text;

ALTER TABLE public.servizi
    DROP CONSTRAINT IF EXISTS servizi_richiedente_check;

ALTER TABLE public.servizi
    ADD CONSTRAINT servizi_richiedente_check
    CHECK (
        richiedente IS NULL
        OR richiedente IN (
            'SORU',
            'SOPI',
            'COORDINAMENTO VESUVIUS',
            'COMUNE',
            'ENTE ESTERNO',
            'FF.OO.',
            'V.V.F.',
            'PRIVATO',
            'ALTRO COORDINAMENTO'
        )
    );


-- ============================================================================
-- supabase/migrations/015_volontari_anagrafica_qualifiche.sql
-- ============================================================================
ALTER TABLE public.volontari
    ADD COLUMN IF NOT EXISTS data_nascita DATE,
    ADD COLUMN IF NOT EXISTS luogo_nascita TEXT,
    ADD COLUMN IF NOT EXISTS comune_residenza TEXT,
    ADD COLUMN IF NOT EXISTS via_residenza TEXT,
    ADD COLUMN IF NOT EXISTS censito BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS matricola_regionale TEXT,
    ADD COLUMN IF NOT EXISTS qualifica_antincendio TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS qualifiche_coordinamento TEXT[] NOT NULL DEFAULT '{}';


-- ============================================================================
-- supabase/migrations/016_servizi_art39.sql
-- ============================================================================
-- Art.39 globale sull'intervento

ALTER TABLE public.servizi
    ADD COLUMN IF NOT EXISTS art39 TEXT NOT NULL DEFAULT 'Si'
    CHECK (art39 IN ('Si', 'No'));

COMMENT ON COLUMN public.servizi.art39 IS 'Abilita gestione Art.39 per volontario assegnato al servizio';


-- ============================================================================
-- supabase/migrations/017_squadre_aib.sql
-- ============================================================================
-- Squadre A.I.B.: composizione per associazione e assegnazione agli interventi AIB

CREATE TABLE IF NOT EXISTS public.squadre_aib (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    associazione_appartenenza TEXT NOT NULL,
    mezzi_ids TEXT[] NOT NULL CHECK (cardinality(mezzi_ids) > 0),
    volontari_ids TEXT[] NOT NULL CHECK (cardinality(volontari_ids) > 0),
    stato TEXT NOT NULL DEFAULT 'Operativa' CHECK (stato IN ('Operativa', 'Non operativa')),
    disponibile_fino TIME,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_squadra_aib_associazione()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM unnest(NEW.mezzi_ids) AS mezzo_id
        LEFT JOIN public.mezzi m ON m.id = mezzo_id
        WHERE m.id IS NULL OR m.associazione_appartenenza IS DISTINCT FROM NEW.associazione_appartenenza
    ) THEN
        RAISE EXCEPTION 'I mezzi della squadra AIB devono appartenere alla stessa associazione';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM unnest(NEW.volontari_ids) AS volontario_id
        LEFT JOIN public.volontari v ON v.id = volontario_id
        WHERE v.id IS NULL OR v.associazione_appartenenza IS DISTINCT FROM NEW.associazione_appartenenza
    ) THEN
        RAISE EXCEPTION 'I volontari della squadra AIB devono appartenere alla stessa associazione';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_squadra_aib_associazione_trigger ON public.squadre_aib;
CREATE TRIGGER validate_squadra_aib_associazione_trigger
    BEFORE INSERT OR UPDATE ON public.squadre_aib
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_squadra_aib_associazione();

ALTER TABLE public.servizi
    ADD COLUMN IF NOT EXISTS squadre_aib_ids TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.squadre_aib ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "squadre_aib_select" ON public.squadre_aib;
CREATE POLICY "squadre_aib_select"
    ON public.squadre_aib
    FOR SELECT
    USING (
        public.is_master()
        OR public.is_sala_operativa()
        OR associazione_appartenenza = public.my_associazione()
    );

DROP POLICY IF EXISTS "squadre_aib_insert" ON public.squadre_aib;
CREATE POLICY "squadre_aib_insert"
    ON public.squadre_aib
    FOR INSERT
    WITH CHECK (
        public.is_master()
        OR (
            public.my_associazione() IS NOT NULL
            AND associazione_appartenenza = public.my_associazione()
        )
    );

DROP POLICY IF EXISTS "squadre_aib_update" ON public.squadre_aib;
CREATE POLICY "squadre_aib_update"
    ON public.squadre_aib
    FOR UPDATE
    USING (
        public.is_master()
        OR associazione_appartenenza = public.my_associazione()
    )
    WITH CHECK (
        public.is_master()
        OR associazione_appartenenza = public.my_associazione()
    );

DROP POLICY IF EXISTS "squadre_aib_delete" ON public.squadre_aib;
CREATE POLICY "squadre_aib_delete"
    ON public.squadre_aib
    FOR DELETE
    USING (
        public.is_master()
        OR associazione_appartenenza = public.my_associazione()
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.squadre_aib TO authenticated;


-- ============================================================================
-- supabase/migrations/018_segreteria_servizi_in_corso.sql
-- ============================================================================
-- Segreteria: consente di vedere anche i servizi in corso.
-- Serve alla view Squadre A.I.B. per mostrare le assegnazioni attive.

ALTER POLICY "servizi_segreteria_select"
    ON public.servizi
    USING (
        public.is_segreteria()
        AND stato IN ('Programmato', 'Pianificato', 'In corso', 'Completato')
    );


-- ============================================================================
-- supabase/migrations/019_squadre_aib_disponibile_fino.sql
-- ============================================================================
-- Squadre A.I.B.: scadenza disponibilita automatica

ALTER TABLE public.squadre_aib
    ADD COLUMN IF NOT EXISTS disponibile_fino TIME;


-- ============================================================================
-- supabase/migrations/023_volontari_foto_storage.sql
-- ============================================================================
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


-- ============================================================================
-- supabase/migrations/024_volontari_patenti_storage.sql
-- ============================================================================
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
