-- Prelievi magazzino: salvataggio e rientro atomici via RPC.

CREATE OR REPLACE FUNCTION public.save_magazzino_prelievo(
    p_prelievo_id UUID,
    p_data_prelievo DATE,
    p_consegnato_a TEXT,
    p_associazione_appartenenza TEXT,
    p_righe JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile RECORD;
    v_prelievo RECORD;
    v_prelievo_id UUID;
    v_new_rows_count INTEGER;
    v_all_rows_count INTEGER;
    v_invalid_rows_count INTEGER;
    v_expected_items_count INTEGER;
    v_seen_items_count INTEGER := 0;
    v_item RECORD;
    v_next_quantita INTEGER;
BEGIN
    SELECT ruolo, associazione
    INTO v_profile
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_profile.ruolo IS NULL OR v_profile.ruolo NOT IN ('master', 'super_user', 'segreteria') THEN
        RAISE EXCEPTION 'Operazione non autorizzata.';
    END IF;

    IF v_profile.ruolo = 'segreteria' AND v_profile.associazione IS DISTINCT FROM p_associazione_appartenenza THEN
        RAISE EXCEPTION 'Operazione non autorizzata per questa associazione.';
    END IF;

    IF p_data_prelievo IS NULL
        OR length(trim(coalesce(p_consegnato_a, ''))) = 0
        OR length(trim(coalesce(p_associazione_appartenenza, ''))) = 0
        OR p_righe IS NULL
        OR jsonb_typeof(p_righe) <> 'array'
    THEN
        RAISE EXCEPTION 'Dati prelievo non validi.';
    END IF;

    SELECT count(*)
    INTO v_all_rows_count
    FROM jsonb_to_recordset(p_righe) AS r(attrezzatura_id UUID, quantita INTEGER);

    SELECT count(*)
    INTO v_invalid_rows_count
    FROM jsonb_to_recordset(p_righe) AS r(attrezzatura_id UUID, quantita INTEGER)
    WHERE r.attrezzatura_id IS NULL OR r.quantita IS NULL OR r.quantita <= 0;

    SELECT count(*)
    INTO v_new_rows_count
    FROM (
        SELECT r.attrezzatura_id
        FROM jsonb_to_recordset(p_righe) AS r(attrezzatura_id UUID, quantita INTEGER)
        GROUP BY r.attrezzatura_id
    ) grouped_rows;

    IF v_all_rows_count = 0 OR v_invalid_rows_count > 0 OR v_new_rows_count = 0 THEN
        RAISE EXCEPTION 'Righe prelievo non valide.';
    END IF;

    IF p_prelievo_id IS NOT NULL THEN
        SELECT id, stato, associazione_appartenenza
        INTO v_prelievo
        FROM public.magazzino_prelievi
        WHERE id = p_prelievo_id
        FOR UPDATE;

        IF v_prelievo.id IS NULL THEN
            RAISE EXCEPTION 'Prelievo non trovato.';
        END IF;

        IF v_profile.ruolo = 'segreteria'
            AND v_prelievo.associazione_appartenenza IS DISTINCT FROM p_associazione_appartenenza
        THEN
            RAISE EXCEPTION 'Operazione non autorizzata per questa associazione.';
        END IF;

        IF v_prelievo.stato <> 'aperto' THEN
            RAISE EXCEPTION 'Il prelievo non e modificabile.';
        END IF;

        v_prelievo_id := v_prelievo.id;
    ELSE
        INSERT INTO public.magazzino_prelievi (
            data_prelievo,
            consegnato_a,
            associazione_appartenenza,
            stato
        )
        VALUES (
            p_data_prelievo,
            trim(p_consegnato_a),
            p_associazione_appartenenza,
            'aperto'
        )
        RETURNING id INTO v_prelievo_id;
    END IF;

    WITH new_rows AS (
        SELECT r.attrezzatura_id, sum(r.quantita)::INTEGER AS quantita
        FROM jsonb_to_recordset(p_righe) AS r(attrezzatura_id UUID, quantita INTEGER)
        GROUP BY r.attrezzatura_id
    ),
    old_rows AS (
        SELECT r.attrezzatura_id, sum(r.quantita)::INTEGER AS quantita
        FROM public.magazzino_prelievi_righe r
        WHERE r.prelievo_id = v_prelievo_id
        GROUP BY r.attrezzatura_id
    ),
    all_items AS (
        SELECT attrezzatura_id FROM new_rows
        UNION
        SELECT attrezzatura_id FROM old_rows
    )
    SELECT count(*)
    INTO v_expected_items_count
    FROM all_items;

    FOR v_item IN
        WITH new_rows AS (
            SELECT r.attrezzatura_id, sum(r.quantita)::INTEGER AS quantita
            FROM jsonb_to_recordset(p_righe) AS r(attrezzatura_id UUID, quantita INTEGER)
            GROUP BY r.attrezzatura_id
        ),
        old_rows AS (
            SELECT r.attrezzatura_id, sum(r.quantita)::INTEGER AS quantita
            FROM public.magazzino_prelievi_righe r
            WHERE r.prelievo_id = v_prelievo_id
            GROUP BY r.attrezzatura_id
        ),
        all_items AS (
            SELECT attrezzatura_id FROM new_rows
            UNION
            SELECT attrezzatura_id FROM old_rows
        )
        SELECT
            ma.id,
            ma.quantita,
            ma.associazione_appartenenza,
            coalesce(old_rows.quantita, 0) AS old_quantita,
            coalesce(new_rows.quantita, 0) AS new_quantita
        FROM all_items
        JOIN public.magazzino_attrezzature ma ON ma.id = all_items.attrezzatura_id
        LEFT JOIN old_rows ON old_rows.attrezzatura_id = ma.id
        LEFT JOIN new_rows ON new_rows.attrezzatura_id = ma.id
        ORDER BY ma.id
        FOR UPDATE OF ma
    LOOP
        v_seen_items_count := v_seen_items_count + 1;

        IF v_profile.ruolo = 'segreteria'
            AND v_item.associazione_appartenenza IS DISTINCT FROM p_associazione_appartenenza
        THEN
            RAISE EXCEPTION 'Item non autorizzato per questa associazione.';
        END IF;

        v_next_quantita := v_item.quantita + v_item.old_quantita - v_item.new_quantita;
        IF v_next_quantita < 0 THEN
            RAISE EXCEPTION 'Quantita non disponibile.';
        END IF;

        UPDATE public.magazzino_attrezzature
        SET quantita = v_next_quantita
        WHERE id = v_item.id;
    END LOOP;

    IF v_seen_items_count <> v_expected_items_count THEN
        RAISE EXCEPTION 'Uno o piu item non sono disponibili.';
    END IF;

    IF p_prelievo_id IS NOT NULL THEN
        UPDATE public.magazzino_prelievi
        SET
            data_prelievo = p_data_prelievo,
            consegnato_a = trim(p_consegnato_a),
            associazione_appartenenza = p_associazione_appartenenza
        WHERE id = v_prelievo_id;

        DELETE FROM public.magazzino_prelievi_righe
        WHERE prelievo_id = v_prelievo_id;
    END IF;

    INSERT INTO public.magazzino_prelievi_righe (prelievo_id, attrezzatura_id, quantita)
    SELECT v_prelievo_id, r.attrezzatura_id, sum(r.quantita)::INTEGER
    FROM jsonb_to_recordset(p_righe) AS r(attrezzatura_id UUID, quantita INTEGER)
    GROUP BY r.attrezzatura_id;

    RETURN v_prelievo_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rientro_magazzino_prelievo(p_prelievo_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile RECORD;
    v_prelievo RECORD;
    v_item RECORD;
BEGIN
    SELECT ruolo, associazione
    INTO v_profile
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_profile.ruolo IS NULL OR v_profile.ruolo NOT IN ('master', 'super_user', 'segreteria') THEN
        RAISE EXCEPTION 'Operazione non autorizzata.';
    END IF;

    SELECT *
    INTO v_prelievo
    FROM public.magazzino_prelievi
    WHERE id = p_prelievo_id
    FOR UPDATE;

    IF v_prelievo.id IS NULL THEN
        RAISE EXCEPTION 'Prelievo non trovato.';
    END IF;

    IF v_profile.ruolo = 'segreteria' AND v_profile.associazione IS DISTINCT FROM v_prelievo.associazione_appartenenza THEN
        RAISE EXCEPTION 'Operazione non autorizzata per questa associazione.';
    END IF;

    IF v_prelievo.stato <> 'aperto' THEN
        RAISE EXCEPTION 'Prelievo gia completato.';
    END IF;

    FOR v_item IN
        WITH rientri AS (
            SELECT r.attrezzatura_id, sum(r.quantita)::INTEGER AS quantita_rientro
            FROM public.magazzino_prelievi_righe r
            WHERE r.prelievo_id = p_prelievo_id
            GROUP BY r.attrezzatura_id
        )
        SELECT ma.id, rientri.quantita_rientro
        FROM rientri
        JOIN public.magazzino_attrezzature ma ON ma.id = rientri.attrezzatura_id
        ORDER BY ma.id
        FOR UPDATE OF ma
    LOOP
        UPDATE public.magazzino_attrezzature
        SET quantita = quantita + v_item.quantita_rientro
        WHERE id = v_item.id;
    END LOOP;

    UPDATE public.magazzino_prelievi
    SET stato = 'completato'
    WHERE id = p_prelievo_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_magazzino_prelievo(UUID, DATE, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rientro_magazzino_prelievo(UUID) TO authenticated;
