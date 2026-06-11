                <!-- ================= TAB: GESTIONE MAGAZZINO ================= -->
                <section id="tab-magazzino" data-magazzino-access class="tab-content space-y-6 hidden fade-in">
                    <div class="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                            <div class="relative w-full sm:w-72">
                                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </span>
                                <input type="text" id="search-magazzino" oninput="renderMagazzino()" placeholder="Cerca attrezzatura o inventario..." class="w-full bg-slate-900 border border-slate-800 text-slate-100 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                            </div>

                            <select id="filter-tipo-attrezzatura" onchange="renderMagazzino()" class="bg-slate-900 border border-slate-800 text-slate-300 py-2.5 px-4 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors">
                                <option value="">Tutte le tipologie</option>
                            </select>
                        </div>

                        <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <button onclick="openNuovoTipoAttrezzaturaModal()" class="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m6-6H6" />
                                </svg>
                                <span>Nuovo Tipo</span>
                            </button>
                            <button onclick="openNuovaAttrezzaturaModal()" class="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Nuova Attrezzatura</span>
                            </button>
                        </div>
                    </div>

                    <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="border-b border-slate-800 text-slate-400 text-xs font-semibold tracking-wider">
                                        <th class="py-3 px-4">Nome attrezzatura</th>
                                        <th class="py-3 px-4">Tipo attrezzatura</th>
                                        <th class="py-3 px-4">Numero inventario</th>
                                        <th class="py-3 px-4">Associazione di appartenenza</th>
                                        <th class="py-3 px-4 text-right">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody id="magazzino-table-body" class="text-sm divide-y divide-slate-800/50">
                                    <!-- Generato dinamicamente via JS -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
