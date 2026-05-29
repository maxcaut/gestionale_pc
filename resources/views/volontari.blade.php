                <!-- ================= TAB 2: VOLONTARI ================= -->
                <section id="tab-volontari" class="tab-content space-y-6 hidden fade-in">
                    
                    <!-- Barra Superiore Azioni Volontari -->
                    <div class="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <!-- Ricerca e Filtri -->
                        <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                            <!-- Input Ricerca -->
                            <div class="relative w-full sm:w-64">
                                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </span>
                                <input type="text" id="search-volontari" oninput="renderVolontari()" placeholder="Cerca volontario..." class="w-full bg-slate-900 border border-slate-800 text-slate-100 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                            </div>
                            
                            <!-- Filtro Ruolo -->
                            <select id="filter-ruolo" onchange="renderVolontari()" class="bg-slate-900 border border-slate-800 text-slate-300 py-2.5 px-4 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors">
                                <option value="">Tutti i ruoli</option>
                                <option value="Coordinatore">Coordinatore</option>
                                <option value="Soccorritore">Soccorritore</option>
                                <option value="Autista">Autista</option>
                                <option value="Logista">Logista</option>
                            </select>
                            
                            <!-- Filtro Stato -->
                            <select id="filter-stato-volontario" onchange="renderVolontari()" class="bg-slate-900 border border-slate-800 text-slate-300 py-2.5 px-4 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors">
                                <option value="">Tutti gli stati</option>
                                <option value="Operativo">Operativo</option>
                                <option value="In riposo">In riposo</option>
                                <option value="Sospeso">Sospeso</option>
                            </select>
                        </div>

                        <!-- Bottone Inserimento (Apre Modal) -->
                        <button onclick="openNuovoVolontarioModal()" class="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.3 20c-2.243 0-4.352-.648-6.124-1.773L3.892 19.2c-.417-.234-.67-.679-.69-1.148z" />
                            </svg>
                            <span>Nuovo Volontario</span>
                        </button>
                    </div>

                    <!-- Griglia/Lista Volontari -->
                    <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="bg-slate-900/60 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                        <th class="py-4 px-6">Nominativo</th>
                                        <th class="py-4 px-6">Codice Fiscale</th>
                                        <th class="py-4 px-6">Ruolo Principale</th>
                                        <th class="py-4 px-6">Recapito</th>
                                        <th class="py-4 px-6">Stato Operativo</th>
                                        <th class="py-4 px-6 text-right">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody id="volontari-table-body" class="text-sm divide-y divide-slate-800/40">
                                    <!-- Popolato dinamicamente via JS -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
