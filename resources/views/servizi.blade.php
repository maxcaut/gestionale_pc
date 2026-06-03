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
                                <input type="text" id="search-servizi" oninput="renderServizi()" placeholder="Cerca servizio o note..." class="w-full bg-slate-900 border border-slate-800 text-slate-100 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                            </div>
                            
                            <!-- Filtro Stato -->
                            <select id="filter-stato-servizio" onchange="renderServizi()" class="bg-slate-900 border border-slate-800 text-slate-300 py-2.5 px-4 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors">
                                <option value="">Tutti gli stati</option>
                                <option value="Programmato">Programmato</option>
                                <option value="In corso">In corso</option>
                                <option value="Completato">Completato</option>
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

                    <!-- Mappa servizi sul territorio -->
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                        <div class="px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <h3 class="text-sm font-bold text-white uppercase tracking-wider">Mappa interventi</h3>
                                <p class="text-xs text-slate-500 mt-0.5">Posizioni da coordinate inserite in fase di pianificazione missione</p>
                            </div>
                            <div class="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="bg-slate-900/60 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
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
