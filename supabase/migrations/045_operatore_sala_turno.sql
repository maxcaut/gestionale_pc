CREATE TABLE IF NOT EXISTS public.operatore_sala_turno (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    volontario_id TEXT NOT NULL,
    nome TEXT NOT NULL,
    cognome TEXT NOT NULL,
    telefono TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.operatore_sala_turno ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "operatore_sala_turno_select" ON public.operatore_sala_turno;
CREATE POLICY "operatore_sala_turno_select"
    ON public.operatore_sala_turno
    FOR SELECT
    TO authenticated
    USING (public.is_master() OR public.is_sala_operativa() OR public.is_capo_squadra());

DROP POLICY IF EXISTS "operatore_sala_turno_insert" ON public.operatore_sala_turno;
CREATE POLICY "operatore_sala_turno_insert"
    ON public.operatore_sala_turno
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_master() OR public.is_sala_operativa());

DROP POLICY IF EXISTS "operatore_sala_turno_update" ON public.operatore_sala_turno;
CREATE POLICY "operatore_sala_turno_update"
    ON public.operatore_sala_turno
    FOR UPDATE
    TO authenticated
    USING (public.is_master() OR public.is_sala_operativa())
    WITH CHECK (public.is_master() OR public.is_sala_operativa());

GRANT SELECT, INSERT, UPDATE ON public.operatore_sala_turno TO authenticated;
