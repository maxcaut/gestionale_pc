                <!-- ================= TAB: STATISTICHE ================= -->
                <section id="tab-statistiche" data-master-only class="tab-content space-y-6 hidden fade-in">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <h2 class="text-lg font-bold text-white">Statistiche</h2>
                            <p class="text-xs text-slate-400 mt-1">Ore lavorate calcolate dai servizi con orari disponibili.</p>
                        </div>
                        <button type="button" onclick="exportStatistiche()" class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md shadow-amber-500/10">
                            Export
                        </button>
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

                    <div id="statistiche-soru-senza-protocollo" class="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h3 class="text-sm font-bold text-white uppercase tracking-wider">Servizi SORU senza protocollo regionale</h3>
                                <p class="text-xs text-slate-400 mt-1">Servizi con richiedente SORU e numero di protocollo regionale mancante.</p>
                            </div>
                            <div class="shrink-0 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-3 text-center">
                                <div class="flex items-baseline justify-center gap-1 leading-none">
                                    <span id="statistiche-soru-senza-protocollo-count" class="text-3xl font-black text-amber-400">0</span>
                                    <span class="text-sm font-bold text-amber-200/80">di</span>
                                    <span id="statistiche-soru-totale-count" class="text-xl font-black text-amber-200">0</span>
                                </div>
                                <div class="mt-1 text-[10px] font-bold uppercase tracking-wider text-amber-200/80">senza protocollo</div>
                            </div>
                        </div>
                        <div id="statistiche-soru-senza-protocollo-list" class="mt-5 space-y-2 max-h-80 overflow-y-auto pr-1"></div>
                    </div>

                    <div id="statistiche-non-calcolabili" class="bg-slate-900 border border-slate-800 rounded-2xl p-6 hidden">
                        <h3 class="text-sm font-bold text-white uppercase tracking-wider">Servizi senza ore calcolabili</h3>
                        <p class="text-xs text-slate-400 mt-1">Servizi esclusi dal conteggio perché non hanno un orario di fine/rientro utilizzabile.</p>
                        <div id="statistiche-non-calcolabili-list" class="mt-4 flex flex-wrap gap-2"></div>
                    </div>
                </section>
