                <!-- ================= TAB 4: SERVIZI ================= -->
                <section id="tab-servizi" data-servizi-access class="tab-content space-y-6 hidden fade-in">
                    
                    <!-- Barra Superiore Azioni Servizi -->
                    <div class="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                            <!-- Input Ricerca -->
                            <div class="relative w-full sm:w-64">
                                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </span>
                                <input type="text" id="search-servizi" oninput="renderServizi()" placeholder="Cerca Protocollo o servizio..." class="w-full bg-slate-900 border border-slate-800 text-slate-100 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                            </div>
                            
                            <!-- Filtro Stato -->
                            <select id="filter-stato-servizio" onchange="renderServizi()" class="bg-slate-900 border border-slate-800 text-slate-300 py-2.5 px-4 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors">
                                <option value="">Tutti gli stati</option>
                                <option value="Programmato">Programmato</option>
                                <option value="In corso">In corso</option>
                                <option value="Completato">Completato</option>
                            </select>

                            <select id="sort-servizi-field" onchange="renderServizi()" class="bg-slate-900 border border-slate-800 text-slate-300 py-2.5 px-4 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors">
                                <option value="data" selected>Ordina per data</option>
                                <option value="id">Ordina per protocollo</option>
                                <option value="tipo">Ordina per tipologia</option>
                                <option value="mezzi">Ordina per mezzi</option>
                                <option value="volontari">Ordina per equipaggio</option>
                                <option value="stato">Ordina per stato</option>
                            </select>

                            <select id="sort-servizi-direction" onchange="renderServizi()" class="bg-slate-900 border border-slate-800 text-slate-300 py-2.5 px-4 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors">
                                <option value="desc" selected>Decrescente</option>
                                <option value="asc">Crescente</option>
                            </select>
                        </div>

                        <!-- Bottone Inserimento (Apre Modal) -->
                        <button type="button" id="btn-nuovo-servizio" data-hide-for-capo-squadra onclick="openNuovoServizioModal()" class="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Nuova Missione / Servizio</span>
                        </button>
                    </div>

                    <div data-operatore-sala-control class="hidden bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                        <h3 class="text-sm font-bold text-white uppercase tracking-wider">Operatore di turno in Sala Operativa</h3>
                        <div class="mt-4 relative max-w-xl">
                            <div class="relative">
                                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </span>
                                <input type="text" id="operatore-sala-search" onfocus="this.select(); renderOperatoreSalaOptions()" oninput="filterOperatoreSalaOptions()" placeholder="Cerca e seleziona un volontario..." autocomplete="off" class="w-full bg-slate-950 border border-slate-800 text-slate-100 pl-10 pr-10 py-3 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" class="absolute inset-y-0 right-3 my-auto h-4 w-4 text-slate-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                            <div id="operatore-sala-options" class="hidden absolute z-30 mt-2 w-full max-h-64 overflow-y-auto bg-slate-950 border border-slate-700 rounded-xl p-1.5 shadow-2xl"></div>
                        </div>
                    </div>

                    <!-- Mappa servizi sul territorio -->
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                        <div class="px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <h3 class="text-sm font-bold text-white uppercase tracking-wider">Mappa interventi</h3>
                                <p class="text-xs text-slate-500 mt-0.5">Posizioni da coordinate inserite in fase di pianificazione missione</p>
                            </div>
                            <div class="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                <span id="canadair-live-status" class="inline-flex items-center gap-1.5"><span class="canadair-legend-icon" aria-hidden="true"><svg viewBox="0 0 44 44"><path class="canadair-body" d="M22 2.5c-1.8 0-2.8 4.2-3.2 12.2L4 21.1v4.4l14.8-2.2.5 10-5.5 3.8v3.1l8.2-1.8 8.2 1.8v-3.1l-5.5-3.8.5-10L40 25.5v-4.4l-14.8-6.4C24.8 6.7 23.8 2.5 22 2.5Z"/><path class="canadair-wing-band" d="m9.1 18.9 4.8-2.1 1.2 7.4-5 .7Zm25.8 5.3 1.2-7.4 4.8 2.1-1 6Z"/></svg></span> Canadair live: —</span>
                                <span id="radio-live-status" class="inline-flex items-center gap-1.5"><span class="radio-legend-icon is-online" aria-hidden="true"><svg class="radio-walkie-icon" viewBox="0 0 24 24"><path d="M8 5 6 1M7 5h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path d="M8 8h8v4H8zM9 16h6M9 19h6M19 9h2"/></svg></span> Radio TLC: —</span>
                                <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-blue-400"></span> Programmato</span>
                                <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span> In corso</span>
                                <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Completato</span>
                            </div>
                        </div>
                        <div id="servizi-map" class="servizi-map w-full" role="region" aria-label="Mappa dei servizi sul territorio di Massa di Somma"></div>
                        <p id="servizi-map-hint" class="px-6 py-2 text-[10px] text-slate-500 border-t border-slate-800/80 hidden"></p>
                    </div>

                    <!-- Elenco Tabella Servizi -->
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                        <div class="overflow-x-auto">
                            <table class="mobile-card-table w-full text-left border-collapse">
                                <thead>
                                    <tr class="bg-slate-900/60 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                        <th class="py-4 px-6">Protocollo</th>
                                        <th class="py-4 px-6">Tipologia Servizio / Dettagli</th>
                                        <th class="py-4 px-6">Data e Ora</th>
                                        <th class="py-4 px-6">Mezzi Assegnati</th>
                                        <th class="py-4 px-6">Equipaggio Volontari</th>
                                        <th class="py-4 px-6">Stato Servizio</th>
                                        <th class="py-4 px-6 text-right">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody id="servizi-table-body" class="text-sm divide-y divide-slate-800/40">
                                    <!-- Popolato dinamicamente via JS -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                <div id="modal-area-intervento" class="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 hidden">
                    <div class="mt-4 bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl slide-in">
                        <div class="p-6 border-b border-slate-800 flex justify-between items-center">
                            <div>
                                <h3 id="area-intervento-modal-title" class="text-lg font-bold text-white">Nuova area intervento</h3>
                                <p class="mt-1 text-xs text-slate-500">Descrivi l'attività svolta all'interno del poligono.</p>
                            </div>
                            <button type="button" onclick="closeAreaInterventoModal()" class="text-slate-400 hover:text-white transition-colors" aria-label="Chiudi">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div class="p-6 space-y-4">
                            <div>
                                <label for="area-intervento-servizio" class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Protocollo / servizio (facoltativo)</label>
                                <select id="area-intervento-servizio" class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500"></select>
                            </div>
                            <div>
                                <label for="area-intervento-descrizione" class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Descrizione <span class="text-amber-500">*</span></label>
                                <textarea id="area-intervento-descrizione" rows="5" maxlength="2000" class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 resize-y" placeholder="Descrivi l'intervento effettuato..."></textarea>
                            </div>
                            <div>
                                <label for="area-intervento-foto" class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Foto</label>
                                <input id="area-intervento-foto" type="file" accept="image/jpeg,image/png,image/webp" multiple class="block w-full text-sm text-slate-400 file:mr-4 file:rounded-lg file:border-0 file:bg-amber-500 file:px-4 file:py-2 file:text-sm file:font-bold file:text-slate-950 hover:file:bg-amber-600">
                                <p class="mt-2 text-[11px] text-slate-500">JPG, PNG o WebP; massimo 10 MB per foto.</p>
                                <div id="area-intervento-foto-esistenti" class="mt-3 grid grid-cols-3 gap-2"></div>
                            </div>
                        </div>
                        <div class="px-6 pb-6 flex gap-3">
                            <button type="button" onclick="closeAreaInterventoModal()" class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-5 py-2.5 rounded-xl text-sm">Annulla</button>
                            <button type="button" id="area-intervento-delete" onclick="deleteAreaIntervento()" class="hidden bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 font-semibold px-5 py-2.5 rounded-xl text-sm">Elimina</button>
                            <button type="button" id="area-intervento-save" onclick="saveAreaIntervento()" class="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm">Salva area</button>
                        </div>
                    </div>
                </div>
