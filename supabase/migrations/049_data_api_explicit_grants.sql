-- Permessi espliciti per il cambio dei default Supabase del 30 ottobre 2026.
-- Istanza esistente: eseguire come postgres dopo tutte le migration fino alla 048.
-- Rieseguibile: aggiunge i permessi necessari senza revocare quelli esistenti.
-- Non modifica dati, policy RLS, accesso anon o privilegi predefiniti.

BEGIN;

GRANT USAGE ON SCHEMA public TO authenticated, service_role;

-- Frontend: conserva le operazioni previste dalle migration originali.
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON
    public.volontari,
    public.mezzi,
    public.servizi,
    public.squadre_aib,
    public.magazzino_tipi_attrezzatura,
    public.magazzino_attrezzature,
    public.magazzino_prelievi,
    public.magazzino_prelievi_righe,
    public.protocollo_ingresso,
    public.protocollo_associazione,
    public.sala_operativa_aree_intervento
TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.associazioni TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.operatore_sala_turno TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE
    public.associazioni_id_seq,
    public.protocollo_ingresso_seq,
    public.protocollo_associazione_seq
TO authenticated;

-- Backend: API esterna di lettura, PDF e controlli sulle associazioni in uso.
GRANT SELECT ON
    public.profiles,
    public.volontari,
    public.mezzi,
    public.servizi,
    public.squadre_aib,
    public.associazioni,
    public.magazzino_tipi_attrezzatura,
    public.magazzino_attrezzature,
    public.magazzino_prelievi,
    public.magazzino_prelievi_righe,
    public.protocollo_ingresso,
    public.protocollo_associazione,
    public.operatore_sala_turno,
    public.sala_operativa_aree_intervento
TO service_role;

-- La cancellazione dei profili avviene tramite Auth con ON DELETE CASCADE.
GRANT INSERT, UPDATE ON public.profiles TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.associazioni TO service_role;
GRANT USAGE ON SEQUENCE public.associazioni_id_seq TO service_role;

COMMIT;
