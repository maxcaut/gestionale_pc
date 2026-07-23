                <!-- ================= TAB: ATTIVITÀ (segreteria) ================= -->
                <section id="tab-attivita" class="tab-content space-y-6 hidden fade-in">

                    <div class="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <div class="relative w-full sm:w-64">
                            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </span>
                            <input type="text" id="search-attivita" oninput="renderAttivita()" placeholder="Cerca servizio o note..." class="w-full bg-slate-900 border border-slate-800 text-slate-100 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                        </div>
                        <p class="text-xs text-slate-500 font-medium">Servizi in stato <span class="text-blue-400 font-bold">Programmato</span> o <span class="text-emerald-400 font-bold">Completato</span>. I completati sono in sola lettura.</p>
                    </div>

                    <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                        <div class="overflow-x-auto">
                            <table class="mobile-card-table w-full text-left border-collapse">
                                <thead>
                                    <tr class="bg-slate-900/60 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                        <th class="py-4 px-6">Tipologia Servizio / Dettagli</th>
                                        <th class="py-4 px-6">Data e Ora</th>
                                        <th class="py-4 px-6">Mezzi Assegnati</th>
                                        <th class="py-4 px-6">Equipaggio Volontari</th>
                                        <th class="py-4 px-6 text-right">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody id="attivita-table-body" class="text-sm divide-y divide-slate-800/40">
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
