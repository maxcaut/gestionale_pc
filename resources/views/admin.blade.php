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
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="bg-slate-900/60 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                        <th class="py-4 px-6">Email</th>
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
                </section>
