import { createClient } from '@supabase/supabase-js';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// --- INIZIALIZZAZIONE SUPABASE ---
// Invece di import.meta.env, leggiamo una variabile passata da Laravel nel file HTML
const supabaseUrl = window.laravelConfig?.supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = window.laravelConfig?.supabaseKey || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

const TIPO_FUORISTRADA = "Fuoristrada";
const TIPO_CARRELLO_APPENDICE = "Carrello appendice";
const TIPI_MEZZI_TRAINANTI_CARRELLO = ["Fuoristrada", "Mezzo A.I.B", "Pickup con gancio traino"];
const MEZZO_STATO_MANUTENZIONE = "In manutenzione";
const VOLONTARI_FOTO_BUCKET = "volontari-foto";
const VOLONTARI_FOTO_MAX_SIZE = 5 * 1024 * 1024;
const VOLONTARI_FOTO_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VOLONTARI_PATENTI_BUCKET = "volontari-patenti";
const VOLONTARI_PATENTI_MAX_SIZE = 10 * 1024 * 1024;
const VOLONTARI_PATENTI_ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const VOLONTARI_PATENTI_OPTIONS = ["A", "B", "C", "D", "E", "MMT", "Patente Nautica"];
const VOLONTARI_PATENTI_AUTO_OPTIONS = ["A", "B", "C", "D", "E"];
const VOLONTARI_PATENTI_AUTO_FILE_KEY = "Patenti A-B-C-D-E";
const VOLONTARI_ATTESTATI_BUCKET = "volontari-attestati";
const VOLONTARI_ATTESTATI_MAX_SIZE = 10 * 1024 * 1024;
const VOLONTARI_ATTESTATI_ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const VOLONTARI_QUALIFICHE_COORDINAMENTO_ATTESTATI = ["Corso BLSD", "Corso Alto Rischio"];
const VOLONTARI_CARTA_IDENTITA_BUCKET = "volontari-carte-identita";
const VOLONTARI_CARTA_IDENTITA_MAX_SIZE = 10 * 1024 * 1024;
const VOLONTARI_CARTA_IDENTITA_ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const VOLONTARI_ALLEGATO_V_BUCKET = "volontari-allegato-v";
const VOLONTARI_ALLEGATO_V_MAX_SIZE = 10 * 1024 * 1024;
const VOLONTARI_ALLEGATO_V_ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const PROTOCOLLO_INGRESSO_BUCKET = "protocollo-ingresso";
const PROTOCOLLO_ASSOCIAZIONE_BUCKET = "protocollo-associazione";
const PROTOCOLLO_ASSOCIAZIONE_ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const PROTOCOLLO_ASSOCIAZIONE_ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "webp"];
const SALA_OPERATIVA_AREE_FOTO_BUCKET = "sala-operativa-aree-foto";
const SALA_OPERATIVA_AREE_FOTO_MAX_SIZE = 10 * 1024 * 1024;
const SALA_OPERATIVA_AREE_FOTO_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DEFAULT_ASSOCIAZIONI = [
    "G.C. Massa di Somma",
    "G.C. Cercola",
    "Cobra 2",
    "G.C. Sant'Anastasia",
    "Save Me",
    "NVPC Pomigliano",
    "COPCSV Pomigliano",
];

// --- PROFILO UTENTE (ruolo + associazione) ---
let currentUserProfile = null;
let associazioniDisponibili = DEFAULT_ASSOCIAZIONI.map((nome, index) => ({ id: `default-${index}`, nome }));
let associazioniLoadedFromApi = false;
let adminProfilesCache = [];

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

function isSuperUser() {
    return currentUserProfile?.ruolo === 'super_user';
}

function hasMasterAccess() {
    return isMaster() || isSuperUser();
}

function canAccessVolontari() {
    return hasMasterAccess() || isSegreteria();
}

function canAccessServizi() {
    return hasMasterAccess() || isCapoSquadra() || isSalaOperativa();
}

function canAccessAttivita() {
    return isSegreteria() || isSuperUser();
}

function canAccessSquadreAib() {
    return hasMasterAccess() || isSegreteria();
}

function canAccessDashboardCaposquadra() {
    return hasMasterAccess() || isCapoSquadra();
}

function canAccessProtocolloIngresso() {
    return hasMasterAccess();
}

function canAccessProtocolloAssociazione() {
    return hasMasterAccess() || isSegreteria();
}

function canAccessMagazzino() {
    return hasMasterAccess() || isSegreteria();
}

function canLoadServizi() {
    return canAccessServizi() || canAccessAttivita();
}

function canAccessMezzi() {
    return hasMasterAccess() || isSegreteria();
}

function canSeeAllMezzi() {
    return hasMasterAccess() || isSalaOperativa();
}

function canManageMezzo(mezzo = null) {
    if (hasMasterAccess()) return true;
    return isSegreteria() && (!mezzo || mezzo.associazione_appartenenza === getUserAssociazione());
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
    if (!canLoadServizi() || !serviziList?.length) return;

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

function isCarrelloAppendice(mezzo) {
    return mezzo?.tipo === TIPO_CARRELLO_APPENDICE;
}

function isFuoristrada(mezzo) {
    return mezzo?.tipo === TIPO_FUORISTRADA;
}

function canTrainCarrelloAppendice(mezzo) {
    return TIPI_MEZZI_TRAINANTI_CARRELLO.includes(mezzo?.tipo);
}

function roleRequiresAssociazione(ruolo) {
    return ruolo === 'segreteria' || ruolo === 'capo_squadra';
}

function roleAllowsProfiloIdentita(ruolo) {
    return ['capo_squadra', 'master', 'super_user'].includes(ruolo);
}

function formatRuoloLabel(ruolo) {
    const labels = {
        master: 'Master',
        segreteria: 'Segreteria',
        capo_squadra: 'Capo Squadra',
        sala_operativa: 'Sala Operativa',
        super_user: 'SuperUser',
    };
    return labels[ruolo] || ruolo;
}

function getUserAssociazione() {
    return currentUserProfile?.associazione || null;
}

function getAssociazioniNomi() {
    const nomi = associazioniDisponibili.map(a => a.nome).filter(Boolean);
    return nomi.length ? nomi : DEFAULT_ASSOCIAZIONI;
}

function getDefaultAssociazione() {
    return getAssociazioniNomi()[0] || '';
}

function renderAssociazioniOptions(selectedValue = '') {
    const options = getAssociazioniNomi().map(nome => (
        `<option value="${escapeAttr(nome)}">${escapeHtml(nome)}</option>`
    )).join('');

    document.querySelectorAll('select[data-associazione-select]').forEach(select => {
        const valueToKeep = selectedValue || select.value || DEFAULT_ASSOCIAZIONI[0];
        select.innerHTML = options;
        if (valueToKeep && getAssociazioniNomi().includes(valueToKeep)) {
            select.value = valueToKeep;
        }
    });
}

async function loadAssociazioni() {
    try {
        const { associazioni } = await adminApiFetch('/api/admin/associazioni');
        if (Array.isArray(associazioni)) {
            associazioniDisponibili = associazioni;
            associazioniLoadedFromApi = true;
        }
    } catch (err) {
        associazioniLoadedFromApi = false;
        console.warn('Lista associazioni non disponibile, uso valori predefiniti:', err);
    }

    renderAssociazioniOptions();
}

function canSeeAllVolontari() {
    return hasMasterAccess() || isSalaOperativa();
}

function applyVolontariScope(list) {
    if (canSeeAllVolontari() || isCapoSquadra()) return list;
    const assoc = getUserAssociazione();
    if (!assoc) return [];
    return list.filter(v => v.associazione_appartenenza === assoc);
}

async function enrichVolontariFromServizi(serviziList) {
    if (!canLoadServizi() || !serviziList?.length) return;

    const knownIds = new Set(volontari.map(v => v.id));
    const missingIds = [...new Set(
        serviziList.flatMap(s => s.volontariIds || []).filter(id => id && !knownIds.has(id))
    )];
    if (missingIds.length === 0) return;

    const { data, error } = await supabase.from('volontari').select('*').in('id', missingIds);
    if (error) throw error;
    if (data?.length) {
        volontari = await attachVolontariFotoUrls(applyVolontariScope([...volontari, ...data]));
    }
}

async function loadUserProfile(user) {
    if (!user?.id) {
        currentUserProfile = null;
        return null;
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, nome, cognome, ruolo, associazione')
        .eq('id', user.id)
        .maybeSingle();

    if (error) {
        console.error('Errore caricamento profilo:', error);
        throw error;
    }

    currentUserProfile = data;
    return data;
}

function getCurrentProfileCompletionSnapshot() {
    const nome = currentUserProfile?.nome?.trim() || null;
    const cognome = currentUserProfile?.cognome?.trim() || null;

    return {
        completato_da_profile_id: currentUserProfile?.id || null,
        completato_da_nome: nome,
        completato_da_cognome: cognome,
        completato_il: new Date().toISOString(),
    };
}

function normalizeCaposquadraMatchValue(value) {
    return (value || '')
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
}

function findCaposquadraVolontarioByCompletatore(servizio) {
    const nome = normalizeCaposquadraMatchValue(servizio?.completatoDaNome);
    const cognome = normalizeCaposquadraMatchValue(servizio?.completatoDaCognome);
    if (!nome || !cognome) return null;

    return volontari.find(v => {
        const ruolo = normalizeCaposquadraMatchValue(v.ruolo);
        return normalizeCaposquadraMatchValue(v.nome) === nome
            && normalizeCaposquadraMatchValue(v.cognome) === cognome
            && ruolo.includes('capo');
    }) || null;
}

function getServizioCompletionSnapshot(existing, stato) {
    if (stato !== "Completato" || existing?.stato === "Completato") {
        return {};
    }

    return getCurrentProfileCompletionSnapshot();
}

function canCompleteServizioWithCurrentProfile(existing, stato) {
    if (stato !== "Completato" || existing?.stato === "Completato") {
        return true;
    }

    if (currentUserProfile?.nome?.trim() && currentUserProfile?.cognome?.trim()) {
        return true;
    }

    showToast(
        "Nominativo mancante",
        "Completa nome e cognome del profilo utente prima di segnare il servizio come completato."
    );
    return false;
}

const CAPO_SQUADRA_SERVIZIO_READONLY_IDS = ['s-richiedente', 's-tipo'];
const CAPO_SQUADRA_SERVIZIO_REQUIRED_IDS = ['s-richiedente', 's-tipo', 's-data', 's-stato'];
const CAPO_SQUADRA_READONLY_MESSAGE = 'Questo campo non può essere modificato con il ruolo Capo Squadra.';

let capoSquadraReadonlyHintClickHandler = null;

function getCapoSquadraReadonlyHintClickHandler() {
    if (!capoSquadraReadonlyHintClickHandler) {
        capoSquadraReadonlyHintClickHandler = (e) => {
            const hint = e.currentTarget;
            if (!hint?.dataset?.capoReadonlyHint || !isCapoSquadra()) return;
            e.preventDefault();
            e.stopPropagation();
            showToast('Modifica non consentita', CAPO_SQUADRA_READONLY_MESSAGE);
        };
    }
    return capoSquadraReadonlyHintClickHandler;
}

function markCapoSquadraReadonlyHint(el) {
    if (!el || el.dataset.capoReadonlyHint === '1') return;
    el.dataset.capoReadonlyHint = '1';
    el.title = CAPO_SQUADRA_READONLY_MESSAGE;
    el.classList.add('cursor-not-allowed');
    el.addEventListener('click', getCapoSquadraReadonlyHintClickHandler(), true);
}

function unmarkCapoSquadraReadonlyHint(el) {
    if (!el || el.dataset.capoReadonlyHint !== '1') return;
    delete el.dataset.capoReadonlyHint;
    el.removeAttribute('title');
    el.classList.remove('cursor-not-allowed');
    el.removeEventListener('click', getCapoSquadraReadonlyHintClickHandler(), true);
}

function wrapCapoSquadraReadonlyControl(el) {
    if (!el) return null;
    const existing = el.closest('[data-capo-readonly-wrap]');
    if (existing) return existing;

    const wrap = document.createElement('div');
    wrap.dataset.capoReadonlyWrap = '1';
    wrap.className = 'w-full';
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);
    el.classList.add('pointer-events-none');
    return wrap;
}

function unwrapCapoSquadraReadonlyControl(el) {
    if (!el) return;
    const wrap = el.closest('[data-capo-readonly-wrap]');
    if (!wrap) return;
    el.classList.remove('pointer-events-none');
    wrap.parentNode.insertBefore(el, wrap);
    wrap.remove();
}

function formatServizioDataPianificata(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function applyCapoSquadraServizioFormRestrictions() {
    if (!isCapoSquadra()) return;

    CAPO_SQUADRA_SERVIZIO_READONLY_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.disabled = true;
        el.required = false;
        markCapoSquadraReadonlyHint(wrapCapoSquadraReadonlyControl(el));
    });

    const dataEl = document.getElementById('s-data');
    if (dataEl) {
        dataEl.required = false;
        dataEl.classList.add('hidden');

        let display = document.getElementById('s-data-capo-display');
        if (!display) {
            display = document.createElement('div');
            display.id = 's-data-capo-display';
            display.className = 'w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm';
            dataEl.insertAdjacentElement('afterend', display);
        }
        display.textContent = formatServizioDataPianificata(dataEl.value);
        display.classList.remove('hidden');
        markCapoSquadraReadonlyHint(display);
    }

    document.querySelectorAll('#s-mezzi-list input[type="checkbox"], #s-volontari-list input[type="checkbox"], #s-volontari-list select[name="s-volontari-art39"], #s-volontari-list select[name="s-volontari-mezzo"]').forEach(control => {
        control.disabled = true;
    });

    const mezziList = document.getElementById('s-mezzi-list');
    const volontariList = document.getElementById('s-volontari-list');
    if (mezziList) markCapoSquadraReadonlyHint(mezziList);
    if (volontariList) markCapoSquadraReadonlyHint(volontariList);
}

function applySalaOperativaServizioFormRestrictions() {
    if (!isSalaOperativa()) return;

    document.querySelectorAll('[data-servizio-mezzi-volontari-block]').forEach(block => {
        block.classList.add('hidden');
    });
}

function resetSalaOperativaServizioFormRestrictions() {
    document.querySelectorAll('[data-servizio-mezzi-volontari-block]').forEach(block => {
        block.classList.remove('hidden');
    });
}

function toggleResponsabileServizioField() {
    const block = document.getElementById('s-responsabile-servizio-block');
    if (!block) return;
    block.classList.toggle('hidden', !hasMasterAccess() || !editingServizioId);
}

function getSegreteriaAttivitaHiddenBlocks() {
    const blocks = [
        document.getElementById('s-aib-section'),
        document.getElementById('s-aib-orari-fine'),
        document.getElementById('s-lat')?.parentElement?.parentElement ?? null,
        document.getElementById('s-stato')?.parentElement ?? null,
    ];

    return blocks.filter(Boolean);
}

function applySegreteriaAttivitaFormRestrictions() {
    if (!isSegreteria()) return;

    const form = document.querySelector('#modal-servizio form');
    if (!form) return;

    getSegreteriaAttivitaHiddenBlocks().forEach(block => {
        block.classList.add('hidden');
        block.dataset.segreteriaAttivitaHidden = '1';
    });

    form.querySelectorAll('input, select, textarea').forEach(el => {
        if (
            el.id === 's-data'
            || el.id === 's-mezzi-search'
            || el.id === 's-volontari-search'
            || el.closest('#s-mezzi-list')
            || el.closest('#s-volontari-list')
        ) return;
        el.disabled = true;
    });

    const dataEl = document.getElementById('s-data');
    if (dataEl) {
        dataEl.required = false;
        dataEl.classList.add('hidden');

        let display = document.getElementById('s-data-segreteria-display');
        if (!display) {
            display = document.createElement('div');
            display.id = 's-data-segreteria-display';
            display.className = 'w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm';
            dataEl.insertAdjacentElement('afterend', display);
        }
        display.textContent = formatServizioDataPianificata(dataEl.value);
        display.classList.remove('hidden');
    }

    form.querySelectorAll('button[type="button"]').forEach(btn => {
        if (btn.closest('[data-servizio-mezzi-volontari-block]')) return;
        btn.disabled = true;
    });
}

function resetSegreteriaAttivitaFormRestrictions() {
    const form = document.querySelector('#modal-servizio form');
    if (!form) return;

    document.querySelectorAll('[data-segreteria-attivita-hidden]').forEach(block => {
        block.classList.remove('hidden');
        delete block.dataset.segreteriaAttivitaHidden;
    });

    const dataEl = document.getElementById('s-data');
    if (dataEl) {
        dataEl.classList.remove('hidden');
        dataEl.required = true;
    }
    const dataDisplay = document.getElementById('s-data-segreteria-display');
    if (dataDisplay) {
        dataDisplay.classList.add('hidden');
    }

    form.querySelectorAll('input, select, textarea, button[type="button"]').forEach(el => {
        el.disabled = false;
    });
}

function resetCapoSquadraServizioFormRestrictions() {
    CAPO_SQUADRA_SERVIZIO_READONLY_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const wrap = el.closest('[data-capo-readonly-wrap]');
        if (wrap) unmarkCapoSquadraReadonlyHint(wrap);
        unwrapCapoSquadraReadonlyControl(el);
        el.disabled = false;
    });

    const dataEl = document.getElementById('s-data');
    if (dataEl) {
        dataEl.classList.remove('hidden');
    }
    const dataDisplay = document.getElementById('s-data-capo-display');
    if (dataDisplay) {
        unmarkCapoSquadraReadonlyHint(dataDisplay);
        dataDisplay.classList.add('hidden');
    }

    CAPO_SQUADRA_SERVIZIO_REQUIRED_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.required = true;
    });

    document.querySelectorAll('#s-mezzi-list input[type="checkbox"], #s-volontari-list input[type="checkbox"], #s-volontari-list select[name="s-volontari-art39"], #s-volontari-list select[name="s-volontari-mezzo"]').forEach(control => {
        control.disabled = false;
    });

    const mezziList = document.getElementById('s-mezzi-list');
    const volontariList = document.getElementById('s-volontari-list');
    if (mezziList) unmarkCapoSquadraReadonlyHint(mezziList);
    if (volontariList) unmarkCapoSquadraReadonlyHint(volontariList);
}

function buildCapoSquadraServizioUpdatePayload(existing, stato) {
    const latValue = document.getElementById('s-lat')?.value.trim() ?? '';
    const lngValue = document.getElementById('s-lng')?.value.trim() ?? '';
    const indirizzo = document.getElementById('s-indirizzo')?.value.trim() ?? '';
    const note = document.getElementById('s-note')?.value ?? '';
    const altriEnti = document.getElementById('s-altri-enti')?.value.trim() ?? '';

    let latitudine = latValue !== '' ? parseFloat(latValue) : null;
    let longitudine = lngValue !== '' ? parseFloat(lngValue) : null;

    return {
        latitudine,
        longitudine,
        indirizzo_intervento: indirizzo || null,
        note,
        altri_enti_coinvolti: altriEnti || null,
        stato,
        ...getServizioCompletionSnapshot(existing, stato),
        ...buildServizioAibPayload(existing.tipo),
    };
}

function applyRoleBasedUI() {
    document.querySelectorAll('[data-master-only]').forEach(el => {
        el.classList.toggle('hidden', !hasMasterAccess());
    });
    document.querySelectorAll('[data-hide-for-capo-squadra]').forEach(el => {
        el.classList.toggle('hidden', isCapoSquadra());
    });
    document.querySelectorAll('[data-volontari-access]').forEach(el => {
        el.classList.toggle('hidden', !canAccessVolontari());
    });
    document.querySelectorAll('[data-servizi-access]').forEach(el => {
        el.classList.toggle('hidden', !canAccessServizi());
    });
    document.querySelectorAll('[data-operatore-sala-control]').forEach(el => {
        el.classList.toggle('hidden', !(hasMasterAccess() || isSalaOperativa()));
    });
    document.querySelectorAll('[data-mezzi-access]').forEach(el => {
        el.classList.toggle('hidden', !canAccessMezzi());
    });
    document.querySelectorAll('[data-magazzino-access]').forEach(el => {
        el.classList.toggle('hidden', !canAccessMagazzino());
    });
    document.querySelectorAll('#nav-attivita, #bottom-nav-attivita').forEach(el => {
        el.classList.toggle('hidden', !canAccessAttivita());
    });
    document.querySelectorAll('[data-squadre-aib-access]').forEach(el => {
        el.classList.toggle('hidden', !canAccessSquadreAib());
    });
    document.querySelectorAll('[data-dashboard-caposquadra-access]').forEach(el => {
        el.classList.toggle('hidden', !canAccessDashboardCaposquadra());
    });
    document.querySelectorAll('[data-protocollo-ingresso-access]').forEach(el => {
        el.classList.toggle('hidden', !canAccessProtocolloIngresso());
    });
    document.querySelectorAll('[data-protocollo-associazione-access]').forEach(el => {
        el.classList.toggle('hidden', !canAccessProtocolloAssociazione());
    });

    configureProfiloRuoloOptions();

    const badge = document.getElementById('user-email-badge');
    if (badge && currentUserProfile) {
        if (isSuperUser()) {
            badge.innerText = 'SuperUser';
        } else if (isMaster()) {
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
    setupSquadraAibAssociazioneField();
    setupProtocolloAssociazioneField();

    if (isSegreteria()) {
        switchTab('volontari');
    } else if (isCapoSquadra()) {
        switchTab('dashboard-caposquadra');
    } else if (isSalaOperativa()) {
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

function setupAttrezzaturaAssociazioneField() {
    const selectWrap = document.getElementById('a-associazione-select-wrap');
    const fissaWrap = document.getElementById('a-associazione-fissa-wrap');
    const select = document.getElementById('a-associazione');
    const fissaInput = document.getElementById('a-associazione-fissa');
    const fissaLabel = document.getElementById('a-associazione-fissa-label');

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

function getAttrezzaturaAssociazioneValue() {
    if (isSegreteria()) {
        return getUserAssociazione();
    }
    return document.getElementById('a-associazione')?.value || null;
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

const SYSTEM_STATUS_BLOCKS = [
    { ping: 'system-status-dot-ping', dot: 'system-status-dot', text: 'system-status-text' },
    { ping: 'login-system-status-dot-ping', dot: 'login-system-status-dot', text: 'login-system-status-text' },
];

function setSystemStatus(healthy) {
    SYSTEM_STATUS_BLOCKS.forEach(({ ping, dot, text }) => {
        const pingEl = document.getElementById(ping);
        const dotEl = document.getElementById(dot);
        const textEl = document.getElementById(text);
        if (!dotEl || !textEl) return;

        if (healthy) {
            if (pingEl) {
                pingEl.classList.remove('hidden');
                pingEl.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75';
            }
            dotEl.className = 'relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500';
            textEl.textContent = 'HEALTHLY';
            textEl.className = 'text-[10px] text-emerald-500 font-medium uppercase';
        } else {
            if (pingEl) pingEl.classList.add('hidden');
            dotEl.className = 'relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500';
            textEl.textContent = 'UNHEALTHLY';
            textEl.className = 'text-[10px] text-red-500 font-medium uppercase';
        }
    });
}

async function pingSupabaseAvailability() {
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
        headers: { apikey: supabaseKey },
    });
    return response.ok;
}

async function checkDatabaseConnection(forLoginScreen = false) {
    try {
        if (!forLoginScreen) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { error } = await supabase.from('volontari').select('id').limit(1);
                setSystemStatus(!error);
                return;
            }
        }

        setSystemStatus(await pingSupabaseAvailability());
    } catch {
        setSystemStatus(false);
    }
}

async function bootstrapApp(user) {
    appNavigationRefreshEnabled = false;
    await loadUserProfile(user);

    if (!currentUserProfile) {
        await supabase.auth.signOut();
        await showLogin();
        const errorDiv = document.getElementById('login-error');
        const errorText = document.getElementById('login-error-text');
        if (errorDiv && errorText) {
            errorText.innerText = 'Profilo non configurato. Contatta l\'amministratore (vedi docs/SUPABASE_SETUP.md).';
            errorDiv.classList.remove('hidden');
        }
        return false;
    }

    if (hasMasterAccess()) {
        await loadAssociazioni();
    } else {
        renderAssociazioniOptions();
    }

    applyRoleBasedUI();
    const pendingViewAfterRefresh = sessionStorage.getItem(PENDING_VIEW_AFTER_REFRESH_KEY);
    if (pendingViewAfterRefresh) {
        sessionStorage.removeItem(PENDING_VIEW_AFTER_REFRESH_KEY);
        switchTab(pendingViewAfterRefresh);
    } else if (!document.querySelector(".tab-content:not(.hidden)")) {
        switchTab('dashboard');
    }
    showApp(user);
    await checkDatabaseConnection();
    await fetchDataFromSupabase();
    appNavigationRefreshEnabled = true;
    startRealtimeClock();
    startSquadreAibScadenzaTimer();
    return true;
}

// --- AUTENTICAZIONE SUPABASE ---

function showApp(user) {
    const loginScreen = document.getElementById('login-screen');
    loginScreen.classList.add('hidden');
    loginScreen.style.display = 'none';
    const appLayout = document.getElementById('app-layout');
    appLayout.classList.remove('hidden');
    appLayout.style.display = 'flex';

    // Mostra bottom navigation su mobile
    const bottomNav = document.getElementById('bottom-nav');
    if (bottomNav) bottomNav.style.display = '';
}

async function showLogin() {
    document.getElementById('app-layout').classList.add('hidden');
    document.getElementById('app-layout').style.display = 'none';
    const loginScreen = document.getElementById('login-screen');
    loginScreen.classList.remove('hidden');
    loginScreen.style.display = 'flex';
    document.getElementById('login-form').reset();
    document.getElementById('login-error').classList.add('hidden');

    // Nascondi bottom navigation
    const bottomNav = document.getElementById('bottom-nav');
    if (bottomNav) bottomNav.style.display = 'none';

    await checkDatabaseConnection(true);
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
    squadreAib = [];
    protocolliIngresso = [];
    protocolliAssociazione = [];
    stopSquadreAibScadenzaTimer();
    await showLogin();
}

function openChangePasswordModal() {
    toggleModal('modal-change-password', true);
}

async function saveCurrentUserPassword(event) {
    event.preventDefault();

    const password = document.getElementById('current-user-password').value;
    if (!password || password.length < 6) {
        showToast('Errore', 'La password deve contenere almeno 6 caratteri.');
        return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
        showToast('Errore', error.message || 'Impossibile modificare la password.');
        return;
    }

    toggleModal('modal-change-password', false);
    showToast('Password aggiornata', 'La password è stata modificata con successo.');
}

// --- STATO IN-MEMORY DELL'APPLICAZIONE ---
let volontari = [];
let mezzi = [];
let servizi = [];
let squadreAib = [];
let protocolliIngresso = [];
let protocolliAssociazione = [];
let attrezzatureMagazzino = [];
let tipiAttrezzaturaMagazzino = [];
let prelieviMagazzino = [];
let prelievoRigheMagazzino = [];
let operatoreSalaTurno = null;

let editingVolontarioId = null;
let editingMezzoId = null;
let editingServizioId = null;
let editingProfileId = null;
let editingAssociazioneId = null;
let editingSquadraAibId = null;
let editingProtocolloIngressoId = null;
let editingProtocolloAssociazioneId = null;
let isSavingVolontario = false;
let isSavingProtocolloIngresso = false;
let isSavingProtocolloAssociazione = false;
let isSavingPrelievoMagazzino = false;
let savingRientriPrelievoMagazzino = new Set();
let editingAttrezzaturaId = null;
let editingPrelievoMagazzinoId = null;
let pendingVolontarioFileDeletes = { foto: false, cartaIdentita: false, allegatoV: false, patenti: new Set(), qualificheCoordinamento: new Set() };

// Mappa servizi — default: comune di Massa di Somma (NA)
const MASSA_DI_SOMMA_CENTER = [40.850, 14.342];
const MASSA_DI_SOMMA_ZOOM = 11;
let serviziMap = null;
let serviziMapMarkersLayer = null;
let serviziMapRoadLayer = null;
let serviziMapSatelliteLayer = null;
let serviziMapMunicipalityLayer = null;
let serviziMapActiveBaseLayer = "road";
let serviziMapAreeLayer = null;
let serviziMapDrawControl = null;
let areeIntervento = [];
let pendingAreaInterventoLayer = null;
let editingAreaInterventoId = null;
let isSavingAreaIntervento = false;
let areaDrawingLatLngs = [];
let areaDrawingPreviewLayer = null;
let areaDrawingControlContainer = null;
const geocodeCache = new Map();
const serviziMapMarkersById = new Map();
let serviziMapUpdateToken = 0;
let pdfExportProgressTimer = null;
let pendingPdfDelivery = null;
let pendingPdfServizioId = null;
let pendingVolontarioDocumentiId = null;
let squadreAibScadenzaTimer = null;
const PENDING_VIEW_AFTER_REFRESH_KEY = 'pc_pending_view_after_refresh';
let appNavigationRefreshEnabled = false;

const ICON_EDIT = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>`;
const ICON_EYE = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`;
const ICON_DOWNLOAD = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12L12 16.5m0 0l4.5-4.5M12 16.5V3" /></svg>`;
const ICON_TRASH = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>`;

function toDatetimeLocalValue(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}

function normalizeTimeValue(value) {
    if (!value) return '';
    const match = String(value).match(/^(\d{2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : '';
}

function toLocalDateValue(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function toLocalTimeValue(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function getSquadraAibAvailabilityStart(squadra) {
    const start = new Date(squadra?.disponibileDal || squadra?.createdAt || '');
    return Number.isNaN(start.getTime()) ? null : start;
}

function getSquadraAibAvailabilityEnd(squadra) {
    const start = getSquadraAibAvailabilityStart(squadra);
    const endTime = normalizeTimeValue(squadra?.disponibileFino);
    if (!start || !endTime) return null;

    const [hours, minutes] = endTime.split(':').map(Number);
    const end = new Date(start);
    end.setHours(hours, minutes, 0, 0);
    if (end <= start) {
        end.setDate(end.getDate() + 1);
    }
    return end;
}

function isSquadraAibDisponibileOra(squadra, now = new Date()) {
    const start = getSquadraAibAvailabilityStart(squadra);
    const end = getSquadraAibAvailabilityEnd(squadra);
    return Boolean(start && end && start <= now && now < end);
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
    return escapeHtml(value);
}

function escapeXml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

function isTimeValuePassedToday(value) {
    const normalized = normalizeTimeValue(value);
    if (!normalized) return false;

    const [hours, minutes] = normalized.split(':').map(Number);
    const now = new Date();
    const end = new Date();
    end.setHours(hours, minutes, 0, 0);
    return end <= now;
}

function resetEditState() {
    editingVolontarioId = null;
    editingMezzoId = null;
    editingServizioId = null;
    editingSquadraAibId = null;
    editingProtocolloIngressoId = null;
    editingAttrezzaturaId = null;
    editingPrelievoMagazzinoId = null;
    resetVolontarioFileDeleteState();
}

function getVolontarioInitials(volontario = {}) {
    const nome = volontario.nome || "";
    const cognome = volontario.cognome || "";
    return `${nome.charAt(0)}${cognome.charAt(0)}`.toUpperCase() || "--";
}

function resetVolontarioFileDeleteState() {
    pendingVolontarioFileDeletes = { foto: false, cartaIdentita: false, allegatoV: false, patenti: new Set(), qualificheCoordinamento: new Set() };
}

function hasPendingVolontarioPatenteDelete(patente) {
    return pendingVolontarioFileDeletes.patenti.has(patente);
}

function hasPendingVolontarioQualificaCoordinamentoDelete(qualifica) {
    return pendingVolontarioFileDeletes.qualificheCoordinamento.has(qualifica);
}

function setVolontarioFileDeleteButton(button, show) {
    if (button) button.classList.toggle("hidden", !show);
}

function getFilenameFromPath(path) {
    return String(path || "").split("/").filter(Boolean).pop() || "";
}

function setVolontarioFileName(el, path) {
    if (!el) return;
    const filename = getFilenameFromPath(path);
    el.innerText = filename;
    el.title = filename;
    el.classList.toggle("hidden", !filename);
}

function clearVolontarioFileDelete(type, patente = null) {
    if (type === "foto") {
        pendingVolontarioFileDeletes.foto = false;
    }
    if (type === "cartaIdentita") {
        pendingVolontarioFileDeletes.cartaIdentita = false;
        const file = document.getElementById("v-carta-identita")?.files?.[0] || null;
        if (file) setVolontarioFileName(document.getElementById("v-carta-identita-filename"), file.name);
    }
    if (type === "allegatoV") {
        pendingVolontarioFileDeletes.allegatoV = false;
        const file = document.getElementById("v-allegato-v")?.files?.[0] || null;
        if (file) setVolontarioFileName(document.getElementById("v-allegato-v-filename"), file.name);
    }
    if (type === "patente" && patente) {
        pendingVolontarioFileDeletes.patenti.delete(patente);
        const file = document.querySelector(`[data-patente-file-input="${patente}"]`)?.files?.[0] || null;
        if (file) setVolontarioFileName(document.querySelector(`[data-patente-filename="${patente}"]`), file.name);
    }
    if (type === "qualificaCoordinamento" && patente) {
        pendingVolontarioFileDeletes.qualificheCoordinamento.delete(patente);
        const file = document.querySelector(`[data-qualifica-coordinamento-file-input="${patente}"]`)?.files?.[0] || null;
        if (file) setVolontarioFileName(document.querySelector(`[data-qualifica-coordinamento-filename="${patente}"]`), file.name);
    }
}

function markVolontarioFileForDelete(type, patente = null) {
    if (!editingVolontarioId) return;

    if (type === "foto") {
        pendingVolontarioFileDeletes.foto = true;
        const input = document.getElementById("v-foto");
        if (input) input.value = "";
        setVolontarioFotoPreview(volontari.find(v => v.id === editingVolontarioId) || null, null);
        const current = document.getElementById("v-foto-current");
        if (current) current.innerText = "Foto eliminata al salvataggio.";
        setVolontarioFileName(document.getElementById("v-foto-filename"), "");
        setVolontarioFileDeleteButton(document.getElementById("v-foto-delete"), false);
    }

    if (type === "cartaIdentita") {
        pendingVolontarioFileDeletes.cartaIdentita = true;
        const input = document.getElementById("v-carta-identita");
        if (input) {
            input.value = "";
            input.required = false;
        }
        const current = document.getElementById("v-carta-identita-current");
        if (current) current.innerText = "Carta d'identita eliminata al salvataggio.";
        setVolontarioFileName(document.getElementById("v-carta-identita-filename"), "");
        setVolontarioFileDeleteButton(document.getElementById("v-carta-identita-delete"), false);
    }

    if (type === "allegatoV") {
        pendingVolontarioFileDeletes.allegatoV = true;
        const input = document.getElementById("v-allegato-v");
        if (input) input.value = "";
        const current = document.getElementById("v-allegato-v-current");
        if (current) current.innerText = "ALLEGATO V eliminato al salvataggio.";
        setVolontarioFileName(document.getElementById("v-allegato-v-filename"), "");
        setVolontarioFileDeleteButton(document.getElementById("v-allegato-v-delete"), false);
    }

    if (type === "patente" && patente) {
        pendingVolontarioFileDeletes.patenti.add(patente);
        const input = document.querySelector(`[data-patente-file-input="${patente}"]`);
        if (input) input.value = "";
        const current = document.querySelector(`[data-patente-current="${patente}"]`);
        if (current) current.innerText = "File patente eliminato al salvataggio.";
        setVolontarioFileName(document.querySelector(`[data-patente-filename="${patente}"]`), "");
        setVolontarioFileDeleteButton(document.querySelector(`[data-patente-delete="${patente}"]`), false);
    }

    if (type === "qualificaCoordinamento" && patente) {
        pendingVolontarioFileDeletes.qualificheCoordinamento.add(patente);
        const input = document.querySelector(`[data-qualifica-coordinamento-file-input="${patente}"]`);
        if (input) input.value = "";
        const current = document.querySelector(`[data-qualifica-coordinamento-current="${patente}"]`);
        if (current) current.innerText = "Attestato eliminato al salvataggio.";
        setVolontarioFileName(document.querySelector(`[data-qualifica-coordinamento-filename="${patente}"]`), "");
        setVolontarioFileDeleteButton(document.querySelector(`[data-qualifica-coordinamento-delete="${patente}"]`), false);
    }
}

function resetVolontarioFotoField() {
    const input = document.getElementById("v-foto");
    const preview = document.getElementById("v-foto-preview");
    const current = document.getElementById("v-foto-current");
    const deleteButton = document.getElementById("v-foto-delete");
    const filename = document.getElementById("v-foto-filename");

    if (input) input.value = "";
    if (preview) {
        preview.innerHTML = "--";
        preview.classList.remove("bg-cover", "bg-center");
        preview.style.backgroundImage = "";
    }
    if (current) current.innerText = "";
    setVolontarioFileName(filename, "");
    setVolontarioFileDeleteButton(deleteButton, false);
}

function setVolontarioCartaIdentitaField(volontario = null) {
    const input = document.getElementById("v-carta-identita");
    const current = document.getElementById("v-carta-identita-current");
    const deleteButton = document.getElementById("v-carta-identita-delete");
    const filename = document.getElementById("v-carta-identita-filename");
    const isDeleted = pendingVolontarioFileDeletes.cartaIdentita;
    if (input) {
        input.value = "";
        input.required = !volontario?.carta_identita_path && !isDeleted;
    }
    if (current) {
        current.innerText = volontario?.carta_identita_path && !isDeleted ? "Carta d'identita gia caricata." : "";
    }
    setVolontarioFileName(filename, volontario?.carta_identita_path && !isDeleted ? volontario.carta_identita_path : "");
    setVolontarioFileDeleteButton(deleteButton, Boolean(volontario?.carta_identita_path && !isDeleted));
}

function resetVolontarioCartaIdentitaField() {
    setVolontarioCartaIdentitaField(null);
}

function setVolontarioAllegatoVField(volontario = null) {
    const input = document.getElementById("v-allegato-v");
    const current = document.getElementById("v-allegato-v-current");
    const deleteButton = document.getElementById("v-allegato-v-delete");
    const filename = document.getElementById("v-allegato-v-filename");
    const isDeleted = pendingVolontarioFileDeletes.allegatoV;
    if (input) input.value = "";
    if (current) {
        current.innerText = volontario?.allegato_v_path && !isDeleted ? "ALLEGATO V gia caricato." : "";
    }
    setVolontarioFileName(filename, volontario?.allegato_v_path && !isDeleted ? volontario.allegato_v_path : "");
    setVolontarioFileDeleteButton(deleteButton, Boolean(volontario?.allegato_v_path && !isDeleted));
}

function resetVolontarioAllegatoVField() {
    setVolontarioAllegatoVField(null);
}

function resetVolontarioPatentiFields() {
    const presenzaSelect = document.getElementById("v-patente-presente");
    if (presenzaSelect) presenzaSelect.value = "No";
    setCheckedValues("v-patenti", []);
    document.querySelectorAll("[data-patente-file-input]").forEach(input => {
        input.value = "";
    });
    document.querySelectorAll("[data-patente-current]").forEach(el => {
        el.innerText = "";
    });
    document.querySelectorAll("[data-patente-delete]").forEach(button => {
        setVolontarioFileDeleteButton(button, false);
    });
    document.querySelectorAll("[data-patente-filename]").forEach(el => {
        setVolontarioFileName(el, "");
    });
    toggleVolontarioPatentiPresence();
}

function getVolontarioPatentiFilesMap(volontario = null) {
    const files = volontario?.patenti_files || {};
    return files && typeof files === "object" && !Array.isArray(files) ? files : {};
}

function getVolontarioPatentiAutoFilePath(files = {}) {
    if (files[VOLONTARI_PATENTI_AUTO_FILE_KEY]) return files[VOLONTARI_PATENTI_AUTO_FILE_KEY];
    return VOLONTARI_PATENTI_AUTO_OPTIONS.map(patente => files[patente]).find(Boolean) || null;
}

function getVolontarioQualificheCoordinamentoFilesMap(volontario = null) {
    const files = volontario?.qualifiche_coordinamento_files || {};
    return files && typeof files === "object" && !Array.isArray(files) ? files : {};
}

function getVolontarioDocumentiCaricati(volontario = null) {
    const documenti = [];
    if (volontario?.carta_identita_path) {
        documenti.push({
            label: "Carta d'identita",
            description: "Documento di identita caricato.",
            bucket: VOLONTARI_CARTA_IDENTITA_BUCKET,
            path: volontario.carta_identita_path,
        });
    }
    if (volontario?.allegato_v_path) {
        documenti.push({
            label: "ALLEGATO V",
            description: "ALLEGATO V Firmato caricato.",
            bucket: VOLONTARI_ALLEGATO_V_BUCKET,
            path: volontario.allegato_v_path,
        });
    }

    const patentiFiles = getVolontarioPatentiFilesMap(volontario);
    Object.entries(patentiFiles).filter(([, path]) => Boolean(path)).forEach(([patente, path]) => {
        documenti.push({
            label: patente,
            description: "File patente caricato.",
            bucket: VOLONTARI_PATENTI_BUCKET,
            path,
        });
    });

    const qualificheCoordinamentoFiles = getVolontarioQualificheCoordinamentoFilesMap(volontario);
    Object.entries(qualificheCoordinamentoFiles).filter(([, path]) => Boolean(path)).forEach(([qualifica, path]) => {
        documenti.push({
            label: qualifica,
            description: "Attestato corso caricato.",
            bucket: VOLONTARI_ATTESTATI_BUCKET,
            path,
        });
    });

    return documenti.filter((documento, index, list) =>
        list.findIndex(item => item.bucket === documento.bucket && item.path === documento.path) === index
    );
}

function toggleVolontarioPatentiPresence() {
    const hasPatente = document.getElementById("v-patente-presente")?.value === "Si";
    const fieldsWrap = document.getElementById("v-patenti-fields-wrap");
    if (fieldsWrap) fieldsWrap.classList.toggle("hidden", !hasPatente);

    if (!hasPatente) {
        setCheckedValues("v-patenti", []);
        document.querySelectorAll("[data-patente-file-input]").forEach(input => {
            input.value = "";
        });
    }

    toggleVolontarioPatentiFiles();
}

function toggleVolontarioPatentiFiles() {
    const hasPatente = document.getElementById("v-patente-presente")?.value === "Si";
    const selected = new Set(collectCheckedValues("v-patenti"));
    const hasAutoPatente = VOLONTARI_PATENTI_AUTO_OPTIONS.some(patente => selected.has(patente));
    const wrap = document.getElementById("v-patenti-files-wrap");
    if (wrap) wrap.classList.toggle("hidden", !hasPatente || selected.size === 0);

    document.querySelectorAll("[data-patente-file]").forEach(row => {
        const patente = row.dataset.patenteFile;
        const show = hasPatente && (patente === VOLONTARI_PATENTI_AUTO_FILE_KEY ? hasAutoPatente : selected.has(patente));
        row.classList.toggle("hidden", !show);
        const input = row.querySelector("[data-patente-file-input]");
        if (input && !show) input.value = "";
    });
}

function setVolontarioPatentiFields(volontario = null) {
    const patenti = volontario?.patenti || [];
    const presenzaSelect = document.getElementById("v-patente-presente");
    if (presenzaSelect) presenzaSelect.value = patenti.length > 0 ? "Si" : "No";
    setCheckedValues("v-patenti", patenti);
    document.querySelectorAll("[data-patente-file-input]").forEach(input => {
        input.value = "";
    });

    const files = getVolontarioPatentiFilesMap(volontario);
    document.querySelectorAll("[data-patente-current]").forEach(el => {
        const patente = el.dataset.patenteCurrent;
        const hasFile = patente === VOLONTARI_PATENTI_AUTO_FILE_KEY ? getVolontarioPatentiAutoFilePath(files) : files[patente];
        const isDeleted = hasPendingVolontarioPatenteDelete(patente);
        el.innerText = hasFile && !isDeleted ? "File patente gia caricato." : "";
        setVolontarioFileName(
            document.querySelector(`[data-patente-filename="${patente}"]`),
            hasFile && !isDeleted ? hasFile : ""
        );
        setVolontarioFileDeleteButton(
            document.querySelector(`[data-patente-delete="${patente}"]`),
            Boolean(hasFile && !isDeleted)
        );
    });
    toggleVolontarioPatentiPresence();
}

function toggleVolontarioQualificheCoordinamentoFiles() {
    const selected = new Set(collectCheckedValues("v-qualifiche-coordinamento"));
    const wrap = document.getElementById("v-qualifiche-coordinamento-files-wrap");
    const hasSelectedAttestati = VOLONTARI_QUALIFICHE_COORDINAMENTO_ATTESTATI.some(qualifica => selected.has(qualifica));
    if (wrap) wrap.classList.toggle("hidden", !hasSelectedAttestati);

    document.querySelectorAll("[data-qualifica-coordinamento-file]").forEach(row => {
        const qualifica = row.dataset.qualificaCoordinamentoFile;
        const show = selected.has(qualifica);
        row.classList.toggle("hidden", !show);
        const input = row.querySelector("[data-qualifica-coordinamento-file-input]");
        if (input && !show) input.value = "";
    });
}

function setVolontarioQualificheCoordinamentoFiles(volontario = null) {
    document.querySelectorAll("[data-qualifica-coordinamento-file-input]").forEach(input => {
        input.value = "";
    });

    const files = getVolontarioQualificheCoordinamentoFilesMap(volontario);
    document.querySelectorAll("[data-qualifica-coordinamento-current]").forEach(el => {
        const qualifica = el.dataset.qualificaCoordinamentoCurrent;
        const hasFile = files[qualifica];
        const isDeleted = hasPendingVolontarioQualificaCoordinamentoDelete(qualifica);
        el.innerText = hasFile && !isDeleted ? "Attestato gia caricato." : "";
        setVolontarioFileName(
            document.querySelector(`[data-qualifica-coordinamento-filename="${qualifica}"]`),
            hasFile && !isDeleted ? hasFile : ""
        );
        setVolontarioFileDeleteButton(
            document.querySelector(`[data-qualifica-coordinamento-delete="${qualifica}"]`),
            Boolean(hasFile && !isDeleted)
        );
    });
    toggleVolontarioQualificheCoordinamentoFiles();
}

function setVolontarioFotoPreview(volontario = null, previewUrl = null) {
    const preview = document.getElementById("v-foto-preview");
    const current = document.getElementById("v-foto-current");
    const deleteButton = document.getElementById("v-foto-delete");
    const filename = document.getElementById("v-foto-filename");
    if (!preview) return;

    const initials = getVolontarioInitials(volontario || {});
    preview.classList.remove("bg-cover", "bg-center");
    preview.style.backgroundImage = "";
    const hasExistingFoto = Boolean(volontario?.foto_path && !pendingVolontarioFileDeletes.foto);
    setVolontarioFileName(filename, hasExistingFoto ? volontario.foto_path : "");

    if (previewUrl && !pendingVolontarioFileDeletes.foto) {
        preview.innerHTML = "";
        preview.style.backgroundImage = `url("${previewUrl.replaceAll('"', '%22')}")`;
        preview.classList.add("bg-cover", "bg-center");
        if (current) current.innerText = "Foto attuale caricata.";
        setVolontarioFileDeleteButton(deleteButton, hasExistingFoto);
        return;
    }

    preview.innerHTML = escapeHtml(initials);
    if (current) current.innerText = hasExistingFoto ? "Foto presente, anteprima non disponibile." : "";
    setVolontarioFileDeleteButton(deleteButton, hasExistingFoto);
}

function getSelectedVolontarioFotoFile() {
    return document.getElementById("v-foto")?.files?.[0] || null;
}

function getSelectedVolontarioCartaIdentitaFile() {
    return document.getElementById("v-carta-identita")?.files?.[0] || null;
}

function getSelectedVolontarioAllegatoVFile() {
    return document.getElementById("v-allegato-v")?.files?.[0] || null;
}

function validateVolontarioFotoFile(file) {
    if (!file) return null;
    if (!VOLONTARI_FOTO_ALLOWED_TYPES.includes(file.type)) {
        return "La foto deve essere JPG, PNG o WebP.";
    }
    if (file.size > VOLONTARI_FOTO_MAX_SIZE) {
        return "La foto non può superare 5 MB.";
    }
    return null;
}

function validateVolontarioCartaIdentitaFile(file) {
    if (!file) return null;
    if (!VOLONTARI_CARTA_IDENTITA_ALLOWED_TYPES.includes(file.type)) {
        return "La carta d'identita deve essere PDF, JPG, PNG o WebP.";
    }
    if (file.size > VOLONTARI_CARTA_IDENTITA_MAX_SIZE) {
        return "La carta d'identita non puo superare 10 MB.";
    }
    return null;
}

function validateVolontarioAllegatoVFile(file) {
    if (!file) return null;
    if (!VOLONTARI_ALLEGATO_V_ALLOWED_TYPES.includes(file.type)) {
        return "ALLEGATO V deve essere PDF, JPG, PNG o WebP.";
    }
    if (file.size > VOLONTARI_ALLEGATO_V_MAX_SIZE) {
        return "ALLEGATO V non puo superare 10 MB.";
    }
    return null;
}

function getSelectedVolontarioPatentiFiles() {
    const files = {};
    document.querySelectorAll("[data-patente-file-input]").forEach(input => {
        const patente = input.dataset.patenteFileInput;
        if (patente && input.files?.[0]) files[patente] = input.files[0];
    });
    return files;
}

function validateVolontarioPatenteFile(file) {
    if (!file) return null;
    if (!VOLONTARI_PATENTI_ALLOWED_TYPES.includes(file.type)) {
        return "Le patenti devono essere PDF, JPG, PNG o WebP.";
    }
    if (file.size > VOLONTARI_PATENTI_MAX_SIZE) {
        return "Ogni file patente non puo superare 10 MB.";
    }
    return null;
}

function validateVolontarioPatentiFiles(filesByPatente) {
    for (const [patente, file] of Object.entries(filesByPatente || {})) {
        const validationError = validateVolontarioPatenteFile(file);
        if (validationError) return `${patente}: ${validationError}`;
    }
    return null;
}

function getSelectedVolontarioQualificheCoordinamentoFiles() {
    const files = {};
    document.querySelectorAll("[data-qualifica-coordinamento-file-input]").forEach(input => {
        const qualifica = input.dataset.qualificaCoordinamentoFileInput;
        if (qualifica && input.files?.[0]) files[qualifica] = input.files[0];
    });
    return files;
}

function validateVolontarioAttestatoFile(file) {
    if (!file) return null;
    if (!VOLONTARI_ATTESTATI_ALLOWED_TYPES.includes(file.type)) {
        return "Gli attestati devono essere PDF, JPG, PNG o WebP.";
    }
    if (file.size > VOLONTARI_ATTESTATI_MAX_SIZE) {
        return "Ogni attestato non puo superare 10 MB.";
    }
    return null;
}

function validateVolontarioQualificheCoordinamentoFiles(filesByQualifica) {
    for (const [qualifica, file] of Object.entries(filesByQualifica || {})) {
        const validationError = validateVolontarioAttestatoFile(file);
        if (validationError) return `${qualifica}: ${validationError}`;
    }
    return null;
}

function getVolontarioFotoPath(volontarioId, file) {
    const extensionByType = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
    };
    const extension = extensionByType[file.type] || "jpg";
    return `${volontarioId}/foto.${extension}`;
}

function getVolontarioCartaIdentitaPath(volontarioId, file) {
    const extensionByType = {
        "application/pdf": "pdf",
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
    };
    const extension = extensionByType[file.type] || "pdf";
    return `${volontarioId}/carta-identita.${extension}`;
}

function getVolontarioAllegatoVPath(volontarioId, file) {
    const extensionByType = {
        "application/pdf": "pdf",
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
    };
    const extension = extensionByType[file.type] || "pdf";
    return `${volontarioId}/allegato-v.${extension}`;
}

function getVolontarioPatentePath(volontarioId, patente, file) {
    const extensionByType = {
        "application/pdf": "pdf",
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
    };
    const safePatente = String(patente).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const extension = extensionByType[file.type] || "pdf";
    return `${volontarioId}/patenti/${safePatente}.${extension}`;
}

function getVolontarioAttestatoPath(volontarioId, qualifica, file) {
    const extensionByType = {
        "application/pdf": "pdf",
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
    };
    const safeQualifica = String(qualifica).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const extension = extensionByType[file.type] || "pdf";
    return `${volontarioId}/attestati/${safeQualifica}.${extension}`;
}

async function uploadVolontarioFoto(volontarioId, file, previousPath = null) {
    const validationError = validateVolontarioFotoFile(file);
    if (validationError) throw new Error(validationError);

    const path = getVolontarioFotoPath(volontarioId, file);
    const { error } = await supabase.storage
        .from(VOLONTARI_FOTO_BUCKET)
        .upload(path, file, {
            cacheControl: "3600",
            contentType: file.type,
            upsert: true,
        });
    if (error) throw error;

    if (previousPath && previousPath !== path) {
        await supabase.storage.from(VOLONTARI_FOTO_BUCKET).remove([previousPath]);
    }

    return path;
}

async function uploadVolontarioCartaIdentita(volontarioId, file, previousPath = null) {
    const validationError = validateVolontarioCartaIdentitaFile(file);
    if (validationError) throw new Error(validationError);

    const path = getVolontarioCartaIdentitaPath(volontarioId, file);
    const { error } = await supabase.storage
        .from(VOLONTARI_CARTA_IDENTITA_BUCKET)
        .upload(path, file, {
            cacheControl: "3600",
            contentType: file.type,
            upsert: true,
        });
    if (error) throw error;

    if (previousPath && previousPath !== path) {
        await supabase.storage.from(VOLONTARI_CARTA_IDENTITA_BUCKET).remove([previousPath]);
    }

    return path;
}

async function uploadVolontarioAllegatoV(volontarioId, file, previousPath = null) {
    const validationError = validateVolontarioAllegatoVFile(file);
    if (validationError) throw new Error(validationError);

    const path = getVolontarioAllegatoVPath(volontarioId, file);
    const { error } = await supabase.storage
        .from(VOLONTARI_ALLEGATO_V_BUCKET)
        .upload(path, file, {
            cacheControl: "3600",
            contentType: file.type,
            upsert: true,
        });
    if (error) throw error;

    if (previousPath && previousPath !== path) {
        await supabase.storage.from(VOLONTARI_ALLEGATO_V_BUCKET).remove([previousPath]);
    }

    return path;
}

async function uploadVolontarioPatentiFiles(volontarioId, selectedPatenti, filesByPatente, previousFiles = {}, deletedFileKeys = new Set()) {
    const selected = new Set(selectedPatenti || []);
    const hasAutoPatente = VOLONTARI_PATENTI_AUTO_OPTIONS.some(patente => selected.has(patente));
    const selectedFileKeys = [
        ...(hasAutoPatente ? [VOLONTARI_PATENTI_AUTO_FILE_KEY] : []),
        ...["MMT", "Patente Nautica"].filter(patente => selected.has(patente)),
    ];
    const nextFiles = {};
    const pathsToRemove = [];

    for (const patente of selectedFileKeys) {
        const file = filesByPatente?.[patente] || null;
        const previousPath = patente === VOLONTARI_PATENTI_AUTO_FILE_KEY
            ? getVolontarioPatentiAutoFilePath(previousFiles)
            : previousFiles[patente];

        if (!file) {
            if (previousPath && !deletedFileKeys.has(patente)) nextFiles[patente] = previousPath;
            if (previousPath && deletedFileKeys.has(patente)) pathsToRemove.push(previousPath);
            continue;
        }

        const validationError = validateVolontarioPatenteFile(file);
        if (validationError) throw new Error(`${patente}: ${validationError}`);

        const path = getVolontarioPatentePath(volontarioId, patente, file);
        const { error } = await supabase.storage
            .from(VOLONTARI_PATENTI_BUCKET)
            .upload(path, file, {
                cacheControl: "3600",
                contentType: file.type,
                upsert: true,
            });
        if (error) throw error;

        if (previousPath && previousPath !== path) {
            pathsToRemove.push(previousPath);
        }
        nextFiles[patente] = path;
    }

    Object.entries(previousFiles || {}).forEach(([patente, path]) => {
        const isKeptFileKey = selectedFileKeys.includes(patente);
        const isKeptPath = Object.values(nextFiles).includes(path);
        if (!isKeptFileKey && !isKeptPath && path) pathsToRemove.push(path);
    });

    if (pathsToRemove.length > 0) {
        const { error } = await supabase.storage
            .from(VOLONTARI_PATENTI_BUCKET)
            .remove([...new Set(pathsToRemove)]);
        if (error) console.error("File patente non rimossi:", error);
    }

    return nextFiles;
}

async function uploadVolontarioQualificheCoordinamentoFiles(volontarioId, selectedQualifiche, filesByQualifica, previousFiles = {}, deletedFileKeys = new Set()) {
    const selected = new Set(selectedQualifiche || []);
    const selectedFileKeys = VOLONTARI_QUALIFICHE_COORDINAMENTO_ATTESTATI.filter(qualifica => selected.has(qualifica));
    const nextFiles = {};
    const pathsToRemove = [];

    for (const qualifica of selectedFileKeys) {
        const file = filesByQualifica?.[qualifica] || null;
        const previousPath = previousFiles[qualifica];

        if (!file) {
            if (previousPath && !deletedFileKeys.has(qualifica)) nextFiles[qualifica] = previousPath;
            if (previousPath && deletedFileKeys.has(qualifica)) pathsToRemove.push(previousPath);
            continue;
        }

        const validationError = validateVolontarioAttestatoFile(file);
        if (validationError) throw new Error(`${qualifica}: ${validationError}`);

        const path = getVolontarioAttestatoPath(volontarioId, qualifica, file);
        const { error } = await supabase.storage
            .from(VOLONTARI_ATTESTATI_BUCKET)
            .upload(path, file, {
                cacheControl: "3600",
                contentType: file.type,
                upsert: true,
            });
        if (error) throw error;

        if (previousPath && previousPath !== path) {
            pathsToRemove.push(previousPath);
        }
        nextFiles[qualifica] = path;
    }

    Object.entries(previousFiles || {}).forEach(([qualifica, path]) => {
        const isKeptFileKey = selectedFileKeys.includes(qualifica);
        const isKeptPath = Object.values(nextFiles).includes(path);
        if (!isKeptFileKey && !isKeptPath && path) pathsToRemove.push(path);
    });

    if (pathsToRemove.length > 0) {
        const { error } = await supabase.storage
            .from(VOLONTARI_ATTESTATI_BUCKET)
            .remove([...new Set(pathsToRemove)]);
        if (error) console.error("Attestati non rimossi:", error);
    }

    return nextFiles;
}

async function attachVolontariFotoUrls(list) {
    const paths = [...new Set((list || []).map(v => v.foto_path).filter(Boolean))];
    if (paths.length === 0) return list || [];

    const { data, error } = await supabase.storage
        .from(VOLONTARI_FOTO_BUCKET)
        .createSignedUrls(paths, 60 * 60);

    if (error) {
        console.error("Errore creazione URL foto volontari:", error);
        return list || [];
    }

    const urlByPath = new Map((data || []).map(item => [item.path, item.signedUrl]));
    return (list || []).map(v => ({
        ...v,
        foto_url: v.foto_path ? urlByPath.get(v.foto_path) || null : null,
    }));
}

function setModalFormMode(modalId, { title, submitText }) {
    const titleEl = document.getElementById(`${modalId}-title`);
    const submitEl = document.getElementById(`${modalId}-submit`);
    if (titleEl) titleEl.innerText = title;
    if (submitEl) submitEl.innerText = submitText;
}

function collectCheckedValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(input => input.value);
}

function setCheckedValues(name, values = []) {
    const selected = new Set(Array.isArray(values) ? values : []);
    document.querySelectorAll(`input[name="${name}"]`).forEach(input => {
        input.checked = selected.has(input.value);
    });
}

function getQualificationDateMap(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function addYearsToDate(date, years) {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
}

function parseLocalDate(value) {
    if (!value) return null;
    const parts = String(value).split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
}

function isQualificaAntincendioS(qualifica) {
    return String(qualifica || '').trim().toUpperCase() === 'S';
}

function getQualificationValidityYears(type, qualifica) {
    return type === 'antincendio' && isQualificaAntincendioS(qualifica) ? 1 : 3;
}

function getExpiredVolunteerQualifications(volontario = {}) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const groups = [
        {
            label: 'Antincendio',
            type: 'antincendio',
            values: volontario.qualifica_antincendio || [],
            dates: getQualificationDateMap(volontario.qualifica_antincendio_date),
        },
        {
            label: 'Coordinamento',
            type: 'coordinamento',
            values: volontario.qualifiche_coordinamento || [],
            dates: getQualificationDateMap(volontario.qualifiche_coordinamento_date),
        },
    ];

    return groups.flatMap(group => group.values
        .map(qualifica => {
            const achievedAt = parseLocalDate(group.dates[qualifica]);
            if (!achievedAt) return null;

            const expiresAt = addYearsToDate(achievedAt, getQualificationValidityYears(group.type, qualifica));
            expiresAt.setHours(0, 0, 0, 0);
            if (expiresAt > today) return null;

            return {
                label: group.label,
                qualifica,
            };
        })
        .filter(Boolean));
}

function renderVolunteerQualificationExpiryHtml(volontario) {
    const expired = getExpiredVolunteerQualifications(volontario);
    if (expired.length === 0) return '';

    return `
        <div class="mt-2 flex flex-wrap gap-1.5">
            ${expired.map(item => `
                <span class="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-300">
                    ${escapeHtml(item.label)} ${escapeHtml(item.qualifica)} scaduta
                </span>
            `).join('')}
        </div>
    `;
}

function renderQualificationDateFields(name, containerId, dateMap = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const selected = collectCheckedValues(name);
    const currentDates = {
        ...getQualificationDateMap(dateMap),
        ...collectQualificationDateMap(containerId, selected, false),
    };

    if (selected.length === 0) {
        container.innerHTML = '';
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    container.innerHTML = selected.map(qualifica => `
        <div>
            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Data conseguimento ${escapeHtml(qualifica)} <span class="text-amber-500">*</span></label>
            <input type="date" data-qualification-date="${escapeAttr(qualifica)}" value="${escapeAttr(currentDates[qualifica] || '')}" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
        </div>
    `).join('');
}

function collectQualificationDateMap(containerId, selectedValues, requireDates = true) {
    const container = document.getElementById(containerId);
    const selected = Array.isArray(selectedValues) ? selectedValues : [];
    const dates = {};
    if (!container) return dates;

    const inputs = Array.from(container.querySelectorAll('input[data-qualification-date]'));
    selected.forEach(qualifica => {
        const input = inputs.find(item => item.dataset.qualificationDate === qualifica);
        const value = input?.value || '';
        if (value) dates[qualifica] = value;
        if (requireDates && input) input.required = true;
    });

    return dates;
}

function renderVolontarioQualificationDateFields(volontario = {}) {
    renderQualificationDateFields(
        'v-qualifica-antincendio',
        'v-qualifica-antincendio-date-fields',
        volontario.qualifica_antincendio_date || {}
    );
    renderQualificationDateFields(
        'v-qualifiche-coordinamento',
        'v-qualifiche-coordinamento-date-fields',
        volontario.qualifiche_coordinamento_date || {}
    );
    toggleVolontarioQualificheCoordinamentoFiles();
}

function resetVolontarioQualificationDateFields() {
    renderVolontarioQualificationDateFields({});
}

function toggleVolontarioMatricolaField() {
    const censito = document.getElementById("v-censito")?.value === "Si";
    const wrap = document.getElementById("v-matricola-regionale-wrap");
    const input = document.getElementById("v-matricola-regionale");
    if (wrap) wrap.classList.toggle("hidden", !censito);
    if (input) {
        input.required = censito;
        if (!censito) input.value = "";
    }
}

// Funzione helper per caricare dati sincronicamente dallo stato in-memory
function getDB(table) {
    if (table === "pc_volontari") return volontari;
    if (table === "pc_mezzi") return mezzi;
    if (table === "pc_servizi") return servizi;
    if (table === "pc_squadre_aib") return squadreAib;
    if (table === "pc_protocollo_ingresso") return protocolliIngresso;
    if (table === "pc_attrezzature_magazzino") return attrezzatureMagazzino;
    return [];
}

// Funzione helper per caricare dati da Supabase in modo asincrono
function parseDateOnly(value) {
    if (!value) return null;
    const [year, month, day] = String(value).split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
}

function getTodayDateOnly() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getMezzoScadenzaManutenzioneReasons(mezzo) {
    const today = getTodayDateOnly();
    const scadenze = [
        { date: parseDateOnly(mezzo?.scadenza_rca), reason: 'RCA scaduta' },
        { date: parseDateOnly(mezzo?.scadenza_revisione), reason: 'Revisione scaduta' },
    ].filter(item => item.date && item.date <= today);

    if (scadenze.length === 0) return [];

    scadenze.sort((a, b) => a.date - b.date);
    const firstExpiredDate = scadenze[0].date.getTime();
    return scadenze
        .filter(item => item.date.getTime() === firstExpiredDate)
        .map(item => item.reason);
}

function getMezzoScadenzaAvvisoReasons(mezzo) {
    const today = getTodayDateOnly();
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const scadenze = [
        { date: parseDateOnly(mezzo?.scadenza_rca), label: 'RCA' },
        { date: parseDateOnly(mezzo?.scadenza_revisione), label: 'Revisione' },
    ].filter(item => item.date && item.date > today)
        .map(item => ({
            ...item,
            daysLeft: Math.ceil((item.date - today) / millisecondsPerDay),
        }))
        .filter(item => item.daysLeft <= 30);

    return scadenze
        .sort((a, b) => a.date - b.date)
        .map(item => `${item.label} scadrà fra ${item.daysLeft} ${item.daysLeft === 1 ? 'giorno' : 'giorni'}`);
}

async function updateMezziScaduti() {
    const scaduti = mezzi.filter(m =>
        canManageMezzo(m)
        && m.stato !== MEZZO_STATO_MANUTENZIONE
        && getMezzoScadenzaManutenzioneReasons(m).length > 0
    );

    if (scaduti.length === 0) return;

    const ids = scaduti.map(m => m.id);
    const { error } = await supabase
        .from('mezzi')
        .update({ stato: MEZZO_STATO_MANUTENZIONE })
        .in('id', ids);
    if (error) throw error;

    mezzi = mezzi.map(m => ids.includes(m.id) ? { ...m, stato: MEZZO_STATO_MANUTENZIONE } : m);
}

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
        's-aib-ora-rientro',
        ...AIB_SUPERFICIE_FIELDS.ceduo.map(f => f.id),
        ...AIB_SUPERFICIE_FIELDS.altoFusto.map(f => f.id),
        ...AIB_SUPERFICIE_FIELDS.nonBoscato.map(f => f.id),
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const tipologia = document.getElementById('s-aib-tipologia-servizio');
    if (tipologia) tipologia.value = 'L';
}

function toggleServizioAibFields() {
    const tipo = document.getElementById('s-tipo')?.value ?? '';
    const show = isAntincendioBoschivo(tipo);
    const section = document.getElementById('s-aib-section');
    const tipologiaBlock = document.getElementById('s-aib-tipologia-servizio-block');
    const tipologia = document.getElementById('s-aib-tipologia-servizio');
    const orariFine = document.getElementById('s-aib-orari-fine');
    const squadreBlock = document.getElementById('s-aib-squadre-block');
    if (section) section.classList.toggle('hidden', !show);
    if (tipologiaBlock) tipologiaBlock.classList.toggle('hidden', !show);
    if (tipologia) {
        tipologia.required = show;
        if (show && !tipologia.value) tipologia.value = 'L';
    }
    if (orariFine) orariFine.classList.toggle('hidden', !show);
    if (squadreBlock) squadreBlock.classList.toggle('hidden', !(show && isSalaOperativa()));
    document.querySelectorAll('.servizio-mezzi-required').forEach(el => el.classList.toggle('hidden', !show));
    populateServizioSquadreAibOptions(collectCheckedValues('s-aib-squadre-check'));
}

function toggleProtocolloRegionaleField() {
    const richiedente = document.getElementById('s-richiedente')?.value ?? '';
    const block = document.getElementById('s-protocollo-regionale-block');
    const input = document.getElementById('s-protocollo-regionale');
    const show = richiedente === 'SORU';
    if (block) block.classList.toggle('hidden', !show);
    if (input && !show) input.value = '';
}

function setServizioAibFormData(serv) {
    resetServizioAibFields();
    if (!serv || !isAntincendioBoschivo(serv.tipo)) return;

    const oraArrivo = document.getElementById('s-aib-ora-arrivo');
    const oraFine = document.getElementById('s-aib-ora-fine');
    const oraRientro = document.getElementById('s-aib-ora-rientro');
    const tipologia = document.getElementById('s-aib-tipologia-servizio');
    if (oraArrivo) oraArrivo.value = serv.oraArrivoIncendio || '';
    if (oraFine) oraFine.value = serv.oraFineIntervento || '';
    if (oraRientro) oraRientro.value = serv.oraRientroSede || '';
    if (tipologia) tipologia.value = serv.tipologiaAib || 'L';

    setSuperficieGroup(AIB_SUPERFICIE_FIELDS.ceduo, serv.superficieCeduo);
    setSuperficieGroup(AIB_SUPERFICIE_FIELDS.altoFusto, serv.superficieAltoFusto);
    setSuperficieGroup(AIB_SUPERFICIE_FIELDS.nonBoscato, serv.superficieNonBoscato);
}

function buildServizioAibPayload(tipo) {
    const oraFine = document.getElementById('s-aib-ora-fine')?.value.trim() || null;

    if (!isAntincendioBoschivo(tipo)) {
        return {
            ora_arrivo_incendio: null,
            ora_fine_intervento: oraFine,
            ora_rientro_sede: null,
            superficie_ceduo: null,
            superficie_alto_fusto: null,
            superficie_non_boscato: null,
            tipologia_aib: null,
        };
    }

    const tipologiaAib = document.getElementById('s-aib-tipologia-servizio')?.value || null;
    const oraArrivo = document.getElementById('s-aib-ora-arrivo')?.value.trim() || null;
    const oraRientro = document.getElementById('s-aib-ora-rientro')?.value.trim() || null;

    return {
        tipologia_aib: tipologiaAib,
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
        carrelliTrainanti: s.carrelli_trainanti || {},
        volontariIds: s.volontari_ids || [],
        volontariArt39: s.volontari_art39 || {},
        volontariMezzi: s.volontari_mezzi || {},
        volontariContaOre: s.volontari_conta_ore || {},
        volontariInReport: s.volontari_in_report || {},
        responsabileServizioId: s.responsabile_servizio_id || '',
        art39: s.art39 || 'Si',
        note: s.note,
        altriEnti: s.altri_enti_coinvolti,
        protocolloRegionale: s.protocollo_regionale || '',
        stato: s.stato,
        oraArrivoIncendio: s.ora_arrivo_incendio || '',
        oraFineIntervento: s.ora_fine_intervento || '',
        oraRientroSede: s.ora_rientro_sede || '',
        superficieCeduo: s.superficie_ceduo || {},
        superficieAltoFusto: s.superficie_alto_fusto || {},
        superficieNonBoscato: s.superficie_non_boscato || {},
        tipologiaAib: s.tipologia_aib || '',
        squadreAibIds: s.squadre_aib_ids || [],
        completatoDaProfileId: s.completato_da_profile_id || null,
        completatoDaNome: s.completato_da_nome || '',
        completatoDaCognome: s.completato_da_cognome || '',
        completatoIl: s.completato_il || null,
    };
}

function mapSquadraAibRow(s) {
    return {
        id: s.id,
        nome: s.nome,
        associazione_appartenenza: s.associazione_appartenenza,
        mezziIds: s.mezzi_ids || [],
        volontariIds: s.volontari_ids || [],
        caposquadraId: s.caposquadra_id || '',
        stato: s.stato || 'Operativa',
        disponibileDal: s.disponibile_dal || null,
        disponibileFino: s.disponibile_fino || null,
        createdAt: s.created_at || null,
    };
}

async function cleanupSquadreAibScadute() {
    if (!canAccessSquadreAib() || squadreAib.length === 0) return;

    const now = new Date();
    const operativeIds = squadreAib
        .filter(s => {
            const availabilityStart = getSquadraAibAvailabilityStart(s);
            const availabilityEnd = getSquadraAibAvailabilityEnd(s);
            return availabilityStart
                && availabilityEnd
                && availabilityStart <= now
                && availabilityEnd > now
                && canManageSquadraAib(s)
                && s.stato === 'Non operativa';
        })
        .map(s => s.id);
    const expiredIds = squadreAib
        .filter(s => {
            const availabilityEnd = getSquadraAibAvailabilityEnd(s);
            if (!availabilityEnd) return false;
            return availabilityEnd <= now
                && canManageSquadraAib(s)
                && s.stato !== 'Turno Terminato'
                && !isSquadraAibAssegnataAInterventoAttivo(s.id);
        })
        .map(s => s.id);

    if (operativeIds.length > 0) {
        const { error } = await supabase
            .from('squadre_aib')
            .update({ stato: 'Operativa' })
            .in('id', operativeIds);
        if (error) throw error;
    }

    if (expiredIds.length > 0) {
        const { error } = await supabase
            .from('squadre_aib')
            .update({ stato: 'Turno Terminato' })
            .in('id', expiredIds);
        if (error) throw error;
    }

    if (operativeIds.length === 0 && expiredIds.length === 0) return;
    squadreAib = squadreAib.map(s => {
        if (operativeIds.includes(s.id)) return { ...s, stato: 'Operativa' };
        if (expiredIds.includes(s.id)) return { ...s, stato: 'Turno Terminato' };
        return s;
    });
}

function startSquadreAibScadenzaTimer() {
    stopSquadreAibScadenzaTimer();
    if (!canAccessSquadreAib()) return;

    squadreAibScadenzaTimer = setInterval(async () => {
        try {
            await fetchDataFromSupabase();
        } catch (err) {
            console.error('Errore controllo scadenza squadre AIB:', err);
        }
    }, 60000);
}

function stopSquadreAibScadenzaTimer() {
    if (!squadreAibScadenzaTimer) return;
    clearInterval(squadreAibScadenzaTimer);
    squadreAibScadenzaTimer = null;
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
            volontari = await attachVolontariFotoUrls(applyVolontariScope(volResponse.data || []));
        }

        if (canAccessMezzi() || canLoadServizi()) {
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

            if (canLoadServizi()) {
                const [mezResponse, serResponse] = await Promise.all([
                    loadMezzi,
                    supabase.from('servizi').select('*').order('created_at', { ascending: true })
                ]);

                if (mezResponse.error) throw mezResponse.error;
                if (serResponse.error) throw serResponse.error;

                mezzi = applyMezziScope(mezResponse.data || []);
                servizi = (serResponse.data || []).map(mapServizioRow);
                await updateMezziScaduti();
                await enrichMezziFromServizi(servizi);
                await enrichVolontariFromServizi(servizi);
            } else if (canAccessMezzi()) {
                const mezResponse = await loadMezzi;

                if (mezResponse.error) throw mezResponse.error;

                mezzi = applyMezziScope(mezResponse.data || []);
                await updateMezziScaduti();
                servizi = [];
            } else {
                mezzi = [];
                servizi = [];
            }
        } else {
            mezzi = [];
            servizi = [];
        }

        if (canAccessSquadreAib() || canAccessDashboardCaposquadra() || isSalaOperativa()) {
            let squadreQuery = supabase.from('squadre_aib').select('*').order('created_at', { ascending: true });
            if (isSegreteria()) {
                const assoc = getUserAssociazione();
                squadreQuery = assoc
                    ? squadreQuery.eq('associazione_appartenenza', assoc)
                    : Promise.resolve({ data: [], error: null });
            }

            const squadreResponse = await squadreQuery;
            if (squadreResponse.error) throw squadreResponse.error;
            squadreAib = (squadreResponse.data || []).map(mapSquadraAibRow);
            await cleanupSquadreAibScadute();
        } else {
            squadreAib = [];
        }

        if (canAccessDashboardCaposquadra() || isSalaOperativa()) {
            const operatoreSalaResponse = await supabase
                .from('operatore_sala_turno')
                .select('*')
                .eq('id', 1)
                .maybeSingle();
            if (operatoreSalaResponse.error) throw operatoreSalaResponse.error;
            operatoreSalaTurno = operatoreSalaResponse.data || null;
        } else {
            operatoreSalaTurno = null;
        }

        if (canAccessProtocolloIngresso()) {
            const protocolloResponse = await supabase
                .from('protocollo_ingresso')
                .select('*')
                .order('created_at', { ascending: false });
            if (protocolloResponse.error) throw protocolloResponse.error;
            protocolliIngresso = protocolloResponse.data || [];
        } else {
            protocolliIngresso = [];
        }

        if (canAccessProtocolloAssociazione()) {
            let protocolloAssociazioneQuery = supabase
                .from('protocollo_associazione')
                .select('*')
                .order('created_at', { ascending: false });

            if (isSegreteria()) {
                const assoc = getUserAssociazione();
                protocolloAssociazioneQuery = assoc
                    ? protocolloAssociazioneQuery.eq('associazione_appartenenza', assoc)
                    : Promise.resolve({ data: [], error: null });
            }

            const protocolloAssociazioneResponse = await protocolloAssociazioneQuery;
            if (protocolloAssociazioneResponse.error) throw protocolloAssociazioneResponse.error;
            protocolliAssociazione = protocolloAssociazioneResponse.data || [];
        } else {
            protocolliAssociazione = [];
        }

        if (canAccessMagazzino()) {
            let attrezzatureQuery = supabase
                .from('magazzino_attrezzature')
                .select('*')
                .order('created_at', { ascending: true });
            let prelieviQuery = supabase
                .from('magazzino_prelievi')
                .select('*')
                .order('data_prelievo', { ascending: false })
                .order('created_at', { ascending: false });

            if (isSegreteria()) {
                const assoc = getUserAssociazione();
                attrezzatureQuery = assoc
                    ? attrezzatureQuery.eq('associazione_appartenenza', assoc)
                    : Promise.resolve({ data: [], error: null });
                prelieviQuery = assoc
                    ? prelieviQuery.eq('associazione_appartenenza', assoc)
                    : Promise.resolve({ data: [], error: null });
            }

            const [attrezzatureResponse, tipiResponse, prelieviResponse, prelievoRigheResponse] = await Promise.all([
                attrezzatureQuery,
                supabase.from('magazzino_tipi_attrezzatura').select('*').order('nome', { ascending: true }),
                prelieviQuery,
                supabase.from('magazzino_prelievi_righe').select('*')
            ]);

            if (attrezzatureResponse.error) throw attrezzatureResponse.error;
            if (tipiResponse.error) throw tipiResponse.error;
            if (prelieviResponse.error) throw prelieviResponse.error;
            if (prelievoRigheResponse.error) throw prelievoRigheResponse.error;

            attrezzatureMagazzino = attrezzatureResponse.data || [];
            tipiAttrezzaturaMagazzino = tipiResponse.data || [];
            prelieviMagazzino = prelieviResponse.data || [];
            prelievoRigheMagazzino = prelievoRigheResponse.data || [];
        } else {
            attrezzatureMagazzino = [];
            tipiAttrezzaturaMagazzino = [];
            prelieviMagazzino = [];
            prelievoRigheMagazzino = [];
        }

        setSystemStatus(true);
        updateUI();
    } catch (err) {
        setSystemStatus(false);
        console.error("Errore durante il caricamento da Supabase:", err);
        showToast("Errore di caricamento", "Impossibile caricare i dati da Supabase.");
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
        toggleVolontarioMatricolaField();
        resetVolontarioFotoField();
        resetVolontarioCartaIdentitaField();
        resetVolontarioPatentiFields();
        setVolontarioQualificheCoordinamentoFiles(null);
        resetVolontarioQualificationDateFields();
        resetEditState();
        resetCapoSquadraServizioFormRestrictions();
        resetSalaOperativaServizioFormRestrictions();
        resetSegreteriaAttivitaFormRestrictions();
        resetProtocolloIngressoForm();
        resetProtocolloAssociazioneForm();
        resetPrelievoMagazzinoForm();
        setModalFormMode('modal-volontario', { title: 'Aggiungi Nuovo Volontario', submitText: 'Registra' });
        setModalFormMode('modal-mezzo', { title: 'Aggiungi Nuovo Mezzo di Soccorso', submitText: 'Registra' });
        setModalFormMode('modal-attrezzatura', { title: 'Nuova Attrezzatura', submitText: 'Registra' });
        setModalFormMode('modal-prelievo-magazzino', { title: 'Nuovo Prelievo', submitText: 'Registra' });
        setModalFormMode('modal-servizio', { title: 'Pianifica Servizio / Missione', submitText: 'Pianifica' });
    }
}

// --- CAMBIO TAB (NAVIGAZIONE) ---
function switchTab(tabId) {
    if (!canAccessDashboardCaposquadra() && tabId === 'dashboard-caposquadra') {
        tabId = canAccessServizi() ? 'servizi' : 'dashboard';
    }
    if (!canAccessVolontari() && tabId === 'volontari') {
        if (canAccessServizi()) tabId = 'servizi';
        else if (canAccessAttivita()) tabId = 'attivita';
        else tabId = 'dashboard';
    }
    if (!canAccessServizi() && tabId === 'servizi') {
        tabId = canAccessAttivita() ? 'attivita' : (canAccessVolontari() ? 'volontari' : 'dashboard');
    }
    if (!canAccessAttivita() && tabId === 'attivita') {
        tabId = canAccessVolontari() ? 'volontari' : 'dashboard';
    }
    if (!canAccessMezzi() && tabId === 'mezzi') {
        tabId = canAccessVolontari() ? 'volontari' : (canAccessAttivita() ? 'attivita' : 'dashboard');
    }
    if (!canAccessMagazzino() && tabId === 'magazzino') {
        tabId = canAccessVolontari() ? 'volontari' : (canAccessMezzi() ? 'mezzi' : 'dashboard');
    }
    if (!canAccessSquadreAib() && tabId === 'squadre-aib') {
        tabId = canAccessVolontari() ? 'volontari' : (canAccessServizi() ? 'servizi' : 'dashboard');
    }
    if (!canAccessProtocolloIngresso() && tabId === 'protocollo-ingresso') {
        tabId = canAccessServizi() ? 'servizi' : (canAccessVolontari() ? 'volontari' : 'dashboard');
    }
    if (!canAccessProtocolloAssociazione() && tabId === 'protocollo-associazione') {
        tabId = canAccessServizi() ? 'servizi' : (canAccessVolontari() ? 'volontari' : 'dashboard');
    }
    if (!hasMasterAccess() && (tabId === 'admin' || tabId === 'dashboard' || tabId === 'statistiche')) {
        if (canAccessServizi()) tabId = 'servizi';
        else if (canAccessAttivita()) tabId = 'attivita';
        else if (canAccessSquadreAib()) tabId = 'squadre-aib';
        else if (canAccessMagazzino()) tabId = 'magazzino';
        else if (canAccessVolontari()) tabId = 'volontari';
        else tabId = 'mezzi';
    }

    const currentTab = document.querySelector(".tab-content:not(.hidden)");
    const currentTabId = currentTab?.id?.replace(/^tab-/, "");
    if (appNavigationRefreshEnabled && currentTabId && currentTabId !== tabId) {
        sessionStorage.setItem(PENDING_VIEW_AFTER_REFRESH_KEY, tabId);
        window.location.reload();
        return;
    }

    // Nascondi tutti i contenuti delle tab
    document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
    // Rimuovi classe attiva da tutti i bottoni nav (sidebar)
    document.querySelectorAll(".nav-btn").forEach(el => {
        el.classList.remove("bg-slate-800", "text-amber-500", "shadow-md");
        el.classList.add("text-slate-400", "hover:text-white", "hover:bg-slate-800/50");
    });

    // Mostra tab selezionata
    const activeTab = document.getElementById(`tab-${tabId}`);
    if (!activeTab) return;
    activeTab.classList.remove("hidden");

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
        activeBottomBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }

    // Aggiorna titolo top bar
    const titleMap = {
        dashboard: "Dashboard",
        volontari: "Gestione Volontari",
        mezzi: "Gestione Flotta Mezzi",
        magazzino: "Gestione Magazzino",
        "squadre-aib": "Squadre A.I.B.",
        "dashboard-caposquadra": "Dashboard Caposquadra",
        servizi: "Sala Operativa",
        statistiche: "Statistiche",
        attivita: "Attività",
        "protocollo-ingresso": "Protocollo in Ingresso",
        "protocollo-associazione": "Protocollo Associazione",
        admin: "Gestione Utenti"
    };
    document.getElementById("page-title").innerText = titleMap[tabId] || tabId;

    if (tabId === "admin") {
        renderAdminProfiles();
        renderAdminAssociazioni();
    }

    if (tabId === "servizi") {
        setTimeout(() => {
            ensureServiziMap();
            renderServizi();
        }, 100);
    }

    if (tabId === "protocollo-ingresso") {
        renderProtocolloIngresso();
    }

    if (tabId === "protocollo-associazione") {
        renderProtocolloAssociazione();
    }

    if (tabId === "magazzino") {
        renderMagazzino();
    }

    if (tabId === "attivita") {
        renderAttivita();
    }

    if (tabId === "statistiche") {
        renderStatistiche();
    }

    if (tabId === "squadre-aib") {
        renderSquadreAib();
    }

    if (tabId === "dashboard-caposquadra") {
        renderDashboardCaposquadra();
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

    if (!hasMasterAccess()) {
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

function getServizioDurationHours(servizio) {
    if (servizio.stato !== 'Completato' || !servizio.data) return null;

    const start = new Date(servizio.data);
    if (Number.isNaN(start.getTime())) return null;

    const endTime = normalizeTimeValue(servizio.oraRientroSede || servizio.oraFineIntervento);
    if (!endTime) return null;

    const [hours, minutes] = endTime.split(':').map(Number);
    const end = new Date(start);
    end.setHours(hours, minutes, 0, 0);
    if (end <= start) {
        end.setDate(end.getDate() + 1);
    }

    const diffHours = (end.getTime() - start.getTime()) / 3600000;
    return diffHours > 0 ? diffHours : null;
}

function formatHours(value) {
    return Number(value || 0).toLocaleString('it-IT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function addStatHours(map, key, label, tipologia, hours) {
    const mapKey = `${key}__${tipologia}`;
    const current = map.get(mapKey) || { label, tipologia, hours: 0 };
    current.hours += hours;
    map.set(mapKey, current);
}

function renderStatisticheTable(tbodyId, rows, emptyMessage, columns) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    tbody.innerHTML = '';
    if (rows.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="${columns}" class="py-8 px-6 text-center text-slate-500 font-medium">${emptyMessage}</td>
            </tr>
        `;
        return;
    }

    rows.forEach(row => {
        if (columns === 2) {
            tbody.innerHTML += `
                <tr class="hover:bg-slate-800/10 transition-colors">
                    <td class="py-4 px-6 text-slate-100 font-semibold">${escapeHtml(row.tipologia)}</td>
                    <td class="py-4 px-6 text-right text-amber-400 font-bold">${formatHours(row.hours)}</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML += `
            <tr class="hover:bg-slate-800/10 transition-colors">
                <td class="py-4 px-6 text-slate-100 font-semibold">${escapeHtml(row.label)}</td>
                <td class="py-4 px-6 text-slate-300">${escapeHtml(row.tipologia)}</td>
                <td class="py-4 px-6 text-right text-amber-400 font-bold">${formatHours(row.hours)}</td>
            </tr>
        `;
    });
}

function renderStatisticheGroupedTable(tbodyId, rows, emptyMessage) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    tbody.innerHTML = '';
    if (rows.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="py-8 px-6 text-center text-slate-500 font-medium">${emptyMessage}</td>
            </tr>
        `;
        return;
    }

    const grouped = new Map();
    rows.forEach(row => {
        const current = grouped.get(row.label) || { label: row.label, hours: 0, details: [] };
        current.hours += row.hours;
        current.details.push({ tipologia: row.tipologia, hours: row.hours });
        grouped.set(row.label, current);
    });

    [...grouped.values()]
        .sort((a, b) => a.label.localeCompare(b.label, 'it'))
        .forEach(row => {
            const details = row.details
                .sort((a, b) => a.tipologia.localeCompare(b.tipologia, 'it'))
                .map(detail => `
                    <div class="flex items-center justify-between gap-4 py-2 border-t border-slate-800/60">
                        <span class="text-slate-300">${escapeHtml(detail.tipologia)}</span>
                        <span class="text-amber-400 font-bold">${formatHours(detail.hours)}</span>
                    </div>
                `).join('');

            tbody.innerHTML += `
                <tr class="hover:bg-slate-800/10 transition-colors">
                    <td colspan="3" class="py-4 px-6">
                        <details class="group">
                            <summary class="flex cursor-pointer list-none items-center justify-between gap-4 text-slate-100 font-semibold">
                                <span class="inline-flex items-center gap-2">
                                    <span>${escapeHtml(row.label)}</span>
                                    <span class="text-[10px] text-slate-500 group-open:rotate-180 transition-transform">v</span>
                                </span>
                                <span class="text-right text-amber-400 font-bold">${formatHours(row.hours)}</span>
                            </summary>
                            <div class="mt-3">${details}</div>
                        </details>
                    </td>
                </tr>
            `;
        });
}

function getSquadraAibAvailabilityInterval(squadra, now = new Date()) {
    const start = getSquadraAibAvailabilityStart(squadra);
    const end = getSquadraAibAvailabilityEnd(squadra);
    if (!start || !end || now <= start) return null;

    const effectiveEnd = squadra.stato === 'Turno Terminato' ? end : new Date(Math.min(now.getTime(), end.getTime()));
    return effectiveEnd > start ? { start, end: effectiveEnd } : null;
}

function getServizioAibInterval(servizio) {
    if (servizio.stato !== 'Completato' || !servizio.data) return null;

    const start = new Date(servizio.data);
    if (Number.isNaN(start.getTime())) return null;

    const endTime = normalizeTimeValue(servizio.oraRientroSede || servizio.oraFineIntervento);
    if (!endTime) return null;

    const [hours, minutes] = endTime.split(':').map(Number);
    const end = new Date(start);
    end.setHours(hours, minutes, 0, 0);
    if (end <= start) {
        end.setDate(end.getDate() + 1);
    }

    return end > start ? { start, end } : null;
}

function getOverlappedHours(baseInterval, intervals) {
    const baseStart = baseInterval.start.getTime();
    const baseEnd = baseInterval.end.getTime();
    const clipped = intervals
        .map(interval => ({
            start: Math.max(baseStart, interval.start.getTime()),
            end: Math.min(baseEnd, interval.end.getTime()),
        }))
        .filter(interval => interval.end > interval.start)
        .sort((a, b) => a.start - b.start);

    if (clipped.length === 0) return 0;

    const merged = [];
    clipped.forEach(interval => {
        const last = merged[merged.length - 1];
        if (!last || interval.start > last.end) {
            merged.push({ ...interval });
        } else {
            last.end = Math.max(last.end, interval.end);
        }
    });

    return merged.reduce((total, interval) => total + ((interval.end - interval.start) / 3600000), 0);
}

function renderStatisticheSquadreAibVuoto(rows) {
    const tbody = document.getElementById('statistiche-squadre-aib-vuoto-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (rows.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="py-8 px-6 text-center text-slate-500 font-medium">Nessuna ora a vuoto calcolabile.</td>
            </tr>
        `;
        return;
    }

    rows.forEach(row => {
        tbody.innerHTML += `
            <tr class="hover:bg-slate-800/10 transition-colors">
                <td class="py-4 px-6 text-slate-300">${escapeHtml(row.associazione)}</td>
                <td class="py-4 px-6 text-slate-100 font-semibold">${escapeHtml(row.nome)}</td>
                <td class="py-4 px-6 text-right text-amber-400 font-bold">${formatHours(row.hours)}</td>
            </tr>
        `;
    });
}

function renderStatisticheNonCalcolabili(serviziList) {
    const wrap = document.getElementById('statistiche-non-calcolabili');
    const list = document.getElementById('statistiche-non-calcolabili-list');
    if (!wrap || !list) return;

    if (serviziList.length === 0) {
        wrap.classList.add('hidden');
        list.innerHTML = '';
        return;
    }

    wrap.classList.remove('hidden');
    list.innerHTML = serviziList.map(s => `
        <span class="inline-flex max-w-full px-2.5 py-1 bg-slate-800 text-slate-300 border border-slate-700/60 rounded-xl text-xs font-semibold">
            <span class="truncate">${escapeHtml(s.id)} · ${escapeHtml(s.tipo)}</span>
        </span>
    `).join('');
}

function renderStatisticheSoruSenzaProtocollo(serviziSenzaProtocollo, total) {
    const countEl = document.getElementById('statistiche-soru-senza-protocollo-count');
    const totalEl = document.getElementById('statistiche-soru-totale-count');
    const listEl = document.getElementById('statistiche-soru-senza-protocollo-list');
    if (!countEl || !totalEl || !listEl) return;

    countEl.textContent = serviziSenzaProtocollo.length;
    totalEl.textContent = total;

    if (serviziSenzaProtocollo.length === 0) {
        listEl.innerHTML = '<div class="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-400">Nessun servizio SORU senza protocollo regionale.</div>';
        return;
    }

    listEl.innerHTML = serviziSenzaProtocollo.map(servizio => {
        const editId = escapeAttr(JSON.stringify(servizio.id));
        return `
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
            <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-sm font-bold text-white">${escapeHtml(servizio.id)}</span>
                    <span class="rounded-lg border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">${escapeHtml(servizio.stato || 'Senza stato')}</span>
                </div>
                <div class="mt-1 text-sm text-slate-300 truncate">${escapeHtml(servizio.tipo || 'Senza tipologia')}</div>
                <div class="mt-1 text-xs text-slate-500">${escapeHtml(formatServizioDataPianificata(servizio.data))}</div>
            </div>
            <button type="button" onclick="openEditServizioModal(${editId})" class="shrink-0 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md shadow-amber-500/10">
                Modifica
            </button>
        </div>
    `;
    }).join('');
}

function getStatisticheData() {
    const volontariList = getDB('pc_volontari');
    const mezziList = getDB('pc_mezzi');
    const serviziList = getDB('pc_servizi');
    const squadreAibList = getDB('pc_squadre_aib');
    const volontariById = new Map(volontariList.map(v => [v.id, v]));
    const mezziById = new Map(mezziList.map(m => [m.id, m]));
    const volontariStats = new Map();
    const mezziStats = new Map();
    const tipologieStats = new Map();
    const squadreAibVuotoStats = new Map();
    const nonCalcolabili = [];
    let soruTotale = 0;
    const soruSenzaProtocollo = [];

    serviziList.forEach(servizio => {
        if (servizio.richiedente === 'SORU') {
            soruTotale += 1;
            if (!String(servizio.protocolloRegionale || '').trim()) {
                soruSenzaProtocollo.push(servizio);
            }
        }

        if (servizio.stato !== 'Completato') return;

        const hours = getServizioDurationHours(servizio);
        if (hours === null) {
            nonCalcolabili.push(servizio);
            return;
        }

        const tipologia = servizio.tipo || 'Senza tipologia';
        const tipoStat = tipologieStats.get(tipologia) || { tipologia, hours: 0 };
        tipoStat.hours += hours;
        tipologieStats.set(tipologia, tipoStat);

        (servizio.volontariIds || []).forEach(id => {
            if ((servizio.volontariContaOre || {})[id] === 'No') return;
            const volontario = volontariById.get(id);
            if (!volontario) return;
            addStatHours(volontariStats, id, `${volontario.nome} ${volontario.cognome}`, tipologia, hours);
        });

        (servizio.mezziIds || []).forEach(id => {
            const mezzo = mezziById.get(id);
            if (!mezzo) return;
            const label = `${mezzo.modello}${mezzo.targa ? ` [${mezzo.targa}]` : ''}`;
            addStatHours(mezziStats, id, label, tipologia, hours);
        });
    });

    const now = new Date();
    squadreAibList
        .filter(squadra => ['Operativa', 'Turno Terminato'].includes(squadra.stato))
        .forEach(squadra => {
            const availabilityInterval = getSquadraAibAvailabilityInterval(squadra, now);
            if (!availabilityInterval) return;

            const interventiIntervals = serviziList
                .filter(servizio => (
                    isAntincendioBoschivo(servizio.tipo)
                    && (servizio.squadreAibIds || []).includes(squadra.id)
                ))
                .map(getServizioAibInterval)
                .filter(Boolean);

            const totalHours = (availabilityInterval.end.getTime() - availabilityInterval.start.getTime()) / 3600000;
            const busyHours = getOverlappedHours(availabilityInterval, interventiIntervals);
            const emptyHours = Math.max(0, totalHours - busyHours);
            if (emptyHours <= 0) return;

            const key = `${squadra.associazione_appartenenza || ''}__${squadra.nome || ''}`;
            const current = squadreAibVuotoStats.get(key) || {
                associazione: squadra.associazione_appartenenza || '—',
                nome: squadra.nome || 'Senza nome',
                hours: 0,
            };
            current.hours += emptyHours;
            squadreAibVuotoStats.set(key, current);
        });

    const byLabelAndTipologia = (a, b) => a.label.localeCompare(b.label, 'it') || a.tipologia.localeCompare(b.tipologia, 'it');
    const byTipologia = (a, b) => a.tipologia.localeCompare(b.tipologia, 'it');
    const byAssociazioneAndNome = (a, b) => a.associazione.localeCompare(b.associazione, 'it') || a.nome.localeCompare(b.nome, 'it');

    return {
        volontariStats: [...volontariStats.values()].sort(byLabelAndTipologia),
        mezziStats: [...mezziStats.values()].sort(byLabelAndTipologia),
        tipologieStats: [...tipologieStats.values()].sort(byTipologia),
        squadreAibVuotoStats: [...squadreAibVuotoStats.values()].sort(byAssociazioneAndNome),
        nonCalcolabili,
        soruTotale,
        soruSenzaProtocollo,
    };
}

function escapeCsvValue(value) {
    const text = String(value ?? '');
    return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function exportStatistiche() {
    if (!hasMasterAccess()) return;

    const {
        volontariStats,
        mezziStats,
        tipologieStats,
        squadreAibVuotoStats,
        nonCalcolabili,
    } = getStatisticheData();

    const lines = [];
    const addSection = (title, headers, rows) => {
        if (lines.length > 0) lines.push('');
        lines.push(title);
        lines.push(headers.map(escapeCsvValue).join(';'));
        rows.forEach(row => lines.push(row.map(escapeCsvValue).join(';')));
    };

    addSection('Ore volontari per tipologia', ['Volontario', 'Tipologia', 'Ore'], volontariStats.map(row => [
        row.label,
        row.tipologia,
        formatHours(row.hours),
    ]));
    addSection('Ore mezzi per tipologia', ['Mezzo', 'Tipologia', 'Ore'], mezziStats.map(row => [
        row.label,
        row.tipologia,
        formatHours(row.hours),
    ]));
    addSection('Ore per tipologia', ['Tipologia', 'Ore'], tipologieStats.map(row => [
        row.tipologia,
        formatHours(row.hours),
    ]));
    addSection('Ore a vuoto squadre AIB', ['Associazione', 'Squadra', 'Ore a vuoto'], squadreAibVuotoStats.map(row => [
        row.associazione,
        row.nome,
        formatHours(row.hours),
    ]));
    addSection('Servizi senza ore calcolabili', ['ID', 'Tipologia'], nonCalcolabili.map(servizio => [
        servizio.id,
        servizio.tipo,
    ]));

    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `statistiche-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function renderStatistiche() {
    if (!hasMasterAccess()) return;

    const {
        volontariStats,
        mezziStats,
        tipologieStats,
        squadreAibVuotoStats,
        nonCalcolabili,
        soruTotale,
        soruSenzaProtocollo,
    } = getStatisticheData();

    renderStatisticheGroupedTable(
        'statistiche-volontari-body',
        volontariStats,
        'Nessuna ora volontario calcolabile.'
    );
    renderStatisticheGroupedTable(
        'statistiche-mezzi-body',
        mezziStats,
        'Nessuna ora mezzo calcolabile.'
    );
    renderStatisticheTable(
        'statistiche-tipologie-body',
        tipologieStats,
        'Nessuna ora per tipologia calcolabile.',
        2
    );
    renderStatisticheSquadreAibVuoto(squadreAibVuotoStats);
    renderStatisticheSoruSenzaProtocollo(soruSenzaProtocollo, soruTotale);
    renderStatisticheNonCalcolabili(nonCalcolabili);
}

// --- SEZIONE 2: VOLONTARI (CRUD & VIEW) ---
function createExcelXmlWorksheet(sheetName, headers, rows) {
    const rowXml = [
        headers,
        ...rows,
    ].map(row => `
        <Row>${row.map(value => `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`).join('')}</Row>
    `).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
    <Worksheet ss:Name="${escapeXml(sheetName)}">
        <Table>${rowXml}</Table>
    </Worksheet>
</Workbook>`;
}

function closeVolontariExportMenu() {
    document.getElementById('volontari-export-menu')?.classList.add('hidden');
}

function toggleVolontariExportMenu(event) {
    event?.stopPropagation();
    document.getElementById('volontari-export-menu')?.classList.toggle('hidden');
}

document.addEventListener('click', event => {
    const dropdown = document.getElementById('volontari-export-dropdown');
    if (dropdown && !dropdown.contains(event.target)) {
        closeVolontariExportMenu();
    }
});

function exportVolontariNonCensiti() {
    if (!canAccessVolontari()) return;

    const headers = [
        'Associazione di appartenenza',
        'Cognome',
        'Nome',
        'Data Nascita',
        'Città nascita',
        'Codice Fiscale',
        'Indirizzo Residenza',
        'Città Residenza',
        'Numero cellulare',
    ];
    const rows = getDB("pc_volontari")
        .filter(v => v.censito === false)
        .sort((a, b) => String(a.cognome || '').localeCompare(String(b.cognome || ''), 'it')
            || String(a.nome || '').localeCompare(String(b.nome || ''), 'it'))
        .map(v => [
            v.associazione_appartenenza || '',
            v.cognome || '',
            v.nome || '',
            v.data_nascita || '',
            v.luogo_nascita || '',
            v.cf || '',
            v.via_residenza || '',
            v.comune_residenza || '',
            v.telefono || '',
        ]);

    if (rows.length === 0) {
        showToast("Nessun volontario", "Non ci sono volontari non censiti da esportare.");
        return;
    }

    const xml = createExcelXmlWorksheet('Volontari non censiti', headers, rows);
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    downloadBlob(blob, `volontari-non-censiti-${new Date().toISOString().slice(0, 10)}.xls`);
    showToast("Export completato", "Il file Excel dei volontari non censiti è stato scaricato.");
}

function formatVolontarioExportList(value) {
    return Array.isArray(value) ? value.join(', ') : '';
}

function formatVolontarioExportDates(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return '';

    return Object.entries(value)
        .map(([qualifica, data]) => `${qualifica}: ${data || ''}`)
        .join(', ');
}

function exportTuttiVolontari() {
    if (!canAccessVolontari()) return;

    const headers = [
        'Associazione di appartenenza',
        'Cognome',
        'Nome',
        'Data di nascita',
        'Luogo di nascita',
        'Codice Fiscale',
        'Via di residenza',
        'Comune di residenza',
        'Numero di telefono',
        'Email',
        'Censito',
        'Matricola Regionale',
        'Ruolo Operativo',
        'Stato Disponibilità',
        'Qualifica Antincendio',
        'Date Qualifica Antincendio',
        'Qualifiche Coordinamento',
        'Date Qualifiche Coordinamento',
        'Patenti',
    ];
    const rows = getDB("pc_volontari")
        .slice()
        .sort((a, b) => String(a.cognome || '').localeCompare(String(b.cognome || ''), 'it')
            || String(a.nome || '').localeCompare(String(b.nome || ''), 'it'))
        .map(v => [
            v.associazione_appartenenza || '',
            v.cognome || '',
            v.nome || '',
            v.data_nascita || '',
            v.luogo_nascita || '',
            v.cf || '',
            v.via_residenza || '',
            v.comune_residenza || '',
            v.telefono || '',
            v.email || '',
            v.censito === true ? 'Si' : 'No',
            v.matricola_regionale || '',
            v.ruolo || '',
            v.stato || '',
            formatVolontarioExportList(v.qualifica_antincendio),
            formatVolontarioExportDates(v.qualifica_antincendio_date),
            formatVolontarioExportList(v.qualifiche_coordinamento),
            formatVolontarioExportDates(v.qualifiche_coordinamento_date),
            formatVolontarioExportList(v.patenti),
        ]);

    if (rows.length === 0) {
        showToast("Nessun volontario", "Non ci sono volontari da esportare.");
        return;
    }

    const xml = createExcelXmlWorksheet('Tutti i volontari', headers, rows);
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    downloadBlob(blob, `tutti-volontari-${new Date().toISOString().slice(0, 10)}.xls`);
    showToast("Export completato", "Il file Excel con tutti i volontari è stato scaricato.");
}

function renderVolontari() {
    const volontari = getDB("pc_volontari");
    const tbody = document.getElementById("volontari-table-body");
    const search = document.getElementById("search-volontari").value.toLowerCase();
    const filterRuolo = document.getElementById("filter-ruolo").value;
    const filterStato = document.getElementById("filter-stato-volontario").value;
    const filterOrdine = document.getElementById("filter-ordine-volontari").value;

    tbody.innerHTML = "";

    let filtered = volontari.filter(v => {
        const matchSearch = `${v.nome} ${v.cognome} ${v.cf} ${v.telefono} ${v.associazione_appartenenza || ""}`.toLowerCase().includes(search);
        const matchRuolo = filterRuolo === "" || v.ruolo === filterRuolo;
        const matchStato = filterStato === "" || v.stato === filterStato;
        return matchSearch && matchRuolo && matchStato;
    });

    if (["nome-asc", "nome-desc", "cognome-asc", "cognome-desc"].includes(filterOrdine)) {
        filtered = filtered.sort((a, b) => {
            const field = filterOrdine.startsWith("nome") ? "nome" : "cognome";
            const secondaryField = field === "nome" ? "cognome" : "nome";
            const result = String(a[field] || "").localeCompare(String(b[field] || ""), "it")
                || String(a[secondaryField] || "").localeCompare(String(b[secondaryField] || ""), "it");
            return filterOrdine.endsWith("desc") ? -result : result;
        });
    }

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

        const initials = getVolontarioInitials(v);
        const fotoHtml = v.foto_url
            ? `<img src="${escapeAttr(v.foto_url)}" alt="Foto ${escapeAttr(`${v.nome} ${v.cognome}`)}" class="h-full w-full object-cover">`
            : escapeHtml(initials);
        const qualificationExpiryHtml = renderVolunteerQualificationExpiryHtml(v);
        const volontarioPdfBtn = v.censito === false
            ? `<button onclick="exportVolontarioPdf('${escapeAttr(v.id)}')" title="Scarica modulo V iscrizione" class="p-2 hover:bg-amber-950/30 rounded-lg text-slate-400 hover:text-amber-500 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
               </button>`
            : '';
        const documentiBtn = getVolontarioDocumentiCaricati(v).length > 0
            ? `<button onclick="visualizzaDocumentiVolontario('${escapeAttr(v.id)}')" title="Visualizza file caricati" class="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-500 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
               </button>`
            : '';

        tbody.innerHTML += `
            <tr class="hover:bg-slate-800/10 transition-colors">
                <td class="py-4 px-6 flex items-center gap-3">
                    <div class="h-10 w-10 rounded-full bg-slate-800 border border-slate-700/60 flex items-center justify-center font-bold text-amber-500 text-sm shrink-0">
                        ${fotoHtml}
                    </div>
                    <div>
                        <p class="font-bold text-white text-base">${v.nome} ${v.cognome}</p>
                        ${qualificationExpiryHtml}
                    </div>
                </td>
                <td class="py-4 px-6 text-slate-300 font-mono text-xs uppercase">${v.cf}</td>
                <td class="py-4 px-6">
                    <span class="px-3 py-1 bg-slate-800 border border-slate-700/50 rounded-xl text-slate-300 font-medium text-xs whitespace-nowrap">${v.ruolo}</span>
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
                        ${volontarioPdfBtn}
                        ${documentiBtn}
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

async function exportVolontarioPdf(id) {
    const volontario = volontari.find(v => v.id === id);
    if (!volontario) return;

    if (volontario.censito !== false) {
        showToast("Export non disponibile", "Il PDF può essere generato solo per volontari non censiti.");
        return;
    }

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

    showPdfExportProgress();

    try {
        const response = await fetch('/volontari/pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/pdf',
                'X-CSRF-TOKEN': csrfToken || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                volontario: {
                    id: volontario.id,
                    nome: volontario.nome,
                    cognome: volontario.cognome,
                    cf: volontario.cf || '',
                    data_nascita: volontario.data_nascita || '',
                    luogo_nascita: volontario.luogo_nascita || '',
                    comune_residenza: volontario.comune_residenza || '',
                    via_residenza: volontario.via_residenza || '',
                    telefono: volontario.telefono || '',
                    email: volontario.email || '',
                    ruolo: volontario.ruolo || '',
                    stato: volontario.stato || '',
                    associazione_appartenenza: volontario.associazione_appartenenza || '',
                    censito: volontario.censito,
                },
            }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || (delivery === 'email' ? 'Errore durante l\'invio dell\'email' : 'Errore durante la generazione del PDF'));
        }

        const blob = await response.blob();
        const disposition = response.headers.get('Content-Disposition');
        let filename = `volontario-non-censito.pdf`;
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

        showToast("PDF generato", "Il PDF del volontario è stato scaricato.");
        hidePdfExportProgress(true);
    } catch (err) {
        console.error("Errore export PDF volontario:", err);
        showToast("Errore export PDF", err.message || "Impossibile generare il file PDF.");
        hidePdfExportProgress(false);
    }
}

async function visualizzaDocumentiVolontario(id) {
    const volontario = volontari.find(v => v.id === id);
    if (!volontario) return;

    const documenti = getVolontarioDocumentiCaricati(volontario);
    if (documenti.length === 0) {
        showToast("Nessun file", "Non ci sono file caricati per questo volontario.");
        return;
    }

    pendingVolontarioDocumentiId = id;
    renderVolontarioDocumentiOptions(documenti);
    toggleModal('modal-volontario-documenti', true);
}

function renderVolontarioDocumentiOptions(documenti = []) {
    const wrap = document.getElementById("volontario-documenti-options");
    if (!wrap) return;

    const buttons = documenti.map((documento, index) => `
        <div class="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4 transition-all group flex items-center gap-3">
            <input type="checkbox" data-volontario-documento-check value="${index}" class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900 shrink-0">
            <button type="button" onclick="confirmVolontarioDocumento(${index})" class="min-w-0 flex-1 text-left">
                <p class="font-bold text-white group-hover:text-amber-500 transition-colors">${escapeHtml(documento.label)}</p>
                <p class="text-xs text-slate-500 mt-1">${escapeHtml(documento.description)}</p>
            </button>
        </div>
    `);

    wrap.innerHTML = buttons.join("");
}

function closeVolontarioDocumentiModal() {
    pendingVolontarioDocumentiId = null;
    toggleModal('modal-volontario-documenti', false);
}

async function getVolontarioDocumentoSignedUrl(documento) {
    const { data, error } = await supabase.storage
        .from(documento.bucket)
        .createSignedUrl(documento.path, 60 * 10);

    if (error) throw error;
    return data.signedUrl;
}

function getVolontarioDocumentoFilename(documento) {
    const filename = String(documento.path || "").split("/").filter(Boolean).pop();
    return filename || `${documento.label}.pdf`;
}

function getSafeFilenamePart(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

function getVolontarioDocumentiZipFilename(volontario = {}) {
    const nominativo = [volontario.nome, volontario.cognome]
        .map(getSafeFilenamePart)
        .filter(Boolean)
        .join("-");

    return `documenti-volontario-${nominativo || volontario.id || "selezionato"}.zip`;
}

function getUniqueVolontarioDocumentoFilename(documento, usedNames) {
    const filename = getVolontarioDocumentoFilename(documento);
    if (!usedNames.has(filename)) {
        usedNames.add(filename);
        return filename;
    }

    const dotIndex = filename.lastIndexOf(".");
    const name = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
    const extension = dotIndex > 0 ? filename.slice(dotIndex) : "";
    let counter = 2;
    let uniqueName = `${name}-${counter}${extension}`;

    while (usedNames.has(uniqueName)) {
        counter += 1;
        uniqueName = `${name}-${counter}${extension}`;
    }

    usedNames.add(uniqueName);
    return uniqueName;
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function getCrc32Table() {
    if (window.__crc32Table) return window.__crc32Table;

    window.__crc32Table = Array.from({ length: 256 }, (_, index) => {
        let crc = index;
        for (let bit = 0; bit < 8; bit += 1) {
            crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
        }
        return crc >>> 0;
    });

    return window.__crc32Table;
}

function crc32(buffer) {
    const table = getCrc32Table();
    const bytes = new Uint8Array(buffer);
    let crc = 0xffffffff;

    for (const byte of bytes) {
        crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }

    return (crc ^ 0xffffffff) >>> 0;
}

function zipHeader(size) {
    return new Uint8Array(size);
}

function createVolontarioDocumentiZip(files) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    files.forEach(file => {
        const nameBytes = encoder.encode(file.name);
        const bytes = new Uint8Array(file.buffer);
        const crc = crc32(file.buffer);

        const localHeader = zipHeader(30 + nameBytes.length);
        const localView = new DataView(localHeader.buffer);
        localView.setUint32(0, 0x04034b50, true);
        localView.setUint16(4, 20, true);
        localView.setUint16(6, 0, true);
        localView.setUint16(8, 0, true);
        localView.setUint16(10, 0, true);
        localView.setUint16(12, 0, true);
        localView.setUint32(14, crc, true);
        localView.setUint32(18, bytes.length, true);
        localView.setUint32(22, bytes.length, true);
        localView.setUint16(26, nameBytes.length, true);
        localView.setUint16(28, 0, true);
        localHeader.set(nameBytes, 30);

        localParts.push(localHeader, bytes);

        const centralHeader = zipHeader(46 + nameBytes.length);
        const centralView = new DataView(centralHeader.buffer);
        centralView.setUint32(0, 0x02014b50, true);
        centralView.setUint16(4, 20, true);
        centralView.setUint16(6, 20, true);
        centralView.setUint16(8, 0, true);
        centralView.setUint16(10, 0, true);
        centralView.setUint16(12, 0, true);
        centralView.setUint16(14, 0, true);
        centralView.setUint32(16, crc, true);
        centralView.setUint32(20, bytes.length, true);
        centralView.setUint32(24, bytes.length, true);
        centralView.setUint16(28, nameBytes.length, true);
        centralView.setUint16(30, 0, true);
        centralView.setUint16(32, 0, true);
        centralView.setUint16(34, 0, true);
        centralView.setUint16(36, 0, true);
        centralView.setUint32(38, 0, true);
        centralView.setUint32(42, offset, true);
        centralHeader.set(nameBytes, 46);

        centralParts.push(centralHeader);
        offset += localHeader.length + bytes.length;
    });

    const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
    const endHeader = zipHeader(22);
    const endView = new DataView(endHeader.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, files.length, true);
    endView.setUint16(10, files.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, offset, true);
    endView.setUint16(20, 0, true);

    return new Blob([...localParts, ...centralParts, endHeader], { type: "application/zip" });
}

async function confirmVolontarioDocumento(index) {
    const volontario = volontari.find(v => v.id === pendingVolontarioDocumentiId);
    const documento = getVolontarioDocumentiCaricati(volontario)[index];
    if (!documento) return;

    const tab = window.open("about:blank", "_blank");
    if (!tab) {
        showToast("Popup bloccato", "Consenti l'apertura della nuova scheda per visualizzare il file.");
        return;
    }

    try {
        const signedUrl = await getVolontarioDocumentoSignedUrl(documento);
        closeVolontarioDocumentiModal();
        tab.location.href = signedUrl;
    } catch (err) {
        console.error("Errore apertura documento volontario:", err);
        tab.close();
        showToast("Errore", "Impossibile visualizzare il file caricato.");
    }
}

async function downloadVolontarioDocumenti() {
    const volontario = volontari.find(v => v.id === pendingVolontarioDocumentiId);
    const documenti = getVolontarioDocumentiCaricati(volontario);
    const selectedIndexes = Array.from(document.querySelectorAll("[data-volontario-documento-check]:checked"))
        .map(input => Number(input.value))
        .filter(index => Number.isInteger(index));
    const selectedDocumenti = selectedIndexes.map(index => documenti[index]).filter(Boolean);
    if (selectedDocumenti.length === 0) {
        showToast("Nessun file selezionato", "Seleziona almeno un file da scaricare.");
        return;
    }

    try {
        showPdfExportProgress("Preparazione download", "Attendere la preparazione dei file selezionati...");

        if (selectedDocumenti.length === 1) {
            const signedUrl = await getVolontarioDocumentoSignedUrl(selectedDocumenti[0]);
            const response = await fetch(signedUrl);
            if (!response.ok) throw new Error("Download file non riuscito.");

            const blob = await response.blob();
            downloadBlob(blob, getVolontarioDocumentoFilename(selectedDocumenti[0]));
        } else {
            const usedNames = new Set();
            const files = [];

            for (const documento of selectedDocumenti) {
                const signedUrl = await getVolontarioDocumentoSignedUrl(documento);
                const response = await fetch(signedUrl);
                if (!response.ok) throw new Error("Download file non riuscito.");

                files.push({
                    name: getUniqueVolontarioDocumentoFilename(documento, usedNames),
                    buffer: await response.arrayBuffer(),
                });
            }

            const zip = createVolontarioDocumentiZip(files);
            downloadBlob(zip, getVolontarioDocumentiZipFilename(volontario));
        }

        closeVolontarioDocumentiModal();
        hidePdfExportProgress(true);
        showToast("Download avviato", "Download dei file caricati avviato.");
    } catch (err) {
        console.error("Errore download documenti volontario:", err);
        hidePdfExportProgress(false);
        showToast("Errore", "Impossibile scaricare i file caricati.");
    }
}

function openNuovoVolontarioModal() {
    resetEditState();
    resetVolontarioFotoField();
    resetVolontarioCartaIdentitaField();
    resetVolontarioAllegatoVField();
    resetVolontarioPatentiFields();
    setVolontarioQualificheCoordinamentoFiles(null);
    resetVolontarioQualificationDateFields();
    setModalFormMode('modal-volontario', { title: 'Aggiungi Nuovo Volontario', submitText: 'Registra' });
    toggleVolontarioMatricolaField();
    setupVolontarioAssociazioneField();
    toggleModal('modal-volontario', true);
}

function openEditVolontarioModal(id) {
    const vol = volontari.find(v => v.id === id);
    if (!vol) return;

    resetVolontarioFileDeleteState();
    editingVolontarioId = id;
    setModalFormMode('modal-volontario', { title: 'Modifica Volontario', submitText: 'Salva modifiche' });

    document.getElementById("v-nome").value = vol.nome;
    document.getElementById("v-cognome").value = vol.cognome;
    document.getElementById("v-data-nascita").value = vol.data_nascita || "";
    document.getElementById("v-luogo-nascita").value = vol.luogo_nascita || "";
    document.getElementById("v-cf").value = vol.cf;
    document.getElementById("v-comune-residenza").value = vol.comune_residenza || "";
    document.getElementById("v-via-residenza").value = vol.via_residenza || "";
    document.getElementById("v-censito").value = vol.censito ? "Si" : "No";
    document.getElementById("v-matricola-regionale").value = vol.matricola_regionale || "";
    toggleVolontarioMatricolaField();
    document.getElementById("v-ruolo").value = vol.ruolo;
    setCheckedValues("v-qualifica-antincendio", vol.qualifica_antincendio || []);
    setCheckedValues("v-qualifiche-coordinamento", vol.qualifiche_coordinamento || []);
    renderVolontarioQualificationDateFields(vol);
    setVolontarioQualificheCoordinamentoFiles(vol);
    setVolontarioPatentiFields(vol);
    document.getElementById("v-stato").value = vol.stato;
    document.getElementById("v-telefono").value = vol.telefono;
    document.getElementById("v-email").value = vol.email || "";
    setupVolontarioAssociazioneField();
    if (hasMasterAccess()) {
        document.getElementById("v-associazione").value = vol.associazione_appartenenza || getDefaultAssociazione();
    }
    document.getElementById("v-foto").value = "";
    setVolontarioFotoPreview(vol, vol.foto_url);
    setVolontarioCartaIdentitaField(vol);
    setVolontarioAllegatoVField(vol);

    toggleModal('modal-volontario', true);
}

function previewVolontarioFoto() {
    const file = getSelectedVolontarioFotoFile();
    const vol = editingVolontarioId ? volontari.find(v => v.id === editingVolontarioId) : null;
    clearVolontarioFileDelete("foto");

    if (!file) {
        setVolontarioFotoPreview(vol, vol?.foto_url || null);
        return;
    }

    const validationError = validateVolontarioFotoFile(file);
    if (validationError) {
        showToast("Foto non valida", validationError);
        document.getElementById("v-foto").value = "";
        setVolontarioFotoPreview(vol, vol?.foto_url || null);
        return;
    }

    setVolontarioFotoPreview(vol, URL.createObjectURL(file));
    setVolontarioFileName(document.getElementById("v-foto-filename"), file.name);
    const current = document.getElementById("v-foto-current");
    if (current) current.innerText = "Nuova foto selezionata.";
}

async function saveVolontario(event) {
    event.preventDefault();
    if (isSavingVolontario) return;

    const nome = document.getElementById("v-nome").value;
    const cognome = document.getElementById("v-cognome").value;
    const data_nascita = document.getElementById("v-data-nascita").value;
    const luogo_nascita = document.getElementById("v-luogo-nascita").value;
    const cf = document.getElementById("v-cf").value.toUpperCase();
    const comune_residenza = document.getElementById("v-comune-residenza").value;
    const via_residenza = document.getElementById("v-via-residenza").value;
    const censito = document.getElementById("v-censito").value === "Si";
    const matricola_regionale = censito ? document.getElementById("v-matricola-regionale").value : null;
    const ruolo = document.getElementById("v-ruolo").value;
    const qualifica_antincendio = collectCheckedValues("v-qualifica-antincendio");
    const qualifiche_coordinamento = collectCheckedValues("v-qualifiche-coordinamento");
    const qualifica_antincendio_date = collectQualificationDateMap("v-qualifica-antincendio-date-fields", qualifica_antincendio);
    const qualifiche_coordinamento_date = collectQualificationDateMap("v-qualifiche-coordinamento-date-fields", qualifiche_coordinamento);
    const qualificheCoordinamentoFiles = getSelectedVolontarioQualificheCoordinamentoFiles();
    const patentePresente = document.getElementById("v-patente-presente")?.value === "Si";
    const patenti = patentePresente ? collectCheckedValues("v-patenti") : [];
    const patentiFiles = getSelectedVolontarioPatentiFiles();
    const stato = document.getElementById("v-stato").value;
    const telefono = document.getElementById("v-telefono").value;
    const email = document.getElementById("v-email").value;
    const associazione_appartenenza = getVolontarioAssociazioneValue();
    const fotoFile = getSelectedVolontarioFotoFile();
    const cartaIdentitaFile = getSelectedVolontarioCartaIdentitaFile();
    const allegatoVFile = getSelectedVolontarioAllegatoVFile();
    const fotoValidationError = validateVolontarioFotoFile(fotoFile);
    const cartaIdentitaValidationError = validateVolontarioCartaIdentitaFile(cartaIdentitaFile);
    const allegatoVValidationError = validateVolontarioAllegatoVFile(allegatoVFile);
    const qualificheCoordinamentoValidationError = validateVolontarioQualificheCoordinamentoFiles(qualificheCoordinamentoFiles);
    const patentiValidationError = validateVolontarioPatentiFiles(patentiFiles);
    const currentVolontario = editingVolontarioId ? volontari.find(v => v.id === editingVolontarioId) : null;
    if (!associazione_appartenenza) {
        showToast("Errore", "Associazione non configurata per questo account.");
        return;
    }
    if (qualifica_antincendio.some(qualifica => !qualifica_antincendio_date[qualifica])) {
        showToast("Dati incompleti", "Inserisci la data conseguimento per ogni qualifica antincendio selezionata.");
        return;
    }
    if (qualifiche_coordinamento.some(qualifica => !qualifiche_coordinamento_date[qualifica])) {
        showToast("Dati incompleti", "Inserisci la data conseguimento per ogni qualifica coordinamento selezionata.");
        return;
    }
    if (fotoValidationError) {
        showToast("Foto non valida", fotoValidationError);
        return;
    }
    if (cartaIdentitaValidationError) {
        showToast("Carta d'identita non valida", cartaIdentitaValidationError);
        return;
    }
    if (allegatoVValidationError) {
        showToast("ALLEGATO V non valido", allegatoVValidationError);
        return;
    }
    if (!cartaIdentitaFile && !currentVolontario?.carta_identita_path) {
        showToast("Dati incompleti", "Allega la copia della carta d'identita.");
        return;
    }
    if (patentiValidationError) {
        showToast("File patente non valido", patentiValidationError);
        return;
    }
    if (qualificheCoordinamentoValidationError) {
        showToast("Attestato non valido", qualificheCoordinamentoValidationError);
        return;
    }

    isSavingVolontario = true;
    const submitEl = document.getElementById("modal-volontario-submit");
    let saveSucceeded = false;
    if (submitEl) submitEl.disabled = true;
    showPdfExportProgress("Salvataggio volontario in corso", "Attendere il completamento del salvataggio...");

    const payload = {
        nome,
        cognome,
        data_nascita,
        luogo_nascita,
        cf,
        comune_residenza,
        via_residenza,
        censito,
        matricola_regionale,
        ruolo,
        qualifica_antincendio,
        qualifiche_coordinamento,
        qualifica_antincendio_date,
        qualifiche_coordinamento_date,
        patenti,
        stato,
        telefono,
        email,
        associazione_appartenenza
    };

    try {
        if (editingVolontarioId) {
            if (fotoFile) {
                payload.foto_path = await uploadVolontarioFoto(editingVolontarioId, fotoFile, currentVolontario?.foto_path || null);
            } else if (pendingVolontarioFileDeletes.foto && currentVolontario?.foto_path) {
                const { error: fotoRemoveError } = await supabase.storage
                    .from(VOLONTARI_FOTO_BUCKET)
                    .remove([currentVolontario.foto_path]);
                if (fotoRemoveError) console.error("Foto volontario non rimossa:", fotoRemoveError);
                payload.foto_path = null;
            }
            if (cartaIdentitaFile) {
                payload.carta_identita_path = await uploadVolontarioCartaIdentita(editingVolontarioId, cartaIdentitaFile, currentVolontario?.carta_identita_path || null);
            } else if (pendingVolontarioFileDeletes.cartaIdentita && currentVolontario?.carta_identita_path) {
                const { error: cartaRemoveError } = await supabase.storage
                    .from(VOLONTARI_CARTA_IDENTITA_BUCKET)
                    .remove([currentVolontario.carta_identita_path]);
                if (cartaRemoveError) console.error("Carta d'identita volontario non rimossa:", cartaRemoveError);
                payload.carta_identita_path = null;
            }
            if (allegatoVFile) {
                payload.allegato_v_path = await uploadVolontarioAllegatoV(editingVolontarioId, allegatoVFile, currentVolontario?.allegato_v_path || null);
            } else if (pendingVolontarioFileDeletes.allegatoV && currentVolontario?.allegato_v_path) {
                const { error: allegatoVRemoveError } = await supabase.storage
                    .from(VOLONTARI_ALLEGATO_V_BUCKET)
                    .remove([currentVolontario.allegato_v_path]);
                if (allegatoVRemoveError) console.error("ALLEGATO V volontario non rimosso:", allegatoVRemoveError);
                payload.allegato_v_path = null;
            }
            payload.patenti_files = await uploadVolontarioPatentiFiles(
                editingVolontarioId,
                patenti,
                patentiFiles,
                getVolontarioPatentiFilesMap(currentVolontario),
                pendingVolontarioFileDeletes.patenti
            );
            payload.qualifiche_coordinamento_files = await uploadVolontarioQualificheCoordinamentoFiles(
                editingVolontarioId,
                qualifiche_coordinamento,
                qualificheCoordinamentoFiles,
                getVolontarioQualificheCoordinamentoFilesMap(currentVolontario),
                pendingVolontarioFileDeletes.qualificheCoordinamento
            );

            const { error } = await supabase.from('volontari').update(payload).eq('id', editingVolontarioId);
            if (error) throw error;
            toggleModal('modal-volontario', false);
            showToast("Volontario Aggiornato", `${nome} ${cognome} è stato modificato con successo.`);
        } else {
            const newVolontario = { id: "v_" + Date.now(), ...payload };
            const { error } = await supabase.from('volontari').insert([newVolontario]);
            if (error) throw error;

            if (fotoFile) {
                const fotoPath = await uploadVolontarioFoto(newVolontario.id, fotoFile);
                const { error: fotoUpdateError } = await supabase
                    .from('volontari')
                    .update({ foto_path: fotoPath })
                    .eq('id', newVolontario.id);
                if (fotoUpdateError) throw fotoUpdateError;
            }
            if (cartaIdentitaFile) {
                const cartaIdentitaPath = await uploadVolontarioCartaIdentita(newVolontario.id, cartaIdentitaFile);
                const { error: cartaIdentitaUpdateError } = await supabase
                    .from('volontari')
                    .update({ carta_identita_path: cartaIdentitaPath })
                    .eq('id', newVolontario.id);
                if (cartaIdentitaUpdateError) throw cartaIdentitaUpdateError;
            }
            if (allegatoVFile) {
                const allegatoVPath = await uploadVolontarioAllegatoV(newVolontario.id, allegatoVFile);
                const { error: allegatoVUpdateError } = await supabase
                    .from('volontari')
                    .update({ allegato_v_path: allegatoVPath })
                    .eq('id', newVolontario.id);
                if (allegatoVUpdateError) throw allegatoVUpdateError;
            }
            if (patenti.length > 0) {
                const patenti_files = await uploadVolontarioPatentiFiles(newVolontario.id, patenti, patentiFiles, {});
                const { error: patentiUpdateError } = await supabase
                    .from('volontari')
                    .update({ patenti_files })
                    .eq('id', newVolontario.id);
                if (patentiUpdateError) throw patentiUpdateError;
            }
            if (qualifiche_coordinamento.length > 0) {
                const qualifiche_coordinamento_files = await uploadVolontarioQualificheCoordinamentoFiles(newVolontario.id, qualifiche_coordinamento, qualificheCoordinamentoFiles, {});
                const { error: qualificheUpdateError } = await supabase
                    .from('volontari')
                    .update({ qualifiche_coordinamento_files })
                    .eq('id', newVolontario.id);
                if (qualificheUpdateError) throw qualificheUpdateError;
            }

            toggleModal('modal-volontario', false);
            showToast("Volontario Registrato", `${nome} ${cognome} è stato inserito con successo.`);
        }
        await fetchDataFromSupabase();
        saveSucceeded = true;
    } catch (err) {
        console.error("Errore durante il salvataggio del volontario:", err);
        showToast("Errore di Salvataggio", "Impossibile salvare il volontario su Supabase.");
    } finally {
        hidePdfExportProgress(saveSucceeded);
        isSavingVolontario = false;
        if (submitEl) submitEl.disabled = false;
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
            const vol = volontari.find(v => v.id === id);
            const { error } = await supabase
                .from('volontari')
                .delete()
                .eq('id', id);
            if (error) throw error;

            if (vol?.foto_path) {
                const { error: storageError } = await supabase.storage
                    .from(VOLONTARI_FOTO_BUCKET)
                    .remove([vol.foto_path]);
                if (storageError) {
                    console.error("Volontario eliminato, ma foto non rimossa:", storageError);
                }
            }
            if (vol?.carta_identita_path) {
                const { error: cartaIdentitaStorageError } = await supabase.storage
                    .from(VOLONTARI_CARTA_IDENTITA_BUCKET)
                    .remove([vol.carta_identita_path]);
                if (cartaIdentitaStorageError) {
                    console.error("Volontario eliminato, ma carta d'identita non rimossa:", cartaIdentitaStorageError);
                }
            }
            if (vol?.allegato_v_path) {
                const { error: allegatoVStorageError } = await supabase.storage
                    .from(VOLONTARI_ALLEGATO_V_BUCKET)
                    .remove([vol.allegato_v_path]);
                if (allegatoVStorageError) {
                    console.error("Volontario eliminato, ma ALLEGATO V non rimosso:", allegatoVStorageError);
                }
            }
            const patentePaths = Object.values(getVolontarioPatentiFilesMap(vol)).filter(Boolean);
            if (patentePaths.length > 0) {
                const { error: patentiStorageError } = await supabase.storage
                    .from(VOLONTARI_PATENTI_BUCKET)
                    .remove(patentePaths);
                if (patentiStorageError) {
                    console.error("Volontario eliminato, ma file patenti non rimossi:", patentiStorageError);
                }
            }
            const attestatiPaths = Object.values(getVolontarioQualificheCoordinamentoFilesMap(vol)).filter(Boolean);
            if (attestatiPaths.length > 0) {
                const { error: attestatiStorageError } = await supabase.storage
                    .from(VOLONTARI_ATTESTATI_BUCKET)
                    .remove(attestatiPaths);
                if (attestatiStorageError) {
                    console.error("Volontario eliminato, ma attestati non rimossi:", attestatiStorageError);
                }
            }

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

        const motiviManutenzione = m.stato === MEZZO_STATO_MANUTENZIONE
            ? getMezzoScadenzaManutenzioneReasons(m)
            : [];
        const motivoManutenzioneHtml = motiviManutenzione.length > 0
            ? `<div class="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300">${motiviManutenzione.join('<br>')}</div>`
            : '';
        const avvisiScadenza = getMezzoScadenzaAvvisoReasons(m);
        const avvisoScadenzaHtml = avvisiScadenza.length > 0
            ? `<div class="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-300">${avvisiScadenza.join('<br>')}</div>`
            : '';
        const doveUbicatoHtml = m.dove_ubicato
            ? `<p class="mb-4 text-xs text-slate-400"><span class="font-bold uppercase tracking-wider text-slate-500">Dove ubicato?</span><br>${m.dove_ubicato}</p>`
            : '';

        let iconSvg = "";
        if (m.tipo === TIPO_FUORISTRADA) {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-amber-500"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5l2.5-4.25A2.5 2.5 0 017.65 11h5.7a2.5 2.5 0 012.15 1.25L18 16.5M5 16.5h14M7 16.5a2.5 2.5 0 105 0m5 0a2.5 2.5 0 105 0M8 11l2-3h4l2 3M2.75 19.5l3-1.25 3 1.25 3-1.25 3 1.25 3-1.25 3 1.25" /></svg>`;
        } else if (m.tipo === "Mezzo A.I.B") {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-amber-500"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16.5h1.5m13 0H20m-13 0a2 2 0 104 0m-4 0a2 2 0 114 0m5 0a2 2 0 104 0m-4 0a2 2 0 114 0m-5 0h5M4 16.5V9a1 1 0 011-1h7.5a1 1 0 011 1v7.5M13.5 11H18a1 1 0 011 1v4.5M6.5 8V5.5M9 8V5.5M5.75 5.5h4M16.5 4.5c1.25 1.15 2 2.2 2 3.25a2 2 0 11-4 0c0-1.05.75-2.1 2-3.25z" /></svg>`;
        } else if (m.tipo === "Pickup con gancio traino") {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-amber-500"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5h1.5m10 0H16m-10 0a2 2 0 104 0m-4 0a2 2 0 114 0m5.5 0a2 2 0 104 0m-4 0a2 2 0 114 0m-5.5 0h5.5M3 16.5V10a1 1 0 011-1h6l2.25 3H16a1 1 0 011 1v3.5M3 12h9.25M17 16.5h1.75c.69 0 1.25.56 1.25 1.25S20.56 19 21.25 19H22" /></svg>`;
        } else if (m.tipo === "Autovettura") {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-amber-500"><path stroke-linecap="round" stroke-linejoin="round" d="M7 17.5a1.75 1.75 0 11-3.5 0 1.75 1.75 0 013.5 0zm13.5 0a1.75 1.75 0 11-3.5 0 1.75 1.75 0 013.5 0zM5.25 15.75h13.5m-14.5 0H3V12.5a2 2 0 012-2h1.25l1.55-3.1A2.5 2.5 0 0110.04 6h3.92a2.5 2.5 0 012.24 1.4l1.55 3.1H19a2 2 0 012 2v3.25h-1.25M7 10.5h10" /></svg>`;
        } else if (m.tipo === "Motorino") {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-amber-500"><path stroke-linecap="round" stroke-linejoin="round" d="M7 17.25a2.75 2.75 0 11-5.5 0 2.75 2.75 0 015.5 0zm15.5 0a2.75 2.75 0 11-5.5 0 2.75 2.75 0 015.5 0zM7 17.25h3.25l2.25-5.5H15l2.25 5.5M8.5 9.25h3.25m5.75 0H20m-7.5 2.5l-2-4.5H8.75M15 11.75l2.5-2.5" /></svg>`;
        } else if (m.tipo === "Furgone") {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-amber-500"><path stroke-linecap="round" stroke-linejoin="round" d="M6.5 17a2 2 0 11-4 0 2 2 0 014 0zm14 0a2 2 0 11-4 0 2 2 0 014 0zM6.5 17h10M3 17V8.5A1.5 1.5 0 014.5 7H14a1.5 1.5 0 011.5 1.5V17M15.5 10.5H19l2 3V17h-1M5.5 10h5M5.5 13h8" /></svg>`;
        } else if (m.tipo === "Camper UCM") {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-amber-500"><path stroke-linecap="round" stroke-linejoin="round" d="M6.5 17.25a2 2 0 11-4 0 2 2 0 014 0zm14.5 0a2 2 0 11-4 0 2 2 0 014 0zM6.5 17.25H17M3 17.25V8a2 2 0 012-2h10.5a3 3 0 012.45 1.27L21 11.5v5.75h-1M5.5 9h4v3h-4V9zm6.5 0h4.25L18 11.5V12h-6V9zM8.5 15h5" /></svg>`;
        } else if (m.tipo === TIPO_CARRELLO_APPENDICE) {
            iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8 text-amber-500"><path stroke-linecap="round" stroke-linejoin="round" d="M5 9.5h11a1 1 0 011 1v6H5v-7zM5 16.5H3.5M17 16.5h2.5L22 14M7 18.25a1.75 1.75 0 103.5 0 1.75 1.75 0 00-3.5 0zm7 0a1.75 1.75 0 103.5 0 1.75 1.75 0 00-3.5 0zM6.5 12.25h9" /></svg>`;
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

                    ${doveUbicatoHtml}
                    ${motivoManutenzioneHtml}
                    ${avvisoScadenzaHtml}
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
    document.getElementById("m-scadenza-rca").value = mezzo.scadenza_rca || "";
    document.getElementById("m-scadenza-revisione").value = mezzo.scadenza_revisione || "";
    document.getElementById("m-dove-ubicato").value = mezzo.dove_ubicato || "";
    setupMezzoAssociazioneField();
    const mAssocSelect = document.getElementById("m-associazione");
    if (mAssocSelect) {
        mAssocSelect.value = mezzo.associazione_appartenenza || getDefaultAssociazione();
    }

    toggleModal('modal-mezzo', true);
}

async function saveMezzo(event) {
    event.preventDefault();
    const modello = document.getElementById("m-modello").value;
    const targa = document.getElementById("m-targa").value.toUpperCase();
    const tipo = document.getElementById("m-tipo").value;
    const stato = document.getElementById("m-stato").value;
    const scadenza_rca = document.getElementById("m-scadenza-rca").value;
    const scadenza_revisione = document.getElementById("m-scadenza-revisione").value;
    const dove_ubicato = document.getElementById("m-dove-ubicato").value;
    const associazione_appartenenza = getMezzoAssociazioneValue();

    if (!associazione_appartenenza) {
        showToast("Associazione mancante", "Seleziona l'associazione di appartenenza del mezzo.");
        return;
    }

    const payload = { modello, targa, tipo, stato, associazione_appartenenza, scadenza_rca, scadenza_revisione, dove_ubicato };

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

// --- SEZIONE: GESTIONE MAGAZZINO ---
function renderTipiAttrezzaturaOptions() {
    const tipoSelect = document.getElementById('a-tipo');
    const filtroSelect = document.getElementById('filter-tipo-attrezzatura');
    const options = tipiAttrezzaturaMagazzino.map(t => t.nome).filter(Boolean);

    if (tipoSelect) {
        tipoSelect.innerHTML = options
            .map(nome => `<option value="${escapeAttr(nome)}">${escapeHtml(nome)}</option>`)
            .join('');
    }

    if (filtroSelect) {
        const selected = filtroSelect.value;
        filtroSelect.innerHTML = '<option value="">Tutte le tipologie</option>' + options
            .map(nome => `<option value="${escapeAttr(nome)}">${escapeHtml(nome)}</option>`)
            .join('');
        filtroSelect.value = options.includes(selected) ? selected : '';
    }

    renderTipiAttrezzaturaList();
}

function renderTipiAttrezzaturaList() {
    const list = document.getElementById('tipi-attrezzatura-list');
    if (!list) return;

    if (tipiAttrezzaturaMagazzino.length === 0) {
        list.innerHTML = '<p class="text-sm text-slate-500 font-medium">Nessun tipo disponibile.</p>';
        return;
    }

    list.innerHTML = tipiAttrezzaturaMagazzino.map(tipo => `
        <div class="flex items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
            <span class="text-sm text-slate-200 font-semibold truncate">${escapeHtml(tipo.nome)}</span>
            <button type="button" onclick="deleteTipoAttrezzatura(${escapeAttr(JSON.stringify(tipo.id))})" class="shrink-0 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors">Delete</button>
        </div>
    `).join('');
}

function getTodayDateValue() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
}

function formatDateIt(value) {
    if (!value) return '—';
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('it-IT');
}

function getPrelievoRighe(prelievoId) {
    return prelievoRigheMagazzino.filter(riga => riga.prelievo_id === prelievoId);
}

function getAttrezzaturaById(id) {
    return attrezzatureMagazzino.find(item => item.id === id) || null;
}

function getPrelievoCurrentQuantitaByItem(prelievoId) {
    const map = new Map();
    getPrelievoRighe(prelievoId).forEach(riga => {
        map.set(riga.attrezzatura_id, (map.get(riga.attrezzatura_id) || 0) + Number(riga.quantita || 0));
    });
    return map;
}

function getAttrezzaturePrelevabili() {
    const currentByItem = editingPrelievoMagazzinoId
        ? getPrelievoCurrentQuantitaByItem(editingPrelievoMagazzinoId)
        : new Map();

    return attrezzatureMagazzino.filter(item => {
        const available = Number(item.quantita || 0) + (currentByItem.get(item.id) || 0);
        return available > 0;
    });
}

function getAvailableQuantitaForPrelievoItem(itemId) {
    const item = getAttrezzaturaById(itemId);
    if (!item) return 0;
    const currentByItem = editingPrelievoMagazzinoId
        ? getPrelievoCurrentQuantitaByItem(editingPrelievoMagazzinoId)
        : new Map();
    return Number(item.quantita || 0) + (currentByItem.get(itemId) || 0);
}

function renderPrelieviMagazzino() {
    const tbody = document.getElementById('prelievi-magazzino-table-body');
    if (!tbody) return;

    if (prelieviMagazzino.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="py-10 px-4 text-center text-slate-500 font-medium">Nessun prelievo registrato.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = prelieviMagazzino.map(prelievo => {
        const righe = getPrelievoRighe(prelievo.id);
        const items = righe.length
            ? righe.map(riga => {
                const item = getAttrezzaturaById(riga.attrezzatura_id);
                return `${escapeHtml(item?.nome_attrezzatura || 'Item non disponibile')} <span class="text-slate-500">x${Number(riga.quantita || 0)}</span>`;
            }).join('<br>')
            : '<span class="text-slate-500">—</span>';
        const isAperto = prelievo.stato === 'aperto';
        const statoClass = !isAperto
            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
            : 'bg-amber-500/10 text-amber-300 border-amber-500/30';

        return `
            <tr class="hover:bg-slate-800/30 transition-colors">
                <td class="py-4 px-4 text-slate-300">${escapeHtml(formatDateIt(prelievo.data_prelievo))}</td>
                <td class="py-4 px-4 text-slate-100 font-semibold">${escapeHtml(prelievo.consegnato_a)}</td>
                <td class="py-4 px-4 text-slate-300 leading-6">${items}</td>
                <td class="py-4 px-4">
                    <span class="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statoClass}">
                        ${isAperto ? 'Aperto' : 'Completato'}
                    </span>
                </td>
                <td class="py-4 px-4">
                    <div class="flex justify-end gap-1">
                        ${isAperto ? `<button type="button" onclick="exportBollaPrelievoMagazzinoPdf('${escapeAttr(prelievo.id)}')" title="Scarica bolla" class="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-sky-400 transition-colors">${ICON_DOWNLOAD}</button>` : ''}
                        <button type="button" onclick="openEditPrelievoMagazzinoModal('${escapeAttr(prelievo.id)}')" title="Modifica" ${isAperto ? '' : 'disabled'} class="p-2 rounded-lg text-slate-400 transition-colors ${isAperto ? 'hover:bg-slate-800 hover:text-amber-500' : 'opacity-40 cursor-not-allowed'}">${ICON_EDIT}</button>
                        <button type="button" onclick="rientroPrelievoMagazzino('${escapeAttr(prelievo.id)}')" title="Rientro" ${isAperto ? '' : 'disabled'} class="px-3 py-2 rounded-lg text-xs font-bold transition-colors ${isAperto ? 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-100' : 'bg-slate-800/40 text-slate-600 cursor-not-allowed'}">Rientro</button>
                        <button type="button" onclick="deletePrelievoMagazzino('${escapeAttr(prelievo.id)}')" title="Elimina transazione" class="p-2 hover:bg-rose-950/30 rounded-lg text-slate-400 hover:text-rose-500 transition-colors">${ICON_TRASH}</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderMagazzino() {
    renderTipiAttrezzaturaOptions();
    renderPrelieviMagazzino();

    const tbody = document.getElementById('magazzino-table-body');
    if (!tbody) return;

    const search = (document.getElementById('search-magazzino')?.value || '').toLowerCase();
    const filterTipo = document.getElementById('filter-tipo-attrezzatura')?.value || '';

    const filtered = getDB('pc_attrezzature_magazzino').filter(item => {
        const matchSearch = [
            item.nome_attrezzatura,
            item.tipo_attrezzatura,
            item.numero_inventario,
            item.quantita,
            item.associazione_appartenenza
        ].join(' ').toLowerCase().includes(search);
        const matchTipo = !filterTipo || item.tipo_attrezzatura === filterTipo;
        return matchSearch && matchTipo;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-10 px-4 text-center text-slate-500 font-medium">Nessuna attrezzatura trovata.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map(item => `
        <tr class="hover:bg-slate-800/30 transition-colors">
            <td class="py-4 px-4 text-slate-100 font-semibold">${escapeHtml(item.nome_attrezzatura)}</td>
            <td class="py-4 px-4 text-slate-300">${escapeHtml(item.tipo_attrezzatura)}</td>
            <td class="py-4 px-4 text-slate-300 font-mono text-xs font-bold">${escapeHtml(item.numero_inventario)}</td>
            <td class="py-4 px-4 text-slate-100 font-bold">${Number(item.quantita || 0)}</td>
            <td class="py-4 px-4 text-slate-400">${escapeHtml(item.associazione_appartenenza)}</td>
            <td class="py-4 px-4">
                <div class="flex justify-end gap-1">
                    <button type="button" onclick="openEditAttrezzaturaModal('${escapeAttr(item.id)}')" title="Modifica" class="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-500 transition-colors">${ICON_EDIT}</button>
                    <button type="button" onclick="deleteAttrezzatura('${escapeAttr(item.id)}')" title="Elimina" class="p-2 hover:bg-rose-950/30 rounded-lg text-slate-400 hover:text-rose-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openNuovaAttrezzaturaModal() {
    resetEditState();
    setModalFormMode('modal-attrezzatura', { title: 'Nuova Attrezzatura', submitText: 'Registra' });
    renderTipiAttrezzaturaOptions();
    setupAttrezzaturaAssociazioneField();
    const quantitaInput = document.getElementById('a-quantita');
    if (quantitaInput) quantitaInput.value = '0';
    toggleModal('modal-attrezzatura', true);
}

function openEditAttrezzaturaModal(id) {
    const attrezzatura = attrezzatureMagazzino.find(item => item.id === id);
    if (!attrezzatura) return;

    editingAttrezzaturaId = id;
    setModalFormMode('modal-attrezzatura', { title: 'Modifica Attrezzatura', submitText: 'Salva modifiche' });
    renderTipiAttrezzaturaOptions();

    document.getElementById('a-nome').value = attrezzatura.nome_attrezzatura || '';
    document.getElementById('a-tipo').value = attrezzatura.tipo_attrezzatura || '';
    document.getElementById('a-numero-inventario').value = attrezzatura.numero_inventario || '';
    document.getElementById('a-quantita').value = Number(attrezzatura.quantita || 0);

    setupAttrezzaturaAssociazioneField();
    const associazioneSelect = document.getElementById('a-associazione');
    if (associazioneSelect) {
        associazioneSelect.value = attrezzatura.associazione_appartenenza || getDefaultAssociazione();
    }

    toggleModal('modal-attrezzatura', true);
}

function openNuovoTipoAttrezzaturaModal() {
    document.getElementById('ta-nome').value = '';
    renderTipiAttrezzaturaList();
    toggleModal('modal-tipo-attrezzatura', true);
}

function resetPrelievoMagazzinoForm() {
    const items = document.getElementById('pm-items');
    if (items) items.innerHTML = '';
}

function renderPrelievoMagazzinoRows(rows = []) {
    const container = document.getElementById('pm-items');
    if (!container) return;

    const attrezzature = getAttrezzaturePrelevabili();
    if (attrezzature.length === 0) {
        container.innerHTML = '<p class="text-sm text-slate-500 font-medium">Nessun item disponibile con quantità maggiore di 0.</p>';
        return;
    }

    const normalizedRows = rows.length ? rows : [{ attrezzatura_id: attrezzature[0].id, quantita: 1 }];
    container.innerHTML = normalizedRows.map((row, index) => renderPrelievoMagazzinoRow(row, index)).join('');
}

function renderPrelievoMagazzinoRow(row = {}, index = 0) {
    const attrezzature = getAttrezzaturePrelevabili();
    const selectedId = row.attrezzatura_id || attrezzature[0]?.id || '';
    const options = attrezzature.map(item => {
        const available = getAvailableQuantitaForPrelievoItem(item.id);
        const label = `${item.nome_attrezzatura} - ${item.numero_inventario} (${available} disponibili)`;
        return `<option value="${escapeAttr(item.id)}" ${item.id === selectedId ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    }).join('');

    return `
        <div class="grid grid-cols-1 sm:grid-cols-[1fr_8rem_auto] gap-3 bg-slate-950 border border-slate-800 rounded-xl p-3" data-prelievo-row>
            <select name="pm-item" required class="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                ${options}
            </select>
            <input type="number" name="pm-quantita" min="1" step="1" value="${Number(row.quantita || 1)}" required class="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
            <button type="button" onclick="removePrelievoMagazzinoRow(this)" title="Rimuovi" class="px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 text-xs font-bold transition-colors ${index === 0 ? 'sm:invisible' : ''}">Rimuovi</button>
        </div>
    `;
}

function addPrelievoMagazzinoRow() {
    const container = document.getElementById('pm-items');
    if (!container) return;

    const rows = collectPrelievoMagazzinoRows({ allowInvalid: true });
    const attrezzature = getAttrezzaturePrelevabili();
    if (attrezzature.length === 0) return;
    rows.push({ attrezzatura_id: attrezzature[0].id, quantita: 1 });
    renderPrelievoMagazzinoRows(rows);
}

function removePrelievoMagazzinoRow(button) {
    const rows = collectPrelievoMagazzinoRows({ allowInvalid: true });
    if (rows.length <= 1) return;
    const rowEl = button.closest('[data-prelievo-row]');
    const index = Array.from(document.querySelectorAll('#pm-items [data-prelievo-row]')).indexOf(rowEl);
    rows.splice(index, 1);
    renderPrelievoMagazzinoRows(rows);
}

function collectPrelievoMagazzinoRows({ allowInvalid = false } = {}) {
    const rows = Array.from(document.querySelectorAll('#pm-items [data-prelievo-row]')).map(row => ({
        attrezzatura_id: row.querySelector('select[name="pm-item"]')?.value || '',
        quantita: Number.parseInt(row.querySelector('input[name="pm-quantita"]')?.value || '0', 10)
    }));

    if (allowInvalid) return rows.filter(row => row.attrezzatura_id);

    const byItem = new Map();
    rows.forEach(row => {
        if (!row.attrezzatura_id || !Number.isInteger(row.quantita) || row.quantita <= 0) return;
        byItem.set(row.attrezzatura_id, (byItem.get(row.attrezzatura_id) || 0) + row.quantita);
    });

    return Array.from(byItem.entries()).map(([attrezzatura_id, quantita]) => ({ attrezzatura_id, quantita }));
}

function validatePrelievoMagazzinoRows(rows) {
    if (rows.length === 0) {
        showToast('Campi mancanti', 'Seleziona almeno un item da prelevare.');
        return false;
    }

    for (const row of rows) {
        const available = getAvailableQuantitaForPrelievoItem(row.attrezzatura_id);
        if (row.quantita > available) {
            const item = getAttrezzaturaById(row.attrezzatura_id);
            showToast('Quantità non disponibile', `${item?.nome_attrezzatura || 'Item'} ha ${available} unità disponibili.`);
            return false;
        }
    }

    return true;
}

function getPrelievoMagazzinoAssociazione(rows) {
    const associazioni = [...new Set(rows.map(row => getAttrezzaturaById(row.attrezzatura_id)?.associazione_appartenenza).filter(Boolean))];
    if (associazioni.length === 1) return associazioni[0];
    if (hasMasterAccess() && associazioni.length > 1) return associazioni.join(', ');
    return null;
}

function openNuovoPrelievoMagazzinoModal() {
    resetEditState();
    setModalFormMode('modal-prelievo-magazzino', { title: 'Nuovo Prelievo', submitText: 'Registra' });
    document.getElementById('pm-data').value = getTodayDateValue();
    document.getElementById('pm-consegnato-a').value = '';
    renderPrelievoMagazzinoRows();
    toggleModal('modal-prelievo-magazzino', true);
}

function openEditPrelievoMagazzinoModal(id) {
    const prelievo = prelieviMagazzino.find(item => item.id === id);
    if (!prelievo || prelievo.stato === 'completato') return;

    editingPrelievoMagazzinoId = id;
    setModalFormMode('modal-prelievo-magazzino', { title: 'Modifica Prelievo', submitText: 'Salva modifiche' });
    document.getElementById('pm-data').value = prelievo.data_prelievo || getTodayDateValue();
    document.getElementById('pm-consegnato-a').value = prelievo.consegnato_a || '';
    renderPrelievoMagazzinoRows(getPrelievoRighe(id));
    toggleModal('modal-prelievo-magazzino', true);
}

async function setAttrezzaturaQuantita(itemId, quantita) {
    const { error } = await supabase
        .from('magazzino_attrezzature')
        .update({ quantita })
        .eq('id', itemId);
    if (error) throw error;
}

async function applyPrelievoQuantita(rows, oldRows = []) {
    const itemIds = [...new Set([
        ...rows.map(row => row.attrezzatura_id),
        ...oldRows.map(row => row.attrezzatura_id)
    ])];

    for (const itemId of itemIds) {
        const item = getAttrezzaturaById(itemId);
        if (!item) continue;
        const oldQty = oldRows
            .filter(row => row.attrezzatura_id === itemId)
            .reduce((sum, row) => sum + Number(row.quantita || 0), 0);
        const newQty = rows
            .filter(row => row.attrezzatura_id === itemId)
            .reduce((sum, row) => sum + Number(row.quantita || 0), 0);
        const nextQuantita = Number(item.quantita || 0) + oldQty - newQty;
        if (nextQuantita < 0) throw new Error('Quantità non disponibile');
        await setAttrezzaturaQuantita(itemId, nextQuantita);
    }
}

async function savePrelievoMagazzino(event) {
    event.preventDefault();
    if (isSavingPrelievoMagazzino) return;

    const data_prelievo = document.getElementById('pm-data')?.value;
    const consegnato_a = document.getElementById('pm-consegnato-a')?.value.trim();
    const rows = collectPrelievoMagazzinoRows();
    const associazione_appartenenza = getPrelievoMagazzinoAssociazione(rows);

    if (!data_prelievo || !consegnato_a || !associazione_appartenenza) {
        showToast('Campi mancanti', 'Compila tutti i campi richiesti e usa item della stessa associazione.');
        return;
    }
    if (!validatePrelievoMagazzinoRows(rows)) return;

    isSavingPrelievoMagazzino = true;
    const submitEl = document.getElementById('modal-prelievo-magazzino-submit');
    const submitText = submitEl?.innerText || '';
    let saveSucceeded = false;
    if (submitEl) submitEl.disabled = true;
    showPdfExportProgress('Salvataggio prelievo in corso', 'Attendere il completamento del salvataggio...');
    await new Promise(resolve => requestAnimationFrame(resolve));

    try {
        if (editingPrelievoMagazzinoId) {
            const { error } = await supabase.rpc('save_magazzino_prelievo', {
                p_prelievo_id: editingPrelievoMagazzinoId,
                p_data_prelievo: data_prelievo,
                p_consegnato_a: consegnato_a,
                p_associazione_appartenenza: associazione_appartenenza,
                p_righe: rows,
            });
            if (error) throw error;
            showToast('Prelievo aggiornato', 'La transazione è stata modificata.');
        } else {
            const { error } = await supabase.rpc('save_magazzino_prelievo', {
                p_prelievo_id: null,
                p_data_prelievo: data_prelievo,
                p_consegnato_a: consegnato_a,
                p_associazione_appartenenza: associazione_appartenenza,
                p_righe: rows,
            });
            if (error) throw error;
            showToast('Prelievo registrato', 'Le quantità sono state aggiornate.');
        }

        toggleModal('modal-prelievo-magazzino', false);
        editingPrelievoMagazzinoId = null;
        await fetchDataFromSupabase();
        saveSucceeded = true;
    } catch (err) {
        console.error('Errore salvataggio prelievo magazzino:', err);
        showToast('Errore di salvataggio', err?.message || 'Impossibile salvare il prelievo.');
        await fetchDataFromSupabase();
    } finally {
        hidePdfExportProgress(saveSucceeded);
        isSavingPrelievoMagazzino = false;
        if (submitEl) {
            submitEl.disabled = false;
            submitEl.innerText = submitText;
        }
    }
}

async function rientroPrelievoMagazzino(id) {
    const prelievo = prelieviMagazzino.find(item => item.id === id);
    if (!prelievo || prelievo.stato === 'completato') return;
    if (savingRientriPrelievoMagazzino.has(id)) return;
    if (!confirm('Confermare il rientro in magazzino di questo prelievo?')) return;

    savingRientriPrelievoMagazzino.add(id);
    try {
        const { error } = await supabase.rpc('rientro_magazzino_prelievo', {
            p_prelievo_id: id,
        });
        if (error) throw error;

        showToast('Rientro completato', 'La transazione è stata completata.');
        await fetchDataFromSupabase();
    } catch (err) {
        console.error('Errore rientro prelievo magazzino:', err);
        showToast('Errore', err?.message || 'Impossibile completare il rientro.');
        await fetchDataFromSupabase();
    } finally {
        savingRientriPrelievoMagazzino.delete(id);
    }
}

async function deletePrelievoMagazzino(id) {
    const prelievo = prelieviMagazzino.find(item => item.id === id);
    if (!prelievo) return;
    if (!confirm('Eliminare questa transazione di prelievo?')) return;

    try {
        const righe = getPrelievoRighe(id);
        if (prelievo.stato === 'aperto') {
            const quantitaByItem = new Map();
            righe.forEach(riga => {
                quantitaByItem.set(riga.attrezzatura_id, (quantitaByItem.get(riga.attrezzatura_id) || 0) + Number(riga.quantita || 0));
            });

            for (const [itemId, quantita] of quantitaByItem.entries()) {
                const item = getAttrezzaturaById(itemId);
                if (!item) continue;
                await setAttrezzaturaQuantita(item.id, Number(item.quantita || 0) + quantita);
            }
        }

        const { error } = await supabase
            .from('magazzino_prelievi')
            .delete()
            .eq('id', id);
        if (error) throw error;

        showToast('Transazione eliminata', 'Il prelievo è stato rimosso.');
        await fetchDataFromSupabase();
    } catch (err) {
        console.error('Errore eliminazione prelievo magazzino:', err);
        showToast('Errore', 'Impossibile eliminare la transazione.');
        await fetchDataFromSupabase();
    }
}

async function exportBollaPrelievoMagazzinoPdf(id) {
    const prelievo = prelieviMagazzino.find(item => item.id === id);
    if (!prelievo || prelievo.stato !== 'aperto') return;

    const righe = getPrelievoRighe(id).map(riga => {
        const item = getAttrezzaturaById(riga.attrezzatura_id);
        return {
            nome_attrezzatura: item?.nome_attrezzatura || 'Item non disponibile',
            associazione_appartenenza: item?.associazione_appartenenza || '',
            tipo_attrezzatura: item?.tipo_attrezzatura || '',
            numero_inventario: item?.numero_inventario || '',
            quantita: Number(riga.quantita || 0),
        };
    }).filter(riga => riga.quantita > 0);

    if (righe.length === 0) {
        showToast('Bolla non disponibile', 'Nessun item presente nel prelievo.');
        return;
    }

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    showPdfExportProgress('Generazione bolla in corso', 'Attendere il completamento del download...');

    try {
        const response = await fetch('/magazzino/prelievi/pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/pdf',
                'X-CSRF-TOKEN': csrfToken || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                prelievo: {
                    id: prelievo.id,
                    data_prelievo: prelievo.data_prelievo,
                    consegnato_a: prelievo.consegnato_a,
                    associazione_appartenenza: prelievo.associazione_appartenenza || '',
                    stato: prelievo.stato,
                },
                righe,
            }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Errore durante la generazione del PDF');
        }

        const blob = await response.blob();
        const disposition = response.headers.get('Content-Disposition');
        let filename = 'bolla-prelievo.pdf';
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

        showToast('PDF generato', 'La bolla di prelievo è stata scaricata.');
        hidePdfExportProgress(true);
    } catch (err) {
        console.error('Errore PDF bolla prelievo:', err);
        showToast('Errore PDF', err?.message || 'Impossibile generare la bolla.');
        hidePdfExportProgress(false);
    }
}

async function saveAttrezzatura(event) {
    event.preventDefault();

    const nome_attrezzatura = document.getElementById('a-nome')?.value.trim();
    const tipo_attrezzatura = document.getElementById('a-tipo')?.value;
    const numero_inventario = document.getElementById('a-numero-inventario')?.value.trim();
    const quantita = Number.parseInt(document.getElementById('a-quantita')?.value || '0', 10);
    const associazione_appartenenza = getAttrezzaturaAssociazioneValue();

    if (!nome_attrezzatura || !tipo_attrezzatura || !numero_inventario || !Number.isInteger(quantita) || quantita < 0 || !associazione_appartenenza) {
        showToast('Campi mancanti', 'Compila tutti i campi richiesti.');
        return;
    }

    const showMagazzinoCreateProgress = !editingAttrezzaturaId;
    let saveSucceeded = false;
    if (showMagazzinoCreateProgress) {
        showPdfExportProgress('Salvataggio item in corso', 'Attendere il completamento del salvataggio...');
        await new Promise(resolve => requestAnimationFrame(resolve));
    }

    try {
        const payload = {
            nome_attrezzatura,
            tipo_attrezzatura,
            numero_inventario,
            quantita,
            associazione_appartenenza
        };

        if (editingAttrezzaturaId) {
            const { error } = await supabase.from('magazzino_attrezzature').update(payload).eq('id', editingAttrezzaturaId);
            if (error) throw error;
            toggleModal('modal-attrezzatura', false);
            showToast('Attrezzatura aggiornata', `${nome_attrezzatura} modificata correttamente.`);
        } else {
            const { error } = await supabase.from('magazzino_attrezzature').insert([payload]);
            if (error) throw error;
            toggleModal('modal-attrezzatura', false);
            showToast('Attrezzatura registrata', `${nome_attrezzatura} inserita correttamente.`);
        }
        await fetchDataFromSupabase();
        saveSucceeded = true;
    } catch (err) {
        console.error('Errore salvataggio attrezzatura:', err);
        showToast('Errore di salvataggio', "Impossibile registrare l'attrezzatura su Supabase.");
    } finally {
        if (showMagazzinoCreateProgress) hidePdfExportProgress(saveSucceeded);
    }
}

async function deleteAttrezzatura(id) {
    if (!confirm("Sei sicuro di voler eliminare questa attrezzatura?")) return;

    try {
        const { error } = await supabase
            .from('magazzino_attrezzature')
            .delete()
            .eq('id', id);
        if (error) throw error;

        showToast('Attrezzatura eliminata', "L'attrezzatura è stata rimossa dal magazzino.");
        await fetchDataFromSupabase();
    } catch (err) {
        console.error("Errore eliminazione attrezzatura:", err);
        showToast('Errore', "Impossibile eliminare l'attrezzatura da Supabase.");
    }
}

async function saveTipoAttrezzatura(event) {
    event.preventDefault();

    const nome = document.getElementById('ta-nome')?.value.trim();
    if (!nome) {
        showToast('Campo mancante', 'Inserisci il nome del tipo attrezzatura.');
        return;
    }

    try {
        const { error } = await supabase.from('magazzino_tipi_attrezzatura').insert([{ nome }]);
        if (error) throw error;

        toggleModal('modal-tipo-attrezzatura', false);
        showToast('Tipo aggiunto', `${nome} inserito correttamente.`);
        await fetchDataFromSupabase();
    } catch (err) {
        console.error('Errore salvataggio tipo attrezzatura:', err);
        showToast('Errore di salvataggio', 'Impossibile registrare il tipo attrezzatura su Supabase.');
    }
}

async function deleteTipoAttrezzatura(id) {
    if (!id) return;

    const tipo = tipiAttrezzaturaMagazzino.find(item => item.id === id);
    if (!tipo?.nome) return;
    const nome = tipo.nome;

    const usedLocally = attrezzatureMagazzino.some(item => item.tipo_attrezzatura === nome);
    if (usedLocally) {
        showToast('Cancellazione non consentita', 'Questa categoria ha almeno 1 item associato.');
        return;
    }

    if (!confirm(`Sei sicuro di voler eliminare il tipo "${nome}"?`)) return;

    try {
        const { count, error: countError } = await supabase
            .from('magazzino_attrezzature')
            .select('id', { count: 'exact', head: true })
            .eq('tipo_attrezzatura', nome);
        if (countError) throw countError;

        if ((count || 0) > 0) {
            showToast('Cancellazione non consentita', 'Questa categoria ha almeno 1 item associato.');
            return;
        }

        const { error } = await supabase.rpc('delete_magazzino_tipo_attrezzatura', {
            p_tipo_id: id,
        });
        if (error) throw error;

        showToast('Tipo eliminato', `${nome} rimosso correttamente.`);
        await fetchDataFromSupabase();
    } catch (err) {
        console.error('Errore eliminazione tipo attrezzatura:', err);
        const isReferenced = err?.code === '23503';
        showToast(
            isReferenced ? 'Cancellazione non consentita' : 'Errore',
            isReferenced ? 'Questa categoria ha almeno 1 item associato.' : (err?.message || 'Impossibile eliminare il tipo attrezzatura da Supabase.')
        );
    }
}

// --- SEZIONE: SQUADRE A.I.B. ---
function canManageSquadraAib(squadra = null) {
    if (hasMasterAccess()) return true;
    return isSegreteria() && (!squadra || squadra.associazione_appartenenza === getUserAssociazione());
}

function getSquadraAibAssociazioneValue() {
    if (isSegreteria()) return getUserAssociazione();
    return document.getElementById('aib-squadra-associazione')?.value || null;
}

function setupSquadraAibAssociazioneField() {
    const selectWrap = document.getElementById('aib-squadra-associazione-select-wrap');
    const fissaWrap = document.getElementById('aib-squadra-associazione-fissa-wrap');
    const fissaInput = document.getElementById('aib-squadra-associazione-fissa');
    const fissaLabel = document.getElementById('aib-squadra-associazione-fissa-label');
    if (!selectWrap || !fissaWrap) return;

    if (isSegreteria()) {
        const assoc = getUserAssociazione() || '';
        selectWrap.classList.add('hidden');
        fissaWrap.classList.remove('hidden');
        if (fissaInput) fissaInput.value = assoc;
        if (fissaLabel) fissaLabel.innerText = assoc || 'Associazione non configurata';
    } else {
        selectWrap.classList.remove('hidden');
        fissaWrap.classList.add('hidden');
    }
}

function setupProtocolloAssociazioneField() {
    const selectWrap = document.getElementById('pa-associazione-select-wrap');
    const fissaWrap = document.getElementById('pa-associazione-fissa-wrap');
    const fissaInput = document.getElementById('pa-associazione-fissa');
    const fissaLabel = document.getElementById('pa-associazione-fissa-label');
    if (!selectWrap || !fissaWrap) return;

    if (isSegreteria()) {
        const assoc = getUserAssociazione() || '';
        selectWrap.classList.add('hidden');
        fissaWrap.classList.remove('hidden');
        if (fissaInput) fissaInput.value = assoc;
        if (fissaLabel) fissaLabel.innerText = assoc || 'Associazione non configurata';
    } else {
        selectWrap.classList.remove('hidden');
        fissaWrap.classList.add('hidden');
    }
}

function getSquadraAibCaposquadraId() {
    return document.querySelector('input[name="aib-squadra-caposquadra-check"]:checked')?.value || '';
}

function updateSquadraAibCaposquadraControls() {
    const selectedVolontari = new Set(collectCheckedValues('aib-squadra-volontari-check'));
    const caposquadraChecks = [...document.querySelectorAll('input[name="aib-squadra-caposquadra-check"]')];
    let selectedCaposquadra = getSquadraAibCaposquadraId();

    if (selectedCaposquadra && !selectedVolontari.has(selectedCaposquadra)) {
        caposquadraChecks.forEach(input => {
            if (input.value === selectedCaposquadra) input.checked = false;
        });
        selectedCaposquadra = '';
    }

    caposquadraChecks.forEach(input => {
        const wrapper = input.closest('[data-aib-caposquadra-control]');

        if (wrapper) {
            wrapper.classList.toggle('hidden', Boolean(selectedCaposquadra) && input.value !== selectedCaposquadra);
        }
    });
}

function handleSquadraAibVolontarioSelectionChange(checkbox) {
    if (!checkbox.checked) {
        document.querySelectorAll('input[name="aib-squadra-caposquadra-check"]').forEach(input => {
            if (input.value === checkbox.value) input.checked = false;
        });
    }

    updateSquadraAibCaposquadraControls();
}

function handleSquadraAibCaposquadraSelectionChange(checkbox) {
    if (checkbox.checked) {
        document.querySelectorAll('input[name="aib-squadra-caposquadra-check"]').forEach(input => {
            if (input !== checkbox) input.checked = false;
        });

        document.querySelectorAll('input[name="aib-squadra-volontari-check"]').forEach(input => {
            if (input.value === checkbox.value) input.checked = true;
        });
    }

    updateSquadraAibCaposquadraControls();
}

function populateSquadraAibModalOptions(selectedMezziIds = null, selectedVolontariIds = null, selectedCaposquadraId = null) {
    const associazione = getSquadraAibAssociazioneValue();
    const selectedMezzi = new Set(Array.isArray(selectedMezziIds) ? selectedMezziIds : collectCheckedValues('aib-squadra-mezzi-check'));
    const selectedVolontari = new Set(Array.isArray(selectedVolontariIds) ? selectedVolontariIds : collectCheckedValues('aib-squadra-volontari-check'));
    const selectedCaposquadra = typeof selectedCaposquadraId === 'string' ? selectedCaposquadraId : getSquadraAibCaposquadraId();
    const mezziBox = document.getElementById('aib-squadra-mezzi-list');
    const volontariBox = document.getElementById('aib-squadra-volontari-list');
    if (!mezziBox || !volontariBox) return;

    const mezziSearchEl = document.getElementById('aib-squadra-mezzi-search');
    const volontariSearchEl = document.getElementById('aib-squadra-volontari-search');
    if (mezziSearchEl) mezziSearchEl.value = '';
    if (volontariSearchEl) volontariSearchEl.value = '';

    const mezziDisponibili = getDB('pc_mezzi')
        .filter(m => m.associazione_appartenenza === associazione && !isCarrelloAppendice(m) && (m.stato === 'Disponibile' || selectedMezzi.has(m.id)));
    const volontariOperativi = getDB('pc_volontari')
        .filter(v => v.associazione_appartenenza === associazione && (v.stato === 'Operativo' || selectedVolontari.has(v.id)));

    mezziBox.innerHTML = mezziDisponibili.length
        ? mezziDisponibili.map(m => `
            <label data-aib-mezzo-search="${`${m.modello || ''} ${m.targa || ''} ${m.tipo || ''}`.toLowerCase()}" class="flex items-center gap-3 p-1.5 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors text-slate-200">
                <input type="checkbox" name="aib-squadra-mezzi-check" value="${m.id}" ${selectedMezzi.has(m.id) ? 'checked' : ''} class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900 w-4 h-4">
                <span class="text-xs font-semibold">${m.modello} [${m.targa}] (${m.tipo})</span>
            </label>
        `).join('')
        : `<p class="text-xs text-slate-500 p-2 text-center">Nessun mezzo disponibile per questa associazione.</p>`;

    volontariBox.innerHTML = volontariOperativi.length
        ? volontariOperativi.map(v => `
            <div data-aib-volontario-search="${`${v.nome || ''} ${v.cognome || ''} ${v.ruolo || ''}`.toLowerCase()}" class="flex items-center gap-3 p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-200">
                <label class="flex min-w-0 flex-1 items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="aib-squadra-volontari-check" value="${v.id}" ${selectedVolontari.has(v.id) ? 'checked' : ''} onchange="handleSquadraAibVolontarioSelectionChange(this)" class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900 w-4 h-4">
                    <span class="text-xs font-semibold truncate">${v.nome} ${v.cognome} (${v.ruolo})</span>
                </label>
                <label data-aib-caposquadra-control class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 cursor-pointer">
                    <input type="checkbox" name="aib-squadra-caposquadra-check" value="${v.id}" ${selectedCaposquadra === v.id ? 'checked' : ''} onchange="handleSquadraAibCaposquadraSelectionChange(this)" class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900 w-4 h-4">
                    <span>CS</span>
                </label>
            </div>
        `).join('')
        : `<p class="text-xs text-slate-500 p-2 text-center">Nessun volontario operativo per questa associazione.</p>`;

    updateSquadraAibCaposquadraControls();
}

function filterSquadraAibMezziList() {
    const search = (document.getElementById('aib-squadra-mezzi-search')?.value || '').toLowerCase().trim();
    const box = document.getElementById('aib-squadra-mezzi-list');
    if (!box) return;

    box.querySelectorAll('label[data-aib-mezzo-search]').forEach(label => {
        const text = label.dataset.aibMezzoSearch || '';
        label.classList.toggle('hidden', search !== '' && !text.includes(search));
    });
}

function filterSquadraAibVolontariList() {
    const search = (document.getElementById('aib-squadra-volontari-search')?.value || '').toLowerCase().trim();
    const box = document.getElementById('aib-squadra-volontari-list');
    if (!box) return;

    box.querySelectorAll('[data-aib-volontario-search]').forEach(label => {
        const text = label.dataset.aibVolontarioSearch || '';
        label.classList.toggle('hidden', search !== '' && !text.includes(search));
    });
}

function formatSquadraAibMezzi(mezziIds = []) {
    return (mezziIds || [])
        .map(id => mezzi.find(m => m.id === id))
        .filter(Boolean)
        .map(m => `<span class="inline-block px-2.5 py-1 bg-slate-800 text-slate-200 border border-slate-700/60 rounded-xl text-xs font-semibold mr-1.5 mb-1.5">${m.modello}<span class="text-[10px] text-slate-400 font-mono ml-1">${m.targa}</span></span>`)
        .join('') || `<span class="text-xs text-rose-400 font-semibold">Nessun mezzo</span>`;
}

function formatSquadraAibVolontari(volontariIds = []) {
    return (volontariIds || [])
        .map(id => volontari.find(v => v.id === id))
        .filter(Boolean)
        .map(v => `<span class="inline-block px-2.5 py-1 bg-slate-800 text-slate-200 border border-slate-700/60 rounded-xl text-xs font-semibold mr-1.5 mb-1.5">${v.nome} ${v.cognome}</span>`)
        .join('') || `<span class="text-xs text-rose-400 font-semibold">Nessun volontario</span>`;
}

function formatSquadraAibDisponibileFino(value) {
    if (!value) return `<span class="text-xs text-rose-400 font-semibold">Non impostata</span>`;

    return normalizeTimeValue(value) || `<span class="text-xs text-rose-400 font-semibold">Non valida</span>`;
}

function getDashboardCaposquadraVolontario() {
    if (!isCapoSquadra()) return null;

    const nome = normalizeCaposquadraMatchValue(currentUserProfile?.nome);
    const cognome = normalizeCaposquadraMatchValue(currentUserProfile?.cognome);
    const associazione = normalizeCaposquadraMatchValue(getUserAssociazione());
    if (!nome || !cognome || !associazione) return null;

    return volontari.find(v => (
        normalizeCaposquadraMatchValue(v.nome) === nome
        && normalizeCaposquadraMatchValue(v.cognome) === cognome
        && normalizeCaposquadraMatchValue(v.associazione_appartenenza) === associazione
    )) || null;
}

function isSquadraAibDelGiorno(squadra, today = new Date()) {
    const start = getSquadraAibAvailabilityStart(squadra);
    return Boolean(
        start
        && toLocalDateValue(start) === toLocalDateValue(today)
        && squadra.stato !== 'Turno Terminato'
    );
}

function renderDashboardCaposquadra() {
    if (!canAccessDashboardCaposquadra()) return;

    const container = document.getElementById('dashboard-caposquadra-content');
    if (!container) return;

    const volontarioCaposquadra = getDashboardCaposquadraVolontario();
    const squadreDelGiorno = squadreAib.filter(squadra => {
        if (!isSquadraAibDelGiorno(squadra)) return false;
        return hasMasterAccess() || squadra.caposquadraId === volontarioCaposquadra?.id;
    });

    if (squadreDelGiorno.length === 0) {
        container.innerHTML = `
            <div class="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-16 text-center shadow-xl">
                <p class="text-xl sm:text-2xl font-bold text-amber-400">Non sei di Turno</p>
                <p class="text-xl sm:text-2xl font-bold text-amber-400">Goditi il Riposo finche puoi 😂</p>
            </div>
        `;
        return;
    }

    const operatoreSalaNome = operatoreSalaTurno
        ? `${operatoreSalaTurno.nome || ''} ${operatoreSalaTurno.cognome || ''}`.trim()
        : '';
    const operatoreSalaHtml = `
        <section class="bg-slate-900 border border-cyan-500/30 rounded-2xl px-6 py-5 shadow-xl">
            <p class="text-xs font-bold uppercase tracking-widest text-cyan-400">Operatore di turno in Sala Operativa</p>
            ${operatoreSalaNome
                ? `<div class="mt-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p class="text-lg font-bold text-white">${escapeHtml(operatoreSalaNome)}</p>
                    ${operatoreSalaTurno.telefono
                        ? `<a href="tel:${escapeAttr(operatoreSalaTurno.telefono)}" class="font-semibold text-amber-400 hover:text-amber-300">${escapeHtml(operatoreSalaTurno.telefono)}</a>`
                        : `<span class="text-sm text-slate-500">Telefono non disponibile</span>`}
                </div>`
                : `<p class="mt-3 text-sm text-slate-500">Nessun operatore selezionato</p>`}
        </section>
    `;

    container.innerHTML = operatoreSalaHtml + squadreDelGiorno.map(squadra => {
        const start = getSquadraAibAvailabilityStart(squadra);
        const volontariSquadra = (squadra.volontariIds || [])
            .map(id => volontari.find(v => v.id === id))
            .filter(Boolean);
        const caposquadra = volontariSquadra.find(v => v.id === squadra.caposquadraId) || null;
        const altriVolontari = volontariSquadra.filter(v => v.id !== squadra.caposquadraId);
        const mezziSquadra = (squadra.mezziIds || [])
            .map(id => mezzi.find(m => m.id === id))
            .filter(Boolean);
        const formatVolontarioDashboard = v => `
            <li class="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/70 last:border-b-0">
                <span class="font-semibold text-slate-100">${escapeHtml(`${v.nome || ''} ${v.cognome || ''}`.trim())}</span>
                ${v.telefono
                    ? `<a href="tel:${escapeAttr(v.telefono)}" class="text-sm font-semibold text-amber-400 hover:text-amber-300">${escapeHtml(v.telefono)}</a>`
                    : `<span class="text-sm text-slate-500">Telefono non disponibile</span>`}
            </li>
        `;
        const caposquadraHtml = caposquadra ? formatVolontarioDashboard(caposquadra) : '';
        const volontariHtml = altriVolontari.map(formatVolontarioDashboard).join('');
        const mezziHtml = mezziSquadra.map(m => `
            <div class="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
                <p class="font-semibold text-slate-100">${escapeHtml(m.modello || '—')}</p>
                <p class="mt-1 text-xs text-slate-400">${escapeHtml(m.targa || '—')}${m.tipo ? ` · ${escapeHtml(m.tipo)}` : ''}</p>
            </div>
        `).join('');

        return `
            <article class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <header class="p-6 border-b border-slate-800">
                    <p class="text-xs font-bold uppercase tracking-widest text-amber-500">Squadra A.I.B.</p>
                    <h2 class="mt-2 text-2xl font-bold text-white">${escapeHtml(squadra.nome || '—')}</h2>
                    <p class="mt-1 text-sm text-slate-400">${escapeHtml(squadra.associazione_appartenenza || '—')}</p>
                </header>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                    <section class="lg:col-span-2">
                        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Volontari assegnati</h3>
                        <div class="grid grid-cols-1 sm:grid-cols-2 px-4 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <span>Nominativo</span>
                            <span class="hidden sm:block sm:text-right">Num. di telefono</span>
                        </div>
                        ${caposquadra ? `
                            <div class="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4">
                                <p class="pt-3 text-[10px] font-bold uppercase tracking-wider text-amber-400">Caposquadra</p>
                                <ul>${caposquadraHtml}</ul>
                            </div>
                        ` : ''}
                        <div class="mt-3 rounded-xl border border-slate-800 bg-slate-950 px-4">
                            <p class="pt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Volontari</p>
                            <ul>${volontariHtml}</ul>
                        </div>
                    </section>
                    <div class="space-y-6">
                        <section>
                            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Automezzo utilizzato</h3>
                            <div class="space-y-2">${mezziHtml}</div>
                        </section>
                        <section>
                            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Orario di disponibilità</h3>
                            <div class="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200">
                                <p><span class="text-slate-500">Inizio:</span> ${start ? escapeHtml(toLocalTimeValue(start)) : '—'}</p>
                                <p class="mt-2"><span class="text-slate-500">Fine:</span> ${escapeHtml(normalizeTimeValue(squadra.disponibileFino) || '—')}</p>
                            </div>
                        </section>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

function renderOperatoreSalaOptions(search = '') {
    const optionsBox = document.getElementById('operatore-sala-options');
    if (!optionsBox) return;

    const normalizedSearch = search.toLowerCase().trim();
    const options = volontari
        .filter(v => !normalizedSearch || `${v.nome || ''} ${v.cognome || ''} ${v.telefono || ''} ${v.associazione_appartenenza || ''}`.toLowerCase().includes(normalizedSearch))
        .sort((a, b) => `${a.cognome || ''} ${a.nome || ''}`.localeCompare(`${b.cognome || ''} ${b.nome || ''}`, 'it'))
        .map(v => `<button type="button" onclick="selectOperatoreSalaTurno('${escapeAttr(v.id)}')" class="w-full text-left px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-slate-800 hover:text-white transition-colors">${escapeHtml(`${v.nome || ''} ${v.cognome || ''}`.trim())}</button>`)
        .join('');

    const nessunOperatore = !normalizedSearch || 'nessun operatore disponibile'.includes(normalizedSearch)
        ? `<button type="button" onclick="selectOperatoreSalaTurno('')" class="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">Nessun operatore Disponibile</button>`
        : '';
    optionsBox.innerHTML = nessunOperatore + options;
    optionsBox.classList.remove('hidden');
}

function filterOperatoreSalaOptions() {
    renderOperatoreSalaOptions(document.getElementById('operatore-sala-search')?.value || '');
}

function syncOperatoreSalaControl() {
    const input = document.getElementById('operatore-sala-search');
    if (!input) return;
    input.dataset.volontarioId = operatoreSalaTurno?.volontario_id || '';
    input.value = operatoreSalaTurno?.volontario_id
        ? `${operatoreSalaTurno.nome || ''} ${operatoreSalaTurno.cognome || ''}`.trim()
        : 'Nessun operatore Disponibile';
}

async function saveOperatoreSalaTurno() {
    if (!(hasMasterAccess() || isSalaOperativa())) return;

    const volontarioId = document.getElementById('operatore-sala-search')?.dataset.volontarioId || '';
    const volontario = volontari.find(v => v.id === volontarioId) || null;

    const payload = {
        id: 1,
        volontario_id: volontario?.id || '',
        nome: volontario?.nome || '',
        cognome: volontario?.cognome || '',
        telefono: volontario?.telefono || null,
        updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
        .from('operatore_sala_turno')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

    if (error) {
        showToast('Errore', 'Impossibile salvare l\'operatore di turno.');
        renderOperatoreSalaOptions();
        return;
    }

    operatoreSalaTurno = data;
    showToast('Operatore aggiornato', 'Operatore di turno salvato correttamente.');
    renderDashboardCaposquadra();
}

function selectOperatoreSalaTurno(volontarioId) {
    const input = document.getElementById('operatore-sala-search');
    const optionsBox = document.getElementById('operatore-sala-options');
    const volontario = volontari.find(v => v.id === volontarioId) || null;
    if (input) {
        input.dataset.volontarioId = volontario?.id || '';
        input.value = volontario
            ? `${volontario.nome || ''} ${volontario.cognome || ''}`.trim()
            : 'Nessun operatore Disponibile';
    }
    optionsBox?.classList.add('hidden');
    saveOperatoreSalaTurno();
}

function renderSquadreAib() {
    if (!canAccessSquadreAib()) return;
    const tbody = document.getElementById('squadre-aib-table-body');
    if (!tbody) return;

    const search = (document.getElementById('search-squadre-aib')?.value || '').toLowerCase().trim();
    const stato = document.getElementById('filter-stato-squadre-aib')?.value || '';
    const filtered = squadreAib.filter(s => {
        const matchSearch = !search || `${s.nome} ${s.associazione_appartenenza}`.toLowerCase().includes(search);
        const matchStato = !stato || s.stato === stato;
        return matchSearch && matchStato;
    }).sort((a, b) => {
        const statoOrder = { 'Operativa': 0, 'Non operativa': 1, 'Turno Terminato': 2 };
        return (statoOrder[a.stato] ?? 1) - (statoOrder[b.stato] ?? 1);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-500 font-medium">Nessuna squadra A.I.B. configurata.</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    filtered.forEach(s => {
        const assegnazione = getSquadraAibInterventoAttivo(s.id);
        const statoAssegnazione = formatSquadraAibStatoIntervento(assegnazione?.stato);
        const assegnazioneHtml = assegnazione
            ? `<div class="mt-2 text-[11px] font-semibold text-amber-300 leading-snug">
                    Assegnata a: ${assegnazione.tipo}${statoAssegnazione ? ` · ${statoAssegnazione}` : ''}${assegnazione.data ? ` · ${formatServizioDataPianificata(assegnazione.data)}` : ''}
               </div>`
            : '';
        const badgeClass = s.stato === 'Operativa'
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        tbody.innerHTML += `
            <tr class="hover:bg-slate-800/10 transition-colors">
                <td class="py-4 px-6 text-white font-bold">${s.nome}</td>
                <td class="py-4 px-6 text-slate-300">${s.associazione_appartenenza || '—'}</td>
                <td class="py-4 px-6 max-w-[280px]"><div class="flex flex-wrap">${formatSquadraAibMezzi(s.mezziIds)}</div></td>
                <td class="py-4 px-6 max-w-[280px]"><div class="flex flex-wrap">${formatSquadraAibVolontari(s.volontariIds)}</div></td>
                <td class="py-4 px-6"><span class="px-2.5 py-1 text-[10px] font-bold border rounded-full ${badgeClass}">${s.stato}</span>${assegnazioneHtml}</td>
                <td class="py-4 px-6 text-slate-300 font-semibold">${formatSquadraAibDisponibileFino(s.disponibileFino)}</td>
                <td class="py-4 px-6 text-right">
                    <div class="inline-flex gap-2">
                        <button type="button" onclick="openSquadraAibPdfDeliveryModal('${s.id}')" title="Genera PDF" class="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-500 transition-colors">${ICON_DOWNLOAD}</button>
                        <button type="button" onclick="openEditSquadraAibModal('${s.id}')" title="Modifica" class="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-500 transition-colors">${ICON_EDIT}</button>
                        <button type="button" onclick="deleteSquadraAib('${s.id}')" title="Elimina squadra" class="p-2 hover:bg-rose-950/30 rounded-lg text-slate-400 hover:text-rose-500 transition-colors">
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

function openSquadraAibPdfDeliveryModal(id) {
    const squadra = squadreAib.find(s => s.id === id);
    if (!squadra) return;

    openPdfDeliveryModal({
        type: 'squadra-aib',
        id,
        filename: getSquadraAibPdfFilename(squadra),
        description: 'PDF squadra A.I.B.',
    });
}

async function exportSquadraAibPdf(id, delivery = 'download', email = null) {
    const squadra = squadreAib.find(s => s.id === id);
    if (!squadra) return;

    const mezziExport = (squadra.mezziIds || [])
        .map(mId => mezzi.find(m => m.id === mId))
        .filter(Boolean);
    const caposquadraId = squadra.caposquadraId || '';
    const equipaggio = (squadra.volontariIds || [])
        .map(vId => volontari.find(v => v.id === vId))
        .filter(Boolean);
    if (caposquadraId) {
        const caposquadraIndex = equipaggio.findIndex(v => v.id === caposquadraId);
        if (caposquadraIndex > 0) {
            const [caposquadra] = equipaggio.splice(caposquadraIndex, 1);
            equipaggio.unshift(caposquadra);
        }
    }
    const associazioneSquadra = associazioniDisponibili.find(a => a.nome === squadra.associazione_appartenenza);

    if (equipaggio.length === 0) {
        showToast('PDF non disponibile', 'La squadra non ha volontari associati.');
        return;
    }

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    showPdfExportProgress(
        delivery === 'email' ? 'Invio email in corso' : 'Generazione PDF in corso',
        delivery === 'email' ? 'Attendere il completamento dell\'invio...' : 'Attendere il completamento del download...'
    );

    try {
        const response = await fetch('/squadre-aib/pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': delivery === 'email' ? 'application/json' : 'application/pdf',
                'X-CSRF-TOKEN': csrfToken || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                delivery,
                ...(delivery === 'email' ? { email } : {}),
                squadra: {
                    id: squadra.id,
                    nome: squadra.nome,
                    associazione_appartenenza: squadra.associazione_appartenenza || '',
                    legale_rappresentante: associazioneSquadra?.legale_rappresentante || '',
                    caposquadra_id: caposquadraId,
                    stato: squadra.stato || '',
                    disponibile_dal: squadra.disponibileDal || '',
                    disponibile_fino: squadra.disponibileFino || '',
                },
                mezzi: mezziExport.map(m => ({
                    id: m.id,
                    modello: m.modello,
                    targa: m.targa,
                    tipo: m.tipo,
                    stato: m.stato,
                })),
                equipaggio: equipaggio.map(v => ({
                    id: v.id,
                    nome: v.nome,
                    cognome: v.cognome,
                    cf: v.cf,
                    ruolo: v.ruolo,
                    associazione_appartenenza: v.associazione_appartenenza,
                    telefono: v.telefono,
                    stato: v.stato,
                })),
            }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Errore durante la generazione del PDF');
        }

        if (delivery === 'email') {
            const data = await response.json().catch(() => ({}));
            showToast('Invio email avviato', data.message || 'Il PDF della squadra A.I.B. verrà inviato a breve.');
            hidePdfExportProgress(true);
            return;
        }

        const blob = await response.blob();
        const disposition = response.headers.get('Content-Disposition');
        let filename = 'squadra-aib.pdf';
        if (disposition) {
            const match = disposition.match(/filename="?([^";]+)"?/);
            if (match) filename = match[1];
        }

        downloadBlob(blob, filename);
        showToast('PDF generato', 'Il PDF della squadra A.I.B. è stato scaricato.');
        hidePdfExportProgress(true);
    } catch (err) {
        console.error('Errore export PDF squadra AIB:', err);
        showToast(delivery === 'email' ? 'Errore invio email' : 'Errore export PDF', err.message || (delivery === 'email' ? 'Impossibile inviare l\'email.' : 'Impossibile generare il file PDF.'));
        hidePdfExportProgress(false);
    }
}

function openNuovaSquadraAibModal() {
    if (!canAccessSquadreAib()) return;
    editingSquadraAibId = null;
    const now = new Date();
    setModalFormMode('modal-squadra-aib', { title: 'Nuova Squadra A.I.B.', submitText: 'Salva' });
    setupSquadraAibAssociazioneField();
    document.getElementById('aib-squadra-nome').value = '';
    document.getElementById('aib-squadra-stato').value = isSegreteria() ? 'Non operativa' : 'Operativa';
    document.getElementById('aib-squadra-disponibile-dal-data').value = toLocalDateValue(now);
    document.getElementById('aib-squadra-disponibile-dal-data').min = toLocalDateValue(now);
    document.getElementById('aib-squadra-disponibile-dal-ora').value = toLocalTimeValue(now);
    document.getElementById('aib-squadra-disponibile-fino').value = '';
    if (!isSegreteria()) document.getElementById('aib-squadra-associazione').value = getDefaultAssociazione();
    populateSquadraAibModalOptions([], [], '');
    toggleModal('modal-squadra-aib', true);
}

function openEditSquadraAibModal(id) {
    const squadra = squadreAib.find(s => s.id === id);
    if (!squadra || !canManageSquadraAib(squadra)) return;

    editingSquadraAibId = id;
    setModalFormMode('modal-squadra-aib', { title: 'Modifica Squadra A.I.B.', submitText: 'Salva modifiche' });
    setupSquadraAibAssociazioneField();
    document.getElementById('aib-squadra-nome').value = squadra.nome || '';
    document.getElementById('aib-squadra-stato').value = squadra.stato || 'Operativa';
    const disponibileDal = getSquadraAibAvailabilityStart(squadra);
    document.getElementById('aib-squadra-disponibile-dal-data').value = disponibileDal ? toLocalDateValue(disponibileDal) : '';
    document.getElementById('aib-squadra-disponibile-dal-data').min = '';
    document.getElementById('aib-squadra-disponibile-dal-ora').value = disponibileDal ? toLocalTimeValue(disponibileDal) : '';
    document.getElementById('aib-squadra-disponibile-fino').value = normalizeTimeValue(squadra.disponibileFino);
    if (!isSegreteria()) document.getElementById('aib-squadra-associazione').value = squadra.associazione_appartenenza || getDefaultAssociazione();
    populateSquadraAibModalOptions(squadra.mezziIds || [], squadra.volontariIds || [], squadra.caposquadraId || '');
    toggleModal('modal-squadra-aib', true);
}

async function saveSquadraAib(event) {
    event.preventDefault();
    if (!canAccessSquadreAib()) return;

    const nome = document.getElementById('aib-squadra-nome').value.trim();
    const associazione = getSquadraAibAssociazioneValue();
    const mezziIds = collectCheckedValues('aib-squadra-mezzi-check');
    const volontariIds = collectCheckedValues('aib-squadra-volontari-check');
    const caposquadraId = getSquadraAibCaposquadraId();
    let stato = document.getElementById('aib-squadra-stato').value;
    const disponibileDalData = document.getElementById('aib-squadra-disponibile-dal-data').value;
    const disponibileDalOra = document.getElementById('aib-squadra-disponibile-dal-ora').value;
    const disponibileFino = document.getElementById('aib-squadra-disponibile-fino').value;
    const disponibileDalDate = new Date(`${disponibileDalData}T${disponibileDalOra}:00`);

    if (!associazione) {
        showToast('Dati incompleti', 'Associazione non configurata.');
        return;
    }
    if (!disponibileDalData || !disponibileDalOra || Number.isNaN(disponibileDalDate.getTime())) {
        showToast('Dati incompleti', 'Inserisci il giorno e l\'ora di inizio disponibilità della squadra.');
        return;
    }
    if (!editingSquadraAibId && disponibileDalDate.getTime() < Date.now() - 60000) {
        showToast('Inizio disponibilità non valido', 'L\'inizio disponibilità non può essere precedente all\'orario attuale.');
        return;
    }
    if (!disponibileFino) {
        showToast('Dati incompleti', 'Inserisci la fine disponibilità della squadra.');
        return;
    }
    const availabilityEnd = getSquadraAibAvailabilityEnd({
        disponibileDal: disponibileDalDate.toISOString(),
        disponibileFino,
    });
    if (!availabilityEnd || availabilityEnd <= new Date()) {
        showToast('Fine disponibilità non valida', 'La fine disponibilità deve essere successiva all\'orario attuale.');
        return;
    }
    if (!editingSquadraAibId && isSegreteria()) {
        stato = disponibileDalDate <= new Date() ? 'Operativa' : 'Non operativa';
    }
    if (mezziIds.length === 0 || volontariIds.length === 0) {
        showToast('Dati incompleti', 'Seleziona almeno un mezzo e un volontario.');
        return;
    }
    if (!caposquadraId || !volontariIds.includes(caposquadraId)) {
        showToast('Dati incompleti', 'Seleziona un caposquadra tra i volontari della squadra.');
        return;
    }

    const validMezzi = mezziIds.every(id => {
        const mezzo = mezzi.find(m => m.id === id);
        return mezzo?.associazione_appartenenza === associazione && !isCarrelloAppendice(mezzo);
    });
    const validVolontari = volontariIds.every(id => volontari.find(v => v.id === id)?.associazione_appartenenza === associazione);
    if (!validMezzi || !validVolontari) {
        showToast('Associazione non valida', 'Mezzi e volontari devono appartenere alla stessa organizzazione della squadra.');
        return;
    }

    const payload = {
        nome,
        associazione_appartenenza: associazione,
        mezzi_ids: mezziIds,
        volontari_ids: volontariIds,
        caposquadra_id: caposquadraId,
        stato,
        disponibile_dal: disponibileDalDate.toISOString(),
        disponibile_fino: disponibileFino,
    };

    try {
        if (editingSquadraAibId) {
            const { error } = await supabase.from('squadre_aib').update(payload).eq('id', editingSquadraAibId);
            if (error) throw error;
            showToast('Squadra aggiornata', 'La squadra A.I.B. è stata salvata.');
        } else {
            const { error } = await supabase.from('squadre_aib').insert([{ id: `aib_${Date.now()}`, ...payload }]);
            if (error) throw error;
            showToast('Squadra creata', 'La squadra A.I.B. è stata registrata.');
        }
        toggleModal('modal-squadra-aib', false);
        editingSquadraAibId = null;
        await fetchDataFromSupabase();
    } catch (err) {
        console.error('Errore salvataggio squadra AIB:', err);
        showToast('Errore di Salvataggio', 'Impossibile salvare la squadra A.I.B. su Supabase.');
    }
}

async function deleteSquadraAib(id) {
    const squadra = squadreAib.find(s => s.id === id);
    if (!squadra || !canManageSquadraAib(squadra)) return;
    if (!confirm('Eliminare questa squadra A.I.B.?')) return;

    try {
        const { error } = await supabase.from('squadre_aib').delete().eq('id', id);
        if (error) throw error;
        showToast('Squadra eliminata', 'La squadra A.I.B. è stata rimossa.');
        await fetchDataFromSupabase();
    } catch (err) {
        console.error('Errore eliminazione squadra AIB:', err);
        showToast('Errore', 'Impossibile eliminare la squadra A.I.B.');
    }
}

// --- SEZIONE 4: SERVIZI (CRUD & VIEW) ---
function getSelectedServizioMezziIds() {
    return collectCheckedValues('s-mezzi-check');
}

function renderServizioCarrelliTrainantiOptions(selectedCarrelliTrainanti = null) {
    const box = document.getElementById('s-carrelli-trainanti-list');
    if (!box) return;

    if (selectedCarrelliTrainanti === null) {
        selectedCarrelliTrainanti = {};
        box.querySelectorAll('select[name="s-carrello-trainante"]').forEach(select => {
            if (select.dataset.carrelloId && select.value) {
                selectedCarrelliTrainanti[select.dataset.carrelloId] = select.value;
            }
        });
    }

    const mezziList = getDB("pc_mezzi");
    const selectedIds = getSelectedServizioMezziIds();
    const selectedIdSet = new Set(selectedIds);
    const carrelli = selectedIds
        .map(id => mezziList.find(m => m.id === id))
        .filter(isCarrelloAppendice);
    const trainanti = selectedIds
        .map(id => mezziList.find(m => m.id === id))
        .filter(m => canTrainCarrelloAppendice(m) && !isCarrelloAppendice(m));

    if (carrelli.length === 0) {
        box.classList.add('hidden');
        box.innerHTML = '';
        return;
    }

    box.classList.remove('hidden');
    const options = trainanti.map(m => `<option value="${m.id}">${m.modello} [${m.targa}]</option>`).join('');
    box.innerHTML = carrelli.map(carrello => {
        const selectedTrainante = selectedIdSet.has(selectedCarrelliTrainanti?.[carrello.id])
            ? selectedCarrelliTrainanti[carrello.id]
            : '';
        return `
            <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">${carrello.modello} [${carrello.targa}]</label>
                <select name="s-carrello-trainante" data-carrello-id="${carrello.id}" class="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                    <option value="">Seleziona mezzo trainante</option>
                    ${options}
                </select>
            </div>
        `;
    }).join('');

    box.querySelectorAll('select[name="s-carrello-trainante"]').forEach(select => {
        select.value = selectedCarrelliTrainanti?.[select.dataset.carrelloId] || '';
        if (!selectedIdSet.has(select.value)) select.value = '';
    });
}

function collectServizioCarrelliTrainanti(mezziIds) {
    const selectedIdSet = new Set(mezziIds || []);
    const carrelliIds = (mezziIds || []).filter(id => isCarrelloAppendice(mezzi.find(m => m.id === id)));
    const result = {};

    for (const carrelloId of carrelliIds) {
        const select = document.querySelector(`select[name="s-carrello-trainante"][data-carrello-id="${carrelloId}"]`);
        const trainanteId = select?.value || '';
        const trainante = mezzi.find(m => m.id === trainanteId);
        if (!trainanteId || !selectedIdSet.has(trainanteId) || !canTrainCarrelloAppendice(trainante)) {
            return { valid: false, value: {}, message: 'Seleziona un mezzo trainante valido per ogni carrello appendice.' };
        }
        result[carrelloId] = trainanteId;
    }

    return { valid: true, value: result };
}

function renderResponsabileServizioOptions(selectedResponsabileId = null) {
    const select = document.getElementById('s-responsabile-servizio');
    if (!select) return;

    const selectedIds = new Set(collectCheckedValues('s-volontari-check'));
    const currentValue = selectedResponsabileId ?? select.value;
    const options = volontari
        .filter(v => selectedIds.has(v.id) && v.stato === 'Operativo')
        .map(v => `<option value="${v.id}">${v.cognome} ${v.nome}${v.associazione_appartenenza ? ` - ${v.associazione_appartenenza}` : ''}</option>`)
        .join('');

    select.innerHTML = `<option value="">Seleziona responsabile servizio</option>${options}`;
    select.value = selectedIds.has(currentValue) ? currentValue : '';
}

function getSelectedResponsabileServizioId(volontariIds) {
    if (!hasMasterAccess()) return '';

    const value = document.getElementById('s-responsabile-servizio')?.value || '';
    if (!value) return '';
    if (!(volontariIds || []).includes(value)) {
        return null;
    }

    return value;
}

function populateServizioModalOptions(selectedMezziIds = [], selectedVolontariIds = [], selectedVolontariArt39 = {}, servizioArt39 = 'Si', selectedCarrelliTrainanti = {}, selectedVolontariMezzi = {}, selectedVolontariContaOre = {}, selectedVolontariInReport = {}, selectedResponsabileServizioId = '') {
    const mezziList = getDB("pc_mezzi");
    const volontariList = getDB("pc_volontari");

    const mezziBox = document.getElementById("s-mezzi-list");
    mezziBox.innerHTML = "";

    const mezziDisponibili = mezziList.filter(m => m.stato === "Disponibile");
    const mezziNonDisponibili = mezziList.filter(m => m.stato !== "Disponibile");

    const mezziSearchEl = document.getElementById("s-mezzi-search");
    if (mezziSearchEl) mezziSearchEl.value = "";

    const renderMezzoCheckbox = (m, muted = false) => {
        const checked = selectedMezziIds.includes(m.id) ? 'checked' : '';
        const textClass = muted ? 'text-slate-400' : 'text-slate-200';
        const fontClass = muted ? 'font-medium' : 'font-semibold';
        const extra = muted ? ` - [${m.stato}]` : '';
        const searchText = `${m.modello || ""} ${m.targa || ""}`.toLowerCase();
        return `
            <label data-mezzo-search="${searchText}" class="flex items-center gap-3 p-1.5 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors ${textClass}">
                <input type="checkbox" name="s-mezzi-check" value="${m.id}" ${checked} onchange="renderServizioCarrelliTrainantiOptions(); renderServizioVolontariMezziOptions();" class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900 w-4 h-4">
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
    renderServizioCarrelliTrainantiOptions(selectedCarrelliTrainanti);

    const volontariBox = document.getElementById("s-volontari-list");
    volontariBox.innerHTML = "";

    const volontariSearchEl = document.getElementById("s-volontari-search");
    if (volontariSearchEl) volontariSearchEl.value = "";

    const volontariOperativi = volontariList.filter(v => v.stato === "Operativo");
    const volontariNonOperativi = volontariList.filter(v => v.stato !== "Operativo");
    const canManageVolontariArt39 = servizioArt39 !== 'No' || !isSegreteria();
    const canManageReportFlags = hasMasterAccess();

    const renderVolontarioCheckbox = (v, muted = false) => {
        const checked = selectedVolontariIds.includes(v.id) ? 'checked' : '';
        const art39Value = servizioArt39 === 'No' ? 'No' : (selectedVolontariArt39?.[v.id] === 'Si' ? 'Si' : 'No');
        const mezzoValue = selectedVolontariMezzi?.[v.id] || '';
        const contaOreValue = selectedVolontariContaOre?.[v.id] === 'No' ? 'No' : 'Si';
        const inReportValue = selectedVolontariInReport?.[v.id] === 'No' ? 'No' : 'Si';
        const textClass = muted ? 'text-slate-400' : 'text-slate-200';
        const fontClass = muted ? 'font-medium' : 'font-semibold';
        const extra = muted ? ` - [${v.stato}]` : '';
        const searchText = `${v.nome} ${v.cognome} ${v.ruolo} ${v.associazione_appartenenza || ''} ${v.stato}`.toLowerCase();
        const controlsGridClass = canManageReportFlags
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end'
            : (canManageVolontariArt39
                ? 'grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(5.5rem,9rem)] gap-3 items-end'
                : 'grid grid-cols-1 gap-3 items-end');
        const art39Control = canManageVolontariArt39 ? `
                <span class="flex flex-col gap-1 min-w-0">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">art.39</span>
                    <select name="s-volontari-art39" data-volontario-id="${v.id}" onclick="event.stopPropagation()" class="w-full min-w-[5.5rem] bg-slate-900 border border-slate-700 text-slate-200 py-1.5 px-2 rounded-lg text-[11px] font-bold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500">
                        <option value="Si" ${art39Value === 'Si' ? 'selected' : ''}>Si</option>
                        <option value="No" ${art39Value === 'No' ? 'selected' : ''}>No</option>
                    </select>
                </span>
        ` : '';
        const reportFlagsControls = canManageReportFlags ? `
                <span class="flex flex-col gap-1 min-w-0">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">conta ore</span>
                    <select name="s-volontari-conta-ore" data-volontario-id="${v.id}" onclick="event.stopPropagation()" class="w-full min-w-[5.5rem] bg-slate-900 border border-slate-700 text-slate-200 py-1.5 px-2 rounded-lg text-[11px] font-bold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500">
                        <option value="Si" ${contaOreValue === 'Si' ? 'selected' : ''}>Si</option>
                        <option value="No" ${contaOreValue === 'No' ? 'selected' : ''}>No</option>
                    </select>
                </span>
                <span class="flex flex-col gap-1 min-w-0">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">in report</span>
                    <select name="s-volontari-in-report" data-volontario-id="${v.id}" onclick="event.stopPropagation()" class="w-full min-w-[5.5rem] bg-slate-900 border border-slate-700 text-slate-200 py-1.5 px-2 rounded-lg text-[11px] font-bold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500">
                        <option value="Si" ${inReportValue === 'Si' ? 'selected' : ''}>Si</option>
                        <option value="No" ${inReportValue === 'No' ? 'selected' : ''}>No</option>
                    </select>
                </span>
        ` : '';
        return `
            <label data-volontario-search="${searchText}" class="block p-2 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors ${textClass}">
                <span class="flex items-start gap-3 min-w-0">
                    <input type="checkbox" name="s-volontari-check" value="${v.id}" ${checked} onchange="updateServizioVolontarioMezzoControl(this.value); renderResponsabileServizioOptions();" class="mt-0.5 rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900 w-4 h-4 shrink-0">
                    <span class="text-xs ${fontClass} leading-snug break-words">${v.nome} ${v.cognome} (${v.ruolo})${v.associazione_appartenenza ? ` · ${v.associazione_appartenenza}` : ''}${v.matricola_regionale ? ` · Matricola Regionale: ${v.matricola_regionale}` : ''}${extra}</span>
                </span>
                <span class="mt-3 ml-7 ${controlsGridClass}">
                    <span class="flex flex-col gap-1 min-w-0">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mezzo assegnato</span>
                        <select name="s-volontari-mezzo" data-volontario-id="${v.id}" data-selected-mezzo-id="${mezzoValue}" onclick="event.stopPropagation()" onchange="this.dataset.selectedMezzoId = this.value" class="w-full bg-slate-900 border border-slate-700 text-slate-200 py-1.5 px-2 rounded-lg text-[11px] font-bold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500">
                            <option value="">Mezzo...</option>
                        </select>
                    </span>
                    ${art39Control}
                    ${reportFlagsControls}
                </span>
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

    renderServizioVolontariMezziOptions();
    toggleResponsabileServizioField();
    renderResponsabileServizioOptions(selectedResponsabileServizioId);
}

function populateServizioSquadreAibOptions(selectedSquadreIds = []) {
    const box = document.getElementById('s-aib-squadre-list');
    if (!box) return;

    const tipo = document.getElementById('s-tipo')?.value || '';
    if (!isAntincendioBoschivo(tipo) || !isSalaOperativa()) {
        box.innerHTML = '';
        return;
    }

    const selected = new Set(Array.isArray(selectedSquadreIds) ? selectedSquadreIds : []);
    const operative = squadreAib.filter(s => (
        s.stato === 'Operativa'
        && (isSquadraAibDisponibileOra(s) || selected.has(s.id))
        && (!isSquadraAibAssegnataAInterventoAttivo(s.id) || selected.has(s.id))
    ));
    if (operative.length === 0) {
        box.innerHTML = `<p class="text-xs text-slate-500 p-2 text-center">Nessuna squadra A.I.B. operativa disponibile.</p>`;
        return;
    }

    box.innerHTML = operative.map(s => {
        const mezziCount = (s.mezziIds || []).length;
        const volontariCount = (s.volontariIds || []).length;
        return `
            <div class="rounded-lg hover:bg-slate-800 transition-colors">
                <div class="flex items-start gap-2 p-2 text-slate-200">
                    <label class="flex items-start gap-3 min-w-0 flex-1 cursor-pointer">
                        <input type="checkbox" name="s-aib-squadre-check" value="${s.id}" ${selected.has(s.id) ? 'checked' : ''} class="mt-0.5 rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900 w-4 h-4">
                        <span class="min-w-0">
                            <span class="block text-xs font-bold text-white">${s.nome}</span>
                            <span class="block text-[11px] text-slate-400">${s.associazione_appartenenza || '—'} · ${mezziCount} mezzi · ${volontariCount} volontari</span>
                        </span>
                    </label>
                    <button type="button" onclick="toggleServizioSquadraAibDetails('${s.id}')" title="Vedi componenti squadra" class="p-1.5 -mt-1 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-900 transition-colors shrink-0">
                        ${ICON_EYE}
                    </button>
                </div>
                <div id="s-aib-squadra-details-${s.id}" class="hidden px-9 pb-3">
                    ${buildServizioSquadraAibDetailsHtml(s)}
                </div>
            </div>
        `;
    }).join('');
}

function isSquadraAibAssegnataAInterventoAttivo(squadraId, excludeServizioId = null) {
    return servizi.some(serv => (
        serv.id !== excludeServizioId
        && isAntincendioBoschivo(serv.tipo)
        && isStatoInterventoAibAssegnato(serv.stato)
        && (serv.squadreAibIds || []).includes(squadraId)
    ));
}

function getSquadraAibInterventoAttivo(squadraId, excludeServizioId = null) {
    return servizi.find(serv => (
        serv.id !== excludeServizioId
        && isAntincendioBoschivo(serv.tipo)
        && isStatoInterventoAibAssegnato(serv.stato)
        && (serv.squadreAibIds || []).includes(squadraId)
    ));
}

function isStatoInterventoAibAssegnato(stato) {
    return ['programmato', 'pianificato', 'in corso'].includes((stato || '').trim().toLowerCase());
}

function formatSquadraAibStatoIntervento(stato) {
    const normalized = (stato || '').trim().toLowerCase();
    if (normalized === 'in corso') return 'Intervento in corso';
    if (normalized === 'programmato' || normalized === 'pianificato') return 'Intervento pianificato';
    return stato || '';
}

function getSquadreAibAssegnateAInterventiAttivi(squadreIds = [], excludeServizioId = null) {
    return squadreIds.filter(id => isSquadraAibAssegnataAInterventoAttivo(id, excludeServizioId));
}

function buildServizioSquadraAibDetailsHtml(squadra) {
    const mezziList = (squadra.mezziIds || [])
        .map(id => mezzi.find(m => m.id === id))
        .filter(Boolean);
    const volontariList = (squadra.volontariIds || [])
        .map(id => volontari.find(v => v.id === id))
        .filter(Boolean);

    const mezziHtml = mezziList.length
        ? mezziList.map(m => `<span class="inline-block px-2 py-1 bg-slate-900 border border-slate-700/60 rounded-lg text-[11px] text-slate-200 mr-1.5 mb-1.5">${m.modello} <span class="text-slate-400 font-mono">${m.targa}</span></span>`).join('')
        : `<span class="text-[11px] text-slate-500">Nessun mezzo associato.</span>`;
    const volontariHtml = volontariList.length
        ? volontariList.map(v => `<span class="inline-block px-2 py-1 bg-slate-900 border border-slate-700/60 rounded-lg text-[11px] text-slate-200 mr-1.5 mb-1.5">${v.nome} ${v.cognome}</span>`).join('')
        : `<span class="text-[11px] text-slate-500">Nessun volontario associato.</span>`;

    return `
        <div class="border border-slate-800 bg-slate-950 rounded-xl p-3 space-y-3">
            <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Mezzi</p>
                <div class="flex flex-wrap">${mezziHtml}</div>
            </div>
            <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Volontari</p>
                <div class="flex flex-wrap">${volontariHtml}</div>
            </div>
        </div>
    `;
}

function toggleServizioSquadraAibDetails(id) {
    const detail = document.getElementById(`s-aib-squadra-details-${id}`);
    if (detail) detail.classList.toggle('hidden');
}

function getSelectedServizioSquadreAibIds() {
    if (!isSalaOperativa()) return [];
    const tipo = document.getElementById('s-tipo')?.value || '';
    return isAntincendioBoschivo(tipo) ? collectCheckedValues('s-aib-squadre-check') : [];
}

function getServizioSquadreAibResources(squadreIds = []) {
    const selected = squadreAib.filter(s => squadreIds.includes(s.id) && s.stato === 'Operativa');
    return {
        mezziIds: [...new Set(selected.flatMap(s => s.mezziIds || []))],
        volontariIds: [...new Set(selected.flatMap(s => s.volontariIds || []))],
    };
}

function formatServizioViewSquadreAib(squadreIds = []) {
    return (squadreIds || [])
        .map(id => squadreAib.find(s => s.id === id))
        .filter(Boolean)
        .map(s => `<span class="inline-block px-2.5 py-1 bg-slate-800 text-slate-200 border border-slate-700/60 rounded-xl text-xs font-semibold mr-1.5 mb-1.5">${s.nome}<span class="text-[10px] text-slate-400 ml-1">${s.associazione_appartenenza || ''}</span></span>`)
        .join('') || `<span class="text-xs text-slate-500 font-semibold">Nessuna squadra assegnata.</span>`;
}

function collectServizioVolontariArt39(volontariIds) {
    const volontariArt39 = {};
    const servizioArt39 = document.getElementById('s-art39')?.value || 'Si';
    (volontariIds || []).forEach(id => {
        const select = document.querySelector(`select[name="s-volontari-art39"][data-volontario-id="${CSS.escape(id)}"]`);
        volontariArt39[id] = servizioArt39 === 'No' ? 'No' : (select?.value === 'Si' ? 'Si' : 'No');
    });
    return volontariArt39;
}

function collectServizioVolontariFlag(volontariIds, inputName) {
    const flags = {};
    (volontariIds || []).forEach(id => {
        const select = document.querySelector(`select[name="${inputName}"][data-volontario-id="${CSS.escape(id)}"]`);
        flags[id] = select?.value === 'No' ? 'No' : 'Si';
    });
    return flags;
}

function buildDefaultVolontariFlag(volontariIds, existingFlags = {}) {
    if (hasMasterAccess()) {
        return Object.fromEntries((volontariIds || []).map(id => [id, existingFlags?.[id] === 'No' ? 'No' : 'Si']));
    }

    return Object.fromEntries((volontariIds || []).map(id => [id, 'Si']));
}

function isVolontarioFlagNo(value) {
    return String(value ?? '').trim().toLowerCase() === 'no';
}

function renderServizioVolontariMezziOptions() {
    const mezziIds = getSelectedServizioMezziIds();
    const selectedIdSet = new Set(mezziIds);
    const mezziOptions = mezziIds
        .map(id => mezzi.find(m => m.id === id))
        .filter(Boolean);

    document.querySelectorAll('select[name="s-volontari-mezzo"]').forEach(select => {
        const volontarioId = select.dataset.volontarioId;
        const checkbox = document.querySelector(`input[name="s-volontari-check"][value="${CSS.escape(volontarioId)}"]`);
        const previous = select.value || select.dataset.selectedMezzoId || '';
        const checked = !!checkbox?.checked;

        select.innerHTML = `<option value="">Mezzo...</option>` + mezziOptions.map(m => (
            `<option value="${m.id}">${m.modello} [${m.targa}]</option>`
        )).join('');

        if (checked && selectedIdSet.has(previous)) {
            select.value = previous;
        } else if (checked && mezziOptions.length === 1) {
            select.value = mezziOptions[0].id;
        } else {
            select.value = '';
        }

        select.disabled = !checked;
        select.classList.toggle('opacity-50', !checked);
    });
}

function updateServizioVolontarioMezzoControl(volontarioId) {
    const select = document.querySelector(`select[name="s-volontari-mezzo"][data-volontario-id="${CSS.escape(volontarioId)}"]`);
    if (!select) return;
    renderServizioVolontariMezziOptions();
}

function collectServizioVolontariMezzi(volontariIds, mezziIds) {
    const selectedMezzi = new Set(mezziIds || []);
    const volontariMezzi = {};

    for (const id of (volontariIds || [])) {
        const select = document.querySelector(`select[name="s-volontari-mezzo"][data-volontario-id="${CSS.escape(id)}"]`);
        const mezzoId = select?.value || '';
        if (!mezzoId || !selectedMezzi.has(mezzoId)) {
            return { valid: false, value: {}, message: 'Assegna ogni volontario selezionato a un mezzo.' };
        }
        volontariMezzi[id] = mezzoId;
    }

    return { valid: true, value: volontariMezzi };
}

function filterServizioMezziList() {
    const search = (document.getElementById("s-mezzi-search")?.value || "").toLowerCase().trim();
    const box = document.getElementById("s-mezzi-list");
    if (!box) return;

    box.querySelectorAll("label[data-mezzo-search]").forEach(label => {
        const text = label.dataset.mezzoSearch || "";
        label.classList.toggle("hidden", search !== "" && !text.includes(search));
    });

    box.querySelectorAll("p").forEach(section => {
        let sibling = section.nextElementSibling;
        let hasVisible = false;
        while (sibling && sibling.tagName !== "P") {
            if (sibling.matches("label[data-mezzo-search]") && !sibling.classList.contains("hidden")) {
                hasVisible = true;
                break;
            }
            sibling = sibling.nextElementSibling;
        }
        section.classList.toggle("hidden", search !== "" && !hasVisible);
    });
}

function filterServizioVolontariList() {
    const search = (document.getElementById("s-volontari-search")?.value || "").toLowerCase().trim();
    const box = document.getElementById("s-volontari-list");
    if (!box) return;

    box.querySelectorAll("label[data-volontario-search]").forEach(label => {
        const text = label.dataset.volontarioSearch || "";
        label.classList.toggle("hidden", search !== "" && !text.includes(search));
    });

    box.querySelectorAll("p").forEach(section => {
        let sibling = section.nextElementSibling;
        let hasVisible = false;
        while (sibling && sibling.tagName !== "P") {
            if (sibling.matches("label[data-volontario-search]") && !sibling.classList.contains("hidden")) {
                hasVisible = true;
                break;
            }
            sibling = sibling.nextElementSibling;
        }
        section.classList.toggle("hidden", search !== "" && !hasVisible);
    });
}

function resetServizioLocationFields() {
    document.getElementById("s-richiedente").value = "SORU";
    document.getElementById("s-protocollo-regionale").value = "";
    toggleProtocolloRegionaleField();
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
    if (isCapoSquadra()) return;

    resetEditState();
    setModalFormMode('modal-servizio', { title: 'Pianifica Servizio / Missione', submitText: 'Pianifica' });

    populateServizioModalOptions();

    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById("s-data").value = now.toISOString().slice(0, 16);
    document.getElementById("s-tipo").value = "Pattugliamento Territorio";
    document.getElementById("s-art39").value = "No";
    document.getElementById("s-note").value = "";
    document.getElementById("s-stato").value = "Programmato";
    document.getElementById("s-aib-ora-fine").value = "";
    resetServizioLocationFields();
    resetServizioAibFields();
    toggleServizioAibFields();
    populateServizioSquadreAibOptions([]);

    resetCapoSquadraServizioFormRestrictions();
    resetSegreteriaAttivitaFormRestrictions();
    if (isSalaOperativa()) {
        applySalaOperativaServizioFormRestrictions();
    } else {
        resetSalaOperativaServizioFormRestrictions();
    }

    toggleModal('modal-servizio', true);
}

function openEditServizioModal(id) {
    const serv = servizi.find(s => s.id === id);
    if (!serv) return;

    editingServizioId = id;
    setModalFormMode('modal-servizio', { title: 'Modifica Servizio / Missione', submitText: 'Salva modifiche' });

    populateServizioModalOptions(serv.mezziIds || [], serv.volontariIds || [], serv.volontariArt39 || {}, serv.art39 || 'Si', serv.carrelliTrainanti || {}, serv.volontariMezzi || {}, serv.volontariContaOre || {}, serv.volontariInReport || {}, serv.responsabileServizioId || '');

    document.getElementById("s-richiedente").value = serv.richiedente || "SORU";
    document.getElementById("s-protocollo-regionale").value = serv.protocolloRegionale || "";
    toggleProtocolloRegionaleField();
    document.getElementById("s-tipo").value = serv.tipo;
    document.getElementById("s-art39").value = serv.art39 || "Si";
    document.getElementById("s-data").value = toDatetimeLocalValue(serv.data);
    document.getElementById("s-lat").value = serv.latitudine ?? "";
    document.getElementById("s-lng").value = serv.longitudine ?? "";
    document.getElementById("s-indirizzo").value = serv.indirizzo || "";
    document.getElementById("s-note").value = serv.note || "";
    document.getElementById("s-altri-enti").value = serv.altriEnti || "";
    document.getElementById("s-stato").value = serv.stato;
    document.getElementById("s-aib-ora-fine").value = serv.oraFineIntervento || "";
    setServizioAibFormData(serv);
    toggleServizioAibFields();
    populateServizioSquadreAibOptions(serv.squadreAibIds || []);

    resetCapoSquadraServizioFormRestrictions();
    resetSalaOperativaServizioFormRestrictions();
    resetSegreteriaAttivitaFormRestrictions();

    if (isSegreteria()) {
        if (serv.stato !== 'Programmato') {
            editingServizioId = null;
            showToast('Operazione non consentita', 'Puoi assegnare mezzi e volontari solo ai servizi programmati.');
            return;
        }
        setModalFormMode('modal-servizio', { title: 'Assegna mezzi e equipaggio', submitText: 'Salva assegnazione' });
        applySegreteriaAttivitaFormRestrictions();
    } else if (isCapoSquadra()) {
        applyCapoSquadraServizioFormRestrictions();
    } else if (isSalaOperativa()) {
        applySalaOperativaServizioFormRestrictions();
    }

    toggleModal('modal-servizio', true);
}

function servizioViewField(label, value, options = {}) {
    const hasValue = value !== undefined && value !== null && String(value).trim() !== '';
    const displayValue = hasValue ? value : '—';
    const valueClass = options.multiline ? 'whitespace-pre-wrap break-words' : '';
    return `
        <div>
            <p class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">${label}</p>
            <div class="text-sm text-slate-100 ${valueClass}">${displayValue}</div>
        </div>
    `;
}

function formatServizioViewMezzi(mezziIds, carrelliTrainanti = {}) {
    const mezziList = getDB('pc_mezzi');
    const assigned = (mezziIds || [])
        .map(id => mezziList.find(m => m.id === id))
        .filter(Boolean);

    if (assigned.length === 0) {
        return '<span class="text-sm text-slate-500">Nessun mezzo assegnato</span>';
    }

    return assigned.map(m => `
        <span class="inline-block px-2.5 py-1 bg-slate-800 text-slate-200 border border-slate-700/60 rounded-xl text-xs font-semibold mr-1.5 mb-1.5">
            ${m.modello} [${m.targa}] (${m.tipo})${m.associazione_appartenenza ? ` · ${m.associazione_appartenenza}` : ''}${isCarrelloAppendice(m) && carrelliTrainanti[m.id] ? ` · Trainante: ${mezziList.find(trainante => trainante.id === carrelliTrainanti[m.id])?.targa || '—'}` : ''}
        </span>
    `).join('');
}

function formatServizioViewVolontari(volontariIds, volontariArt39 = {}) {
    const volontariList = getDB('pc_volontari');
    const assigned = (volontariIds || [])
        .map(id => volontariList.find(v => v.id === id))
        .filter(Boolean);

    if (assigned.length === 0) {
        return '<span class="text-sm text-slate-500">Nessun equipaggio assegnato</span>';
    }

    return assigned.map(v => `
        <span class="inline-block px-2.5 py-1 bg-slate-800 text-slate-200 border border-slate-700/60 rounded-xl text-xs font-semibold mr-1.5 mb-1.5">
            ${v.nome} ${v.cognome} ${v.associazione_appartenenza ? ` · ${v.associazione_appartenenza}` : ''} · Art.39 ${volontariArt39[v.id] === 'Si' ? 'Si' : 'No'}
        </span>
    `).join('');
}

function buildServizioViewSuperficieSection(title, fieldDefs, data, labels) {
    const rows = fieldDefs.map(({ key }) => {
        const value = data && typeof data === 'object' ? data[key] : '';
        return servizioViewField(labels[key], value || '');
    }).join('');

    return `
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <p class="text-xs font-bold uppercase tracking-wider text-amber-500/90">${title}</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${rows}</div>
        </div>
    `;
}

function buildServizioViewHtml(serv) {
    const lat = serv.latitudine;
    const lng = serv.longitudine;
    const hasCoords = lat != null && lat !== '' && lng != null && lng !== '';
    const coordsValue = hasCoords ? `${lat}, ${lng}` : '';

    let html = `
        <div class="space-y-4">
            ${servizioViewField('Richiedente', serv.richiedente || 'SORU')}
            ${servizioViewField('Tipologia Servizio / Intervento', serv.tipo)}
            ${servizioViewField('Data e Ora Pianificazione', formatServizioDataPianificata(serv.data))}
    `;

    if (isAntincendioBoschivo(serv.tipo)) {
        html += `
            <div>
                <p class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Squadre A.I.B. assegnate</p>
                <div class="flex flex-wrap">${formatServizioViewSquadreAib(serv.squadreAibIds)}</div>
            </div>
            ${servizioViewField("Orario di arrivo sull'incendio", serv.oraArrivoIncendio)}
            <div>
                <p class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Superficie percorsa dal fuoco (ha)</p>
                <div class="space-y-3">
                    ${buildServizioViewSuperficieSection('Ceduo', AIB_SUPERFICIE_FIELDS.ceduo, serv.superficieCeduo, {
                        matricianato: 'Matricianato',
                        compostato: 'Compostato',
                        degradato: 'Degradato',
                        macchia: 'Macchia',
                    })}
                    ${buildServizioViewSuperficieSection('Alto fusto', AIB_SUPERFICIE_FIELDS.altoFusto, serv.superficieAltoFusto, {
                        resinoso: 'Resinoso',
                        latifoglie: 'Latifoglie',
                        misto: 'Misto',
                        rimboschimento: 'Rimboschimento',
                    })}
                    ${buildServizioViewSuperficieSection('Non boscato', AIB_SUPERFICIE_FIELDS.nonBoscato, serv.superficieNonBoscato, {
                        cespugliato: 'Cespugliato',
                        pascolo: 'Pascolo',
                        seminativo: 'Seminativo',
                        incolto: 'Incolto',
                    })}
                </div>
            </div>
            ${servizioViewField('Orario di rientro in sede', serv.oraRientroSede)}
        `;
    }

    html += `
            ${servizioViewField('Orario di fine intervento', serv.oraFineIntervento)}
            ${servizioViewField('Coordinate Geografiche', coordsValue)}
            ${servizioViewField('Indirizzo Intervento', serv.indirizzo)}
            <div>
                <p class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Mezzi di Soccorso assegnati</p>
                <div class="flex flex-wrap">${formatServizioViewMezzi(serv.mezziIds, serv.carrelliTrainanti || {})}</div>
            </div>
            <div>
                <p class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Equipaggio Volontari assegnati</p>
                <div class="flex flex-wrap">${formatServizioViewVolontari(serv.volontariIds, serv.volontariArt39)}</div>
            </div>
            ${servizioViewField('Note / Dettagli Operativi', serv.note, { multiline: true })}
            ${servizioViewField('Altri Enti Coinvolti', serv.altriEnti)}
            ${servizioViewField('Stato Servizio', serv.stato)}
        </div>
    `;

    return html;
}

function openViewServizioModal(id) {
    const serv = servizi.find(s => s.id === id);
    if (!serv) return;

    const body = document.getElementById('modal-servizio-view-body');
    if (body) {
        body.innerHTML = buildServizioViewHtml(serv);
    }

    toggleModal('modal-servizio-view', true);
}

function getFilteredAttivita() {
    const search = (document.getElementById('search-attivita')?.value || '').toLowerCase();
    return getDB('pc_servizi').filter(s => {
        if (!['Programmato', 'Completato'].includes(s.stato)) return false;
        return `${s.tipo} ${s.note || ''}`.toLowerCase().includes(search);
    });
}

function renderAttivita() {
    const mezziList = getDB('pc_mezzi');
    const volontariList = getDB('pc_volontari');
    const tbody = document.getElementById('attivita-table-body');
    if (!tbody) return;

    const filtered = getFilteredAttivita();
    tbody.innerHTML = '';

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center text-slate-500 font-medium">Nessun servizio programmato o completato disponibile.</td>
            </tr>
        `;
        return;
    }

    [...filtered].sort((a, b) => {
        if (a.stato === b.stato) return new Date(b.data) - new Date(a.data);
        return a.stato === 'Programmato' ? -1 : 1;
    }).forEach(s => {
        const mezziAssegnati = (s.mezziIds || [])
            .map(mId => mezziList.find(m => m.id === mId))
            .filter(Boolean);

        const equipaggio = (s.volontariIds || []).map(vId => {
            const vol = volontariList.find(v => v.id === vId);
            return vol ? `${vol.nome} ${vol.cognome}` : null;
        }).filter(Boolean);

        const formattedDate = new Date(s.data).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        const mezziPills = mezziAssegnati.length > 0
            ? mezziAssegnati.map(m => `<span class="inline-block px-2.5 py-1 bg-slate-800 text-slate-200 border border-slate-700/60 rounded-xl text-xs font-semibold mr-1.5 mb-1.5">${m.modello}<span class="text-[10px] text-slate-400 font-mono ml-1">${m.targa}</span></span>`).join('')
            : `<span class="text-xs text-rose-400 font-semibold">Nessun mezzo assegnato</span>`;

        const volontariPills = equipaggio.length > 0
            ? equipaggio.map(nome => `<span class="inline-block px-2.5 py-1 bg-slate-800 text-slate-200 border border-slate-700/60 rounded-xl text-xs font-semibold mr-1.5 mb-1.5">${nome}</span>`).join('')
            : `<span class="text-xs text-rose-400 font-semibold">Nessun equipaggio assegnato</span>`;

        const editBtn = s.stato === 'Programmato'
            ? `<button onclick="openEditServizioModal('${s.id}')" title="Assegna mezzi e equipaggio" class="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-500 transition-colors">
                    ${ICON_EDIT}
               </button>`
            : '';
        const statoBorderClass = s.stato === 'Programmato' ? 'border-l-4 border-l-blue-400' : 'border-l-4 border-l-emerald-400';

        tbody.innerHTML += `
            <tr class="${statoBorderClass} hover:bg-slate-800/10 transition-colors">
                <td class="py-4 px-6 max-w-[280px]">
                    <p class="font-bold text-white text-base">${s.tipo}</p>
                    <p class="text-xs text-slate-500 mt-1 font-medium italic break-words">${s.note || 'Nessuna nota operativa aggiuntiva'}</p>
                </td>
                <td class="py-4 px-6 text-slate-300 font-bold">${formattedDate}</td>
                <td class="py-4 px-6 max-w-[280px]"><div class="flex flex-wrap">${mezziPills}</div></td>
                <td class="py-4 px-6 max-w-[280px]"><div class="flex flex-wrap">${volontariPills}</div></td>
                <td class="py-4 px-6 text-right">
                    ${editBtn}
                </td>
            </tr>
        `;
    });
}

function getFilteredServizi() {
    const allServizi = getDB("pc_servizi");
    const searchEl = document.getElementById("search-servizi");
    const filterEl = document.getElementById("filter-stato-servizio");
    const search = searchEl ? searchEl.value.toLowerCase() : "";
    const filterStato = filterEl ? filterEl.value : "";

    return allServizi.filter(s => {
        const matchSearch = `${s.id} ${s.tipo} ${s.note || ""}`.toLowerCase().includes(search);
        const matchStato = filterStato === "" || s.stato === filterStato;
        return matchSearch && matchStato;
    });
}

function getServizioSortValue(servizio, field) {
    if (field === "data") {
        const timestamp = new Date(servizio.data).getTime();
        return Number.isFinite(timestamp) ? timestamp : 0;
    }

    if (field === "mezzi") return (servizio.mezziIds || []).length;
    if (field === "volontari") return (servizio.volontariIds || []).length;

    return String(servizio[field] || "").toLowerCase();
}

function sortServiziForTable(servizi) {
    const sortField = document.getElementById("sort-servizi-field")?.value || "data";
    const sortDirection = document.getElementById("sort-servizi-direction")?.value || "desc";
    const direction = sortDirection === "asc" ? 1 : -1;

    return [...servizi].sort((a, b) => {
        const valueA = getServizioSortValue(a, sortField);
        const valueB = getServizioSortValue(b, sortField);

        if (typeof valueA === "number" && typeof valueB === "number") {
            if (valueA !== valueB) return (valueA - valueB) * direction;
        } else {
            const result = String(valueA).localeCompare(String(valueB), "it", { numeric: true, sensitivity: "base" });
            if (result !== 0) return result * direction;
        }

        const fallbackA = getServizioSortValue(a, "data");
        const fallbackB = getServizioSortValue(b, "data");
        return fallbackB - fallbackA;
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
    const marker = L.circleMarker([lat, lng], {
        radius: 9,
        fillColor: getServizioMarkerColor(servizio.stato),
        color: "#f8fafc",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.92,
        className: servizio.stato === "In corso" ? "servizio-marker-in-corso" : ""
    })
        .bindPopup(buildServizioMapPopup(servizio), { maxWidth: 280 })
        .addTo(serviziMapMarkersLayer);

    serviziMapMarkersById.set(String(servizio.id), marker);
}

function addSpreadServizioMapMarkers(markerEntries) {
    const entriesByCoordinates = new Map();

    markerEntries.forEach(entry => {
        const key = `${entry.lat},${entry.lng}`;
        if (!entriesByCoordinates.has(key)) entriesByCoordinates.set(key, []);
        entriesByCoordinates.get(key).push(entry);
    });

    entriesByCoordinates.forEach(entries => {
        entries.forEach((entry, index) => {
            let markerLat = entry.lat;
            let markerLng = entry.lng;

            if (entries.length > 1) {
                const angle = (-Math.PI / 2) + ((2 * Math.PI * index) / entries.length);
                const originalPoint = serviziMap.latLngToLayerPoint([entry.lat, entry.lng]);
                const spreadPoint = originalPoint.add([
                    Math.cos(angle) * 14,
                    Math.sin(angle) * 14,
                ]);
                const spreadLatLng = serviziMap.layerPointToLatLng(spreadPoint);
                markerLat = spreadLatLng.lat;
                markerLng = spreadLatLng.lng;
            }

            addServizioMapMarker(entry.servizio, markerLat, markerLng);
        });
    });
}

function showPdfExportProgress(title = "Generazione PDF in corso", description = "Attendere il completamento del download...") {
    const overlay = document.getElementById("pdf-export-overlay");
    const bar = document.getElementById("pdf-export-progress-bar");
    const titleEl = document.getElementById("pdf-export-progress-title");
    const descriptionEl = document.getElementById("pdf-export-progress-description");
    if (!overlay || !bar) return;

    if (pdfExportProgressTimer) {
        clearInterval(pdfExportProgressTimer);
        pdfExportProgressTimer = null;
    }

    if (titleEl) titleEl.innerText = title;
    if (descriptionEl) descriptionEl.innerText = description;
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
    const titleEl = document.getElementById("pdf-export-progress-title");
    const descriptionEl = document.getElementById("pdf-export-progress-description");
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
        if (titleEl) titleEl.innerText = "Generazione PDF in corso";
        if (descriptionEl) descriptionEl.innerText = "Attendere il completamento del download...";
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
            <p class="text-slate-300"><strong>Protocollo:</strong> ${escapeHtml(servizio.id)}</p>
            <p class="font-bold text-amber-400">${servizio.tipo}</p>
            <p class="text-slate-300 mt-1"><strong>Stato:</strong> ${servizio.stato}</p>
            <p class="text-slate-300"><strong>Data:</strong> ${formattedDate}</p>
            ${indirizzo}
        </div>
    `;
}

function focusServizioMapMarker(id) {
    ensureServiziMap();
    if (!serviziMap) return;

    const marker = serviziMapMarkersById.get(String(id));
    if (!marker) return;

    const latLng = marker.getLatLng();
    serviziMap.setView(latLng, Math.max(serviziMap.getZoom(), 15), { animate: true });
    marker.openPopup();

    const markerEl = marker.getElement();
    if (!markerEl) return;

    markerEl.classList.remove("servizio-marker-highlight");
    void markerEl.offsetWidth;
    markerEl.classList.add("servizio-marker-highlight");
    setTimeout(() => markerEl.classList.remove("servizio-marker-highlight"), 2400);
}

function isServiziTabVisible() {
    const tab = document.getElementById("tab-servizi");
    return tab && !tab.classList.contains("hidden");
}

function canManageAreeIntervento() {
    return hasMasterAccess() || isSalaOperativa();
}

function getAreaInterventoById(id) {
    return areeIntervento.find(area => String(area.id) === String(id)) || null;
}

function getAreaInterventoStyle() {
    return {
        color: "#f97316",
        weight: 3,
        opacity: 0.95,
        fillColor: "#f59e0b",
        fillOpacity: 0.22,
    };
}

function buildAreaInterventoPopup(area) {
    const servizio = area.servizio_id ? servizi.find(item => String(item.id) === String(area.servizio_id)) : null;
    const protocollo = servizio
        ? `<p class="text-slate-300"><strong>Protocollo:</strong> ${escapeHtml(servizio.id)}</p>`
        : "";
    const foto = Array.isArray(area.foto_urls) && area.foto_urls.length
        ? `<div class="area-intervento-popup-foto">${area.foto_urls.map(item => `
            <a href="${escapeAttr(item.url)}" target="_blank" rel="noopener noreferrer" title="Apri ${escapeAttr(item.name || 'foto')}">
                <img src="${escapeAttr(item.url)}" alt="${escapeAttr(item.name || 'Foto intervento')}">
            </a>
        `).join("")}</div>`
        : "";
    const editButton = canManageAreeIntervento()
        ? `<button type="button" onclick="openEditAreaInterventoModal('${escapeAttr(area.id)}')" class="area-intervento-popup-edit">Modifica dettagli</button>`
        : "";

    return `
        <div class="font-sans area-intervento-popup">
            <p class="font-bold text-amber-400">Area intervento</p>
            ${protocollo}
            <p class="mt-1 whitespace-pre-wrap">${escapeHtml(area.descrizione)}</p>
            ${foto}
            ${editButton}
        </div>
    `;
}

function addAreaInterventoToMap(area) {
    if (!serviziMapAreeLayer || !area?.geometria) return;

    const geoJsonLayer = L.geoJSON({ type: "Feature", geometry: area.geometria }, {
        style: getAreaInterventoStyle,
    });
    geoJsonLayer.eachLayer(layer => {
        layer.areaInterventoId = area.id;
        layer.bindPopup(buildAreaInterventoPopup(area), { maxWidth: 320 });
        serviziMapAreeLayer.addLayer(layer);
    });
}

function renderAreeInterventoMap() {
    if (!serviziMapAreeLayer) return;
    serviziMapAreeLayer.clearLayers();
    areeIntervento.forEach(addAreaInterventoToMap);
}

async function attachAreaInterventoFotoUrls(area) {
    const foto = Array.isArray(area.foto) ? area.foto : [];
    if (!foto.length) return { ...area, foto_urls: [] };

    const resolved = await Promise.all(foto.map(async item => {
        if (!item?.path) return null;
        const { data, error } = await supabase.storage
            .from(SALA_OPERATIVA_AREE_FOTO_BUCKET)
            .createSignedUrl(item.path, 3600);
        if (error) {
            console.warn("URL foto area intervento non disponibile:", error);
            return null;
        }
        return { ...item, url: data.signedUrl };
    }));

    return { ...area, foto_urls: resolved.filter(Boolean) };
}

async function loadAreeIntervento() {
    if (!canAccessServizi()) return;

    const { data, error } = await supabase
        .from("sala_operativa_aree_intervento")
        .select("*")
        .order("created_at", { ascending: true });
    if (error) throw error;

    areeIntervento = await Promise.all((data || []).map(attachAreaInterventoFotoUrls));
    renderAreeInterventoMap();
}

function populateAreaInterventoServizi(selectedId = "") {
    const select = document.getElementById("area-intervento-servizio");
    if (!select) return;

    const options = [...servizi]
        .sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")))
        .map(servizio => `<option value="${escapeAttr(servizio.id)}">${escapeHtml(servizio.id)} · ${escapeHtml(servizio.tipo || "Servizio")}</option>`)
        .join("");
    select.innerHTML = `<option value="">Nessun servizio collegato</option>${options}`;
    select.value = selectedId || "";
}

function renderAreaInterventoFotoEsistenti(area = null) {
    const container = document.getElementById("area-intervento-foto-esistenti");
    if (!container) return;
    const foto = Array.isArray(area?.foto_urls) ? area.foto_urls : [];
    container.innerHTML = foto.map(item => `
        <a href="${escapeAttr(item.url)}" target="_blank" rel="noopener noreferrer" class="block overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
            <img src="${escapeAttr(item.url)}" alt="${escapeAttr(item.name || 'Foto intervento')}" class="h-20 w-full object-cover">
        </a>
    `).join("");
}

function openAreaInterventoModal(layer) {
    if (!canManageAreeIntervento()) return;
    pendingAreaInterventoLayer = layer;
    editingAreaInterventoId = null;
    populateAreaInterventoServizi();
    document.getElementById("area-intervento-descrizione").value = "";
    document.getElementById("area-intervento-foto").value = "";
    document.getElementById("area-intervento-modal-title").textContent = "Nuova area intervento";
    document.getElementById("area-intervento-delete").classList.add("hidden");
    renderAreaInterventoFotoEsistenti();
    document.getElementById("modal-area-intervento").classList.remove("hidden");
    setTimeout(() => document.getElementById("area-intervento-descrizione")?.focus(), 100);
}

function openEditAreaInterventoModal(id) {
    if (!canManageAreeIntervento()) return;
    const area = getAreaInterventoById(id);
    if (!area) return;

    serviziMap?.closePopup();
    pendingAreaInterventoLayer = null;
    editingAreaInterventoId = area.id;
    populateAreaInterventoServizi(area.servizio_id || "");
    document.getElementById("area-intervento-descrizione").value = area.descrizione || "";
    document.getElementById("area-intervento-foto").value = "";
    document.getElementById("area-intervento-modal-title").textContent = "Modifica area intervento";
    document.getElementById("area-intervento-delete").classList.remove("hidden");
    renderAreaInterventoFotoEsistenti(area);
    document.getElementById("modal-area-intervento").classList.remove("hidden");
}

function closeAreaInterventoModal() {
    document.getElementById("modal-area-intervento")?.classList.add("hidden");
    if (pendingAreaInterventoLayer && serviziMapAreeLayer?.hasLayer(pendingAreaInterventoLayer)) {
        serviziMapAreeLayer.removeLayer(pendingAreaInterventoLayer);
    }
    pendingAreaInterventoLayer = null;
    editingAreaInterventoId = null;
}

function validateAreaInterventoFiles(files) {
    for (const file of files) {
        if (!SALA_OPERATIVA_AREE_FOTO_ALLOWED_TYPES.includes(file.type)) {
            throw new Error(`Formato non consentito per ${file.name}. Usa JPG, PNG o WebP.`);
        }
        if (file.size > SALA_OPERATIVA_AREE_FOTO_MAX_SIZE) {
            throw new Error(`${file.name} supera il limite di 10 MB.`);
        }
    }
}

function sanitizeStorageFileName(fileName) {
    return String(fileName || "foto")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-");
}

async function uploadAreaInterventoFoto(areaId, files) {
    const uploaded = [];
    try {
        for (const file of files) {
            const path = `${areaId}/${crypto.randomUUID()}-${sanitizeStorageFileName(file.name)}`;
            const { error } = await supabase.storage
                .from(SALA_OPERATIVA_AREE_FOTO_BUCKET)
                .upload(path, file, { contentType: file.type, upsert: false });
            if (error) throw error;
            uploaded.push({ path, name: file.name, mime_type: file.type, size: file.size });
        }
        return uploaded;
    } catch (err) {
        if (uploaded.length) {
            await supabase.storage
                .from(SALA_OPERATIVA_AREE_FOTO_BUCKET)
                .remove(uploaded.map(item => item.path));
        }
        throw err;
    }
}

async function saveAreaIntervento() {
    if (!canManageAreeIntervento() || isSavingAreaIntervento) return;

    const descrizione = document.getElementById("area-intervento-descrizione")?.value.trim() || "";
    const servizioId = document.getElementById("area-intervento-servizio")?.value || null;
    const files = Array.from(document.getElementById("area-intervento-foto")?.files || []);
    if (!descrizione) {
        alert("Inserisci la descrizione dell'intervento.");
        return;
    }

    const existing = editingAreaInterventoId ? getAreaInterventoById(editingAreaInterventoId) : null;
    const geometry = existing?.geometria || pendingAreaInterventoLayer?.toGeoJSON()?.geometry;
    if (!geometry || geometry.type !== "Polygon") {
        alert("Il poligono dell'area non è valido.");
        return;
    }

    isSavingAreaIntervento = true;
    const saveButton = document.getElementById("area-intervento-save");
    if (saveButton) saveButton.disabled = true;
    let createdAreaId = null;
    let uploadedFoto = [];

    try {
        validateAreaInterventoFiles(files);
        if (existing) {
            if (files.length) uploadedFoto = await uploadAreaInterventoFoto(existing.id, files);
            const foto = [...(Array.isArray(existing.foto) ? existing.foto : []), ...uploadedFoto];
            const { error } = await supabase
                .from("sala_operativa_aree_intervento")
                .update({ servizio_id: servizioId, descrizione, foto })
                .eq("id", existing.id);
            if (error) throw error;
        } else {
            const { data, error } = await supabase
                .from("sala_operativa_aree_intervento")
                .insert({ servizio_id: servizioId, descrizione, geometria: geometry, foto: [] })
                .select("id")
                .single();
            if (error) throw error;
            createdAreaId = data.id;
            if (files.length) {
                uploadedFoto = await uploadAreaInterventoFoto(createdAreaId, files);
                const { error: updateError } = await supabase
                    .from("sala_operativa_aree_intervento")
                    .update({ foto: uploadedFoto })
                    .eq("id", createdAreaId);
                if (updateError) throw updateError;
            }
        }

        pendingAreaInterventoLayer = null;
        editingAreaInterventoId = null;
        document.getElementById("modal-area-intervento")?.classList.add("hidden");
        await loadAreeIntervento();
        showToast("Area salvata", "Il poligono è stato registrato sulla mappa.");
    } catch (err) {
        if (uploadedFoto.length) {
            await supabase.storage.from(SALA_OPERATIVA_AREE_FOTO_BUCKET).remove(uploadedFoto.map(item => item.path));
        }
        if (createdAreaId) {
            await supabase.from("sala_operativa_aree_intervento").delete().eq("id", createdAreaId);
        }
        console.error("Errore salvataggio area intervento:", err);
        alert(err.message || "Impossibile salvare l'area intervento.");
    } finally {
        isSavingAreaIntervento = false;
        if (saveButton) saveButton.disabled = false;
    }
}

async function deleteAreaIntervento() {
    if (!canManageAreeIntervento() || !editingAreaInterventoId) return;
    const area = getAreaInterventoById(editingAreaInterventoId);
    if (!area || !confirm("Eliminare questa area intervento e tutte le foto allegate?")) return;

    try {
        const { error } = await supabase
            .from("sala_operativa_aree_intervento")
            .delete()
            .eq("id", area.id);
        if (error) throw error;
        const paths = (Array.isArray(area.foto) ? area.foto : []).map(item => item.path).filter(Boolean);
        if (paths.length) {
            const { error: storageError } = await supabase.storage.from(SALA_OPERATIVA_AREE_FOTO_BUCKET).remove(paths);
            if (storageError) console.warn("Area eliminata, ma alcune foto non sono state rimosse:", storageError);
        }
        document.getElementById("modal-area-intervento")?.classList.add("hidden");
        editingAreaInterventoId = null;
        await loadAreeIntervento();
        showToast("Area eliminata", "Il poligono non è più presente sulla mappa.");
    } catch (err) {
        console.error("Errore eliminazione area intervento:", err);
        alert(err.message || "Impossibile eliminare l'area intervento.");
    }
}

async function saveEditedAreaInterventoLayers(event) {
    const updates = [];
    event.layers.eachLayer(layer => {
        if (!layer.areaInterventoId) return;
        const geometry = layer.toGeoJSON()?.geometry;
        if (geometry?.type === "Polygon") {
            updates.push(supabase
                .from("sala_operativa_aree_intervento")
                .update({ geometria: geometry })
                .eq("id", layer.areaInterventoId));
        }
    });

    try {
        const results = await Promise.all(updates);
        const failed = results.find(result => result.error);
        if (failed?.error) throw failed.error;
        await loadAreeIntervento();
        showToast("Geometria aggiornata", "Le modifiche ai poligoni sono state salvate.");
    } catch (err) {
        console.error("Errore modifica geometria area:", err);
        alert(err.message || "Impossibile salvare la modifica del poligono.");
        await loadAreeIntervento();
    }
}

function updateAreaDrawingControl() {
    if (!areaDrawingControlContainer) return;
    const isDrawing = areaDrawingLatLngs.length > 0 || !!areaDrawingPreviewLayer;
    const startButton = areaDrawingControlContainer.querySelector('[data-area-draw-start]');
    const actions = areaDrawingControlContainer.querySelector('[data-area-draw-actions]');
    const counter = areaDrawingControlContainer.querySelector('[data-area-draw-counter]');
    if (startButton) startButton.classList.toggle('hidden', isDrawing);
    if (actions) actions.classList.toggle('hidden', !isDrawing);
    if (counter) counter.textContent = `${areaDrawingLatLngs.length} punti`;
}

function startAreaDrawing() {
    if (!canManageAreeIntervento() || !serviziMap || areaDrawingPreviewLayer) return;
    areaDrawingLatLngs = [];
    areaDrawingPreviewLayer = L.polygon([], {
        ...getAreaInterventoStyle(),
        dashArray: '7 6',
    }).addTo(serviziMap);
    serviziMap.getContainer().classList.add('is-drawing-area');
    serviziMap.on('click', addAreaDrawingPoint);
    updateAreaDrawingControl();
}

function addAreaDrawingPoint(event) {
    if (!areaDrawingPreviewLayer) return;
    areaDrawingLatLngs.push(event.latlng);
    areaDrawingPreviewLayer.setLatLngs(areaDrawingLatLngs);
    updateAreaDrawingControl();
}

function undoAreaDrawingPoint() {
    if (!areaDrawingPreviewLayer || !areaDrawingLatLngs.length) return;
    areaDrawingLatLngs.pop();
    areaDrawingPreviewLayer.setLatLngs(areaDrawingLatLngs);
    updateAreaDrawingControl();
}

function resetAreaDrawing() {
    if (serviziMap) {
        serviziMap.off('click', addAreaDrawingPoint);
        serviziMap.getContainer().classList.remove('is-drawing-area');
        if (areaDrawingPreviewLayer && serviziMap.hasLayer(areaDrawingPreviewLayer)) {
            serviziMap.removeLayer(areaDrawingPreviewLayer);
        }
    }
    areaDrawingLatLngs = [];
    areaDrawingPreviewLayer = null;
    updateAreaDrawingControl();
}

function cancelAreaDrawing() {
    resetAreaDrawing();
}

function finishAreaDrawing() {
    if (!areaDrawingPreviewLayer) return;
    if (areaDrawingLatLngs.length < 3) {
        alert('Seleziona almeno 3 punti prima di terminare il poligono.');
        return;
    }

    const completedLayer = L.polygon([...areaDrawingLatLngs], getAreaInterventoStyle());
    resetAreaDrawing();
    serviziMapAreeLayer.addLayer(completedLayer);
    openAreaInterventoModal(completedLayer);
}

function addAreaDrawingControl() {
    const drawingControl = L.control({ position: 'topleft' });
    drawingControl.onAdd = () => {
        const container = L.DomUtil.create('div', 'area-drawing-control');
        container.innerHTML = `
            <button type="button" data-area-draw-start class="area-drawing-start" title="Disegna una nuova area" aria-label="Disegna area">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5 18.5 7 16 19 4 16Z"/><circle cx="5" cy="4.5" r="1.5"/><circle cx="18.5" cy="7" r="1.5"/><circle cx="16" cy="19" r="1.5"/><circle cx="4" cy="16" r="1.5"/></svg>
            </button>
            <div data-area-draw-actions class="hidden">
                <span data-area-draw-counter>0 punti</span>
                <button type="button" data-area-draw-undo>Ultimo punto</button>
                <button type="button" data-area-draw-finish>Termina</button>
                <button type="button" data-area-draw-cancel>Annulla</button>
            </div>
        `;
        container.querySelector('[data-area-draw-start]').addEventListener('click', startAreaDrawing);
        container.querySelector('[data-area-draw-undo]').addEventListener('click', undoAreaDrawingPoint);
        container.querySelector('[data-area-draw-finish]').addEventListener('click', finishAreaDrawing);
        container.querySelector('[data-area-draw-cancel]').addEventListener('click', cancelAreaDrawing);
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);
        areaDrawingControlContainer = container;
        return container;
    };
    drawingControl.addTo(serviziMap);
}

function ensureServiziMap() {
    const mapEl = document.getElementById("servizi-map");
    if (!mapEl || serviziMap || !isServiziTabVisible()) return;

    serviziMap = L.map(mapEl, {
        scrollWheelZoom: true,
        zoomControl: true
    }).setView(MASSA_DI_SOMMA_CENTER, MASSA_DI_SOMMA_ZOOM);

    serviziMapRoadLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(serviziMap);

    serviziMapSatelliteLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: 'Tiles &copy; Esri'
    });

    serviziMapMunicipalityLayer = L.tileLayer("https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap France | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });

    const mapTypeControl = L.control({ position: "topright" });
    mapTypeControl.onAdd = () => {
        const container = L.DomUtil.create("div", "servizi-map-type-control");
        const activeButton = L.DomUtil.create("button", "servizi-map-type-active", container);
        const options = L.DomUtil.create("div", "servizi-map-type-options", container);
        const roadButton = L.DomUtil.create("button", "", options);
        const satelliteButton = L.DomUtil.create("button", "", options);
        const municipalityButton = L.DomUtil.create("button", "", options);
        const baseLayers = {
            road: serviziMapRoadLayer,
            satellite: serviziMapSatelliteLayer,
            municipality: serviziMapMunicipalityLayer,
        };
        const baseLayerLabels = {
            road: "Mappa stradale",
            satellite: "Mappa satellite",
            municipality: "Mappa per comuni",
        };

        activeButton.type = "button";
        roadButton.type = "button";
        satelliteButton.type = "button";
        municipalityButton.type = "button";
        roadButton.textContent = baseLayerLabels.road;
        satelliteButton.textContent = baseLayerLabels.satellite;
        municipalityButton.textContent = baseLayerLabels.municipality;

        const updateControl = () => {
            activeButton.textContent = baseLayerLabels[serviziMapActiveBaseLayer];
            roadButton.classList.toggle("is-active", serviziMapActiveBaseLayer === "road");
            satelliteButton.classList.toggle("is-active", serviziMapActiveBaseLayer === "satellite");
            municipalityButton.classList.toggle("is-active", serviziMapActiveBaseLayer === "municipality");
        };

        const setBaseLayer = (layer) => {
            if (layer === serviziMapActiveBaseLayer) {
                container.classList.remove("is-open");
                return;
            }

            serviziMap.removeLayer(baseLayers[serviziMapActiveBaseLayer]);
            serviziMap.addLayer(baseLayers[layer]);
            serviziMapActiveBaseLayer = layer;
            container.classList.remove("is-open");
            updateControl();
        };

        activeButton.addEventListener("click", () => {
            container.classList.toggle("is-open");
        });
        roadButton.addEventListener("click", () => setBaseLayer("road"));
        satelliteButton.addEventListener("click", () => setBaseLayer("satellite"));
        municipalityButton.addEventListener("click", () => setBaseLayer("municipality"));

        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);
        updateControl();

        return container;
    };
    mapTypeControl.addTo(serviziMap);

    serviziMapMarkersLayer = L.layerGroup().addTo(serviziMap);
    serviziMapAreeLayer = new L.FeatureGroup().addTo(serviziMap);
    L.control.layers(null, { "Aree intervento": serviziMapAreeLayer }, { position: "bottomright", collapsed: false }).addTo(serviziMap);

    if (canManageAreeIntervento()) {
        serviziMapDrawControl = new L.Control.Draw({
            position: "topleft",
            draw: false,
            edit: {
                featureGroup: serviziMapAreeLayer,
                remove: false,
            },
        });
        serviziMap.addControl(serviziMapDrawControl);
        serviziMap.on(L.Draw.Event.EDITED, saveEditedAreaInterventoLayers);
        addAreaDrawingControl();
    }

    loadAreeIntervento().catch(err => {
        console.error("Errore caricamento aree intervento:", err);
        showToast("Errore mappa", "Impossibile caricare le aree intervento.");
    });
}

async function updateServiziMap(filteredServizi) {
    if (!isServiziTabVisible()) return;

    const mapHint = document.getElementById("servizi-map-hint");
    ensureServiziMap();
    if (!serviziMap || !serviziMapMarkersLayer) return;

    const updateToken = ++serviziMapUpdateToken;
    serviziMapMarkersLayer.clearLayers();
    serviziMapMarkersById.clear();

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
    const markerEntries = [];

    withCoords.forEach(s => {
        const lat = parseFloat(s.latitudine);
        const lng = parseFloat(s.longitudine);
        markerEntries.push({ servizio: s, lat, lng });
        boundsPoints.push([lat, lng]);
    });

    for (const s of withIndirizzoOnly) {
        if (updateToken !== serviziMapUpdateToken) return;

        const coords = await geocodeIndirizzo(s.indirizzo);
        if (updateToken !== serviziMapUpdateToken) return;
        if (!coords) continue;

        markerEntries.push({ servizio: s, lat: coords.lat, lng: coords.lng });
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

    addSpreadServizioMapMarkers(markerEntries);

    setTimeout(() => serviziMap?.invalidateSize(), 50);
}

function renderServizi() {
    const servizi = getDB("pc_servizi");
    const mezzi = getDB("pc_mezzi");
    const volontari = getDB("pc_volontari");

    const tbody = document.getElementById("servizi-table-body");
    const filtered = getFilteredServizi();
    const tableServizi = isCapoSquadra()
        ? filtered.filter(s => s.stato !== "Completato")
        : filtered;

    updateServiziMap(filtered);

    tbody.innerHTML = "";

    if (tableServizi.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="py-8 text-center text-slate-500 font-medium">Nessuna missione o servizio pianificato con questi criteri.</td>
            </tr>
        `;
        return;
    }

    sortServiziForTable(tableServizi).forEach(s => {
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
        const servizioIdArg = escapeAttr(JSON.stringify(s.id));

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
            ? `<button onclick="openPdfTemplateModal('${s.id}')" title="Scarica modelli intervento completato" class="p-2 hover:bg-amber-950/30 rounded-lg text-slate-400 hover:text-amber-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
               </button>`
            : ["Programmato", "In corso"].includes(s.stato)
                ? `<button onclick="exportServizioPdf('${s.id}')" title="Scarica PDF servizio" class="p-2 hover:bg-amber-950/30 rounded-lg text-slate-400 hover:text-amber-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
               </button>`
                : '';

        const editBtn = (hasMasterAccess() || s.stato !== "Completato")
            ? `<button onclick="openEditServizioModal('${s.id}')" title="Modifica dati" class="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-500 transition-colors">
                    ${ICON_EDIT}
               </button>`
            : '';

        const viewBtn = (hasMasterAccess() || isSalaOperativa())
            ? `<button onclick="openViewServizioModal('${s.id}')" title="Visualizza dettagli intervento" class="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-cyan-500 transition-colors">
                    ${ICON_EYE}
               </button>`
            : '';

        tbody.innerHTML += `
            <tr class="hover:bg-slate-800/10 transition-colors">
                <td class="py-4 px-6 text-slate-400 font-mono text-xs break-all">
                    <button type="button" onclick="focusServizioMapMarker(${servizioIdArg})" title="Trova sulla mappa" class="text-left hover:text-amber-400 focus:outline-none focus:text-amber-400 transition-colors">${escapeHtml(s.id)}</button>
                </td>
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
                        ${viewBtn}
                        ${editBtn}
                        ${completaBtn}
                        ${exportPdfBtn}
                        ${isCapoSquadra() ? '' : `<button onclick="deleteServizio('${s.id}')" title="Elimina Missione" class="p-2 hover:bg-rose-950/30 rounded-lg text-slate-400 hover:text-rose-500 transition-colors">
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

async function saveServizio(event) {
    event.preventDefault();

    if (isSegreteria() && !editingServizioId) {
        showToast("Operazione non consentita", "Non puoi creare nuove missioni o servizi.");
        return;
    }

    if (isCapoSquadra() && !editingServizioId) {
        showToast("Operazione non consentita", "Non puoi creare nuove missioni o servizi.");
        return;
    }

    const stato = document.getElementById("s-stato").value;

    if (isSegreteria() && editingServizioId) {
        const existing = servizi.find(s => s.id === editingServizioId);
        if (!existing || existing.stato !== 'Programmato') {
            showToast('Operazione non consentita', 'Puoi assegnare mezzi e volontari solo ai servizi programmati.');
            return;
        }

        const mezziCheckboxes = document.querySelectorAll('input[name="s-mezzi-check"]:checked');
        const mezziIds = [];
        mezziCheckboxes.forEach(cb => mezziIds.push(cb.value));
        const carrelliTrainantiResult = collectServizioCarrelliTrainanti(mezziIds);
        if (!carrelliTrainantiResult.valid) {
            showToast('Trainante mancante', carrelliTrainantiResult.message);
            return;
        }

        const volontariCheckboxes = document.querySelectorAll('input[name="s-volontari-check"]:checked');
        const volontariIds = [];
        volontariCheckboxes.forEach(cb => volontariIds.push(cb.value));
        const volontariArt39 = collectServizioVolontariArt39(volontariIds);
        const volontariContaOre = buildDefaultVolontariFlag(volontariIds);
        const volontariInReport = buildDefaultVolontariFlag(volontariIds);
        const volontariMezziResult = collectServizioVolontariMezzi(volontariIds, mezziIds);

        if (isAntincendioBoschivo(existing.tipo) && mezziIds.length === 0) {
            alert('Attenzione: devi assegnare almeno un mezzo al servizio!');
            return;
        }

        if (volontariIds.length === 0) {
            alert('Attenzione: devi assegnare almeno un volontario all\'equipaggio del servizio!');
            return;
        }

        if (!volontariMezziResult.valid) {
            showToast('Mezzo mancante', volontariMezziResult.message);
            return;
        }

        try {
            const { error } = await supabase.from('servizi').update({
                mezzi_ids: mezziIds,
                carrelli_trainanti: carrelliTrainantiResult.value,
                volontari_ids: volontariIds,
                volontari_art39: volontariArt39,
                volontari_mezzi: volontariMezziResult.value,
                volontari_conta_ore: volontariContaOre,
                volontari_in_report: volontariInReport,
            }).eq('id', editingServizioId);
            if (error) throw error;
            toggleModal('modal-servizio', false);
            showToast('Assegnazione salvata', 'Mezzi e equipaggio aggiornati correttamente.');
            await fetchDataFromSupabase();
        } catch (err) {
            console.error('Errore durante l\'assegnazione:', err);
            showToast('Errore di Salvataggio', 'Impossibile aggiornare il servizio su Supabase.');
        }
        return;
    }

    if (isCapoSquadra() && editingServizioId) {
        const existing = servizi.find(s => s.id === editingServizioId);
        if (!existing) return;
        if (!canCompleteServizioWithCurrentProfile(existing, stato)) return;

        let payload = buildCapoSquadraServizioUpdatePayload(existing, stato);

        if (!hasValidServizioCoordinates(payload) && payload.indirizzo_intervento) {
            const coords = await geocodeIndirizzo(payload.indirizzo_intervento);
            if (coords) {
                payload = { ...payload, latitudine: coords.lat, longitudine: coords.lng };
            }
        }

        try {
            if (stato === "In corso") {
                for (const mId of (existing.mezziIds || [])) {
                    const mezzo = mezzi.find(m => m.id === mId);
                    if (mezzo && mezzo.stato === "Disponibile") {
                        await supabase.from('mezzi').update({ stato: "In servizio" }).eq('id', mId);
                    }
                }
            }

            const { error } = await supabase.from('servizi').update(payload).eq('id', editingServizioId);
            if (error) throw error;
            toggleModal('modal-servizio', false);
            showToast("Servizio Aggiornato", "Le modifiche sono state salvate correttamente.");
            await fetchDataFromSupabase();
        } catch (err) {
            console.error("Errore durante il salvataggio del servizio:", err);
            showToast("Errore di Salvataggio", "Impossibile registrare il servizio su Supabase.");
        }
        return;
    }

    const richiedente = document.getElementById("s-richiedente").value;
    const protocolloRegionale = richiedente === "SORU"
        ? document.getElementById("s-protocollo-regionale").value.trim()
        : "";
    const tipo = document.getElementById("s-tipo").value;
    const art39 = document.getElementById("s-art39").value;
    const data = document.getElementById("s-data").value;
    const latValue = document.getElementById("s-lat").value.trim();
    const lngValue = document.getElementById("s-lng").value.trim();
    const indirizzo = document.getElementById("s-indirizzo").value.trim();
    const note = document.getElementById("s-note").value;
    const altriEnti = document.getElementById("s-altri-enti").value.trim();
    const existingServizio = editingServizioId ? servizi.find(s => s.id === editingServizioId) : null;
    if (!canCompleteServizioWithCurrentProfile(existingServizio, stato)) return;

    const mezziCheckboxes = document.querySelectorAll('input[name="s-mezzi-check"]:checked');
    let mezziIds = [];
    mezziCheckboxes.forEach(cb => mezziIds.push(cb.value));
    let carrelliTrainanti = {};

    const volontariCheckboxes = document.querySelectorAll('input[name="s-volontari-check"]:checked');
    let volontariIds = [];
    volontariCheckboxes.forEach(cb => volontariIds.push(cb.value));
    let volontariArt39 = collectServizioVolontariArt39(volontariIds);
    let volontariContaOre = hasMasterAccess()
        ? collectServizioVolontariFlag(volontariIds, 's-volontari-conta-ore')
        : buildDefaultVolontariFlag(volontariIds, existingServizio?.volontariContaOre || {});
    let volontariInReport = hasMasterAccess()
        ? collectServizioVolontariFlag(volontariIds, 's-volontari-in-report')
        : buildDefaultVolontariFlag(volontariIds, existingServizio?.volontariInReport || {});
    const responsabileServizioId = getSelectedResponsabileServizioId(volontariIds);
    if (responsabileServizioId === null) {
        showToast('Responsabile servizio non valido', 'Seleziona un responsabile tra i volontari assegnati al servizio.');
        return;
    }
    let volontariMezzi = {};
    let squadreAibIds = isAntincendioBoschivo(tipo) ? (existingServizio?.squadreAibIds || []) : [];

    if (isSalaOperativa()) {
        if (isAntincendioBoschivo(tipo)) {
            squadreAibIds = getSelectedServizioSquadreAibIds();
            if (squadreAibIds.length === 0) {
                alert("Attenzione: devi assegnare almeno una squadra A.I.B. operativa all'intervento!");
                return;
            }
            const squadreOccupate = getSquadreAibAssegnateAInterventiAttivi(squadreAibIds, editingServizioId);
            if (squadreOccupate.length > 0) {
                alert("Attenzione: una o più squadre A.I.B. selezionate sono già assegnate a un intervento non completato.");
                return;
            }
            const resources = getServizioSquadreAibResources(squadreAibIds);
            mezziIds = resources.mezziIds;
            volontariIds = resources.volontariIds;
            carrelliTrainanti = {};
            volontariMezzi = {};
            if (mezziIds.length === 0 || volontariIds.length === 0) {
                alert("Attenzione: le squadre A.I.B. selezionate non hanno mezzi o volontari associati.");
                return;
            }
            volontariArt39 = Object.fromEntries(volontariIds.map(id => [id, art39 === 'No' ? 'No' : 'Si']));
            volontariContaOre = buildDefaultVolontariFlag(volontariIds);
            volontariInReport = buildDefaultVolontariFlag(volontariIds);
        } else if (editingServizioId) {
            mezziIds = existingServizio?.mezziIds || [];
            volontariIds = existingServizio?.volontariIds || [];
            volontariArt39 = existingServizio?.volontariArt39 || {};
            volontariContaOre = buildDefaultVolontariFlag(volontariIds, existingServizio?.volontariContaOre || {});
            volontariInReport = buildDefaultVolontariFlag(volontariIds, existingServizio?.volontariInReport || {});
            volontariMezzi = existingServizio?.volontariMezzi || {};
            carrelliTrainanti = existingServizio?.carrelliTrainanti || {};
            squadreAibIds = [];
        } else {
            mezziIds = [];
            volontariIds = [];
            volontariArt39 = {};
            volontariContaOre = {};
            volontariInReport = {};
            volontariMezzi = {};
            carrelliTrainanti = {};
            squadreAibIds = [];
        }
    } else {
        squadreAibIds = isAntincendioBoschivo(tipo) ? squadreAibIds : [];
        const carrelliTrainantiResult = collectServizioCarrelliTrainanti(mezziIds);
        if (!carrelliTrainantiResult.valid) {
            showToast('Trainante mancante', carrelliTrainantiResult.message);
            return;
        }
        carrelliTrainanti = carrelliTrainantiResult.value;

        if (isAntincendioBoschivo(tipo) && mezziIds.length === 0) {
            alert("Attenzione: devi assegnare almeno un mezzo al servizio!");
            return;
        }

        if (volontariIds.length === 0) {
            alert("Attenzione: devi assegnare almeno un volontario all'equipaggio del servizio!");
            return;
        }

        const volontariMezziResult = collectServizioVolontariMezzi(volontariIds, mezziIds);
        if (!volontariMezziResult.valid) {
            showToast('Mezzo mancante', volontariMezziResult.message);
            return;
        }
        volontariMezzi = volontariMezziResult.value;
    }

    if (art39 === 'No') {
        volontariArt39 = Object.fromEntries(volontariIds.map(id => [id, 'No']));
    }
    volontariContaOre = hasMasterAccess()
        ? Object.fromEntries(volontariIds.map(id => [id, volontariContaOre?.[id] === 'No' ? 'No' : 'Si']))
        : buildDefaultVolontariFlag(volontariIds, existingServizio?.volontariContaOre || {});
    volontariInReport = hasMasterAccess()
        ? Object.fromEntries(volontariIds.map(id => [id, volontariInReport?.[id] === 'No' ? 'No' : 'Si']))
        : buildDefaultVolontariFlag(volontariIds, existingServizio?.volontariInReport || {});

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
        protocollo_regionale: protocolloRegionale || null,
        tipo,
        data,
        latitudine,
        longitudine,
        indirizzo_intervento: indirizzo || null,
        mezzi_ids: mezziIds,
        carrelli_trainanti: carrelliTrainanti,
        volontari_ids: volontariIds,
        volontari_art39: volontariArt39,
        volontari_mezzi: volontariMezzi,
        volontari_conta_ore: volontariContaOre,
        volontari_in_report: volontariInReport,
        responsabile_servizio_id: hasMasterAccess()
            ? (responsabileServizioId || null)
            : (existingServizio?.responsabileServizioId || null),
        squadre_aib_ids: squadreAibIds,
        art39,
        note,
        altri_enti_coinvolti: altriEnti || null,
        stato,
        ...getServizioCompletionSnapshot(existingServizio, stato),
        ...buildServizioAibPayload(tipo),
    };

    const serviziTab = document.getElementById('tab-servizi');
    const showSalaOperativaCreateProgress = !editingServizioId && serviziTab && !serviziTab.classList.contains('hidden');
    let saveSucceeded = false;
    if (showSalaOperativaCreateProgress) {
        showPdfExportProgress('Salvataggio missione in corso', 'Attendere il completamento del salvataggio...');
        await new Promise(resolve => requestAnimationFrame(resolve));
    }

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
        saveSucceeded = true;
    } catch (err) {
        console.error("Errore durante il salvataggio del servizio:", err);
        showToast("Errore di Salvataggio", "Impossibile registrare il servizio su Supabase.");
    } finally {
        if (showSalaOperativaCreateProgress) hidePdfExportProgress(saveSucceeded);
    }
}

async function completaServizio(id) {
    const serv = servizi.find(s => s.id === id);
    if (serv) {
        if (!canCompleteServizioWithCurrentProfile(serv, "Completato")) return;

        try {
            const { error: sErr } = await supabase
                .from('servizi')
                .update({
                    stato: "Completato",
                    ...getServizioCompletionSnapshot(serv, "Completato"),
                })
                .eq('id', id);
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

function slugForPdfFilename(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'documento';
}

function getPdfDateFile(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return new Date().toISOString().slice(0, 10);
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function getServizioPdfFilename(servizio, template) {
    const tipo = slugForPdfFilename(servizio?.tipo);
    const data = getPdfDateFile(servizio?.data);

    if (template === 'template_aib') {
        return `Modello AIB-${tipo}-${data}.pdf`;
    }

    if (template === 'modello-3-2') {
        return `Modello 3.2-${tipo}-${data}.pdf`;
    }

    return `Riepilogo intervento-${tipo}-${data}.pdf`;
}

function getServizioPdfDescription(template) {
    if (template === 'template_aib') return 'Modello AIB - Antincendio Boschivo';
    if (template === 'modello-3-2') return 'Modello 3.2';
    return 'Modello A - Presenze ODV';
}

function getSquadraAibPdfFilename(squadra) {
    return `Squadra AIB-${slugForPdfFilename(squadra?.nome)}-${getPdfDateFile()}.pdf`;
}

function openPdfDeliveryModal(options) {
    pendingPdfDelivery = options;

    const filename = options.filename || 'documento.pdf';
    const recipient = window.laravelConfig?.pdfMailTo || '';
    const description = document.getElementById('pdf-delivery-description');
    const toInput = document.getElementById('pdf-delivery-to');
    const subjectInput = document.getElementById('pdf-delivery-subject');
    const bodyInput = document.getElementById('pdf-delivery-body');

    if (description) {
        description.innerText = `${options.description || 'PDF'}: scegli se scaricare il file oppure inviarlo via email.`;
    }
    if (toInput) toInput.value = recipient;
    if (subjectInput) subjectInput.value = filename;
    if (bodyInput) bodyInput.value = `in allegato il file ${filename} ⚠️ E-Mail generata automaticamente. L'indirizzzo di posta non è abilitato alla ricezione ⚠️`;

    toggleModal('modal-pdf-delivery', true);
}

function closePdfDeliveryModal() {
    pendingPdfDelivery = null;
    toggleModal('modal-pdf-delivery', false);
}

function getPdfDeliveryEmailPayload() {
    const to = document.getElementById('pdf-delivery-to')?.value.trim() || '';
    const subject = document.getElementById('pdf-delivery-subject')?.value.trim() || '';
    const body = document.getElementById('pdf-delivery-body')?.value.trim() || '';

    if (!to) {
        showToast('Destinatario mancante', 'Inserisci un indirizzo email.');
        return null;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        showToast('Email non valida', 'Controlla l\'indirizzo del destinatario.');
        return null;
    }

    return { to, subject, body };
}

function runPendingPdfDelivery(delivery, email = null) {
    const pending = pendingPdfDelivery;
    if (!pending) return;

    closePdfDeliveryModal();

    if (pending.type === 'servizio') {
        exportServizioPdf(pending.id, pending.template, delivery, email);
        return;
    }

    if (pending.type === 'squadra-aib') {
        exportSquadraAibPdf(pending.id, delivery, email);
    }
}

function confirmPdfDeliveryDownload() {
    runPendingPdfDelivery('download');
}

function confirmPdfDeliveryEmail() {
    const email = getPdfDeliveryEmailPayload();
    if (!email) return;

    runPendingPdfDelivery('email', email);
}

function openPdfTemplateModal(id) {
    const serv = servizi.find(s => s.id === id);
    if (!serv) return;

    if (serv.stato !== "Completato") {
        showToast("Export non disponibile", "I modelli consuntivi possono essere generati solo per servizi completati.");
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
        const serv = servizi.find(s => s.id === id);
        if (!serv) return;

        openPdfDeliveryModal({
            type: 'servizio',
            id,
            template,
            filename: getServizioPdfFilename(serv, template),
            description: getServizioPdfDescription(template),
        });
    }
}

async function exportServizioPdf(id, template = 'servizio-programmato', delivery = 'download', email = null) {
    const serv = servizi.find(s => s.id === id);
    if (!serv) return;

    const isConsuntivo = ["riepilogo-intervento", "template_aib", "modello-3-2"].includes(template);
    const isServizioProgrammato = template === "servizio-programmato";
    if (isServizioProgrammato && !["Programmato", "In corso"].includes(serv.stato)) {
        showToast("Export non disponibile", "Il PDF servizio programmato può essere generato solo per servizi programmati o in corso.");
        return;
    }
    if (isServizioProgrammato && serv.stato === "Programmato" && !serv.responsabileServizioId) {
        alert("responsabile servizio non assegnato");
        return;
    }
    if (isConsuntivo && serv.stato !== "Completato") {
        showToast("Export non disponibile", "I modelli consuntivi possono essere generati solo per servizi completati.");
        return;
    }

    const mezziExport = (serv.mezziIds || [])
        .map(mId => mezzi.find(m => m.id === mId))
        .filter(Boolean);
    const equipaggio = (serv.volontariIds || [])
        .filter(vId => !isConsuntivo || !isVolontarioFlagNo((serv.volontariInReport || {})[vId]))
        .map(vId => volontari.find(v => v.id === vId))
        .filter(Boolean);
    const caposquadraVolontario = template === "template_aib"
        ? findCaposquadraVolontarioByCompletatore(serv)
        : null;

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

    showPdfExportProgress(
        delivery === 'email' ? 'Invio email in corso' : 'Generazione PDF in corso',
        delivery === 'email' ? 'Attendere il completamento dell\'invio...' : 'Attendere il completamento del download...'
    );

    try {
        const response = await fetch('/servizi/pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': delivery === 'email' ? 'application/json' : 'application/pdf',
                'X-CSRF-TOKEN': csrfToken || '',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                template,
                delivery,
                ...(delivery === 'email' ? { email } : {}),
                servizio: {
                    id: serv.id,
                    tipo: serv.tipo,
                    data: serv.data,
                    note: serv.note || '',
                    richiedente: serv.richiedente || '',
                    protocollo_regionale: serv.protocolloRegionale || '',
                    indirizzo: serv.indirizzo || '',
                    latitudine: serv.latitudine ?? null,
                    longitudine: serv.longitudine ?? null,
                    altriEnti: serv.altriEnti || '',
                    stato: serv.stato,
                    tipologia_aib: serv.tipologiaAib || '',
                    volontariIds: serv.volontariIds || [],
                    volontari_art39: serv.volontariArt39 || {},
                    volontari_mezzi: serv.volontariMezzi || {},
                    volontari_conta_ore: serv.volontariContaOre || {},
                    volontari_in_report: serv.volontariInReport || {},
                    responsabile_servizio_id: serv.responsabileServizioId || '',
                    carrelli_trainanti: serv.carrelliTrainanti || {},
                    oraArrivoIncendio: serv.oraArrivoIncendio || '',
                    oraFineIntervento: serv.oraFineIntervento || '',
                    oraRientroSede: serv.oraRientroSede || '',
                    superficieCeduo: serv.superficieCeduo || {},
                    superficieAltoFusto: serv.superficieAltoFusto || {},
                    superficieNonBoscato: serv.superficieNonBoscato || {},
                    completato_da_nome: serv.completatoDaNome || '',
                    completato_da_cognome: serv.completatoDaCognome || '',
                    completato_da_telefono: caposquadraVolontario?.telefono || '',
                },
                mezzi: mezziExport.map(m => ({
                    id: m.id,
                    modello: m.modello,
                    targa: m.targa,
                    tipo: m.tipo,
                    stato: m.stato,
                })),
                equipaggio: equipaggio.map(v => ({
                    id: v.id,
                    nome: v.nome,
                    cognome: v.cognome,
                    cf: v.cf,
                    ruolo: v.ruolo,
                    associazione_appartenenza: v.associazione_appartenenza,
                    telefono: v.telefono,
                    stato: v.stato,
                })),
            }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || (delivery === 'email' ? 'Errore durante l\'invio dell\'email' : 'Errore durante la generazione del PDF'));
        }

        if (delivery === 'email') {
            const data = await response.json().catch(() => ({}));
            showToast('Invio email avviato', data.message || 'Il PDF verrà inviato a breve.');
            hidePdfExportProgress(true);
            return;
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
        showToast(delivery === 'email' ? 'Errore invio email' : 'Errore export PDF', err.message || (delivery === 'email' ? "Impossibile inviare l'email." : "Impossibile generare il file PDF."));
        hidePdfExportProgress(false);
    }
}

async function deleteServizio(id) {
    if (isCapoSquadra()) return;

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

// --- PROTOCOLLO IN INGRESSO ---
function getProtocolloIngressoFilePath(id, file) {
    const safeName = String(file?.name || 'documento')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'documento';
    return `${id}/${Date.now()}-${safeName}`;
}

function setProtocolloIngressoModalMode({ title, submitText, fileRequired, currentFileName = '' }) {
    const titleEl = document.getElementById('modal-protocollo-ingresso-title');
    const submitEl = document.getElementById('modal-protocollo-ingresso-submit');
    const fileInput = document.getElementById('pi-file');
    const requiredMark = document.getElementById('pi-file-required');
    const currentFile = document.getElementById('pi-file-current');
    if (titleEl) titleEl.innerText = title;
    if (submitEl) submitEl.innerText = submitText;
    if (fileInput) fileInput.required = fileRequired;
    if (requiredMark) requiredMark.classList.toggle('hidden', !fileRequired);
    if (currentFile) {
        currentFile.classList.toggle('hidden', !currentFileName);
        currentFile.innerText = currentFileName ? `File attuale: ${currentFileName}` : '';
    }
}

function resetProtocolloIngressoForm() {
    setProtocolloIngressoModalMode({
        title: 'Nuovo Protocollo in Ingresso',
        submitText: 'Salva',
        fileRequired: true,
    });
}

function openNuovoProtocolloIngressoModal() {
    if (!canAccessProtocolloIngresso()) return;
    editingProtocolloIngressoId = null;
    document.getElementById('pi-protocollo-esterno').value = '';
    document.getElementById('pi-data-memorizzazione').value = '';
    document.getElementById('pi-file').value = '';
    resetProtocolloIngressoForm();
    toggleModal('modal-protocollo-ingresso', true);
}

function openEditProtocolloIngressoModal(id) {
    if (!canAccessProtocolloIngresso()) return;
    const protocollo = protocolliIngresso.find(item => item.id === id);
    if (!protocollo) {
        showToast('Errore', 'Protocollo non trovato.');
        return;
    }

    editingProtocolloIngressoId = id;
    document.getElementById('pi-protocollo-esterno').value = protocollo.protocollo_esterno || '';
    document.getElementById('pi-data-memorizzazione').value = protocollo.data_memorizzazione || '';
    document.getElementById('pi-file').value = '';
    setProtocolloIngressoModalMode({
        title: 'Modifica Protocollo in Ingresso',
        submitText: 'Salva modifiche',
        fileRequired: false,
        currentFileName: protocollo.file_name || '',
    });
    toggleModal('modal-protocollo-ingresso', true);
}

async function saveProtocolloIngresso(event) {
    event.preventDefault();
    if (!canAccessProtocolloIngresso()) return;
    if (isSavingProtocolloIngresso) return;

    isSavingProtocolloIngresso = true;
    const submitEl = document.getElementById('modal-protocollo-ingresso-submit');
    const submitText = submitEl?.innerText || '';
    let progressVisible = false;
    let saveSucceeded = false;
    if (submitEl) submitEl.disabled = true;

    try {
        const protocolloEsterno = document.getElementById('pi-protocollo-esterno')?.value.trim() || null;
        const dataMemorizzazione = document.getElementById('pi-data-memorizzazione')?.value || '';
        const file = document.getElementById('pi-file')?.files?.[0] || null;

        if (!dataMemorizzazione) {
            showToast('Errore', 'La data di memorizzazione è obbligatoria.');
            return;
        }

        if (!editingProtocolloIngressoId && !file) {
            showToast('Errore', 'Il file è obbligatorio.');
            return;
        }

        showPdfExportProgress('Caricamento protocollo in corso', 'Attendere il completamento del caricamento...');
        progressVisible = true;

        if (editingProtocolloIngressoId) {
            const current = protocolliIngresso.find(item => item.id === editingProtocolloIngressoId);
            const payload = {
                protocollo_esterno: protocolloEsterno,
                data_memorizzazione: dataMemorizzazione,
            };
            let previousFilePathToRemove = null;

            if (file) {
                const path = getProtocolloIngressoFilePath(editingProtocolloIngressoId, file);
                const { error: uploadError } = await supabase.storage
                    .from(PROTOCOLLO_INGRESSO_BUCKET)
                    .upload(path, file, { upsert: true, contentType: file.type || undefined });
                if (uploadError) throw uploadError;

                previousFilePathToRemove = current?.file_path || null;
                payload.file_path = path;
                payload.file_name = file.name;
                payload.file_mime_type = file.type || null;
                payload.file_size = file.size;
            }

            const { error } = await supabase
                .from('protocollo_ingresso')
                .update(payload)
                .eq('id', editingProtocolloIngressoId);
            if (error) throw error;

            if (previousFilePathToRemove) {
                await supabase.storage.from(PROTOCOLLO_INGRESSO_BUCKET).remove([previousFilePathToRemove]);
            }

            toggleModal('modal-protocollo-ingresso', false);
            showToast('Protocollo aggiornato', 'Record modificato con successo.');
        } else {
            const { data, error } = await supabase
                .from('protocollo_ingresso')
                .insert([{
                    protocollo_esterno: protocolloEsterno,
                    data_memorizzazione: dataMemorizzazione,
                    file_path: '',
                    file_name: file.name,
                    file_mime_type: file.type || null,
                    file_size: file.size,
                }])
                .select('id')
                .single();
            if (error) throw error;

            const path = getProtocolloIngressoFilePath(data.id, file);
            const { error: uploadError } = await supabase.storage
                .from(PROTOCOLLO_INGRESSO_BUCKET)
                .upload(path, file, { upsert: true, contentType: file.type || undefined });
            if (uploadError) throw uploadError;

            const { error: updateError } = await supabase
                .from('protocollo_ingresso')
                .update({ file_path: path })
                .eq('id', data.id);
            if (updateError) throw updateError;

            toggleModal('modal-protocollo-ingresso', false);
            showToast('Protocollo inserito', 'Record salvato con successo.');
        }

        editingProtocolloIngressoId = null;
        await fetchDataFromSupabase();
        saveSucceeded = true;
    } catch (err) {
        console.error('Errore salvataggio protocollo in ingresso:', err);
        showToast('Errore', 'Impossibile salvare il protocollo in ingresso.');
    } finally {
        if (progressVisible) hidePdfExportProgress(saveSucceeded);
        isSavingProtocolloIngresso = false;
        if (submitEl) {
            submitEl.disabled = false;
            submitEl.innerText = submitText;
        }
    }
}

function renderProtocolloIngresso() {
    const tbody = document.getElementById('protocollo-ingresso-table-body');
    if (!tbody) return;

    const search = (document.getElementById('search-protocollo-ingresso')?.value || '').toLowerCase();
    const filtered = protocolliIngresso.filter(item => {
        return `${item.id || ''} ${item.protocollo_esterno || ''} ${item.file_name || ''}`.toLowerCase().includes(search);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center text-slate-500 font-medium">Nessun protocollo in ingresso trovato.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    filtered.forEach(item => {
        const formattedDate = item.data_memorizzazione
            ? new Date(`${item.data_memorizzazione}T00:00:00`).toLocaleDateString('it-IT')
            : '—';

        tbody.innerHTML += `
            <tr class="hover:bg-slate-800/10 transition-colors">
                <td class="py-4 px-6 text-slate-200 font-mono text-xs font-bold">${escapeHtml(item.id)}</td>
                <td class="py-4 px-6 text-slate-300 font-medium">${escapeHtml(item.protocollo_esterno || '—')}</td>
                <td class="py-4 px-6 text-slate-300 font-medium">${formattedDate}</td>
                <td class="py-4 px-6 text-slate-400">${escapeHtml(item.file_name || '—')}</td>
                <td class="py-4 px-6 text-right">
                    <div class="inline-flex gap-2">
                        <button type="button" onclick="openEditProtocolloIngressoModal('${escapeAttr(item.id)}')" title="Modifica" class="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-500 transition-all">
                            ${ICON_EDIT}
                        </button>
                        <button type="button" onclick="downloadProtocolloIngressoFile('${escapeAttr(item.id)}')" title="Scarica file" class="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-500 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5m-4.5 4.5V3" />
                            </svg>
                        </button>
                        <button type="button" onclick="deleteProtocolloIngresso('${escapeAttr(item.id)}')" title="Elimina" class="p-2 hover:bg-rose-950/30 rounded-lg text-slate-400 hover:text-rose-500 transition-all">
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

async function downloadProtocolloIngressoFile(id) {
    if (!canAccessProtocolloIngresso()) return;

    const protocollo = protocolliIngresso.find(item => item.id === id);
    if (!protocollo?.file_path) {
        showToast('Errore', 'File non disponibile.');
        return;
    }

    try {
        const { data, error } = await supabase.storage
            .from(PROTOCOLLO_INGRESSO_BUCKET)
            .download(protocollo.file_path);
        if (error) throw error;

        downloadBlob(data, protocollo.file_name || `${id}.file`);
    } catch (err) {
        console.error('Errore download protocollo in ingresso:', err);
        showToast('Errore', 'Impossibile scaricare il file.');
    }
}

async function deleteProtocolloIngresso(id) {
    if (!canAccessProtocolloIngresso()) return;

    const protocollo = protocolliIngresso.find(item => item.id === id);
    if (!protocollo) {
        showToast('Errore', 'Protocollo non trovato.');
        return;
    }

    if (!confirm('Eliminare questo protocollo in ingresso?')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('protocollo_ingresso')
            .delete()
            .eq('id', id);
        if (error) throw error;

        if (protocollo.file_path) {
            await supabase.storage.from(PROTOCOLLO_INGRESSO_BUCKET).remove([protocollo.file_path]);
        }

        showToast('Protocollo eliminato', 'Record eliminato con successo.');
        await fetchDataFromSupabase();
    } catch (err) {
        console.error('Errore eliminazione protocollo in ingresso:', err);
        showToast('Errore', 'Impossibile eliminare il protocollo in ingresso.');
    }
}

// --- PROTOCOLLO ASSOCIAZIONE ---
function getProtocolloAssociazioneFilePath(id, file) {
    const safeName = String(file?.name || 'documento')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'documento';
    return `${id}/${Date.now()}-${safeName}`;
}

function getProtocolloAssociazioneValue() {
    if (isSegreteria()) {
        return getUserAssociazione();
    }
    return document.getElementById('pa-associazione')?.value || null;
}

function setProtocolloAssociazioneModalMode({ title, submitText, fileRequired, currentFileName = '' }) {
    const titleEl = document.getElementById('modal-protocollo-associazione-title');
    const submitEl = document.getElementById('modal-protocollo-associazione-submit');
    const fileInput = document.getElementById('pa-file');
    const requiredMark = document.getElementById('pa-file-required');
    const currentFile = document.getElementById('pa-file-current');
    if (titleEl) titleEl.innerText = title;
    if (submitEl) submitEl.innerText = submitText;
    if (fileInput) fileInput.required = fileRequired;
    if (requiredMark) requiredMark.classList.toggle('hidden', !fileRequired);
    if (currentFile) {
        currentFile.classList.toggle('hidden', !currentFileName);
        currentFile.innerText = currentFileName ? `File attuale: ${currentFileName}` : '';
    }
}

function toggleProtocolloAssociazioneTipoFields() {
    const tipo = document.getElementById('pa-tipo')?.value || 'ingresso';
    document.getElementById('pa-mittente-wrap')?.classList.toggle('hidden', tipo !== 'ingresso');
    document.getElementById('pa-destinatario-wrap')?.classList.toggle('hidden', tipo !== 'uscita');
}

function resetProtocolloAssociazioneForm() {
    setProtocolloAssociazioneModalMode({
        title: 'Nuovo Protocollo Associazione',
        submitText: 'Salva',
        fileRequired: true,
    });
}

function openNuovoProtocolloAssociazioneModal() {
    if (!canAccessProtocolloAssociazione()) return;
    editingProtocolloAssociazioneId = null;
    document.getElementById('pa-tipo').value = 'ingresso';
    document.getElementById('pa-data-memorizzazione').value = '';
    document.getElementById('pa-protocollo-esterno').value = '';
    document.getElementById('pa-mittente').value = '';
    document.getElementById('pa-destinatario').value = '';
    document.getElementById('pa-oggetto').value = '';
    document.getElementById('pa-file').value = '';
    renderAssociazioniOptions(getUserAssociazione() || getDefaultAssociazione());
    setupProtocolloAssociazioneField();
    resetProtocolloAssociazioneForm();
    toggleProtocolloAssociazioneTipoFields();
    toggleModal('modal-protocollo-associazione', true);
}

function openEditProtocolloAssociazioneModal(id) {
    if (!hasMasterAccess()) return;
    const protocollo = protocolliAssociazione.find(item => item.id === id);
    if (!protocollo) {
        showToast('Errore', 'Protocollo non trovato.');
        return;
    }

    editingProtocolloAssociazioneId = id;
    renderAssociazioniOptions(protocollo.associazione_appartenenza || getDefaultAssociazione());
    setupProtocolloAssociazioneField();
    document.getElementById('pa-tipo').value = protocollo.tipo || 'ingresso';
    document.getElementById('pa-data-memorizzazione').value = protocollo.data_memorizzazione || '';
    document.getElementById('pa-protocollo-esterno').value = protocollo.protocollo_esterno || '';
    document.getElementById('pa-mittente').value = protocollo.mittente || '';
    document.getElementById('pa-destinatario').value = protocollo.destinatario || '';
    document.getElementById('pa-oggetto').value = protocollo.oggetto || '';
    document.getElementById('pa-file').value = '';
    if (!isSegreteria()) {
        document.getElementById('pa-associazione').value = protocollo.associazione_appartenenza || getDefaultAssociazione();
    }
    setProtocolloAssociazioneModalMode({
        title: 'Modifica Protocollo Associazione',
        submitText: 'Salva modifiche',
        fileRequired: false,
        currentFileName: protocollo.file_name || '',
    });
    toggleProtocolloAssociazioneTipoFields();
    toggleModal('modal-protocollo-associazione', true);
}

async function saveProtocolloAssociazione(event) {
    event.preventDefault();
    if (!canAccessProtocolloAssociazione()) return;
    if (isSavingProtocolloAssociazione) return;

    isSavingProtocolloAssociazione = true;
    const submitEl = document.getElementById('modal-protocollo-associazione-submit');
    const submitText = submitEl?.innerText || '';
    let progressVisible = false;
    let saveSucceeded = false;
    if (submitEl) submitEl.disabled = true;

    try {
        const tipo = document.getElementById('pa-tipo')?.value || 'ingresso';
        const dataMemorizzazione = document.getElementById('pa-data-memorizzazione')?.value || '';
        const protocolloEsterno = document.getElementById('pa-protocollo-esterno')?.value.trim() || null;
        const mittente = tipo === 'ingresso'
            ? (document.getElementById('pa-mittente')?.value.trim() || null)
            : null;
        const destinatario = tipo === 'uscita'
            ? (document.getElementById('pa-destinatario')?.value.trim() || null)
            : null;
        const oggetto = document.getElementById('pa-oggetto')?.value.trim() || null;
        const associazione = getProtocolloAssociazioneValue();
        const file = document.getElementById('pa-file')?.files?.[0] || null;

        if (!['ingresso', 'uscita'].includes(tipo)) {
            showToast('Errore', 'Seleziona ingresso o uscita.');
            return;
        }

        if (!dataMemorizzazione) {
            showToast('Errore', 'La data di memorizzazione è obbligatoria.');
            return;
        }

        if (!associazione) {
            showToast('Errore', 'Associazione non configurata.');
            return;
        }

        if (!editingProtocolloAssociazioneId && !file) {
            showToast('Errore', 'Il file è obbligatorio.');
            return;
        }

        if (file && !isAllowedProtocolloAssociazioneFile(file)) {
            showToast('Errore', 'Carica solo file PDF o immagini JPG, PNG, WEBP.');
            return;
        }

        showPdfExportProgress('Caricamento protocollo in corso', 'Attendere il completamento del caricamento...');
        progressVisible = true;

        if (editingProtocolloAssociazioneId) {
            const current = protocolliAssociazione.find(item => item.id === editingProtocolloAssociazioneId);
            const payload = {
                tipo,
                protocollo_esterno: protocolloEsterno,
                mittente,
                destinatario,
                data_memorizzazione: dataMemorizzazione,
                oggetto,
                associazione_appartenenza: associazione,
            };
            let previousFilePathToRemove = null;

            if (file) {
                const path = getProtocolloAssociazioneFilePath(editingProtocolloAssociazioneId, file);
                const { error: uploadError } = await supabase.storage
                    .from(PROTOCOLLO_ASSOCIAZIONE_BUCKET)
                    .upload(path, file, { upsert: true, contentType: file.type || undefined });
                if (uploadError) throw uploadError;

                previousFilePathToRemove = current?.file_path || null;
                payload.file_path = path;
                payload.file_name = file.name;
                payload.file_mime_type = file.type || null;
                payload.file_size = file.size;
            }

            const { error } = await supabase
                .from('protocollo_associazione')
                .update(payload)
                .eq('id', editingProtocolloAssociazioneId);
            if (error) throw error;

            if (previousFilePathToRemove) {
                await supabase.storage.from(PROTOCOLLO_ASSOCIAZIONE_BUCKET).remove([previousFilePathToRemove]);
            }

            toggleModal('modal-protocollo-associazione', false);
            showToast('Protocollo aggiornato', 'Record modificato con successo.');
        } else {
            const { data, error } = await supabase
                .from('protocollo_associazione')
                .insert([{
                    tipo,
                    protocollo_esterno: protocolloEsterno,
                    mittente,
                    destinatario,
                    data_memorizzazione: dataMemorizzazione,
                    oggetto,
                    associazione_appartenenza: associazione,
                    file_path: '',
                    file_name: file.name,
                    file_mime_type: file.type || null,
                    file_size: file.size,
                }])
                .select('id')
                .single();
            if (error) throw error;

            const path = getProtocolloAssociazioneFilePath(data.id, file);
            const { error: uploadError } = await supabase.storage
                .from(PROTOCOLLO_ASSOCIAZIONE_BUCKET)
                .upload(path, file, { upsert: true, contentType: file.type || undefined });
            if (uploadError) throw uploadError;

            const { error: updateError } = await supabase
                .from('protocollo_associazione')
                .update({ file_path: path })
                .eq('id', data.id);
            if (updateError) throw updateError;

            toggleModal('modal-protocollo-associazione', false);
            showToast('Protocollo inserito', 'Record salvato con successo.');
        }

        editingProtocolloAssociazioneId = null;
        await fetchDataFromSupabase();
        saveSucceeded = true;
    } catch (err) {
        console.error('Errore salvataggio protocollo associazione:', err);
        showToast('Errore', 'Impossibile salvare il protocollo associazione.');
    } finally {
        if (progressVisible) hidePdfExportProgress(saveSucceeded);
        isSavingProtocolloAssociazione = false;
        if (submitEl) {
            submitEl.disabled = false;
            submitEl.innerText = submitText;
        }
    }
}

function getProtocolloAssociazioneVisibili() {
    const search = (document.getElementById('search-protocollo-associazione')?.value || '').toLowerCase();
    const tipoFilter = document.getElementById('filter-protocollo-associazione-tipo')?.value || '';
    return protocolliAssociazione.filter(item => {
        const matchTipo = !tipoFilter || item.tipo === tipoFilter;
        const searchText = `${item.id || ''} ${item.tipo || ''} ${item.associazione_appartenenza || ''} ${item.protocollo_esterno || ''} ${item.mittente || ''} ${item.destinatario || ''} ${item.oggetto || ''} ${item.file_name || ''}`.toLowerCase();
        return matchTipo && searchText.includes(search);
    });
}

function getProtocolloAssociazioneFileExtension(filename = '') {
    const cleanName = String(filename || '').split('?')[0].split('#')[0];
    const dotIndex = cleanName.lastIndexOf('.');
    return dotIndex >= 0 ? cleanName.slice(dotIndex + 1).toLowerCase() : '';
}

function getProtocolloAssociazioneFileType(file, filename = '') {
    const mimeType = String(file?.type || '').toLowerCase();
    if (mimeType) return mimeType;

    const extension = getProtocolloAssociazioneFileExtension(filename || file?.name);
    if (extension === 'pdf') return 'application/pdf';
    if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
    if (extension === 'png') return 'image/png';
    if (extension === 'webp') return 'image/webp';
    return '';
}

function isAllowedProtocolloAssociazioneFile(file) {
    if (!file) return false;

    const mimeType = getProtocolloAssociazioneFileType(file, file.name);
    if (PROTOCOLLO_ASSOCIAZIONE_ALLOWED_TYPES.includes(mimeType)) return true;

    const extension = getProtocolloAssociazioneFileExtension(file.name);
    return PROTOCOLLO_ASSOCIAZIONE_ALLOWED_EXTENSIONS.includes(extension);
}

function getProtocolloAssociazioneWatermarkedFilename(filename, protocolloId) {
    const safeProtocollo = getSafeFilenamePart(protocolloId) || 'protocollo';
    const fallbackName = `${safeProtocollo}.pdf`;
    const baseFilename = String(filename || fallbackName);
    const dotIndex = baseFilename.lastIndexOf('.');
    if (dotIndex <= 0) return `${baseFilename}-protocollo-${safeProtocollo}`;

    return `${baseFilename.slice(0, dotIndex)}-protocollo-${safeProtocollo}${baseFilename.slice(dotIndex)}`;
}

async function addProtocolloAssociazionePdfWatermark(blob, watermarkText) {
    const bytes = await blob.arrayBuffer();
    const pdfDoc = await PDFDocument.load(bytes);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    pdfDoc.getPages().forEach(page => {
        const { width, height } = page.getSize();
        const text = String(watermarkText || '').trim();
        if (!text) return;

        const fontSize = 12;
        const paddingX = 8;
        const paddingY = 5;
        const boxX = 24;
        const boxHeight = fontSize + (paddingY * 2);
        const boxWidth = font.widthOfTextAtSize(text, fontSize) + (paddingX * 2);
        const boxY = height - 24 - boxHeight;
        const borderWidth = 4;
        const borderRadius = 4;
        const red = rgb(1, 0.35, 0.35);
        const renderedBoxWidth = Math.min(boxWidth, width - (boxX * 2));
        const roundedBoxPath = [
            `M ${borderRadius} 0`,
            `H ${renderedBoxWidth - borderRadius}`,
            `Q ${renderedBoxWidth} 0 ${renderedBoxWidth} ${borderRadius}`,
            `V ${boxHeight - borderRadius}`,
            `Q ${renderedBoxWidth} ${boxHeight} ${renderedBoxWidth - borderRadius} ${boxHeight}`,
            `H ${borderRadius}`,
            `Q 0 ${boxHeight} 0 ${boxHeight - borderRadius}`,
            `V ${borderRadius}`,
            `Q 0 0 ${borderRadius} 0`,
            'Z',
        ].join(' ');

        page.drawSvgPath(roundedBoxPath, {
            x: boxX,
            y: boxY + boxHeight,
            borderColor: red,
            borderWidth,
        });

        page.drawText(text, {
            x: boxX + paddingX,
            y: boxY + paddingY + 1,
            size: fontSize,
            font,
            color: red,
        });
    });

    const watermarkedBytes = await pdfDoc.save();
    return new Blob([watermarkedBytes], { type: 'application/pdf' });
}

function loadProtocolloAssociazioneImage(blob) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const url = URL.createObjectURL(blob);
        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Impossibile leggere immagine protocollo associazione.'));
        };
        image.src = url;
    });
}

async function addProtocolloAssociazioneImageWatermark(blob, watermarkText, mimeType) {
    const image = await loadProtocolloAssociazioneImage(blob);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.save();
    const text = String(watermarkText || '').trim();
    const fontSize = Math.max(14, Math.min(canvas.width, canvas.height) / 40);
    const paddingX = Math.max(8, fontSize * 0.65);
    const paddingY = Math.max(5, fontSize * 0.4);
    const boxX = Math.max(16, canvas.width * 0.035);
    const boxY = Math.max(16, canvas.height * 0.035);

    ctx.font = `700 ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.strokeStyle = '#ff5a5a';
    ctx.fillStyle = '#ff5a5a';
    ctx.lineWidth = 4;

    const boxWidth = Math.min(ctx.measureText(text).width + (paddingX * 2), canvas.width - (boxX * 2));
    const boxHeight = fontSize + (paddingY * 2);
    if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
        ctx.stroke();
    } else {
        ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
    }
    ctx.fillText(text, boxX + paddingX, boxY + paddingY);
    ctx.restore();

    const outputType = PROTOCOLLO_ASSOCIAZIONE_ALLOWED_TYPES.includes(mimeType) && mimeType !== 'application/pdf'
        ? mimeType
        : 'image/png';

    return new Promise(resolve => {
        canvas.toBlob(watermarkedBlob => {
            resolve(watermarkedBlob || blob);
        }, outputType, 0.92);
    });
}

async function addProtocolloAssociazioneWatermark(blob, protocollo) {
    const filename = protocollo.file_name || `${protocollo.id}.file`;
    const mimeType = getProtocolloAssociazioneFileType(blob, filename);
    const protocolloId = String(protocollo.id || '').trim();
    const watermarkText = protocolloId ? `Protocollo ${protocolloId}` : '';

    if (!watermarkText) return blob;
    if (mimeType === 'application/pdf') {
        return addProtocolloAssociazionePdfWatermark(blob, watermarkText);
    }
    if (mimeType.startsWith('image/')) {
        return addProtocolloAssociazioneImageWatermark(blob, watermarkText, mimeType);
    }

    return blob;
}

function renderProtocolloAssociazione() {
    const tbody = document.getElementById('protocollo-associazione-table-body');
    if (!tbody) return;

    const filtered = getProtocolloAssociazioneVisibili();

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="py-8 text-center text-slate-500 font-medium">Nessun protocollo associazione trovato.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    filtered.forEach(item => {
        const formattedDate = item.data_memorizzazione
            ? new Date(`${item.data_memorizzazione}T00:00:00`).toLocaleDateString('it-IT')
            : '—';
        const tipoLabel = item.tipo === 'uscita' ? 'Uscita' : 'Ingresso';
        const tipoClass = item.tipo === 'uscita'
            ? 'bg-sky-500/10 text-sky-300 border-sky-500/20'
            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
        const mittenteDestinatario = item.tipo === 'uscita'
            ? item.destinatario
            : item.mittente;
        const deleteButton = hasMasterAccess()
            ? `<button type="button" onclick="deleteProtocolloAssociazione('${escapeAttr(item.id)}')" title="Elimina" class="p-2 hover:bg-rose-950/30 rounded-lg text-slate-400 hover:text-rose-500 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                        </button>`
            : '';
        const editButton = hasMasterAccess()
            ? `<button type="button" onclick="openEditProtocolloAssociazioneModal('${escapeAttr(item.id)}')" title="Modifica" class="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-500 transition-all">
                            ${ICON_EDIT}
                        </button>`
            : '';

        tbody.innerHTML += `
            <tr class="hover:bg-slate-800/10 transition-colors">
                <td class="py-4 px-6 text-slate-200 font-mono text-xs font-bold">${escapeHtml(item.id)}</td>
                <td class="py-4 px-6"><span class="inline-flex px-2.5 py-1 rounded-lg border text-xs font-bold ${tipoClass}">${tipoLabel}</span></td>
                <td class="py-4 px-6 text-slate-300 font-medium">${escapeHtml(item.associazione_appartenenza || '—')}</td>
                <td class="py-4 px-6 text-slate-300 font-medium">${escapeHtml(item.protocollo_esterno || '—')}</td>
                <td class="py-4 px-6 text-slate-300 font-medium">${escapeHtml(mittenteDestinatario || '—')}</td>
                <td class="py-4 px-6 text-slate-300 font-medium">${formattedDate}</td>
                <td class="py-4 px-6 text-slate-400 max-w-xs truncate" title="${escapeAttr(item.oggetto || '')}">${escapeHtml(item.oggetto || '—')}</td>
                <td class="py-4 px-6 text-slate-400">${escapeHtml(item.file_name || '—')}</td>
                <td class="py-4 px-6 text-right">
                    <div class="inline-flex gap-2">
                        ${editButton}
                        <button type="button" onclick="downloadProtocolloAssociazioneFile('${escapeAttr(item.id)}')" title="Scarica file" class="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-500 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5m-4.5 4.5V3" />
                            </svg>
                        </button>
                        ${deleteButton}
                    </div>
                </td>
            </tr>
        `;
    });
}

async function downloadProtocolloAssociazioneFile(id) {
    if (!canAccessProtocolloAssociazione()) return;

    const protocollo = protocolliAssociazione.find(item => item.id === id);
    if (!protocollo?.file_path) {
        showToast('Errore', 'File non disponibile.');
        return;
    }

    try {
        const { data, error } = await supabase.storage
            .from(PROTOCOLLO_ASSOCIAZIONE_BUCKET)
            .download(protocollo.file_path);
        if (error) throw error;

        const watermarkedBlob = await addProtocolloAssociazioneWatermark(data, protocollo);
        const filename = getProtocolloAssociazioneWatermarkedFilename(protocollo.file_name || `${id}.file`, protocollo.id);
        downloadBlob(watermarkedBlob, filename);
    } catch (err) {
        console.error('Errore download protocollo associazione:', err);
        showToast('Errore', 'Impossibile scaricare il file.');
    }
}

function escapeProtocolloAssociazioneCsvValue(value) {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
}

function exportProtocolloAssociazioneVisibili() {
    if (!canAccessProtocolloAssociazione()) return;

    const rows = getProtocolloAssociazioneVisibili();
    if (!rows.length) {
        showToast('Nessun dato', 'Non ci sono protocolli visibili da esportare.');
        return;
    }

    const headers = [
        'Protocollo',
        'Tipo',
        'Associazione',
        'Protocollo esterno',
        'Mittente',
        'Destinatario',
        'Data',
        'Oggetto',
        'File',
    ];
    const lines = [headers.map(escapeProtocolloAssociazioneCsvValue).join(';')];

    rows.forEach(item => {
        lines.push([
            item.id,
            item.tipo === 'uscita' ? 'Uscita' : 'Ingresso',
            item.associazione_appartenenza,
            item.protocollo_esterno,
            item.mittente,
            item.destinatario,
            item.data_memorizzazione,
            item.oggetto,
            item.file_name,
        ].map(escapeProtocolloAssociazioneCsvValue).join(';'));
    });

    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `protocollo-associazione-${new Date().toISOString().slice(0, 10)}.csv`);
}

async function deleteProtocolloAssociazione(id) {
    if (!hasMasterAccess()) return;

    const protocollo = protocolliAssociazione.find(item => item.id === id);
    if (!protocollo) {
        showToast('Errore', 'Protocollo non trovato.');
        return;
    }

    if (!confirm('Eliminare questo protocollo associazione?')) {
        return;
    }

    try {
        if (protocollo.file_path) {
            await supabase.storage.from(PROTOCOLLO_ASSOCIAZIONE_BUCKET).remove([protocollo.file_path]);
        }

        const { error } = await supabase
            .from('protocollo_associazione')
            .delete()
            .eq('id', id);
        if (error) throw error;

        showToast('Protocollo eliminato', 'Record eliminato con successo.');
        await fetchDataFromSupabase();
    } catch (err) {
        console.error('Errore eliminazione protocollo associazione:', err);
        showToast('Errore', 'Impossibile eliminare il protocollo associazione.');
    }
}

// --- UPDATE TOTALE UI E STATI ---
function updateUI() {
    updateDashboardStats();
    syncOperatoreSalaControl();
    renderDashboardCaposquadra();
    renderVolontari();
    renderMezzi();
    renderSquadreAib();
    renderServizi();
    renderAttivita();
    renderStatistiche();
    renderProtocolloIngresso();
    renderProtocolloAssociazione();
    renderMagazzino();
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

function canManageSuperUser() {
    return isSuperUser();
}

function configureProfiloRuoloOptions() {
    const select = document.getElementById('p-ruolo');
    if (!select) return;

    const superOption = select.querySelector('option[value="super_user"]');
    if (!superOption) return;

    const allowed = canManageSuperUser();
    superOption.hidden = !allowed;
    superOption.disabled = !allowed;
    if (!allowed && select.value === 'super_user') {
        select.value = 'segreteria';
    }
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

    toggleProfiloIdentitaFields();
}

function toggleProfiloIdentitaFields() {
    const wrap = document.getElementById('p-identita-wrap');
    const nomeInput = document.getElementById('p-nome');
    const cognomeInput = document.getElementById('p-cognome');
    const ruolo = document.getElementById('p-ruolo')?.value;
    if (!wrap || !nomeInput || !cognomeInput) return;

    const allowed = roleAllowsProfiloIdentita(ruolo);
    wrap.classList.toggle('hidden', !allowed);
    nomeInput.disabled = !allowed;
    nomeInput.required = allowed;
    cognomeInput.disabled = !allowed;
    cognomeInput.required = allowed;
    if (!allowed) {
        nomeInput.value = '';
        cognomeInput.value = '';
    }
}

function getAdminProfileDisplayName(profile) {
    return [profile.nome, profile.cognome].filter(Boolean).join(' ') || profile.email || '';
}

function renderAdminProfileAssociazioneFilterOptions(profiles) {
    const select = document.getElementById('admin-profiles-associazione-filter');
    if (!select) return;

    const currentValue = select.value;
    const associazioni = [...new Set(profiles.map(p => p.associazione).filter(Boolean))]
        .sort((a, b) => String(a).localeCompare(String(b), 'it'));

    select.innerHTML = '<option value="">Tutte le associazioni</option>' + associazioni.map(associazione => (
        `<option value="${escapeAttr(associazione)}">${escapeHtml(associazione)}</option>`
    )).join('');

    if (currentValue && associazioni.includes(currentValue)) {
        select.value = currentValue;
    }
}

function getFilteredAdminProfiles() {
    const search = document.getElementById('admin-profiles-search')?.value.trim().toLowerCase() || '';
    const roleFilter = document.getElementById('admin-profiles-role-filter')?.value || '';
    const associazioneFilter = document.getElementById('admin-profiles-associazione-filter')?.value || '';
    const sort = document.getElementById('admin-profiles-sort')?.value || 'created_desc';

    return [...adminProfilesCache]
        .filter(profile => {
            const searchText = `${getAdminProfileDisplayName(profile)} ${profile.email || ''} ${formatRuoloLabel(profile.ruolo)} ${profile.associazione || ''}`.toLowerCase();
            const matchSearch = !search || searchText.includes(search);
            const matchRole = !roleFilter || profile.ruolo === roleFilter;
            const matchAssociazione = !associazioneFilter || profile.associazione === associazioneFilter;
            return matchSearch && matchRole && matchAssociazione;
        })
        .sort((a, b) => {
            if (sort === 'name_asc') {
                return String(getAdminProfileDisplayName(a)).localeCompare(String(getAdminProfileDisplayName(b)), 'it');
            }
            if (sort === 'name_desc') {
                return String(getAdminProfileDisplayName(b)).localeCompare(String(getAdminProfileDisplayName(a)), 'it');
            }
            if (sort === 'role_asc') {
                return String(formatRuoloLabel(a.ruolo)).localeCompare(String(formatRuoloLabel(b.ruolo)), 'it');
            }
            if (sort === 'association_asc') {
                return String(a.associazione || '').localeCompare(String(b.associazione || ''), 'it');
            }
            return 0;
        });
}

function renderAdminProfilesRows(profiles, emptyMessage = 'Nessun utente trovato con i filtri selezionati.') {
    const tbody = document.getElementById('admin-profiles-table-body');
    if (!tbody) return;

    if (profiles.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="py-8 text-center text-slate-500 font-medium">${emptyMessage}</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    profiles.forEach(p => {
        let ruoloBadge = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        if (p.ruolo === 'super_user') ruoloBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
        else if (p.ruolo === 'master') ruoloBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        else if (p.ruolo === 'sala_operativa') ruoloBadge = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
        else if (p.ruolo === 'capo_squadra') ruoloBadge = 'bg-violet-500/10 text-violet-400 border-violet-500/20';
        const isSelf = p.id === currentUserProfile?.id;
        const canDelete = !isSelf && (p.ruolo !== 'super_user' || canManageSuperUser());
        const profileName = [p.nome, p.cognome].filter(Boolean).join(' ');

        tbody.innerHTML += `
            <tr class="hover:bg-slate-800/20 transition-all">
                <td class="py-4 px-6">
                    ${profileName ? `<p class="text-slate-200 font-semibold">${escapeHtml(profileName)}</p>` : ''}
                    <p class="text-xs text-slate-500 mt-1">${escapeHtml(p.email || '—')}</p>
                </td>
                <td class="py-4 px-6">
                    <span class="px-2.5 py-1 text-xs font-bold border rounded-full whitespace-nowrap ${ruoloBadge}">${formatRuoloLabel(p.ruolo)}</span>
                </td>
                <td class="py-4 px-6 text-slate-400">${p.associazione || '—'}</td>
                <td class="py-4 px-6 text-right">
                    <div class="inline-flex gap-2">
                        <button type="button" onclick="openEditProfiloModal('${p.id}')" title="Modifica" class="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-500 transition-all">
                            ${ICON_EDIT}
                        </button>
                        ${canDelete ? `<button type="button" onclick="deleteProfilo('${p.id}', '${p.ruolo}')" title="Elimina" class="p-2 hover:bg-rose-950/30 rounded-lg text-slate-400 hover:text-rose-500 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                        </button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    });
}

function applyAdminProfilesFilters() {
    renderAdminProfilesRows(getFilteredAdminProfiles());
}

async function renderAdminProfiles() {
    if (!hasMasterAccess()) return;

    const tbody = document.getElementById('admin-profiles-table-body');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="4" class="py-8 text-center text-slate-500 font-medium">Caricamento...</td>
        </tr>
    `;

    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, nome, cognome, ruolo, associazione, created_at')
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

    adminProfilesCache = data || [];
    renderAdminProfileAssociazioneFilterOptions(adminProfilesCache);
    renderAdminProfilesRows(adminProfilesCache, 'Nessun utente configurato.');
}

function getFilteredAdminAssociazioni() {
    const search = document.getElementById('admin-associazioni-search')?.value.trim().toLowerCase() || '';
    const sort = document.getElementById('admin-associazioni-sort')?.value || 'default';

    return [...associazioniDisponibili]
        .filter(associazione => {
            const searchText = `${associazione.nome || ''} ${associazione.legale_rappresentante || ''} ${associazione.recapito_telefonico || ''} ${associazione.mail_pec || ''}`.toLowerCase();
            return !search || searchText.includes(search);
        })
        .sort((a, b) => {
            if (sort === 'name_asc') {
                return String(a.nome || '').localeCompare(String(b.nome || ''), 'it');
            }
            if (sort === 'name_desc') {
                return String(b.nome || '').localeCompare(String(a.nome || ''), 'it');
            }
            return 0;
        });
}

function renderAdminAssociazioniList(associazioni, emptyMessage = 'Nessuna associazione trovata con i filtri selezionati.') {
    const list = document.getElementById('admin-associazioni-list');
    if (!list) return;

    if (!associazioni.length) {
        list.innerHTML = `<div class="p-6 text-sm text-slate-500 font-medium">${emptyMessage}</div>`;
        return;
    }

    list.innerHTML = associazioni.map(associazione => `
        <div class="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-slate-200">${escapeHtml(associazione.nome || '—')}</p>
                <div class="mt-3 grid gap-3 text-xs sm:grid-cols-2 xl:grid-cols-3">
                    <div>
                        <p class="font-bold uppercase tracking-wider text-slate-500">Legale rappresentante</p>
                        <p class="mt-1 text-slate-300">${escapeHtml(associazione.legale_rappresentante || '—')}</p>
                    </div>
                    <div>
                        <p class="font-bold uppercase tracking-wider text-slate-500">Telefono</p>
                        <p class="mt-1 text-slate-300">${escapeHtml(associazione.recapito_telefonico || '—')}</p>
                    </div>
                    <div>
                        <p class="font-bold uppercase tracking-wider text-slate-500">PEC</p>
                        <p class="mt-1 break-all text-slate-300">${escapeHtml(associazione.mail_pec || '—')}</p>
                    </div>
                </div>
            </div>
            <div class="shrink-0 flex items-center gap-2">
                <button type="button" onclick="openEditAssociazioneModal('${escapeAttr(associazione.id)}')" title="Modifica" class="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-500 transition-all">
                    ${ICON_EDIT}
                </button>
                <button type="button" onclick="deleteAssociazione('${escapeAttr(associazione.id)}')" title="Rimuovi" class="p-2 hover:bg-rose-950/30 rounded-lg text-slate-400 hover:text-rose-500 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

function applyAdminAssociazioniFilters() {
    renderAdminAssociazioniList(getFilteredAdminAssociazioni());
}

async function renderAdminAssociazioni() {
    if (!hasMasterAccess()) return;

    const list = document.getElementById('admin-associazioni-list');
    if (!list) return;

    list.innerHTML = '<div class="p-6 text-sm text-slate-500 font-medium">Caricamento...</div>';

    try {
        await loadAssociazioni();
    } catch (err) {
        console.error('Errore caricamento associazioni:', err);
    }

    if (!associazioniLoadedFromApi) {
        list.innerHTML = '<div class="p-6 text-sm text-amber-400 font-medium">Esegui la migration associazioni su Supabase per abilitare aggiunta e rimozione.</div>';
        return;
    }

    renderAdminAssociazioniList(associazioniDisponibili, 'Nessuna associazione configurata.');
}

function openNuovaAssociazioneModal() {
    if (!hasMasterAccess()) return;

    editingAssociazioneId = null;
    const form = document.getElementById('form-associazione');
    if (form) form.reset();
    document.getElementById('modal-associazione-title').innerText = 'Nuova associazione';
    document.getElementById('modal-associazione-submit').innerText = 'Salva';

    toggleModal('modal-associazione', true);
}

function openEditAssociazioneModal(id) {
    if (!hasMasterAccess()) return;

    const associazione = associazioniDisponibili.find(item => String(item.id) === String(id));
    if (!associazione) {
        showToast('Errore', 'Associazione non trovata.');
        return;
    }

    editingAssociazioneId = id;
    document.getElementById('modal-associazione-title').innerText = 'Modifica associazione';
    document.getElementById('modal-associazione-submit').innerText = 'Salva modifiche';
    document.getElementById('associazione-nome').value = associazione.nome || '';
    document.getElementById('associazione-legale-rappresentante').value = associazione.legale_rappresentante || '';
    document.getElementById('associazione-recapito-telefonico').value = associazione.recapito_telefonico || '';
    document.getElementById('associazione-mail-pec').value = associazione.mail_pec || '';

    toggleModal('modal-associazione', true);
}

function openNuovoProfiloModal() {
    editingProfileId = null;
    document.getElementById('modal-profilo-title').innerText = 'Nuovo utente';
    document.getElementById('modal-profilo-submit').innerText = 'Crea utente';
    document.getElementById('p-email').disabled = false;
    document.getElementById('p-email').value = '';
    document.getElementById('p-nome').value = '';
    document.getElementById('p-cognome').value = '';
    document.getElementById('p-password').value = '';
    document.getElementById('p-password').required = true;
    document.getElementById('p-password-required').classList.remove('hidden');
    document.getElementById('p-password-hint').classList.add('hidden');
    document.getElementById('p-ruolo').value = 'segreteria';
    renderAssociazioniOptions(getDefaultAssociazione());
    document.getElementById('p-associazione').value = getDefaultAssociazione();
    configureProfiloRuoloOptions();
    toggleProfiloAssociazioneField();
    toggleModal('modal-profilo', true);
}

async function openEditProfiloModal(id) {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, nome, cognome, ruolo, associazione')
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
    document.getElementById('p-nome').value = data.nome || '';
    document.getElementById('p-cognome').value = data.cognome || '';
    document.getElementById('p-password').value = '';
    document.getElementById('p-password').required = false;
    document.getElementById('p-password-required').classList.add('hidden');
    document.getElementById('p-password-hint').classList.remove('hidden');
    document.getElementById('p-ruolo').value = data.ruolo;
    renderAssociazioniOptions(data.associazione || getDefaultAssociazione());
    document.getElementById('p-associazione').value = data.associazione || getDefaultAssociazione();
    configureProfiloRuoloOptions();
    toggleProfiloAssociazioneField();
    toggleModal('modal-profilo', true);
}

async function saveProfilo(event) {
    event.preventDefault();
    if (!hasMasterAccess()) return;

    const email = document.getElementById('p-email').value.trim();
    const nome = document.getElementById('p-nome').value.trim();
    const cognome = document.getElementById('p-cognome').value.trim();
    const password = document.getElementById('p-password').value;
    const ruolo = document.getElementById('p-ruolo').value;
    const associazione = document.getElementById('p-associazione').value;
    const identityAllowed = roleAllowsProfiloIdentita(ruolo);
    const profileNome = identityAllowed ? nome : null;
    const profileCognome = identityAllowed ? cognome : null;

    try {
        if (editingProfileId) {
            const payload = {
                nome: profileNome,
                cognome: profileCognome,
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

            if (ruolo === 'super_user' && !canManageSuperUser()) {
                showToast('Errore', 'Non autorizzato a creare utenti SuperUser.');
                return;
            }

            await adminApiFetch('/api/admin/profiles', {
                method: 'POST',
                body: JSON.stringify({
                    email,
                    password,
                    nome: profileNome,
                    cognome: profileCognome,
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

async function deleteProfilo(id, ruolo) {
    if (!hasMasterAccess()) return;
    if (id === currentUserProfile?.id) {
        showToast('Errore', 'Non puoi eliminare il tuo account.');
        return;
    }

    if (ruolo === 'super_user' && !canManageSuperUser()) {
        showToast('Errore', 'Non autorizzato a eliminare utenti SuperUser.');
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

async function saveAssociazione(event) {
    event.preventDefault();
    if (!hasMasterAccess()) return;

    const form = document.getElementById('form-associazione');
    const nome = document.getElementById('associazione-nome')?.value.trim() || '';
    const legaleRappresentante = document.getElementById('associazione-legale-rappresentante')?.value.trim() || '';
    const recapitoTelefonico = document.getElementById('associazione-recapito-telefonico')?.value.trim() || '';
    const mailPec = document.getElementById('associazione-mail-pec')?.value.trim() || '';
    if (!nome) {
        showToast('Errore', 'Inserisci la denominazione dell\'associazione.');
        return;
    }

    if (!legaleRappresentante) {
        showToast('Errore', 'Inserisci il legale rappresentante.');
        return;
    }

    let saveSucceeded = false;
    const isEditingAssociazione = Boolean(editingAssociazioneId);
    showPdfExportProgress('Salvataggio associazione in corso', 'Attendere il completamento del salvataggio...');

    try {
        await adminApiFetch(isEditingAssociazione ? `/api/admin/associazioni/${editingAssociazioneId}` : '/api/admin/associazioni', {
            method: isEditingAssociazione ? 'PATCH' : 'POST',
            body: JSON.stringify({
                nome,
                legale_rappresentante: legaleRappresentante,
                recapito_telefonico: recapitoTelefonico || null,
                mail_pec: mailPec || null,
            }),
        });
        saveSucceeded = true;
        editingAssociazioneId = null;
        if (form) form.reset();
        toggleModal('modal-associazione', false);
        showToast(isEditingAssociazione ? 'Associazione aggiornata' : 'Associazione aggiunta', isEditingAssociazione ? 'Modifiche salvate con successo.' : 'La voce è ora disponibile nei menu.');
        await renderAdminAssociazioni();
    } catch (err) {
        console.error('Errore salvataggio associazione:', err);
        showToast('Errore', err.message || 'Impossibile salvare l\'associazione.');
    } finally {
        hidePdfExportProgress(saveSucceeded);
    }
}

async function deleteAssociazione(id) {
    if (!hasMasterAccess()) return;
    if (!confirm('Rimuovere questa associazione?')) return;

    try {
        await adminApiFetch(`/api/admin/associazioni/${id}`, { method: 'DELETE' });
        showToast('Associazione rimossa', 'La voce non è più disponibile nei menu.');
        await renderAdminAssociazioni();
    } catch (err) {
        console.error('Errore eliminazione associazione:', err);
        showToast('Errore', err.message || 'Impossibile rimuovere l\'associazione.');
    }
}

// Esporta le funzioni globalmente affinché gli event handler in HTML (onclick, onsubmit, oninput, onchange) possano trovarle
window.switchTab = switchTab;
window.toggleModal = toggleModal;
window.toggleVolontarioMatricolaField = toggleVolontarioMatricolaField;
window.renderVolontarioQualificationDateFields = renderVolontarioQualificationDateFields;
window.toggleVolontarioPatentiPresence = toggleVolontarioPatentiPresence;
window.toggleVolontarioPatentiFiles = toggleVolontarioPatentiFiles;
window.previewVolontarioFoto = previewVolontarioFoto;
window.clearVolontarioFileDelete = clearVolontarioFileDelete;
window.markVolontarioFileForDelete = markVolontarioFileForDelete;
window.openNuovoVolontarioModal = openNuovoVolontarioModal;
window.openEditVolontarioModal = openEditVolontarioModal;
window.saveVolontario = saveVolontario;
window.toggleVolontarioStato = toggleVolontarioStato;
window.deleteVolontario = deleteVolontario;
window.renderVolontari = renderVolontari;
window.closeVolontariExportMenu = closeVolontariExportMenu;
window.toggleVolontariExportMenu = toggleVolontariExportMenu;
window.exportVolontariNonCensiti = exportVolontariNonCensiti;
window.exportTuttiVolontari = exportTuttiVolontari;
window.exportVolontarioPdf = exportVolontarioPdf;
window.visualizzaDocumentiVolontario = visualizzaDocumentiVolontario;
window.closeVolontarioDocumentiModal = closeVolontarioDocumentiModal;
window.confirmVolontarioDocumento = confirmVolontarioDocumento;
window.downloadVolontarioDocumenti = downloadVolontarioDocumenti;
window.openNuovoMezzoModal = openNuovoMezzoModal;
window.openEditMezzoModal = openEditMezzoModal;
window.saveMezzo = saveMezzo;
window.toggleMezzoStato = toggleMezzoStato;
window.deleteMezzo = deleteMezzo;
window.renderMezzi = renderMezzi;
window.renderServizioCarrelliTrainantiOptions = renderServizioCarrelliTrainantiOptions;
window.renderServizioVolontariMezziOptions = renderServizioVolontariMezziOptions;
window.updateServizioVolontarioMezzoControl = updateServizioVolontarioMezzoControl;
window.openNuovaSquadraAibModal = openNuovaSquadraAibModal;
window.openEditSquadraAibModal = openEditSquadraAibModal;
window.saveSquadraAib = saveSquadraAib;
window.deleteSquadraAib = deleteSquadraAib;
window.openSquadraAibPdfDeliveryModal = openSquadraAibPdfDeliveryModal;
window.exportSquadraAibPdf = exportSquadraAibPdf;
window.renderSquadreAib = renderSquadreAib;
window.populateSquadraAibModalOptions = populateSquadraAibModalOptions;
window.handleSquadraAibVolontarioSelectionChange = handleSquadraAibVolontarioSelectionChange;
window.handleSquadraAibCaposquadraSelectionChange = handleSquadraAibCaposquadraSelectionChange;
window.filterSquadraAibMezziList = filterSquadraAibMezziList;
window.filterSquadraAibVolontariList = filterSquadraAibVolontariList;
window.openNuovoServizioModal = openNuovoServizioModal;
window.openEditServizioModal = openEditServizioModal;
window.toggleServizioSquadraAibDetails = toggleServizioSquadraAibDetails;
window.toggleProtocolloRegionaleField = toggleProtocolloRegionaleField;
window.filterServizioMezziList = filterServizioMezziList;
window.filterServizioVolontariList = filterServizioVolontariList;
window.filterOperatoreSalaOptions = filterOperatoreSalaOptions;
window.renderOperatoreSalaOptions = renderOperatoreSalaOptions;
window.saveOperatoreSalaTurno = saveOperatoreSalaTurno;
window.selectOperatoreSalaTurno = selectOperatoreSalaTurno;
window.openViewServizioModal = openViewServizioModal;
window.focusServizioMapMarker = focusServizioMapMarker;
window.openEditAreaInterventoModal = openEditAreaInterventoModal;
window.closeAreaInterventoModal = closeAreaInterventoModal;
window.saveAreaIntervento = saveAreaIntervento;
window.deleteAreaIntervento = deleteAreaIntervento;
window.toggleServizioAibFields = toggleServizioAibFields;
window.fillCoordinateFromGps = fillCoordinateFromGps;
window.saveServizio = saveServizio;
window.completaServizio = completaServizio;
window.openPdfTemplateModal = openPdfTemplateModal;
window.closePdfTemplateModal = closePdfTemplateModal;
window.confirmPdfTemplate = confirmPdfTemplate;
window.closePdfDeliveryModal = closePdfDeliveryModal;
window.confirmPdfDeliveryDownload = confirmPdfDeliveryDownload;
window.confirmPdfDeliveryEmail = confirmPdfDeliveryEmail;
window.exportServizioPdf = exportServizioPdf;
window.exportStatistiche = exportStatistiche;
window.deleteServizio = deleteServizio;
window.renderServizi = renderServizi;
window.renderAttivita = renderAttivita;
window.updateUI = updateUI;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.openChangePasswordModal = openChangePasswordModal;
window.saveCurrentUserPassword = saveCurrentUserPassword;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.openNuovoProfiloModal = openNuovoProfiloModal;
window.openEditProfiloModal = openEditProfiloModal;
window.saveProfilo = saveProfilo;
window.deleteProfilo = deleteProfilo;
window.openNuovaAssociazioneModal = openNuovaAssociazioneModal;
window.openEditAssociazioneModal = openEditAssociazioneModal;
window.toggleProfiloAssociazioneField = toggleProfiloAssociazioneField;
window.renderAdminProfiles = renderAdminProfiles;
window.renderAdminAssociazioni = renderAdminAssociazioni;
window.applyAdminProfilesFilters = applyAdminProfilesFilters;
window.applyAdminAssociazioniFilters = applyAdminAssociazioniFilters;
window.saveAssociazione = saveAssociazione;
window.deleteAssociazione = deleteAssociazione;
window.openNuovoProtocolloIngressoModal = openNuovoProtocolloIngressoModal;
window.openEditProtocolloIngressoModal = openEditProtocolloIngressoModal;
window.saveProtocolloIngresso = saveProtocolloIngresso;
window.downloadProtocolloIngressoFile = downloadProtocolloIngressoFile;
window.deleteProtocolloIngresso = deleteProtocolloIngresso;
window.renderProtocolloIngresso = renderProtocolloIngresso;
window.openNuovoProtocolloAssociazioneModal = openNuovoProtocolloAssociazioneModal;
window.openEditProtocolloAssociazioneModal = openEditProtocolloAssociazioneModal;
window.toggleProtocolloAssociazioneTipoFields = toggleProtocolloAssociazioneTipoFields;
window.saveProtocolloAssociazione = saveProtocolloAssociazione;
window.downloadProtocolloAssociazioneFile = downloadProtocolloAssociazioneFile;
window.exportProtocolloAssociazioneVisibili = exportProtocolloAssociazioneVisibili;
window.deleteProtocolloAssociazione = deleteProtocolloAssociazione;
window.renderProtocolloAssociazione = renderProtocolloAssociazione;
window.openNuovaAttrezzaturaModal = openNuovaAttrezzaturaModal;
window.openEditAttrezzaturaModal = openEditAttrezzaturaModal;
window.saveAttrezzatura = saveAttrezzatura;
window.deleteAttrezzatura = deleteAttrezzatura;
window.openNuovoPrelievoMagazzinoModal = openNuovoPrelievoMagazzinoModal;
window.openEditPrelievoMagazzinoModal = openEditPrelievoMagazzinoModal;
window.addPrelievoMagazzinoRow = addPrelievoMagazzinoRow;
window.removePrelievoMagazzinoRow = removePrelievoMagazzinoRow;
window.savePrelievoMagazzino = savePrelievoMagazzino;
window.rientroPrelievoMagazzino = rientroPrelievoMagazzino;
window.deletePrelievoMagazzino = deletePrelievoMagazzino;
window.exportBollaPrelievoMagazzinoPdf = exportBollaPrelievoMagazzinoPdf;
window.openNuovoTipoAttrezzaturaModal = openNuovoTipoAttrezzaturaModal;
window.saveTipoAttrezzatura = saveTipoAttrezzatura;
window.deleteTipoAttrezzatura = deleteTipoAttrezzatura;
window.renderMagazzino = renderMagazzino;

// --- INIZIALIZZAZIONE ALL'AVVIO ---
window.addEventListener("DOMContentLoaded", async () => {
    // Controlla se esiste già una sessione attiva
    const { data: { session } } = await supabase.auth.getSession();

    if (session && session.user) {
        await bootstrapApp(session.user);
    } else {
        await showLogin();
    }

    // Ascolta i cambiamenti di stato auth
    supabase.auth.onAuthStateChange(async (event) => {
        if (event === 'SIGNED_OUT') {
            currentUserProfile = null;
            volontari = [];
            mezzi = [];
            servizi = [];
            squadreAib = [];
            protocolliIngresso = [];
            protocolliAssociazione = [];
            attrezzatureMagazzino = [];
            tipiAttrezzaturaMagazzino = [];
            prelieviMagazzino = [];
            prelievoRigheMagazzino = [];
            operatoreSalaTurno = null;
            stopSquadreAibScadenzaTimer();
            await showLogin();
        }
    });
});
