                <!-- ================= TAB 3: MEZZI ================= -->
                <section id="tab-mezzi" data-mezzi-access class="tab-content space-y-6 hidden fade-in">
                    
                    <!-- Barra Superiore Azioni Mezzi -->
                    <div class="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                            <!-- Input Ricerca -->
                            <div class="relative w-full sm:w-64">
                                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </span>
                                <input type="text" id="search-mezzi" oninput="renderMezzi()" placeholder="Cerca mezzo per marca, targa..." class="w-full bg-slate-900 border border-slate-800 text-slate-100 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                            </div>
                            
                            <!-- Filtro Tipo -->
                            <select id="filter-tipo-mezzo" onchange="renderMezzi()" class="bg-slate-900 border border-slate-800 text-slate-300 py-2.5 px-4 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors">
                                <option value="">Tutte le tipologie</option>
                                <option value="Fuoristrada">Fuoristrada</option>
                                <option value="Ambulanza">Ambulanza</option>
                                <option value="Autobotte">Autobotte</option>
                                <option value="Unità Mobile">Unità Mobile</option>
                                <option value="Furgone">Furgone</option>
                                <option value="Camper UCM">Camper UCM</option>
                                <option value="Carrello appendice">Carrello appendice</option>
                            </select>
                            
                            <!-- Filtro Stato -->
                            <select id="filter-stato-mezzo" onchange="renderMezzi()" class="bg-slate-900 border border-slate-800 text-slate-300 py-2.5 px-4 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition-colors">
                                <option value="">Tutti gli stati</option>
                                <option value="Disponibile">Disponibile</option>
                                <option value="In servizio">In servizio</option>
                                <option value="In manutenzione">In manutenzione</option>
                            </select>
                        </div>

                        <!-- Bottone Inserimento (Apre Modal) -->
                        <button onclick="openNuovoMezzoModal()" class="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Nuovo Mezzo</span>
                        </button>
                    </div>

                    <!-- Griglia a Cards dei Mezzi -->
                    <div id="mezzi-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <!-- Popolato dinamicamente via JS -->
                    </div>
                </section>
