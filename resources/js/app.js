import { createClient } from '@supabase/supabase-js';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- INIZIALIZZAZIONE SUPABASE ---
// Invece di import.meta.env, leggiamo una variabile passata da Laravel nel file HTML
const supabaseUrl = window.laravelConfig?.supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = window.laravelConfig?.supabaseKey || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// --- PROFILO UTENTE (ruolo + associazione) ---
let currentUserProfile = null;

function isMaster() {
    return currentUserProfile?.ruolo === 'master';
}

function isSegreteria() {
    return currentUserProfile?.ruolo === 'segreteria';
}

function isCapoSquadra() {
    return currentUserProfile?.ruolo === 'capo_squadra';
}

function isSalaOperativa() {
    return currentUserProfile?.ruolo === 'sala_operativa';
}

function canAccessVolontari() {
    return isMaster() || isSegreteria();
}

function canAccessServizi() {
    return isMaster() || isCapoSquadra() || isSalaOperativa();
}

function canAccessMezzi() {
    return isMaster() || isSegreteria();
}

function canSeeAllMezzi() {
    return isMaster() || isSalaOperativa();
}

function shouldFilterMezziQueryByAssociazione() {
    return isSegreteria();
}

function applyMezziScope(list) {
    if (canSeeAllMezzi() || isCapoSquadra()) return list;
    const assoc = getUserAssociazione();
    if (!assoc) return [];
    return list.filter(m => m.associazione_appartenenza === assoc);
}

async function enrichMezziFromServizi(serviziList) {
    if (!canAccessServizi() || !serviziList?.length) return;

    const knownIds = new Set(mezzi.map(m => m.id));
    const missingIds = [...new Set(
        serviziList.flatMap(s => s.mezziIds || []).filter(id => id && !knownIds.has(id))
    )];
    if (missingIds.length === 0) return;

    const { data, error } = await supabase.from('mezzi').select('*').in('id', missingIds);
    if (error) throw error;
    if (data?.length) {
        mezzi = applyMezziScope([...mezzi, ...data]);
    }
}

function getMezzoAssociazioneValue() {
    if (isSegreteria()) {
        return getUserAssociazione();
    }
    return document.getElementById('m-associazione')?.value || null;
}

function roleRequiresAssociazione(ruolo) {
    return ruolo === 'segreteria' || ruolo === 'capo_squadra';
}

function formatRuoloLabel(ruolo) {
    const labels = {
        master: 'Master',
        segreteria: 'Segreteria',
        capo_squadra: 'Capo Squadra',
        sala_operativa: 'Sala Operativa',
    };
    return labels[ruolo] || ruolo;
}

function getUserAssociazione() {
    return currentUserProfile?.associazione || null;
}

function canSeeAllVolontari() {
    return isMaster() || isSalaOperativa();
}

function applyVolontariScope(list) {
    if (canSeeAllVolontari()) return list;
    const assoc = getUserAssociazione();
    if (!assoc) return [];
    return list.filter(v => v.associazione_appartenenza === assoc);
}

async function loadUserProfile(user) {
    if (!user?.id) {
        currentUserProfile = null;
        return null;
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, ruolo, associazione')
        .eq('id', user.id)
        .maybeSingle();

    if (error) {
        console.error('Errore caricamento profilo:', error);
        throw error;
    }

    currentUserProfile = data;
    return data;
}

function applyRoleBasedUI() {
    document.querySelectorAll('[data-master-only]').forEach(el => {
        el.classList.toggle('hidden', !isMaster());
    });
    document.querySelectorAll('[data-volontari-access]').forEach(el => {
        el.classList.toggle('hidden', !canAccessVolontari());
    });
    document.querySelectorAll('[data-servizi-access]').forEach(el => {
        el.classList.toggle('hidden', !canAccessServizi());
    });
    document.querySelectorAll('[data-mezzi-access]').forEach(el => {
        el.classList.toggle('hidden', !canAccessMezzi());
    });

    const badge = document.getElementById('user-email-badge');
    if (badge && currentUserProfile) {
        if (isMaster()) {
            badge.innerText = 'Master';
        } else if (isSalaOperativa()) {
            badge.innerText = 'Sala Operativa';
        } else if (isCapoSquadra()) {
            badge.innerText = `Capo · ${getUserAssociazione() || 'Squadra'}`;
        } else if (isSegreteria()) {
            badge.innerText = getUserAssociazione() || 'Segreteria';
        }
    }

    setupVolontarioAssociazioneField();
    setupMezzoAssociazioneField();

    if (isSegreteria()) {
        switchTab('volontari');
    } else if (isCapoSquadra() || isSalaOperativa()) {
        switchTab('servizi');
    }
}

function setupVolontarioAssociazioneField() {
    const selectWrap = document.getElementById('v-associazione-select-wrap');
    const fissaWrap = document.getElementById('v-associazione-fissa-wrap');
    const select = document.getElementById('v-associazione');
    const fissaInput = document.getElementById('v-associazione-fissa');
    const fissaLabel = document.getElementById('v-associazione-fissa-label');

    if (!selectWrap || !fissaWrap) return;

    if (isSegreteria()) {
        const assoc = getUserAssociazione() || '';
        selectWrap.classList.add('hidden');
        fissaWrap.classList.remove('hidden');
        if (fissaInput) fissaInput.value = assoc;
        if (fissaLabel) fissaLabel.innerText = assoc;
        if (select) {
            select.required = false;
            select.value = assoc;
        }
    } else {
        selectWrap.classList.remove('hidden');
        fissaWrap.classList.add('hidden');
        if (select) select.required = true;
    }
}

function getVolontarioAssociazioneValue() {
    if (isSegreteria()) {
        return getUserAssociazione();
    }
    return document.getElementById('v-associazione')?.value || null;
}

function setupMezzoAssociazioneField() {
    const selectWrap = document.getElementById('m-associazione-select-wrap');
    const fissaWrap = document.getElementById('m-associazione-fissa-wrap');
    const select = document.getElementById('m-associazione');
    const fissaInput = document.getElementById('m-associazione-fissa');
    const fissaLabel = document.getElementById('m-associazione-fissa-label');

    if (!selectWrap || !fissaWrap) return;

    if (isSegreteria()) {
        const assoc = getUserAssociazione() || '';
        selectWrap.classList.add('hidden');
        fissaWrap.classList.remove('hidden');
        if (fissaInput) fissaInput.value = assoc;
        if (fissaLabel) fissaLabel.innerText = assoc;
        if (select) {
            select.required = false;
            select.value = assoc;
        }
    } else {
        selectWrap.classList.remove('hidden');
        fissaWrap.classList.add('hidden');
        if (select) select.required = true;
    }
}

async function bootstrapApp(user) {
    await loadUserProfile(user);

    if (!currentUserProfile) {
        await supabase.auth.signOut();
        showLogin();
        const errorDiv = document.getElementById('login-error');
        const errorText = document.getElementById('login-error-text');
        if (errorDiv && errorText) {
            errorText.innerText = 'Profilo non configurato. Contatta l\'amministratore (vedi docs/SUPABASE_SETUP.md).';
            errorDiv.classList.remove('hidden');
        }
        return false;
    }

    showApp(user);
    applyRoleBasedUI();
    await fetchDataFromSupabase();
    startRealtimeClock();
    return true;
}

// --- AUTENTICAZIONE SUPABASE ---

function showApp(user) {
    document.getElementById('login-screen').style.display = 'none';
    const appLayout = document.getElementById('app-layout');
    appLayout.classList.remove('hidden');
    appLayout.style.display = 'flex';

    // Mostra bottom navigation su mobile
    const bottomNav = document.getElementById('bottom-nav');
    if (bottomNav) bottomNav.style.display = '';
}

function showLogin() {
    document.getElementById('app-layout').classList.add('hidden');
    document.getElementById('app-layout').style.display = '';
    document.getElementById('login-screen').style.display = '';
    document.getElementById('login-form').reset();
    document.getElementById('login-error').classList.add('hidden');

    // Nascondi bottom navigation
    const bottomNav = document.getElementById('bottom-nav');
    if (bottomNav) bottomNav.style.display = 'none';
}

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    const errorText = document.getElementById('login-error-text');
    const btn = document.getElementById('login-btn');
    const btnText = document.getElementById('login-btn-text');
    const spinner = document.getElementById('login-spinner');

    // Mostra loading
    btn.disabled = true;
    spinner.classList.remove('hidden');
    btnText.innerText = 'Accesso in corso...';
    errorDiv.classList.add('hidden');

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) throw error;

        const ok = await bootstrapApp(data.user);
        if (!ok) return;
    } catch (err) {
        let msg = 'Credenziali non valide. Riprova.';
        if (err.message && err.message.toLowerCase().includes('email not confirmed')) {
            msg = 'Email non confermata. Controlla la tua casella di posta.';
        } else if (err.message) {
            msg = err.message;
        }
        errorText.innerText = msg;
        errorDiv.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        spinner.classList.add('hidden');
        btnText.innerText = 'Accedi';
    }
}

async function handleLogout() {
    await supabase.auth.signOut();
    currentUserProfile = null;
    volontari = [];
    mezzi = [];
    servizi = [];
    showLogin();
}

// --- MEMORIA DATI INITIALI (MOCK DATABASE) ---
const DEFAULT_VOLONTARI = [
    { id: "v1", nome: "Mario", cognome: "Rossi", cf: "RSSMRA80A01H501U", ruolo: "Coordinatore", telefono: "3331234567", stato: "Operativo", associazione_appartenenza: "G.C. Massa di Somma" },
    { id: "v2", nome: "Laura", cognome: "Bianchi", cf: "BNCLRA85B41H501X", ruolo: "Soccorritore", telefono: "3459876543", stato: "Operativo", associazione_appartenenza: "G.C. Cercola" },
    { id: "v3", nome: "Giuseppe", cognome: "Verdi", cf: "VRDGPP78C12H501Z", ruolo: "Logista", telefono: "3287654321", stato: "In riposo", associazione_appartenenza: "G.C. Massa di Somma" },
    { id: "v4", nome: "Anna", cognome: "Neri", cf: "NRANNA90D50H501W", ruolo: "Autista", telefono: "3394567890", stato: "Operativo", associazione_appartenenza: "Save Me" }
];

const DEFAULT_MEZZI = [
    { id: "m1", modello: "Land Rover Defender 110", targa: "PC 001 AA", tipo: "Fuoristrada", stato: "Disponibile" },
    { id: "m2", modello: "Fiat Ducato Ambulanza", targa: "PC 002 AB", tipo: "Ambulanza", stato: "In servizio" },
    { id: "m3", modello: "Iveco Magirus 4x4", targa: "PC 003 AC", tipo: "Autobotte", stato: "Disponibile" },
    { id: "m4", modello: "Fiat Panda 4x4", targa: "PC 004 AD", tipo: "Unità Mobile", stato: "In manutenzione" }
];

const DEFAULT_SERVIZI = [
    { id: "s1", tipo: "Pattugliamento Territorio", data: "2026-05-29T09:00", mezziIds: ["m1"], volontariIds: ["v1", "v4"], note: "Monitoraggio idrogeologico fiumi post allerta meteo gialla.", stato: "Programmato" },
    { id: "s2", tipo: "Supporto Sanitario", data: "2026-05-28T14:30", mezziIds: ["m2"], volontariIds: ["v2"], note: "Assistenza sanitaria per la gara podistica cittadina.", stato: "In corso" },
    { id: "s3", tipo: "Antincendio Boschivo", data: "2026-05-27T08:00", mezziIds: ["m3"], volontariIds: ["v1", "v3"], note: "Pronto intervento e bonifica area boschiva collinare.", stato: "Completato" }
];

// --- STATO IN-MEMORY DELL'APPLICAZIONE ---
let volontari = [];
let mezzi = [];
let servizi = [];

let editingVolontarioId = null;
let editingMezzoId = null;
let editingServizioId = null;
let editingProfileId = null;

// Mappa servizi — default: comune di Massa di Somma (NA)
const MASSA_DI_SOMMA_CENTER = [40.850, 14.342];
const MASSA_DI_SOMMA_ZOOM = 11;
let serviziMap = null;
let serviziMapMarkersLayer = null;
const geocodeCache = new Map();
let serviziMapUpdateToken = 0;
let pdfExportProgressTimer = null;
let pendingPdfServizioId = null;

const ICON_EDIT = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>`;

function toDatetimeLocalValue(isoString) {
    const d = new Date(isoString);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}

function resetEditState() {
    editingVolontarioId = null;
    editingMezzoId = null;
    editingServizioId = null;
}

function setModalFormMode(modalId, { title, submitText }) {
    const titleEl = document.getElementById(`${modalId}-title`);
    const submitEl = document.getElementById(`${modalId}-submit`);
    if (titleEl) titleEl.innerText = title;
    if (submitEl) submitEl.innerText = submitText;
}

// Funzione helper per caricare dati sincronicamente dallo stato in-memory
function getDB(table) {
    if (table === "pc_volontari") return volontari;
    if (table === "pc_mezzi") return mezzi;
    if (table === "pc_servizi") return servizi;
    return [];
}

// Funzione helper per caricare dati da Supabase in modo asincrono
const AIB_TIPO_SERVIZIO = 'Antincendio Boschivo';

const AIB_SUPERFICIE_FIELDS = {
    ceduo: [
        { key: 'matricianato', id: 's-aib-ceduo-matricianato' },
        { key: 'compostato', id: 's-aib-ceduo-compostato' },
        { key: 'degradato', id: 's-aib-ceduo-degradato' },
        { key: 'macchia', id: 's-aib-ceduo-macchia' },
    ],
    altoFusto: [
        { key: 'resinoso', id: 's-aib-alto-resinoso' },
        { key: 'latifoglie', id: 's-aib-alto-latifoglie' },
        { key: 'misto', id: 's-aib-alto-misto' },
        { key: 'rimboschimento', id: 's-aib-alto-rimboschimento' },
    ],
    nonBoscato: [
        { key: 'cespugliato', id: 's-aib-non-cespugliato' },
        { key: 'pascolo', id: 's-aib-non-pascolo' },
        { key: 'seminativo', id: 's-aib-non-seminativo' },
        { key: 'incolto', id: 's-aib-non-incolto' },
    ],
};

function isAntincendioBoschivo(tipo) {
    return tipo === AIB_TIPO_SERVIZIO;
}

function collectSuperficieGroup(fieldDefs) {
    const out = {};
    let hasValue = false;
    for (const { key, id } of fieldDefs) {
        const el = document.getElementById(id);
        const value = el ? el.value.trim() : '';
        if (value) {
            out[key] = value;
            hasValue = true;
        }
    }
    return hasValue ? out : null;
}

function setSuperficieGroup(fieldDefs, data) {
    const source = data && typeof data === 'object' ? data : {};
    for (const { key, id } of fieldDefs) {
        const el = document.getElementById(id);
        if (el) el.value = source[key] ?? '';
    }
}

function resetServizioAibFields() {
    const ids = [
        's-aib-ora-arrivo',
        's-aib-ora-fine',
        's-aib-ora-rientro',
        ...AIB_SUPERFICIE_FIELDS.ceduo.map(f => f.id),
        ...AIB_SUPERFICIE_FIELDS.altoFusto.map(f => f.id),
        ...AIB_SUPERFICIE_FIELDS.nonBoscato.map(f => f.id),
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

function toggleServizioAibFields() {
    const tipo = document.getElementById('s-tipo')?.value ?? '';
    const show = isAntincendioBoschivo(tipo);
    const section = document.getElementById('s-aib-section');
    const orariFine = document.getElementById('s-aib-orari-fine');
    if (section) section.classList.toggle('hidden', !show);
    if (orariFine) orariFine.classList.toggle('hidden', !show);
}

function setServizioAibFormData(serv) {
    resetServizioAibFields();
    if (!serv || !isAntincendioBoschivo(serv.tipo)) return;

    const oraArrivo = document.getElementById('s-aib-ora-arrivo');
    const oraFine = document.getElementById('s-aib-ora-fine');
    const oraRientro = document.getElementById('s-aib-ora-rientro');
    if (oraArrivo) oraArrivo.value = serv.oraArrivoIncendio || '';
    if (oraFine) oraFine.value = serv.oraFineIntervento || '';
    if (oraRientro) oraRientro.value = serv.oraRientroSede || '';

    setSuperficieGroup(AIB_SUPERFICIE_FIELDS.ceduo, serv.superficieCeduo);
    setSuperficieGroup(AIB_SUPERFICIE_FIELDS.altoFusto, serv.superficieAltoFusto);
    setSuperficieGroup(AIB_SUPERFICIE_FIELDS.nonBoscato, serv.superficieNonBoscato);
}

function buildServizioAibPayload(tipo) {
    if (!isAntincendioBoschivo(tipo)) {
        return {
            ora_arrivo_incendio: null,
            ora_fine_intervento: null,
            ora_rientro_sede: null,
            superficie_ceduo: null,
            superficie_alto_fusto: null,
            superficie_non_boscato: null,
        };
    }

    const oraArrivo = document.getElementById('s-aib-ora-arrivo')?.value.trim() || null;
    const oraFine = document.getElementById('s-aib-ora-fine')?.value.trim() || null;
    const oraRientro = document.getElementById('s-aib-ora-rientro')?.value.trim() || null;

    return {
        ora_arrivo_incendio: oraArrivo,
        ora_fine_intervento: oraFine,
        ora_rientro_sede: oraRientro,
        superficie_ceduo: collectSuperficieGroup(AIB_SUPERFICIE_FIELDS.ceduo),
        superficie_alto_fusto: collectSuperficieGroup(AIB_SUPERFICIE_FIELDS.altoFusto),
        superficie_non_boscato: collectSuperficieGroup(AIB_SUPERFICIE_FIELDS.nonBoscato),
    };
}

function mapServizioRow(s) {
    return {
        id: s.id,
        richiedente: s.richiedente,
        tipo: s.tipo,
        data: s.data,
        latitudine: s.latitudine,
        longitudine: s.longitudine,
        indirizzo: s.indirizzo_intervento,
        mezziIds: Array.isArray(s.mezzi_ids) && s.mezzi_ids.length > 0
            ? s.mezzi_ids
            : (s.mezzo_id ? [s.mezzo_id] : []),
        volontariIds: s.volontari_ids || [],
        note: s.note,
        altriEnti: s.altri_enti_coinvolti,
        stato: s.stato,
        oraArrivoIncendio: s.ora_arrivo_incendio || '',
        oraFineIntervento: s.ora_fine_intervento || '',
        oraRientroSede: s.ora_rientro_sede || '',
        superficieCeduo: s.superficie_ceduo || {},
        superficieAltoFusto: s.superficie_alto_fusto || {},
        superficieNonBoscato: s.superficie_non_boscato || {},
    };
}

async function fetchDataFromSupabase() {
    try {
        let volQuery = supabase
            .from('volontari')
            .select('*')
            .order('created_at', { ascending: true });

        if (!canSeeAllVolontari()) {
            const assoc = getUserAssociazione();
            if (!assoc) {
                volontari = [];
            } else {
                volQuery = volQuery.eq('associazione_appartenenza', assoc);
            }
        }

        if (canSeeAllVolontari() || getUserAssociazione()) {
            const volResponse = await volQuery;

            if (volResponse.error) throw volResponse.error;
            volontari = applyVolontariScope(volResponse.data || []);
        }

        if (canAccessMezzi() || canAccessServizi()) {
            let mezQuery = supabase.from('mezzi').select('*').order('created_at', { ascending: true });

            if (shouldFilterMezziQueryByAssociazione()) {
                const assoc = getUserAssociazione();
                if (!assoc) {
                    mezzi = [];
                } else {
                    mezQuery = mezQuery.eq('associazione_appartenenza', assoc);
                }
            }

            const loadMezzi = canSeeAllMezzi() || getUserAssociazione() || isCapoSquadra()
                ? mezQuery
                : Promise.resolve({ data: [], error: null });

            if (canAccessServizi()) {
                const [mezResponse, serResponse] = await Promise.all([
                    loadMezzi,
                    supabase.from('servizi').select('*').order('created_at', { ascending: true })
                ]);

                if (mezResponse.error) throw mezResponse.error;
                if (serResponse.error) throw serResponse.error;

                mezzi = applyMezziScope(mezResponse.data || []);
                servizi = (serResponse.data || []).map(mapServizioRow);
                await enrichMezziFromServizi(servizi);
            } else if (canAccessMezzi()) {
                const mezResponse = await loadMezzi;

                if (mezResponse.error) throw mezResponse.error;

                mezzi = applyMezziScope(mezResponse.data || []);
                servizi = [];
            } else {
                mezzi = [];
                servizi = [];
            }
        } else {
            mezzi = [];
            servizi = [];
        }

        if (isMaster() && volontari.length === 0 && mezzi.length === 0 && servizi.length === 0) {
            await initializeDefaultData();
            return;
        }

        updateUI();
    } catch (err) {
        console.error("Errore durante il caricamento da Supabase:", err);
        showToast("Errore di caricamento", "Impossibile caricare i dati da Supabase.");
    }
}

// Funzione helper per inserire i dati di mock su Supabase se vuoto
async function initializeDefaultData() {
    if (!isMaster()) return;

    try {
        const { error: volErr } = await supabase.from('volontari').insert(DEFAULT_VOLONTARI);
        if (volErr) throw volErr;

        const { error: mezErr } = await supabase.from('mezzi').insert(DEFAULT_MEZZI);
        if (mezErr) throw mezErr;

        const supabaseServizi = DEFAULT_SERVIZI.map(s => ({
            id: s.id,
            richiedente: s.richiedente,
            tipo: s.tipo,
            data: s.data,
            latitudine: s.latitudine,
            longitudine: s.longitudine,
            indirizzo_intervento: s.indirizzo,
            mezzi_ids: s.mezziIds,
            volontari_ids: s.volontariIds,
            note: s.note,
            altri_enti_coinvolti: s.altriEnti,
            stato: s.stato
        }));
        const { error: serErr } = await supabase.from('servizi').insert(supabaseServizi);
        if (serErr) throw serErr;

        console.log("Dati di default inseriti correttamente su Supabase.");
        await fetchDataFromSupabase();
    } catch (err) {
        console.error("Errore durante il popolamento iniziale su Supabase:", err);
        showToast("Errore inizializzazione", "Impossibile caricare i dati iniziali su Supabase.");
    }
}

// --- SISTEMA DI TOAST (NOTIFICHE) ---
function showToast(title, message) {
    const toast = document.getElementById("toast");
    document.getElementById("toast-title").innerText = title;
    document.getElementById("toast-message").innerText = message;

    // Slide down ed entra con opacità
    toast.style.transform = "translateY(0)";
    toast.style.opacity = "1";

    setTimeout(() => {
        toast.style.transform = "translateY(-100px)";
        toast.style.opacity = "0";
    }, 3000);
}

// --- GESTIONE DEI MODAL ---
function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (show) {
        modal.classList.remove("hidden");
        // Focus automatico sul primo input del form rispettivo
        const form = modal.querySelector("form");
        if (form) {
            const firstInput = form.querySelector("input, select");
            if (firstInput) setTimeout(() => firstInput.focus(), 100);
        }
    } else {
        modal.classList.add("hidden");
        const form = modal.querySelector("form");
        if (form) form.reset();
        resetEditState();
        setModalFormMode('modal-volontario', { title: 'Aggiungi Nuovo Volontario', submitText: 'Registra' });
        setModalFormMode('modal-mezzo', { title: 'Aggiungi Nuovo Mezzo di Soccorso', submitText: 'Registra' });
        setModalFormMode('modal-servizio', { title: 'Pianifica Servizio / Missione', submitText: 'Pianifica' });
    }
}

// --- CAMBIO TAB (NAVIGAZIONE) ---
function switchTab(tabId) {
    if (!canAccessVolontari() && tabId === 'volontari') {
        tabId = canAccessServizi() ? 'servizi' : 'dashboard';
    }
    if (!canAccessServizi() && tabId === 'servizi') {
        tabId = canAccessVolontari() ? 'volontari' : 'dashboard';
    }
    if (!canAccessMezzi() && tabId === 'mezzi') {
        tabId = canAccessVolontari() ? 'volontari' : 'dashboard';
    }
    if (!isMaster() && (tabId === 'admin' || tabId === 'dashboard')) {
        tabId = canAccessServizi() ? 'servizi' : (canAccessVolontari() ? 'volontari' : 'mezzi');
    }

    // Nascondi tutti i contenuti delle tab
    document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
    // Rimuovi classe attiva da tutti i bottoni nav (sidebar)
    document.querySelectorAll(".nav-btn").forEach(el => {
        el.classList.remove("bg-slate-800", "text-amber-500", "shadow-md");
        el.classList.add("text-slate-400", "hover:text-white", "hover:bg-slate-800/50");
    });

    // Mostra tab selezionata
    document.getElementById(`tab-${tabId}`).classList.remove("hidden");

    // Attiva bottone nav selezionato (sidebar)
    const activeBtn = document.getElementById(`nav-${tabId}`);
    if (activeBtn) {
        activeBtn.classList.remove("text-slate-400", "hover:text-white", "hover:bg-slate-800/50");
        activeBtn.classList.add("bg-slate-800", "text-amber-500", "shadow-md");
    }

    // Sincronizza bottom navigation (mobile)
    document.querySelectorAll(".bottom-nav-btn").forEach(el => {
        el.classList.remove("text-amber-500");
        el.classList.add("text-slate-400");
    });
    const activeBottomBtn = document.getElementById(`bottom-nav-${tabId}`);
    if (activeBottomBtn) {
        activeBottomBtn.classList.remove("text-slate-400");
        activeBottomBtn.classList.add("text-amber-500");
    }

    // Aggiorna titolo top bar
    const titleMap = {
        dashboard: "Dashboard",
        volontari: "Gestione Volontari",
        mezzi: "Gestione Flotta Mezzi",
        servizi: "Sala Opeerativa",
        admin: "Gestione Utenti"
    };
    document.getElementById("page-title").innerText = titleMap[tabId] || tabId;

    if (tabId === "admin") {
        renderAdminProfiles();
    }

    if (tabId === "servizi") {
        setTimeout(() => {
            ensureServiziMap();
            renderServizi();
        }, 100);
    }
}

// --- FUNZIONI SIDEBAR MOBILE ---
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const isOpen = !sidebar.classList.contains('-translate-x-full');
    if (isOpen) {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    } else {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.add('-translate-x-full');
    if (overlay) overlay.classList.add('hidden');
}

// --- CALCOLO STATISTICHE E RENDER DASHBOARD ---
function updateDashboardStats() {
    const volontari = getDB("pc_volontari");
    const mezzi = getDB("pc_mezzi");
    const servizi = getDB("pc_servizi");

    // Contatori principali
    document.getElementById("stat-volontari-totali").innerText = volontari.length;
    const volontariOperativi = volontari.filter(v => v.stato === "Operativo").length;
    document.getElementById("stat-volontari-attivi").innerText = volontariOperativi;

    if (!isMaster()) {
        const totalVolontari = volontari.length || 1;
        const percentOperativi = Math.round((volontariOperativi / totalVolontari) * 100);
        document.getElementById("widget-volontari-percent").innerText = `${percentOperativi}%`;
        document.getElementById("widget-volontari-operativi-label").innerText = `${volontariOperativi} Operativi`;
        document.getElementById("svg-circle-progress").setAttribute("stroke-dasharray", `${percentOperativi}, 100`);
        return;
    }

    document.getElementById("stat-mezzi-totali").innerText = mezzi.length;
    const mezziDisponibili = mezzi.filter(m => m.stato === "Disponibile").length;
    document.getElementById("stat-mezzi-disponibili").innerText = mezziDisponibili;

    const serviziInCorso = servizi.filter(s => s.stato === "In corso").length;
    document.getElementById("stat-servizi-in-corso").innerText = serviziInCorso;

    const serviziCompletati = servizi.filter(s => s.stato === "Completato").length;
    document.getElementById("stat-servizi-completati").innerText = serviziCompletati;

    // Widget Stato Mezzi (Barre di progresso)
    const totalMezzi = mezzi.length || 1;
    const mezziInServizio = mezzi.filter(m => m.stato === "In servizio").length;
    const mezziManutenzione = mezzi.filter(m => m.stato === "In manutenzione").length;

    document.getElementById("widget-mezzi-disp-val").innerText = `${mezziDisponibili} / ${mezzi.length}`;
    document.getElementById("widget-mezzi-disp-bar").style.width = `${(mezziDisponibili / totalMezzi) * 100}%`;

    document.getElementById("widget-mezzi-serv-val").innerText = `${mezziInServizio} / ${mezzi.length}`;
    document.getElementById("widget-mezzi-serv-bar").style.width = `${(mezziInServizio / totalMezzi) * 100}%`;

    document.getElementById("widget-mezzi-manut-val").innerText = `${mezziManutenzione} / ${mezzi.length}`;
    document.getElementById("widget-mezzi-manut-bar").style.width = `${(mezziManutenzione / totalMezzi) * 100}%`;

    // Widget Stato Personale (Grafico circolare)
    const totalVolontari = volontari.length || 1;
    const percentOperativi = Math.round((volontariOperativi / totalVolontari) * 100);
    document.getElementById("widget-volontari-percent").innerText = `${percentOperativi}%`;
    document.getElementById("widget-volontari-operativi-label").innerText = `${volontariOperativi} Operativi`;

    // Aggiorna l'anello progressivo SVG (dasharray massimo 100)
    document.getElementById("svg-circle-progress").setAttribute("stroke-dasharray", `${percentOperativi}, 100`);

    renderDashboardVolontari(volontari);

    // Rendering della Tabella Servizi Recenti (Max 5 ultimi servizi)
    const recentServicesBody = document.getElementById("dashboard-recent-services");
    recentServicesBody.innerHTML = "";

    // Copia i servizi ordinati a ritroso per mostrare gli ultimi inseriti o pianificati
    const recentServizi = [...servizi].reverse().slice(0, 5);

    if (recentServizi.length === 0) {
        recentServicesBody.innerHTML = `
            <tr>
                <td colspan="4" class="py-6 text-center text-slate-500 font-medium">Nessun servizio registrato.</td>
            </tr>
        `;
        return;
    }

    recentServizi.forEach(serv => {
        const mezziAssegnati = (serv.mezziIds || [])
            .map(mId => mezzi.find(m => m.id === mId))
            .filter(Boolean);
        let badgeClass = "";
        if (serv.stato === "Programmato") badgeClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
        else if (serv.stato === "In corso") badgeClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
        else badgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

        const formattedDate = new Date(serv.data).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        recentServicesBody.innerHTML += `
            <tr class="hover:bg-slate-800/20 transition-all">
                <td class="py-4 px-4">
                    <p class="font-semibold text-slate-200">${serv.tipo}</p>
                    <p class="text-xs text-slate-500 truncate max-w-[240px]">${serv.note || "Nessun dettaglio aggiuntivo"}</p>
                </td>
                <td class="py-4 px-4 text-slate-300 font-medium">${formattedDate}</td>
                <td class="py-4 px-4">
                    ${mezziAssegnati.length > 0
                        ? mezziAssegnati.map(m => `<span class="text-xs font-semibold text-slate-300 block">${m.modello}</span><span class="text-[10px] text-slate-500 block font-mono mb-1">${m.targa}</span>`).join('')
                        : `<span class="text-xs text-slate-500">Nessun mezzo</span>`}
                </td>
                <td class="py-4 px-0">
                    <span class="px-2.5 py-1 text-[10px] font-bold border rounded-full ${badgeClass}">${serv.stato}</span>
                </td>
            </tr>
        `;
    });
}

function renderDashboardVolontari(volontariList) {
    const tbody = document.getElementById("dashboard-volontari-body");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (volontariList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="py-6 text-center text-slate-500 font-medium">Nessun volontario registrato.</td>
            </tr>
        `;
        return;
    }

    volontariList.forEach(v => {
        let badgeClass = "";
        if (v.stato === "Operativo") badgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
        else if (v.stato === "In riposo") badgeClass = "bg-slate-800 text-slate-400 border-slate-700";
        else badgeClass = "bg-rose-500/10 text-rose-400 border-rose-500/20";

        tbody.innerHTML += `
            <tr class="hover:bg-slate-800/20 transition-all">
                <td class="py-4 px-4">
                    <p class="font-semibold text-slate-200">${v.nome} ${v.cognome}</p>
                </td>
                <td class="py-4 px-4 text-slate-300 font-medium">${v.associazione_appartenenza || "—"}</td>
                <td class="py-4 px-4">
                    <span class="px-2.5 py-1 bg-slate-800 border border-slate-700/50 rounded-lg text-slate-300 text-xs font-medium">${v.ruolo}</span>
                </td>
                <td class="py-4 px-4">
                    <span class="px-2.5 py-1 text-[10px] font-bold border rounded-full ${badgeClass}">${v.stato}</span>
                </td>
            </tr>
        `;
    });
}

// --- SEZIONE 2: VOLONTARI (CRUD & VIEW) ---
function renderVolontari() {
    const volontari = getDB("pc_volontari");
    const tbody = document.getElementById("volontari-table-body");
    const search = document.getElementById("search-volontari").value.toLowerCase();
    const filterRuolo = document.getElementById("filter-ruolo").value;
    const filterStato = document.getElementById("filter-stato-volontario").value;

    tbody.innerHTML = "";

    const filtered = volontari.filter(v => {
        const matchSearch = `${v.nome} ${v.cognome} ${v.cf} ${v.telefono} ${v.associazione_appartenenza || ""}`.toLowerCase().includes(search);
        const matchRuolo = filterRuolo === "" || v.ruolo === filterRuolo;
        const matchStato = filterStato === "" || v.stato === filterStato;
        return matchSearch && matchRuolo && matchStato;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="py-8 text-center text-slate-500 font-medium">Nessun volontario trovato con i filtri inseriti.</td>
            </tr>
        `;
        return;
    }

    filtered.forEach(v => {
        let badgeClass = "";
        if (v.stato === "Operativo") badgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
        else if (v.stato === "In riposo") badgeClass = "bg-slate-800 text-slate-400 border-slate-700";
        else badgeClass = "bg-rose-500/10 text-rose-400 border-rose-500/20";

        const initials = `${v.nome.charAt(0)}${v.cognome.charAt(0)}`.toUpperCase();

        tbody.innerHTML += `
            <tr class="hover:bg-slate-800/10 transition-colors">
                <td class="py-4 px-6 flex items-center gap-3">
                    <div class="h-10 w-10 rounded-full bg-slate-800 border border-slate-700/60 flex items-center justify-center font-bold text-amber-500 text-sm shrink-0">
                        ${initials}
                    </div>
                    <div>
                        <p class="font-bold text-white text-base">${v.nome} ${v.cognome}</p>
                    </div>
                </td>
                <td class="py-4 px-6 text-slate-300 font-mono text-xs uppercase">${v.cf}</td>
                <td class="py-4 px-6">
                    <span class="px-3 py-1 bg-slate-800 border border-slate-700/50 rounded-xl text-slate-300 font-medium text-xs">${v.ruolo}</span>
                </td>
                <td class="py-4 px-6 text-slate-300 font-medium">${v.associazione_appartenenza || "—"}</td>
                <td class="py-4 px-6 text-slate-300 font-medium">
                    <a href="tel:${v.telefono}" class="flex items-center gap-1.5 hover:text-amber-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.3 11.3 0 005.455 5.456l.773-1.548a1 1 0 011.06-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                        </svg>
                        ${v.telefono}
                    </a>
                </td>
                <td class="py-4 px-6">
                    <span class="px-2.5 py-1 text-xs font-bold border rounded-full ${badgeClass}">${v.stato}</span>
                </td>
                <td class="py-4 px-6 text-right">
                    <div class="inline-flex gap-2">
                        <button onclick="openEditVolontarioModal('${v.id}')" title="Modifica dati" class="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-500 transition-all">
                            ${ICON_EDIT}
                        </button>
                        <button onclick="toggleVolontarioStato('${v.id}')" title="Modifica Stato" class="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-500 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                        </button>
                        <button onclick="deleteVolontario('${v.id}')" title="Elimina" class="p-2 hover:bg-rose-950/30 rounded-lg text-slate-400 hover:text-rose-500 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
}

function openNuovoVolontarioModal() {
    resetEditState();
    setModalFormMode('modal-volontario', { title: 'Aggiungi Nuovo Volontario', submitText: 'Registra' });
    setupVolontarioAssociazioneField();
    toggleModal('modal-volontario', true);
}

function openEditVolontarioModal(id) {
    const vol = volontari.find(v => v.id === id);
    if (!vol) return;

    editingVolontarioId = id;
    setModalFormMode('modal-volontario', { title: 'Modifica Volontario', submitText: 'Salva modifiche' });

    document.getElementById("v-nome").value = vol.nome;
    document.getElementById("v-cognome").value = vol.cognome;
    document.getElementById("v-cf").value = vol.cf;
    document.getElementById("v-ruolo").value = vol.ruolo;
    document.getElementById("v-stato").value = vol.stato;
    document.getElementById("v-telefono").value = vol.telefono;
    setupVolontarioAssociazioneField();
    if (isMaster()) {
        document.getElementById("v-associazione").value = vol.associazione_appartenenza || "G.C. Massa di Somma";
    }

    toggleModal('modal-volontario', true);
}

async function saveVolontario(event) {
    event.preventDefault();
    const nome = document.getElementById("v-nome").value;
    const cognome = document.getElementById("v-cognome").value;
    const cf = document.getElementById("v-cf").value.toUpperCase();
    const ruolo = document.getElementById("v-ruolo").value;
    const stato = document.getElementById("v-stato").value;
    const telefono = document.getElementById("v-telefono").value;
    const associazione_appartenenza = getVolontarioAssociazioneValue();
    if (!associazione_appartenenza) {
        showToast("Errore", "Associazione non configurata per questo account.");
        return;
    }

    const payload = { nome, cognome, cf, ruolo, stato, telefono, associazione_appartenenza };

    try {
        if (editingVolontarioId) {
            const { error } = await supabase.from('volontari').update(payload).eq('id', editingVolontarioId);
            if (error) throw error;
            toggleModal('modal-volontario', false);
            showToast("Volontario Aggiornato", `${nome} ${cognome} è stato modificato con successo.`);
        } else {
            const newVolontario = { id: "v_" + Date.now(), ...payload };
            const { error } = await supabase.from('volontari').insert([newVolontario]);
            if (error) throw error;
            toggleModal('modal-volontario', false);
            showToast("Volontario Registrato", `${nome} ${cognome} è stato inserito con successo.`);
        }
        await fetchDataFromSupabase();
    } catch (err) {
        console.error("Errore durante il salvataggio del volontario:", err);
        showToast("Errore di Salvataggio", "Impossibile salvare il volontario su Supabase.");
    }
}

async function toggleVolontarioStato(id) {
    const vol = volontari.find(v => v.id === id);
    if (vol) {
        const stati = ["Operativo", "In riposo", "Sospeso"];
        const currentIdx = stati.indexOf(vol.stato);
        const nextIdx = (currentIdx + 1) % stati.length;
        const nuovoStato = stati[nextIdx];

        try {
            const { error } = await supabase
                .from('volontari')
                .update({ stato: nuovoStato })
                .eq('id', id);
            if (error) throw error;

            showToast("Stato Volontario", `Lo stato di ${vol.nome} è ora: ${nuovoStato}`);
            await fetchDataFromSupabase();
        } catch (err) {
            console.error("Errore durante la modifica dello stato:", err);
            showToast("Errore", "Impossibile aggiornare lo stato del volontario.");
        }
    }
}

async function deleteVolontario(id) {
    if (confirm("Sei sicuro di voler eliminare questo volontario? Questa azione è irreversibile.")) {
        try {
            const { error } = await supabase
                .from('volontari')
                .delete()
                .eq('id', id);
            if (error) throw error;

            showToast("Volontario Rimosso", "Il volontario è stato eliminato dal sistema.");
            await fetchDataFromSupabase();
        } catch (err) {
            console.error("Errore durante l'eliminazione del volontario:", err);
            showToast("Errore", "Impossibile eliminare il volontario da Supabase.");
        }
    }
}

// --- SEZIONE 3: MEZZI (CRUD & VIEW) ---
function renderMezzi() {
    const mezzi = getDB("pc_mezzi");
    const grid = document.getElementById("mezzi-grid");
    const search = document.getElementById("search-mezzi").value.toLowerCase();
    const filterTipo = document.getElementById("filter-tipo-mezzo").value;
    const filterStato = document.getElementById("filter-stato-mezzo").value;

    grid.innerHTML = "";

    const filtered = mezzi.filter(m => {
        const matchSearch = `${m.modello} ${m.targa} ${m.tipo}`.toLowerCase().includes(search);
        const matchTipo = filterTipo === "" || m.tipo === filterTipo;
        const matchStato = filterStato === "" || m.stato === filterStato;
        return matchSearch && matchTipo && matchStato;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-12 text-center text-slate-500 font-medium">Nessun mezzo trovato con i parametri selezionati.</div>
        `;
        return;
    }

    filtered.forEach(m => {
        let badgeClass = "";
        let indicatorColor = "";
        if (m.stato === "Disponibile") {
            badgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
            indicatorColor = "bg-emerald-500";
        } else if (m.stato === "In servizio") {
            badgeClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
            indicatorColor = "bg-blue-500";
        } else {
            badgeClass = "bg-rose-500/10 text-rose-400 border-rose-500/20";
            indicatorColor = "bg-rose-500";
        }

        let iconSvg = "";
        if (m.tipo === "Fuoristrada") {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-amber-500"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177V3.75A1.125 1.125 0 0013.125 2.625h-2.25a1.125 1.125 0 00-1.125 1.125v11.177M14.25 7.5H9.75M16.5 18.75a1.875 1.875 0 11-3.75 0m3.75 0a1.875 1.875 0 00-3.75 0m-9.75 0h9.75" /></svg>`;
        } else if (m.tipo === "Ambulanza") {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-amber-500"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
        } else if (m.tipo === "Autobotte") {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-amber-500"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15a3 3 0 116 0 3 3 0 01-6 0zm13.5 0a3 3 0 116 0 3 3 0 01-6 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M6 7.5h12m-9-3h6m-12 12V6a1 1 0 011-1h11a1 1 0 011 1v10.5m-15 0H21" /></svg>`;
        } else {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-amber-500"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M21 16V10a2 2 0 00-2-2h-4.25m-.75 0H14M16.5 13H21" /></svg>`;
        }

        grid.innerHTML += `
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-amber-500/20 hover:shadow-xl transition-all duration-300 group">
                <div>
                    <div class="flex justify-between items-start mb-4">
                        <div class="p-3 bg-slate-800 rounded-xl group-hover:bg-slate-850 transition-colors">
                            ${iconSvg}
                        </div>
                        <span class="px-2.5 py-1 text-xs font-bold border rounded-full ${badgeClass}">${m.stato}</span>
                    </div>
                    
                    <h4 class="font-extrabold text-white text-lg tracking-tight mb-1">${m.modello}</h4>
                    <p class="text-xs text-slate-500 font-bold uppercase tracking-wider mb-4">${m.tipo}</p>
                    
                    <div class="mb-4">
                        <div class="targa-italiana text-sm py-1 font-mono">${m.targa}</div>
                    </div>
                </div>

                <div class="border-t border-slate-800/80 pt-4 mt-2 flex items-center justify-between">
                    <span class="flex items-center gap-1.5">
                        <span class="w-2.5 h-2.5 rounded-full ${indicatorColor}"></span>
                        <span class="text-xs font-bold text-slate-400">Stato</span>
                    </span>
                    <div class="flex gap-1">
                        <button onclick="openEditMezzoModal('${m.id}')" title="Modifica dati" class="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-500 transition-colors">
                            ${ICON_EDIT}
                        </button>
                        <button onclick="toggleMezzoStato('${m.id}')" title="Cambia Stato" class="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-500 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                        </button>
                        <button onclick="deleteMezzo('${m.id}')" title="Elimina Mezzo" class="p-2 hover:bg-rose-950/30 rounded-lg text-slate-400 hover:text-rose-500 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
}

function openNuovoMezzoModal() {
    resetEditState();
    setModalFormMode('modal-mezzo', { title: 'Aggiungi Nuovo Mezzo di Soccorso', submitText: 'Registra' });
    setupMezzoAssociazioneField();
    toggleModal('modal-mezzo', true);
}

function openEditMezzoModal(id) {
    const mezzo = mezzi.find(m => m.id === id);
    if (!mezzo) return;

    editingMezzoId = id;
    setModalFormMode('modal-mezzo', { title: 'Modifica Mezzo di Soccorso', submitText: 'Salva modifiche' });

    document.getElementById("m-modello").value = mezzo.modello;
    document.getElementById("m-targa").value = mezzo.targa;
    document.getElementById("m-tipo").value = mezzo.tipo;
    document.getElementById("m-stato").value = mezzo.stato;
    setupMezzoAssociazioneField();
    const mAssocSelect = document.getElementById("m-associazione");
    if (mAssocSelect) {
        mAssocSelect.value = mezzo.associazione_appartenenza || "G.C. Massa di Somma";
    }

    toggleModal('modal-mezzo', true);
}

async function saveMezzo(event) {
    event.preventDefault();
    const modello = document.getElementById("m-modello").value;
    const targa = document.getElementById("m-targa").value.toUpperCase();
    const tipo = document.getElementById("m-tipo").value;
    const stato = document.getElementById("m-stato").value;
    const associazione_appartenenza = getMezzoAssociazioneValue();

    if (!associazione_appartenenza) {
        showToast("Associazione mancante", "Seleziona l'associazione di appartenenza del mezzo.");
        return;
    }

    const payload = { modello, targa, tipo, stato, associazione_appartenenza };

    try {
        if (editingMezzoId) {
            const { error } = await supabase.from('mezzi').update(payload).eq('id', editingMezzoId);
            if (error) throw error;
            toggleModal('modal-mezzo', false);
            showToast("Mezzo Aggiornato", `${modello} (${targa}) modificato correttamente.`);
        } else {
            const newMezzo = {
                id: "m_" + Date.now(),
                ...payload,
            };
            const { error } = await supabase.from('mezzi').insert([newMezzo]);
            if (error) throw error;
            toggleModal('modal-mezzo', false);
            showToast("Mezzo Registrato", `${modello} (${targa}) inserito correttamente.`);
        }
        await fetchDataFromSupabase();
    } catch (err) {
        console.error("Errore durante il salvataggio del mezzo:", err);
        showToast("Errore di Salvataggio", "Impossibile registrare il mezzo su Supabase.");
    }
}

async function toggleMezzoStato(id) {
    const mezzo = mezzi.find(m => m.id === id);
    if (mezzo) {
        const stati = ["Disponibile", "In servizio", "In manutenzione"];
        const currentIdx = stati.indexOf(mezzo.stato);
        const nextIdx = (currentIdx + 1) % stati.length;
        const nuovoStato = stati[nextIdx];

        try {
            const { error } = await supabase
                .from('mezzi')
                .update({ stato: nuovoStato })
                .eq('id', id);
            if (error) throw error;

            showToast("Stato Mezzo", `Stato del mezzo ${mezzo.modello} aggiornato a: ${nuovoStato}`);
            await fetchDataFromSupabase();
        } catch (err) {
            console.error("Errore durante la modifica dello stato del mezzo:", err);
            showToast("Errore", "Impossibile aggiornare lo stato del veicolo.");
        }
    }
}

async function deleteMezzo(id) {
    if (confirm("Sei sicuro di voler rimuovere questo mezzo? La rimozione potrebbe invalidare lo storico dei servizi assegnati.")) {
        try {
            const { error } = await supabase
                .from('mezzi')
                .delete()
                .eq('id', id);
            if (error) throw error;

            showToast("Mezzo Rimosso", "Il veicolo è stato disattivato dal registro.");
            await fetchDataFromSupabase();
        } catch (err) {
            console.error("Errore durante l'eliminazione del mezzo:", err);
            showToast("Errore", "Impossibile eliminare il mezzo da Supabase.");
        }
    }
}

// --- SEZIONE 4: SERVIZI (CRUD & VIEW) ---
function populateServizioModalOptions(selectedMezziIds = [], selectedVolontariIds = []) {
    const mezziList = getDB("pc_mezzi");
    const volontariList = getDB("pc_volontari");

    const mezziBox = document.getElementById("s-mezzi-list");
    mezziBox.innerHTML = "";

    const mezziDisponibili = mezziList.filter(m => m.stato === "Disponibile");
    const mezziNonDisponibili = mezziList.filter(m => m.stato !== "Disponibile");

    const renderMezzoCheckbox = (m, muted = false) => {
        const checked = selectedMezziIds.includes(m.id) ? 'checked' : '';
        const textClass = muted ? 'text-slate-400' : 'text-slate-200';
        const fontClass = muted ? 'font-medium' : 'font-semibold';
        const extra = muted ? ` - [${m.stato}]` : '';
        return `
            <label class="flex items-center gap-3 p-1.5 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors ${textClass}">
                <input type="checkbox" name="s-mezzi-check" value="${m.id}" ${checked} class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900 w-4 h-4">
                <span class="text-xs ${fontClass}">${m.modello} [${m.targa}] (${m.tipo})${m.associazione_appartenenza ? ` · ${m.associazione_appartenenza}` : ''}${extra}</span>
            </label>
        `;
    };

    if (mezziDisponibili.length > 0) {
        mezziBox.innerHTML += `<p class="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mb-2">Disponibili</p>`;
        mezziDisponibili.forEach(m => { mezziBox.innerHTML += renderMezzoCheckbox(m); });
    }

    if (mezziNonDisponibili.length > 0) {
        mezziBox.innerHTML += `<p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-3 mb-2">In servizio / Manutenzione</p>`;
        mezziNonDisponibili.forEach(m => { mezziBox.innerHTML += renderMezzoCheckbox(m, true); });
    }

    if (mezziList.length === 0) {
        mezziBox.innerHTML = `<p class="text-xs text-slate-500 p-2 text-center">Nessun mezzo registrato!</p>`;
    }

    const volontariBox = document.getElementById("s-volontari-list");
    volontariBox.innerHTML = "";

    const volontariOperativi = volontariList.filter(v => v.stato === "Operativo");
    const volontariNonOperativi = volontariList.filter(v => v.stato !== "Operativo");

    const renderVolontarioCheckbox = (v, muted = false) => {
        const checked = selectedVolontariIds.includes(v.id) ? 'checked' : '';
        const textClass = muted ? 'text-slate-400' : 'text-slate-200';
        const fontClass = muted ? 'font-medium' : 'font-semibold';
        const extra = muted ? ` - [${v.stato}]` : '';
        return `
            <label class="flex items-center gap-3 p-1.5 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors ${textClass}">
                <input type="checkbox" name="s-volontari-check" value="${v.id}" ${checked} class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900 w-4 h-4">
                <span class="text-xs ${fontClass}">${v.nome} ${v.cognome} (${v.ruolo})${v.associazione_appartenenza ? ` · ${v.associazione_appartenenza}` : ''}${extra}</span>
            </label>
        `;
    };

    if (volontariOperativi.length > 0) {
        volontariBox.innerHTML += `<p class="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mb-2">Disponibili / Operativi</p>`;
        volontariOperativi.forEach(v => { volontariBox.innerHTML += renderVolontarioCheckbox(v); });
    }

    if (volontariNonOperativi.length > 0) {
        volontariBox.innerHTML += `<p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-3 mb-2">In riposo / Sospesi</p>`;
        volontariNonOperativi.forEach(v => { volontariBox.innerHTML += renderVolontarioCheckbox(v, true); });
    }

    if (volontariList.length === 0) {
        volontariBox.innerHTML = `<p class="text-xs text-slate-500 p-2 text-center">Nessun volontario registrato!</p>`;
    }
}

function resetServizioLocationFields() {
    document.getElementById("s-richiedente").value = "SORU";
    document.getElementById("s-lat").value = "";
    document.getElementById("s-lng").value = "";
    document.getElementById("s-indirizzo").value = "";
    document.getElementById("s-altri-enti").value = "";
}

function fillCoordinateFromGps() {
    if (!navigator.geolocation) {
        alert("Geolocalizzazione non supportata da questo browser.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            document.getElementById("s-lat").value = position.coords.latitude.toFixed(6);
            document.getElementById("s-lng").value = position.coords.longitude.toFixed(6);
        },
        (error) => {
            alert("Impossibile ottenere la posizione GPS: " + error.message);
        },
        { enableHighAccuracy: true, timeout: 15000 }
    );
}

function openNuovoServizioModal() {
    resetEditState();
    setModalFormMode('modal-servizio', { title: 'Pianifica Servizio / Missione', submitText: 'Pianifica' });

    populateServizioModalOptions();

    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById("s-data").value = now.toISOString().slice(0, 16);
    document.getElementById("s-tipo").value = "Pattugliamento Territorio";
    document.getElementById("s-note").value = "";
    document.getElementById("s-stato").value = "Programmato";
    resetServizioLocationFields();
    resetServizioAibFields();
    toggleServizioAibFields();

    toggleModal('modal-servizio', true);
}

function openEditServizioModal(id) {
    const serv = servizi.find(s => s.id === id);
    if (!serv) return;

    editingServizioId = id;
    setModalFormMode('modal-servizio', { title: 'Modifica Servizio / Missione', submitText: 'Salva modifiche' });

    populateServizioModalOptions(serv.mezziIds || [], serv.volontariIds || []);

    document.getElementById("s-richiedente").value = serv.richiedente || "SORU";
    document.getElementById("s-tipo").value = serv.tipo;
    document.getElementById("s-data").value = toDatetimeLocalValue(serv.data);
    document.getElementById("s-lat").value = serv.latitudine ?? "";
    document.getElementById("s-lng").value = serv.longitudine ?? "";
    document.getElementById("s-indirizzo").value = serv.indirizzo || "";
    document.getElementById("s-note").value = serv.note || "";
    document.getElementById("s-altri-enti").value = serv.altriEnti || "";
    document.getElementById("s-stato").value = serv.stato;
    setServizioAibFormData(serv);
    toggleServizioAibFields();

    toggleModal('modal-servizio', true);
}

function getFilteredServizi() {
    const allServizi = getDB("pc_servizi");
    const searchEl = document.getElementById("search-servizi");
    const filterEl = document.getElementById("filter-stato-servizio");
    const search = searchEl ? searchEl.value.toLowerCase() : "";
    const filterStato = filterEl ? filterEl.value : "";

    return allServizi.filter(s => {
        const matchSearch = `${s.tipo} ${s.note || ""}`.toLowerCase().includes(search);
        const matchStato = filterStato === "" || s.stato === filterStato;
        return matchSearch && matchStato;
    });
}

function hasValidServizioCoordinates(servizio) {
    const lat = parseFloat(servizio.latitudine);
    const lng = parseFloat(servizio.longitudine);
    return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function hasServizioIndirizzo(servizio) {
    return !!(servizio.indirizzo && String(servizio.indirizzo).trim());
}

async function geocodeIndirizzo(indirizzo) {
    const query = String(indirizzo).trim();
    if (!query) return null;

    const cacheKey = query.toLowerCase();
    if (geocodeCache.has(cacheKey)) {
        return geocodeCache.get(cacheKey);
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=it&q=${encodeURIComponent(query)}`;
    try {
        const response = await fetch(url, {
            headers: {
                Accept: "application/json",
                "Accept-Language": "it",
            },
        });
        if (!response.ok) return null;

        const results = await response.json();
        if (!Array.isArray(results) || results.length === 0) {
            geocodeCache.set(cacheKey, null);
            return null;
        }

        const lat = parseFloat(results[0].lat);
        const lng = parseFloat(results[0].lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            geocodeCache.set(cacheKey, null);
            return null;
        }

        const coords = { lat, lng };
        geocodeCache.set(cacheKey, coords);
        return coords;
    } catch (err) {
        console.warn("Geocoding indirizzo non riuscito:", err);
        return null;
    }
}

function addServizioMapMarker(servizio, lat, lng) {
    L.circleMarker([lat, lng], {
        radius: 9,
        fillColor: getServizioMarkerColor(servizio.stato),
        color: "#f8fafc",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.92
    })
        .bindPopup(buildServizioMapPopup(servizio), { maxWidth: 280 })
        .addTo(serviziMapMarkersLayer);
}

function showPdfExportProgress() {
    const overlay = document.getElementById("pdf-export-overlay");
    const bar = document.getElementById("pdf-export-progress-bar");
    if (!overlay || !bar) return;

    if (pdfExportProgressTimer) {
        clearInterval(pdfExportProgressTimer);
        pdfExportProgressTimer = null;
    }

    overlay.classList.remove("hidden");
    bar.style.width = "0%";

    let progress = 0;
    pdfExportProgressTimer = setInterval(() => {
        progress = Math.min(progress + 6, 90);
        bar.style.width = `${progress}%`;
    }, 200);
}

function hidePdfExportProgress(success) {
    const overlay = document.getElementById("pdf-export-overlay");
    const bar = document.getElementById("pdf-export-progress-bar");
    if (!overlay || !bar) return;

    if (pdfExportProgressTimer) {
        clearInterval(pdfExportProgressTimer);
        pdfExportProgressTimer = null;
    }

    if (success) {
        bar.style.width = "100%";
    }

    const delay = success ? 350 : 0;
    setTimeout(() => {
        overlay.classList.add("hidden");
        bar.style.width = "0%";
    }, delay);
}

function getServizioMarkerColor(stato) {
    if (stato === "Programmato") return "#3b82f6";
    if (stato === "In corso") return "#f59e0b";
    return "#10b981";
}

function buildServizioMapPopup(servizio) {
    const formattedDate = new Date(servizio.data).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
    const indirizzo = servizio.indirizzo
        ? `<p class="text-slate-400 mt-1"><strong class="text-slate-300">Indirizzo:</strong> ${servizio.indirizzo}</p>`
        : "";
    return `
        <div class="font-sans">
            <p class="font-bold text-amber-400">${servizio.tipo}</p>
            <p class="text-slate-300 mt-1"><strong>Stato:</strong> ${servizio.stato}</p>
            <p class="text-slate-300"><strong>Data:</strong> ${formattedDate}</p>
            ${indirizzo}
        </div>
    `;
}

function isServiziTabVisible() {
    const tab = document.getElementById("tab-servizi");
    return tab && !tab.classList.contains("hidden");
}

function ensureServiziMap() {
    const mapEl = document.getElementById("servizi-map");
    if (!mapEl || serviziMap || !isServiziTabVisible()) return;

    serviziMap = L.map(mapEl, {
        scrollWheelZoom: true,
        zoomControl: true
    }).setView(MASSA_DI_SOMMA_CENTER, MASSA_DI_SOMMA_ZOOM);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(serviziMap);

    serviziMapMarkersLayer = L.layerGroup().addTo(serviziMap);
}

async function updateServiziMap(filteredServizi) {
    if (!isServiziTabVisible()) return;

    const mapHint = document.getElementById("servizi-map-hint");
    ensureServiziMap();
    if (!serviziMap || !serviziMapMarkersLayer) return;

    const updateToken = ++serviziMapUpdateToken;
    serviziMapMarkersLayer.clearLayers();

    const withCoords = filteredServizi.filter(hasValidServizioCoordinates);
    const withIndirizzoOnly = filteredServizi.filter(s => !hasValidServizioCoordinates(s) && hasServizioIndirizzo(s));
    const withoutLocation = filteredServizi.filter(s => !hasValidServizioCoordinates(s) && !hasServizioIndirizzo(s));

    if (mapHint) {
        if (withoutLocation.length > 0 && filteredServizi.length > 0) {
            mapHint.textContent = `${withoutLocation.length} missione/i senza coordinate né indirizzo non mostrate sulla mappa. Inserisci almeno uno dei due dal modulo «Nuova Missione / Servizio».`;
            mapHint.classList.remove("hidden");
        } else {
            mapHint.classList.add("hidden");
            mapHint.textContent = "";
        }
    }

    const boundsPoints = [];

    withCoords.forEach(s => {
        const lat = parseFloat(s.latitudine);
        const lng = parseFloat(s.longitudine);
        addServizioMapMarker(s, lat, lng);
        boundsPoints.push([lat, lng]);
    });

    for (const s of withIndirizzoOnly) {
        if (updateToken !== serviziMapUpdateToken) return;

        const coords = await geocodeIndirizzo(s.indirizzo);
        if (updateToken !== serviziMapUpdateToken) return;
        if (!coords) continue;

        addServizioMapMarker(s, coords.lat, coords.lng);
        boundsPoints.push([coords.lat, coords.lng]);

        if (withIndirizzoOnly.indexOf(s) < withIndirizzoOnly.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1100));
        }
    }

    if (updateToken !== serviziMapUpdateToken) return;

    if (boundsPoints.length > 0) {
        const bounds = L.latLngBounds(boundsPoints);
        serviziMap.fitBounds(bounds.pad(0.15), { maxZoom: 15 });
    } else {
        serviziMap.setView(MASSA_DI_SOMMA_CENTER, MASSA_DI_SOMMA_ZOOM);
    }

    setTimeout(() => serviziMap?.invalidateSize(), 50);
}

function renderServizi() {
    const servizi = getDB("pc_servizi");
    const mezzi = getDB("pc_mezzi");
    const volontari = getDB("pc_volontari");

    const tbody = document.getElementById("servizi-table-body");
    const filtered = getFilteredServizi();

    updateServiziMap(filtered);

    tbody.innerHTML = "";

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-8 text-center text-slate-500 font-medium">Nessuna missione o servizio pianificato con questi criteri.</td>
            </tr>
        `;
        return;
    }

    [...filtered].reverse().forEach(s => {
        const mezziAssegnati = (s.mezziIds || [])
            .map(mId => mezzi.find(m => m.id === mId))
            .filter(Boolean);

        const equipaggio = s.volontariIds.map(vId => {
            const vol = volontari.find(v => v.id === vId);
            return vol ? `${vol.nome} ${vol.cognome}` : null;
        }).filter(Boolean);

        let badgeClass = "";
        if (s.stato === "Programmato") badgeClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
        else if (s.stato === "In corso") badgeClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
        else badgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

        const formattedDate = new Date(s.data).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const mezziPills = mezziAssegnati.length > 0
            ? mezziAssegnati.map(m => `<span class="inline-block px-2.5 py-1 bg-slate-800 text-slate-200 border border-slate-700/60 rounded-xl text-xs font-semibold mr-1.5 mb-1.5">${m.modello}<span class="text-[10px] text-slate-400 font-mono ml-1">${m.targa}</span></span>`).join('')
            : `<span class="text-xs text-rose-400 font-semibold">Nessun mezzo assegnato!</span>`;

        const volontariPills = equipaggio.length > 0
            ? equipaggio.map(nome => `<span class="inline-block px-2.5 py-1 bg-slate-800 text-slate-200 border border-slate-700/60 rounded-xl text-xs font-semibold mr-1.5 mb-1.5">${nome}</span>`).join('')
            : `<span class="text-xs text-rose-400 font-semibold">Nessun equipaggio assegnato!</span>`;

        const completaBtn = s.stato !== "Completato"
            ? `<button onclick="completaServizio('${s.id}')" title="Imposta come Completato" class="p-2 hover:bg-emerald-950/30 rounded-lg text-slate-400 hover:text-emerald-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
               </button>`
            : '';

        const exportPdfBtn = s.stato === "Completato"
            ? `<button onclick="openPdfTemplateModal('${s.id}')" title="Esporta PDF" class="p-2 hover:bg-amber-950/30 rounded-lg text-slate-400 hover:text-amber-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
               </button>`
            : '';

        tbody.innerHTML += `
            <tr class="hover:bg-slate-800/10 transition-colors">
                <td class="py-4 px-6 max-w-[280px]">
                    <p class="font-bold text-white text-base">${s.tipo}</p>
                    <p class="text-xs text-slate-500 mt-1 font-medium italic break-words">${s.note || "Nessuna nota operativa aggiuntiva"}</p>
                </td>
                <td class="py-4 px-6 text-slate-300 font-bold">${formattedDate}</td>
                <td class="py-4 px-6 max-w-[280px]">
                    <div class="flex flex-wrap">
                        ${mezziPills}
                    </div>
                </td>
                <td class="py-4 px-6 max-w-[280px]">
                    <div class="flex flex-wrap">
                        ${volontariPills}
                    </div>
                </td>
                <td class="py-4 px-0">
                    <span class="px-2.5 py-1 text-[10px] font-bold border rounded-full ${badgeClass}">${s.stato}</span>
                </td>
                <td class="py-4 px-6 text-right">
                    <div class="inline-flex gap-2">
                        <button onclick="openEditServizioModal('${s.id}')" title="Modifica dati" class="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-500 transition-colors">
                            ${ICON_EDIT}
                        </button>
                        ${completaBtn}
                        ${exportPdfBtn}
                        <button onclick="deleteServizio('${s.id}')" title="Elimina Missione" class="p-2 hover:bg-rose-950/30 rounded-lg text-slate-400 hover:text-rose-500 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
}

async function saveServizio(event) {
    event.preventDefault();
    const richiedente = document.getElementById("s-richiedente").value;
    const tipo = document.getElementById("s-tipo").value;
    const data = document.getElementById("s-data").value;
    const latValue = document.getElementById("s-lat").value.trim();
    const lngValue = document.getElementById("s-lng").value.trim();
    const indirizzo = document.getElementById("s-indirizzo").value.trim();
    const note = document.getElementById("s-note").value;
    const altriEnti = document.getElementById("s-altri-enti").value.trim();
    const stato = document.getElementById("s-stato").value;

    const mezziCheckboxes = document.querySelectorAll('input[name="s-mezzi-check"]:checked');
    const mezziIds = [];
    mezziCheckboxes.forEach(cb => mezziIds.push(cb.value));

    const volontariCheckboxes = document.querySelectorAll('input[name="s-volontari-check"]:checked');
    const volontariIds = [];
    volontariCheckboxes.forEach(cb => volontariIds.push(cb.value));

    if (mezziIds.length === 0) {
        alert("Attenzione: devi assegnare almeno un mezzo al servizio!");
        return;
    }

    if (volontariIds.length === 0) {
        alert("Attenzione: devi assegnare almeno un volontario all'equipaggio del servizio!");
        return;
    }

    let latitudine = latValue !== "" ? parseFloat(latValue) : null;
    let longitudine = lngValue !== "" ? parseFloat(lngValue) : null;

    if (!hasValidServizioCoordinates({ latitudine, longitudine }) && indirizzo) {
        const coords = await geocodeIndirizzo(indirizzo);
        if (coords) {
            latitudine = coords.lat;
            longitudine = coords.lng;
        }
    }

    const payload = {
        richiedente,
        tipo,
        data,
        latitudine,
        longitudine,
        indirizzo_intervento: indirizzo || null,
        mezzi_ids: mezziIds,
        volontari_ids: volontariIds,
        note,
        altri_enti_coinvolti: altriEnti || null,
        stato,
        ...buildServizioAibPayload(tipo),
    };

    try {
        if (stato === "In corso") {
            for (const mId of mezziIds) {
                const mezzo = mezzi.find(m => m.id === mId);
                if (mezzo && mezzo.stato === "Disponibile") {
                    await supabase.from('mezzi').update({ stato: "In servizio" }).eq('id', mId);
                }
            }
        }

        if (editingServizioId) {
            const { error } = await supabase.from('servizi').update(payload).eq('id', editingServizioId);
            if (error) throw error;
            toggleModal('modal-servizio', false);
            showToast("Servizio Aggiornato", "Le modifiche sono state salvate correttamente.");
        } else {
            const newServizio = { id: "s_" + Date.now(), ...payload };
            const { error } = await supabase.from('servizi').insert([newServizio]);
            if (error) throw error;
            toggleModal('modal-servizio', false);
            showToast("Servizio Pianificato", "Il servizio è stato inserito con successo nel registro.");
        }
        await fetchDataFromSupabase();
    } catch (err) {
        console.error("Errore durante il salvataggio del servizio:", err);
        showToast("Errore di Salvataggio", "Impossibile registrare il servizio su Supabase.");
    }
}

async function completaServizio(id) {
    const serv = servizi.find(s => s.id === id);
    if (serv) {
        try {
            const { error: sErr } = await supabase.from('servizi').update({ stato: "Completato" }).eq('id', id);
            if (sErr) throw sErr;

            for (const mId of (serv.mezziIds || [])) {
                const mezzo = mezzi.find(m => m.id === mId);
                if (mezzo && mezzo.stato === "In servizio") {
                    await supabase.from('mezzi').update({ stato: "Disponibile" }).eq('id', mId);
                }
            }

            showToast("Missione Completata", "Il servizio è stato archiviato come completato.");
            await fetchDataFromSupabase();
        } catch (err) {
            console.error("Errore durante il completamento del servizio:", err);
            showToast("Errore", "Impossibile completare il servizio su Supabase.");
        }
    }
}

function openPdfTemplateModal(id) {
    const serv = servizi.find(s => s.id === id);
    if (!serv) return;

    if (serv.stato !== "Completato") {
        showToast("Export non disponibile", "Il PDF può essere generato solo per servizi completati.");
        return;
    }

    const equipaggio = (serv.volontariIds || [])
        .map(vId => volontari.find(v => v.id === vId))
        .filter(Boolean);

    if (equipaggio.length === 0) {
        showToast("Dati incompleti", "Nessun volontario associato a questo servizio.");
        return;
    }

    pendingPdfServizioId = id;
    toggleModal('modal-pdf-template', true);
}

function closePdfTemplateModal() {
    pendingPdfServizioId = null;
    toggleModal('modal-pdf-template', false);
}

function confirmPdfTemplate(template) {
    const id = pendingPdfServizioId;
    closePdfTemplateModal();
    if (id) {
        exportServizioPdf(id, template);
    }
}

async function exportServizioPdf(id, template = 'riepilogo-intervento') {
    const serv = servizi.find(s => s.id === id);
    if (!serv) return;

    if (serv.stato !== "Completato") {
        showToast("Export non disponibile", "Il PDF può essere generato solo per servizi completati.");
        return;
    }

    const mezziExport = (serv.mezziIds || [])
        .map(mId => mezzi.find(m => m.id === mId))
        .filter(Boolean);
    const equipaggio = (serv.volontariIds || [])
        .map(vId => volontari.find(v => v.id === vId))
        .filter(Boolean);

    if (equipaggio.length === 0) {
        showToast("Dati incompleti", "Nessun volontario associato a questo servizio.");
        return;
    }

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

    showPdfExportProgress();

    try {
        const response = await fetch('/servizi/pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/pdf',
                'X-CSRF-TOKEN': csrfToken || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                template,
                servizio: {
                    id: serv.id,
                    tipo: serv.tipo,
                    data: serv.data,
                    note: serv.note || '',
                    richiedente: serv.richiedente || '',
                    indirizzo: serv.indirizzo || '',
                    altriEnti: serv.altriEnti || '',
                    stato: serv.stato,
                    volontariIds: serv.volontariIds || [],
                    oraArrivoIncendio: serv.oraArrivoIncendio || '',
                    oraFineIntervento: serv.oraFineIntervento || '',
                    oraRientroSede: serv.oraRientroSede || '',
                    superficieCeduo: serv.superficieCeduo || {},
                    superficieAltoFusto: serv.superficieAltoFusto || {},
                    superficieNonBoscato: serv.superficieNonBoscato || {},
                },
                mezzi: mezziExport.map(m => ({
                    modello: m.modello,
                    targa: m.targa,
                    tipo: m.tipo,
                    stato: m.stato,
                })),
                equipaggio: equipaggio.map(v => ({
                    nome: v.nome,
                    cognome: v.cognome,
                    cf: v.cf,
                    ruolo: v.ruolo,
                    telefono: v.telefono,
                    stato: v.stato,
                })),
            }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Errore durante la generazione del PDF');
        }

        const blob = await response.blob();
        const disposition = response.headers.get('Content-Disposition');
        let filename = `riepilogo-intervento.pdf`;
        if (disposition) {
            const match = disposition.match(/filename="?([^";]+)"?/);
            if (match) filename = match[1];
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        showToast("PDF generato", "Il riepilogo dell'intervento è stato scaricato.");
        hidePdfExportProgress(true);
    } catch (err) {
        console.error("Errore export PDF:", err);
        showToast("Errore export PDF", err.message || "Impossibile generare il file PDF.");
        hidePdfExportProgress(false);
    }
}

async function deleteServizio(id) {
    if (confirm("Sei sicuro di voler eliminare questa registrazione di servizio?")) {
        try {
            const { error } = await supabase
                .from('servizi')
                .delete()
                .eq('id', id);
            if (error) throw error;

            showToast("Servizio Eliminato", "La registrazione è stata eliminata.");
            await fetchDataFromSupabase();
        } catch (err) {
            console.error("Errore durante l'eliminazione del servizio:", err);
            showToast("Errore", "Impossibile eliminare il servizio da Supabase.");
        }
    }
}

// --- UPDATE TOTALE UI E STATI ---
function updateUI() {
    updateDashboardStats();
    renderVolontari();
    renderMezzi();
    renderServizi();
}

// --- CLOCK E DATA IN TEMPO REALE ---
function startRealtimeClock() {
    const days = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
    const months = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

    function updateTime() {
        const now = new Date();

        const dayName = days[now.getDay()];
        const day = now.getDate();
        const monthName = months[now.getMonth()];
        const year = now.getFullYear();

        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        document.getElementById("current-date").innerText = `${dayName}, ${day} ${monthName} ${year}`;
        document.getElementById("current-time").innerText = `${hours}:${minutes}:${seconds}`;
    }

    updateTime();
    setInterval(updateTime, 1000);
}

// --- ADMIN: GESTIONE PROFILI UTENTE (solo master) ---
async function adminApiFetch(path, options = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
        throw new Error('Sessione scaduta. Effettua di nuovo l\'accesso.');
    }

    const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
    const headers = {
        Accept: 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
        ...options.headers,
    };

    const response = await fetch(path, { ...options, headers });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || 'Operazione non riuscita.');
    }

    return data;
}

function toggleProfiloAssociazioneField() {
    const wrap = document.getElementById('p-associazione-wrap');
    const select = document.getElementById('p-associazione');
    const ruolo = document.getElementById('p-ruolo')?.value;
    if (!wrap || !select) return;

    if (roleRequiresAssociazione(ruolo)) {
        wrap.classList.remove('hidden');
        select.required = true;
    } else {
        wrap.classList.add('hidden');
        select.required = false;
    }
}

async function renderAdminProfiles() {
    if (!isMaster()) return;

    const tbody = document.getElementById('admin-profiles-table-body');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="4" class="py-8 text-center text-slate-500 font-medium">Caricamento...</td>
        </tr>
    `;

    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, ruolo, associazione, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Errore caricamento profili:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="py-8 text-center text-rose-400 font-medium">Impossibile caricare gli utenti. Esegui la migration 002 su Supabase.</td>
            </tr>
        `;
        return;
    }

    const profiles = data || [];
    if (profiles.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="py-8 text-center text-slate-500 font-medium">Nessun utente configurato.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    profiles.forEach(p => {
        let ruoloBadge = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        if (p.ruolo === 'master') ruoloBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        else if (p.ruolo === 'sala_operativa') ruoloBadge = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
        else if (p.ruolo === 'capo_squadra') ruoloBadge = 'bg-violet-500/10 text-violet-400 border-violet-500/20';
        const isSelf = p.id === currentUserProfile?.id;

        tbody.innerHTML += `
            <tr class="hover:bg-slate-800/20 transition-all">
                <td class="py-4 px-6 text-slate-200 font-medium">${p.email || '—'}</td>
                <td class="py-4 px-6">
                    <span class="px-2.5 py-1 text-xs font-bold border rounded-full ${ruoloBadge}">${formatRuoloLabel(p.ruolo)}</span>
                </td>
                <td class="py-4 px-6 text-slate-400">${p.associazione || '—'}</td>
                <td class="py-4 px-6 text-right">
                    <div class="inline-flex gap-2">
                        <button type="button" onclick="openEditProfiloModal('${p.id}')" title="Modifica" class="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-500 transition-all">
                            ${ICON_EDIT}
                        </button>
                        ${isSelf ? '' : `<button type="button" onclick="deleteProfilo('${p.id}')" title="Elimina" class="p-2 hover:bg-rose-950/30 rounded-lg text-slate-400 hover:text-rose-500 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                        </button>`}
                    </div>
                </td>
            </tr>
        `;
    });
}

function openNuovoProfiloModal() {
    editingProfileId = null;
    document.getElementById('modal-profilo-title').innerText = 'Nuovo utente';
    document.getElementById('modal-profilo-submit').innerText = 'Crea utente';
    document.getElementById('p-email').disabled = false;
    document.getElementById('p-email').value = '';
    document.getElementById('p-password').value = '';
    document.getElementById('p-password').required = true;
    document.getElementById('p-password-required').classList.remove('hidden');
    document.getElementById('p-password-hint').classList.add('hidden');
    document.getElementById('p-ruolo').value = 'segreteria';
    document.getElementById('p-associazione').value = 'G.C. Massa di Somma';
    toggleProfiloAssociazioneField();
    toggleModal('modal-profilo', true);
}

async function openEditProfiloModal(id) {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, ruolo, associazione')
        .eq('id', id)
        .maybeSingle();

    if (error || !data) {
        showToast('Errore', 'Profilo non trovato.');
        return;
    }

    editingProfileId = id;
    document.getElementById('modal-profilo-title').innerText = 'Modifica utente';
    document.getElementById('modal-profilo-submit').innerText = 'Salva modifiche';
    document.getElementById('p-email').value = data.email || '';
    document.getElementById('p-email').disabled = true;
    document.getElementById('p-password').value = '';
    document.getElementById('p-password').required = false;
    document.getElementById('p-password-required').classList.add('hidden');
    document.getElementById('p-password-hint').classList.remove('hidden');
    document.getElementById('p-ruolo').value = data.ruolo;
    document.getElementById('p-associazione').value = data.associazione || 'G.C. Massa di Somma';
    toggleProfiloAssociazioneField();
    toggleModal('modal-profilo', true);
}

async function saveProfilo(event) {
    event.preventDefault();
    if (!isMaster()) return;

    const email = document.getElementById('p-email').value.trim();
    const password = document.getElementById('p-password').value;
    const ruolo = document.getElementById('p-ruolo').value;
    const associazione = document.getElementById('p-associazione').value;

    try {
        if (editingProfileId) {
            const payload = {
                ruolo,
                associazione: roleRequiresAssociazione(ruolo) ? associazione : null,
            };
            if (password) payload.password = password;

            await adminApiFetch(`/api/admin/profiles/${editingProfileId}`, {
                method: 'PATCH',
                body: JSON.stringify(payload),
            });

            toggleModal('modal-profilo', false);
            showToast('Utente aggiornato', 'Profilo modificato con successo.');
        } else {
            if (!password || password.length < 6) {
                showToast('Errore', 'Password obbligatoria (minimo 6 caratteri).');
                return;
            }

            await adminApiFetch('/api/admin/profiles', {
                method: 'POST',
                body: JSON.stringify({
                    email,
                    password,
                    ruolo,
                    associazione: roleRequiresAssociazione(ruolo) ? associazione : null,
                }),
            });

            toggleModal('modal-profilo', false);
            showToast('Utente creato', `${email} può accedere all'app.`);
        }

        editingProfileId = null;
        await renderAdminProfiles();
    } catch (err) {
        console.error('Errore salvataggio profilo:', err);
        showToast('Errore', err.message || 'Impossibile salvare l\'utente.');
    }
}

async function deleteProfilo(id) {
    if (!isMaster()) return;
    if (id === currentUserProfile?.id) {
        showToast('Errore', 'Non puoi eliminare il tuo account.');
        return;
    }

    if (!confirm('Eliminare questo utente? L\'accesso verrà revocato definitivamente.')) {
        return;
    }

    try {
        await adminApiFetch(`/api/admin/profiles/${id}`, { method: 'DELETE' });
        showToast('Utente eliminato', 'Account rimosso dal sistema.');
        await renderAdminProfiles();
    } catch (err) {
        console.error('Errore eliminazione profilo:', err);
        showToast('Errore', err.message || 'Impossibile eliminare l\'utente.');
    }
}

// Esporta le funzioni globalmente affinché gli event handler in HTML (onclick, onsubmit, oninput, onchange) possano trovarle
window.switchTab = switchTab;
window.toggleModal = toggleModal;
window.openNuovoVolontarioModal = openNuovoVolontarioModal;
window.openEditVolontarioModal = openEditVolontarioModal;
window.saveVolontario = saveVolontario;
window.toggleVolontarioStato = toggleVolontarioStato;
window.deleteVolontario = deleteVolontario;
window.renderVolontari = renderVolontari;
window.openNuovoMezzoModal = openNuovoMezzoModal;
window.openEditMezzoModal = openEditMezzoModal;
window.saveMezzo = saveMezzo;
window.toggleMezzoStato = toggleMezzoStato;
window.deleteMezzo = deleteMezzo;
window.renderMezzi = renderMezzi;
window.openNuovoServizioModal = openNuovoServizioModal;
window.openEditServizioModal = openEditServizioModal;
window.toggleServizioAibFields = toggleServizioAibFields;
window.fillCoordinateFromGps = fillCoordinateFromGps;
window.saveServizio = saveServizio;
window.completaServizio = completaServizio;
window.openPdfTemplateModal = openPdfTemplateModal;
window.closePdfTemplateModal = closePdfTemplateModal;
window.confirmPdfTemplate = confirmPdfTemplate;
window.exportServizioPdf = exportServizioPdf;
window.deleteServizio = deleteServizio;
window.renderServizi = renderServizi;
window.updateUI = updateUI;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.openNuovoProfiloModal = openNuovoProfiloModal;
window.openEditProfiloModal = openEditProfiloModal;
window.saveProfilo = saveProfilo;
window.deleteProfilo = deleteProfilo;
window.toggleProfiloAssociazioneField = toggleProfiloAssociazioneField;
window.renderAdminProfiles = renderAdminProfiles;

// --- INIZIALIZZAZIONE ALL'AVVIO ---
window.addEventListener("DOMContentLoaded", async () => {
    // Controlla se esiste già una sessione attiva
    const { data: { session } } = await supabase.auth.getSession();

    if (session && session.user) {
        await bootstrapApp(session.user);
    } else {
        // Mostra la schermata di login
        showLogin();
    }

    // Ascolta i cambiamenti di stato auth
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            currentUserProfile = null;
            showLogin();
        }
    });
});
