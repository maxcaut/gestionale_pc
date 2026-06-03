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
