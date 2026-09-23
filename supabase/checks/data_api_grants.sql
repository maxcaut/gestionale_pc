-- Verifica in sola lettura: eseguire nel SQL Editor come postgres dopo la 049.
-- Risultato atteso: zero righe. Ogni riga indica un requisito mancante.
-- Controlla privilegi effettivi e RLS attiva, non la correttezza delle singole
-- policy, eventuali privilegi in eccesso o gli schemi esposti nelle impostazioni API.
WITH expected_tables (table_name, authenticated_privileges, service_privileges) AS (
    VALUES
        ('profiles', 'SELECT', 'SELECT,INSERT,UPDATE'),
        ('volontari', 'SELECT,INSERT,UPDATE,DELETE', 'SELECT'),
        ('mezzi', 'SELECT,INSERT,UPDATE,DELETE', 'SELECT'),
        ('servizi', 'SELECT,INSERT,UPDATE,DELETE', 'SELECT'),
        ('squadre_aib', 'SELECT,INSERT,UPDATE,DELETE', 'SELECT'),
        ('associazioni', 'SELECT,INSERT,DELETE', 'SELECT,INSERT,UPDATE,DELETE'),
        ('magazzino_tipi_attrezzatura', 'SELECT,INSERT,UPDATE,DELETE', 'SELECT'),
        ('magazzino_attrezzature', 'SELECT,INSERT,UPDATE,DELETE', 'SELECT'),
        ('magazzino_prelievi', 'SELECT,INSERT,UPDATE,DELETE', 'SELECT'),
        ('magazzino_prelievi_righe', 'SELECT,INSERT,UPDATE,DELETE', 'SELECT'),
        ('protocollo_ingresso', 'SELECT,INSERT,UPDATE,DELETE', 'SELECT'),
        ('protocollo_associazione', 'SELECT,INSERT,UPDATE,DELETE', 'SELECT'),
        ('operatore_sala_turno', 'SELECT,INSERT,UPDATE', 'SELECT'),
        ('sala_operativa_aree_intervento', 'SELECT,INSERT,UPDATE,DELETE', 'SELECT')
), checks AS (
    SELECT 'public.' || t.table_name AS object_name, r.role_name,
        p.privilege AS requirement,
        has_table_privilege(r.role_name, to_regclass('public.' || t.table_name), p.privilege) AS ok
    FROM expected_tables t
    CROSS JOIN LATERAL (VALUES
        ('authenticated', t.authenticated_privileges),
        ('service_role', t.service_privileges)
    ) AS r(role_name, privileges)
    CROSS JOIN LATERAL unnest(string_to_array(r.privileges, ',')) AS p(privilege)

    UNION ALL
    SELECT 'public.' || t.table_name, 'authenticated', 'RLS ENABLED', c.relrowsecurity
    FROM expected_tables t
    LEFT JOIN pg_class c ON c.oid = to_regclass('public.' || t.table_name)

    UNION ALL
    SELECT 'public.' || s.sequence_name, s.role_name, p.privilege,
        has_sequence_privilege(s.role_name, to_regclass('public.' || s.sequence_name), p.privilege)
    FROM (VALUES
        ('associazioni_id_seq', 'authenticated', 'USAGE,SELECT'),
        ('protocollo_ingresso_seq', 'authenticated', 'USAGE,SELECT'),
        ('protocollo_associazione_seq', 'authenticated', 'USAGE,SELECT'),
        ('associazioni_id_seq', 'service_role', 'USAGE')
    ) AS s(sequence_name, role_name, privileges)
    CROSS JOIN LATERAL unnest(string_to_array(s.privileges, ',')) AS p(privilege)

    UNION ALL
    SELECT 'public', r.role_name, 'SCHEMA USAGE', has_schema_privilege(r.role_name, 'public', 'USAGE')
    FROM (VALUES ('authenticated'), ('service_role')) AS r(role_name)
)
SELECT object_name, role_name, requirement
FROM checks
WHERE ok IS DISTINCT FROM true
ORDER BY object_name, role_name, requirement;
