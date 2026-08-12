<?php

return [
    'token_lifetime_minutes' => (int) env('EXTERNAL_READ_TOKEN_LIFETIME', 30),

    // Elenco chiuso: nessun nome tabella fornito dal client viene usato liberamente.
    'resources' => [
        'profiles',
        'volontari',
        'mezzi',
        'servizi',
        'squadre_aib',
        'associazioni',
        'magazzino_tipi_attrezzatura',
        'magazzino_attrezzature',
        'magazzino_prelievi',
        'magazzino_prelievi_righe',
        'protocollo_ingresso',
        'protocollo_associazione',
        'operatore_sala_turno',
        'sala_operativa_aree_intervento',
    ],
];
