                <!-- ================= TAB: ADMIN UTENTI (solo master) ================= -->
                <section id="tab-admin" data-master-only class="tab-content space-y-6 hidden fade-in">
                    <div class="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <div>
                            <h2 class="text-lg font-bold text-white">Gestione utenti e profili</h2>
                            <p class="text-xs text-slate-400 mt-1">Crea account di accesso e assegna ruolo segreteria o master.</p>
                        </div>
                        <button type="button" onclick="openNuovoProfiloModal()" class="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            <span>Nuovo utente</span>
                        </button>
                    </div>

                    <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                        <div class="p-4 border-b border-slate-800 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <input type="search" id="admin-profiles-search" oninput="applyAdminProfilesFilters()" placeholder="Cerca utente" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40">
                            <select id="admin-profiles-role-filter" onchange="applyAdminProfilesFilters()" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40">
                                <option value="">Tutti i ruoli</option>
                                <option value="master">Master</option>
                                <option value="segreteria">Segreteria</option>
                                <option value="capo_squadra">Capo Squadra</option>
                                <option value="sala_operativa">Sala Operativa</option>
                                <option value="super_user">SuperUser</option>
                            </select>
                            <select id="admin-profiles-associazione-filter" onchange="applyAdminProfilesFilters()" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40">
                                <option value="">Tutte le associazioni</option>
                            </select>
                            <select id="admin-profiles-sort" onchange="applyAdminProfilesFilters()" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40">
                                <option value="created_desc">Piu recenti</option>
                                <option value="name_asc">Utente A-Z</option>
                                <option value="name_desc">Utente Z-A</option>
                                <option value="role_asc">Ruolo A-Z</option>
                                <option value="association_asc">Associazione A-Z</option>
                            </select>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="bg-slate-900/60 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                        <th class="py-4 px-6">Utente</th>
                                        <th class="py-4 px-6">Ruolo</th>
                                        <th class="py-4 px-6">Associazione</th>
                                        <th class="py-4 px-6 text-right">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody id="admin-profiles-table-body" class="text-sm divide-y divide-slate-800/40">
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                        <div class="p-6 border-b border-slate-800 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <h3 class="text-lg font-bold text-white">Associazioni</h3>
                                <p class="text-xs text-slate-400 mt-1">Gestisci le voci disponibili nei menu associazione.</p>
                            </div>
                            <button type="button" onclick="openNuovaAssociazioneModal()" class="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                <span>Aggiungi</span>
                            </button>
                        </div>
                        <div class="p-4 border-b border-slate-800 grid gap-3 md:grid-cols-2">
                            <input type="search" id="admin-associazioni-search" oninput="applyAdminAssociazioniFilters()" placeholder="Cerca associazione" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40">
                            <select id="admin-associazioni-sort" onchange="applyAdminAssociazioniFilters()" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40">
                                <option value="default">Ordine corrente</option>
                                <option value="name_asc">Nome A-Z</option>
                                <option value="name_desc">Nome Z-A</option>
                            </select>
                        </div>
                        <div id="admin-associazioni-list" class="divide-y divide-slate-800/40">
                        </div>
                    </div>
                </section>
