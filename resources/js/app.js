// --- MEMORIA DATI INITIALI (MOCK DATABASE) ---
const DEFAULT_VOLONTARI = [
    { id: "v1", nome: "Mario", cognome: "Rossi", cf: "RSSMRA80A01H501U", ruolo: "Coordinatore", telefono: "3331234567", stato: "Operativo" },
    { id: "v2", nome: "Laura", cognome: "Bianchi", cf: "BNCLRA85B41H501X", ruolo: "Soccorritore", telefono: "3459876543", stato: "Operativo" },
    { id: "v3", nome: "Giuseppe", cognome: "Verdi", cf: "VRDGPP78C12H501Z", ruolo: "Logista", telefono: "3287654321", stato: "In riposo" },
    { id: "v4", nome: "Anna", cognome: "Neri", cf: "NRANNA90D50H501W", ruolo: "Autista", telefono: "3394567890", stato: "Operativo" }
];

const DEFAULT_MEZZI = [
    { id: "m1", modello: "Land Rover Defender 110", targa: "PC 001 AA", tipo: "Fuoristrada", stato: "Disponibile" },
    { id: "m2", modello: "Fiat Ducato Ambulanza", targa: "PC 002 AB", tipo: "Ambulanza", stato: "In servizio" },
    { id: "m3", modello: "Iveco Magirus 4x4", targa: "PC 003 AC", tipo: "Autobotte", stato: "Disponibile" },
    { id: "m4", modello: "Fiat Panda 4x4", targa: "PC 004 AD", tipo: "Unità Mobile", stato: "In manutenzione" }
];

const DEFAULT_SERVIZI = [
    { id: "s1", tipo: "Pattugliamento Territorio", data: "2026-05-29T09:00", mezzoId: "m1", volontariIds: ["v1", "v4"], note: "Monitoraggio idrogeologico fiumi post allerta meteo gialla.", stato: "Programmato" },
    { id: "s2", tipo: "Supporto Sanitario", data: "2026-05-28T14:30", mezzoId: "m2", volontariIds: ["v2"], note: "Assistenza sanitaria per la gara podistica cittadina.", stato: "In corso" },
    { id: "s3", tipo: "Antincendio Boschivo", data: "2026-05-27T08:00", mezzoId: "m3", volontariIds: ["v1", "v3"], note: "Pronto intervento e bonifica area boschiva collinare.", stato: "Completato" }
];

// Inizializza i dati in localStorage se vuoti
function initDatabase() {
    if (!localStorage.getItem("pc_volontari")) {
        localStorage.setItem("pc_volontari", JSON.stringify(DEFAULT_VOLONTARI));
    }
    if (!localStorage.getItem("pc_mezzi")) {
        localStorage.setItem("pc_mezzi", JSON.stringify(DEFAULT_MEZZI));
    }
    if (!localStorage.getItem("pc_servizi")) {
        localStorage.setItem("pc_servizi", JSON.stringify(DEFAULT_SERVIZI));
    }
}

// Funzione helper per caricare dati
function getDB(table) {
    return JSON.parse(localStorage.getItem(table)) || [];
}

// Funzione helper per salvare dati
function saveDB(table, data) {
    localStorage.setItem(table, JSON.stringify(data));
    // Aggiorna tutta l'interfaccia dopo il salvataggio
    updateUI();
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
        // Resetta il form
        const form = modal.querySelector("form");
        if (form) form.reset();
    }
}

// --- CAMBIO TAB (NAVIGAZIONE) ---
function switchTab(tabId) {
    // Nascondi tutti i contenuti delle tab
    document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
    // Rimuovi classe attiva da tutti i bottoni nav
    document.querySelectorAll(".nav-btn").forEach(el => {
        el.classList.remove("bg-slate-800", "text-amber-500", "shadow-md");
        el.classList.add("text-slate-400", "hover:text-white", "hover:bg-slate-800/50");
    });

    // Mostra tab selezionata
    document.getElementById(`tab-${tabId}`).classList.remove("hidden");

    // Attiva bottone nav selezionato
    const activeBtn = document.getElementById(`nav-${tabId}`);
    activeBtn.classList.remove("text-slate-400", "hover:text-white", "hover:bg-slate-800/50");
    activeBtn.classList.add("bg-slate-800", "text-amber-500", "shadow-md");

    // Aggiorna titolo top bar
    const titleMap = {
        dashboard: "Dashboard",
        volontari: "Gestione Volontari",
        mezzi: "Gestione Flotta Mezzi",
        servizi: "Registro Missioni e Servizi"
    };
    document.getElementById("page-title").innerText = titleMap[tabId];
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
        const mezzo = mezzi.find(m => m.id === serv.mezzoId) || { modello: "Nessuno", targa: "" };
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
                    <span class="text-xs font-semibold text-slate-300">${mezzo.modello}</span>
                    <span class="text-[10px] text-slate-500 block font-mono">${mezzo.targa}</span>
                </td>
                <td class="py-4 px-0">
                    <span class="px-2.5 py-1 text-[10px] font-bold border rounded-full ${badgeClass}">${serv.stato}</span>
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
        const matchSearch = `${v.nome} ${v.cognome} ${v.cf} ${v.telefono}`.toLowerCase().includes(search);
        const matchRuolo = filterRuolo === "" || v.ruolo === filterRuolo;
        const matchStato = filterStato === "" || v.stato === filterStato;
        return matchSearch && matchRuolo && matchStato;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-8 text-center text-slate-500 font-medium">Nessun volontario trovato con i filtri inseriti.</td>
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

function saveVolontario(event) {
    event.preventDefault();
    const nome = document.getElementById("v-nome").value;
    const cognome = document.getElementById("v-cognome").value;
    const cf = document.getElementById("v-cf").value.toUpperCase();
    const ruolo = document.getElementById("v-ruolo").value;
    const stato = document.getElementById("v-stato").value;
    const telefono = document.getElementById("v-telefono").value;

    const volontari = getDB("pc_volontari");
    const newVolontario = {
        id: "v_" + Date.now(),
        nome,
        cognome,
        cf,
        ruolo,
        stato,
        telefono
    };

    volontari.push(newVolontario);
    saveDB("pc_volontari", volontari);

    toggleModal('modal-volontario', false);
    showToast("Volontario Registrato", `${nome} ${cognome} è stato inserito con successo.`);
}

function toggleVolontarioStato(id) {
    const volontari = getDB("pc_volontari");
    const volIndex = volontari.findIndex(v => v.id === id);
    if (volIndex !== -1) {
        const stati = ["Operativo", "In riposo", "Sospeso"];
        const currentIdx = stati.indexOf(volontari[volIndex].stato);
        const nextIdx = (currentIdx + 1) % stati.length;
        volontari[volIndex].stato = stati[nextIdx];
        saveDB("pc_volontari", volontari);
        showToast("Stato Volontario", `Lo stato di ${volontari[volIndex].nome} è ora: ${stati[nextIdx]}`);
    }
}

function deleteVolontario(id) {
    if (confirm("Sei sicuro di voler eliminare questo volontario? Questa azione è irreversibile.")) {
        const volontari = getDB("pc_volontari");
        const filtrati = volontari.filter(v => v.id !== id);
        saveDB("pc_volontari", filtrati);
        showToast("Volontario Rimosso", "Il volontario è stato eliminato dal sistema.");
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

function saveMezzo(event) {
    event.preventDefault();
    const modello = document.getElementById("m-modello").value;
    const targa = document.getElementById("m-targa").value.toUpperCase();
    const tipo = document.getElementById("m-tipo").value;
    const stato = document.getElementById("m-stato").value;

    const mezzi = getDB("pc_mezzi");
    const newMezzo = {
        id: "m_" + Date.now(),
        modello,
        targa,
        tipo,
        stato
    };

    mezzi.push(newMezzo);
    saveDB("pc_mezzi", mezzi);

    toggleModal('modal-mezzo', false);
    showToast("Mezzo Registrato", `${modello} (${targa}) inserito correttamente.`);
}

function toggleMezzoStato(id) {
    const mezzi = getDB("pc_mezzi");
    const mezzoIndex = mezzi.findIndex(m => m.id === id);
    if (mezzoIndex !== -1) {
        const stati = ["Disponibile", "In servizio", "In manutenzione"];
        const currentIdx = stati.indexOf(mezzi[mezzoIndex].stato);
        const nextIdx = (currentIdx + 1) % stati.length;
        mezzi[mezzoIndex].stato = stati[nextIdx];
        saveDB("pc_mezzi", mezzi);
        showToast("Stato Mezzo", `Stato del mezzo ${mezzi[mezzoIndex].modello} aggiornato a: ${stati[nextIdx]}`);
    }
}

function deleteMezzo(id) {
    if (confirm("Sei sicuro di voler rimuovere questo mezzo? La rimozione potrebbe invalidare lo storico dei servizi assegnati.")) {
        const mezzi = getDB("pc_mezzi");
        const filtrati = mezzi.filter(m => m.id !== id);
        saveDB("pc_mezzi", filtrati);
        showToast("Mezzo Rimosso", "Il veicolo è stato disattivato dal registro.");
    }
}

// --- SEZIONE 4: SERVIZI (CRUD & VIEW) ---
function openNuovoServizioModal() {
    const mezzi = getDB("pc_mezzi");
    const volontari = getDB("pc_volontari");

    const selectMezzo = document.getElementById("s-mezzo");
    selectMezzo.innerHTML = "";

    mezzi.forEach(m => {
        const statusTag = m.stato !== "Disponibile" ? ` - (${m.stato})` : '';
        selectMezzo.innerHTML += `
            <option value="${m.id}">${m.modello} [${m.targa}]${statusTag}</option>
        `;
    });

    if (mezzi.length === 0) {
        selectMezzo.innerHTML = `<option value="">Nessun mezzo registrato! Creane prima uno.</option>`;
    }

    const volontariBox = document.getElementById("s-volontari-list");
    volontariBox.innerHTML = "";

    const volontariOperativi = volontari.filter(v => v.stato === "Operativo");
    const volontariNonOperativi = volontari.filter(v => v.stato !== "Operativo");

    if (volontariOperativi.length > 0) {
        volontariBox.innerHTML += `<p class="text-[10px] text-emerald-500 font-bold uppercase tracking-wider mb-2">Disponibili / Operativi</p>`;
        volontariOperativi.forEach(v => {
            volontariBox.innerHTML += `
                <label class="flex items-center gap-3 p-1.5 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors text-slate-200">
                    <input type="checkbox" name="s-volontari-check" value="${v.id}" class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900 w-4 h-4">
                    <span class="text-xs font-semibold">${v.nome} ${v.cognome} (${v.ruolo})</span>
                </label>
            `;
        });
    }

    if (volontariNonOperativi.length > 0) {
        volontariBox.innerHTML += `<p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-3 mb-2">In riposo / Sospesi</p>`;
        volontariNonOperativi.forEach(v => {
            volontariBox.innerHTML += `
                <label class="flex items-center gap-3 p-1.5 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors text-slate-400">
                    <input type="checkbox" name="s-volontari-check" value="${v.id}" class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900 w-4 h-4">
                    <span class="text-xs font-medium">${v.nome} ${v.cognome} (${v.ruolo}) - [${v.stato}]</span>
                </label>
            `;
        });
    }

    if (volontari.length === 0) {
        volontariBox.innerHTML = `<p class="text-xs text-slate-500 p-2 text-center">Nessun volontario registrato!</p>`;
    }

    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById("s-data").value = now.toISOString().slice(0, 16);

    toggleModal('modal-servizio', true);
}

function renderServizi() {
    const servizi = getDB("pc_servizi");
    const mezzi = getDB("pc_mezzi");
    const volontari = getDB("pc_volontari");

    const tbody = document.getElementById("servizi-table-body");
    const search = document.getElementById("search-servizi").value.toLowerCase();
    const filterStato = document.getElementById("filter-stato-servizio").value;

    tbody.innerHTML = "";

    const filtered = servizi.filter(s => {
        const matchSearch = `${s.tipo} ${s.note}`.toLowerCase().includes(search);
        const matchStato = filterStato === "" || s.stato === filterStato;
        return matchSearch && matchStato;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-8 text-center text-slate-500 font-medium">Nessuna missione o servizio pianificato con questi criteri.</td>
            </tr>
        `;
        return;
    }

    [...filtered].reverse().forEach(s => {
        const mezzo = mezzi.find(m => m.id === s.mezzoId) || { modello: "Nessun mezzo", targa: "N/D", tipo: "N/D" };

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

        tbody.innerHTML += `
            <tr class="hover:bg-slate-800/10 transition-colors">
                <td class="py-4 px-6 max-w-[280px]">
                    <p class="font-bold text-white text-base">${s.tipo}</p>
                    <p class="text-xs text-slate-500 mt-1 font-medium italic break-words">${s.note || "Nessuna nota operativa aggiuntiva"}</p>
                </td>
                <td class="py-4 px-6 text-slate-300 font-bold">${formattedDate}</td>
                <td class="py-4 px-6">
                    <p class="font-bold text-slate-200 text-sm">${mezzo.modello}</p>
                    <span class="inline-block text-[10px] text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-850 mt-1">${mezzo.targa}</span>
                </td>
                <td class="py-4 px-6 max-w-[280px]">
                    <div class="flex flex-wrap">
                        ${volontariPills}
                    </div>
                </td>
                <td class="py-4 px-6">
                    <span class="px-2.5 py-1 text-xs font-bold border rounded-full ${badgeClass}">${s.stato}</span>
                </td>
                <td class="py-4 px-6 text-right">
                    <div class="inline-flex gap-2">
                        ${completaBtn}
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

function saveServizio(event) {
    event.preventDefault();
    const tipo = document.getElementById("s-tipo").value;
    const data = document.getElementById("s-data").value;
    const mezzoId = document.getElementById("s-mezzo").value;
    const note = document.getElementById("s-note").value;
    const stato = document.getElementById("s-stato").value;

    const checkboxes = document.querySelectorAll('input[name="s-volontari-check"]:checked');
    const volontariIds = [];
    checkboxes.forEach(cb => volontariIds.push(cb.value));

    if (volontariIds.length === 0) {
        alert("Attenzione: devi assegnare almeno un volontario all'equipaggio del servizio!");
        return;
    }

    const servizi = getDB("pc_servizi");
    const newServizio = {
        id: "s_" + Date.now(),
        tipo,
        data,
        mezzoId,
        volontariIds,
        note,
        stato
    };

    servizi.push(newServizio);

    if (stato === "In corso") {
        const mezzi = getDB("pc_mezzi");
        const mIdx = mezzi.findIndex(m => m.id === mezzoId);
        if (mIdx !== -1 && mezzi[mIdx].stato === "Disponibile") {
            mezzi[mIdx].stato = "In servizio";
            localStorage.setItem("pc_mezzi", JSON.stringify(mezzi));
        }
    }

    saveDB("pc_servizi", servizi);

    toggleModal('modal-servizio', false);
    showToast("Servizio Pianificato", "Il servizio è stato inserito con successo nel registro.");
}

function completaServizio(id) {
    const servizi = getDB("pc_servizi");
    const sIdx = servizi.findIndex(s => s.id === id);
    if (sIdx !== -1) {
        servizi[sIdx].stato = "Completato";

        const mezzoId = servizi[sIdx].mezzoId;
        const mezzi = getDB("pc_mezzi");
        const mIdx = mezzi.findIndex(m => m.id === mezzoId);
        if (mIdx !== -1 && mezzi[mIdx].stato === "In servizio") {
            mezzi[mIdx].stato = "Disponibile";
            localStorage.setItem("pc_mezzi", JSON.stringify(mezzi));
        }

        saveDB("pc_servizi", servizi);
        showToast("Missione Completata", "Il servizio è stato archiviato come completato.");
    }
}

function deleteServizio(id) {
    if (confirm("Sei sicuro di voler eliminare questa registrazione di servizio?")) {
        const servizi = getDB("pc_servizi");
        const filtrati = servizi.filter(s => s.id !== id);
        saveDB("pc_servizi", filtrati);
        showToast("Servizio Eliminato", "La registrazione è stata eliminata.");
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

// Esporta le funzioni globalmente affinché gli event handler in HTML (onclick, onsubmit, oninput, onchange) possano trovarle
window.switchTab = switchTab;
window.toggleModal = toggleModal;
window.saveVolontario = saveVolontario;
window.toggleVolontarioStato = toggleVolontarioStato;
window.deleteVolontario = deleteVolontario;
window.renderVolontari = renderVolontari;
window.saveMezzo = saveMezzo;
window.toggleMezzoStato = toggleMezzoStato;
window.deleteMezzo = deleteMezzo;
window.renderMezzi = renderMezzi;
window.openNuovoServizioModal = openNuovoServizioModal;
window.saveServizio = saveServizio;
window.completaServizio = completaServizio;
window.deleteServizio = deleteServizio;
window.renderServizi = renderServizi;
window.updateUI = updateUI;

// --- INIZIALIZZAZIONE ALL'AVVIO ---
window.addEventListener("DOMContentLoaded", () => {
    initDatabase();
    updateUI();
    startRealtimeClock();
});
