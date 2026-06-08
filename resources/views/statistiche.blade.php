                <!-- ================= TAB: STATISTICHE ================= -->
                <section id="tab-statistiche" data-master-only class="tab-content space-y-6 hidden fade-in">
                    <div>
                        <h2 class="text-lg font-bold text-white">Statistiche</h2>
                        <p class="text-xs text-slate-400 mt-1">Ore lavorate calcolate dai servizi con orari disponibili.</p>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                            <div class="px-6 py-4 border-b border-slate-800">
                                <h3 class="text-sm font-bold text-white uppercase tracking-wider">Ore volontari per tipologia</h3>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full text-left border-collapse">
                                    <thead>
                                        <tr class="bg-slate-900/60 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                            <th class="py-4 px-6">Volontario</th>
                                            <th class="py-4 px-6">Tipologia</th>
                                            <th class="py-4 px-6 text-right">Ore</th>
                                        </tr>
                                    </thead>
                                    <tbody id="statistiche-volontari-body" class="text-sm divide-y divide-slate-800/40"></tbody>
                                </table>
                            </div>
                        </div>

                        <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                            <div class="px-6 py-4 border-b border-slate-800">
                                <h3 class="text-sm font-bold text-white uppercase tracking-wider">Ore mezzi per tipologia</h3>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full text-left border-collapse">
                                    <thead>
                                        <tr class="bg-slate-900/60 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                            <th class="py-4 px-6">Mezzo</th>
                                            <th class="py-4 px-6">Tipologia</th>
                                            <th class="py-4 px-6 text-right">Ore</th>
                                        </tr>
                                    </thead>
                                    <tbody id="statistiche-mezzi-body" class="text-sm divide-y divide-slate-800/40"></tbody>
                                </table>
                            </div>
                        </div>

                        <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                            <div class="px-6 py-4 border-b border-slate-800">
                                <h3 class="text-sm font-bold text-white uppercase tracking-wider">Ore per tipologia</h3>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full text-left border-collapse">
                                    <thead>
                                        <tr class="bg-slate-900/60 border-b border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                            <th class="py-4 px-6">Tipologia</th>
                                            <th class="py-4 px-6 text-right">Ore</th>
                                        </tr>
                                    </thead>
                                    <tbody id="statistiche-tipologie-body" class="text-sm divide-y divide-slate-800/40"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div id="statistiche-non-calcolabili" class="bg-slate-900 border border-slate-800 rounded-2xl p-6 hidden">
                        <h3 class="text-sm font-bold text-white uppercase tracking-wider">Servizi senza ore calcolabili</h3>
                        <p class="text-xs text-slate-400 mt-1">Servizi esclusi dal conteggio perché non hanno un orario di fine/rientro utilizzabile.</p>
                        <div id="statistiche-non-calcolabili-list" class="mt-4 flex flex-wrap gap-2"></div>
                    </div>
                </section>
