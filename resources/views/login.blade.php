    <!-- ================= SCHERMATA DI LOGIN ================= -->
    <div id="login-screen" class="hidden fixed inset-0 z-[100] flex items-center justify-center bg-slate-950" style="display: none;">
        <!-- Sfondo animato con pattern -->
        <div class="absolute inset-0 overflow-hidden">
            <div class="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
            <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-900/30 rounded-full blur-3xl"></div>
        </div>

        <div class="relative w-full max-w-md mx-4">
            <!-- Logo e Titolo -->
            <div class="text-center mb-8">
                <div class="inline-flex items-center justify-center ">
                   <!-- <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>-->
                    <img src="/img/logo-regione.png" alt="Logo Regione Campania" class="w-50 h-50 object-contain">
                </div>
                <h1 class="text-3xl font-extrabold text-white tracking-tight">{{ config('app.name') }}</h1>
                <p class="text-sm text-slate-400 mt-2 font-medium">Protezione Civile — Accesso Operatori</p>
            </div>

            <!-- Card Login -->
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
                <h2 class="text-lg font-bold text-white mb-6">Accedi al sistema</h2>

                <!-- Messaggio di errore -->
                <div id="login-error" class="hidden mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    <p id="login-error-text" class="text-xs text-rose-400 font-medium"></p>
                </div>

                <form id="login-form" onsubmit="handleLogin(event)" class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Indirizzo Email</label>
                        <input
                            type="email"
                            id="login-email"
                            required
                            autocomplete="email"
                            placeholder="operatore@protezionecivile.it"
                            class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors placeholder:text-slate-600"
                        >
                    </div>

                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Password</label>
                        <div class="relative">
                            <input
                                type="password"
                                id="login-password"
                                required
                                autocomplete="current-password"
                                placeholder="••••••••"
                                class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors placeholder:text-slate-600"
                            >
                        </div>
                    </div>

                    <button
                        type="submit"
                        id="login-btn"
                        class="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 px-6 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 flex items-center justify-center gap-2 mt-2"
                    >
                        <svg id="login-spinner" class="hidden animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span id="login-btn-text">Accedi</span>
                    </button>
                </form>
            </div>

            <p class="text-center text-xs text-slate-600 mt-6">Accesso riservato al personale autorizzato</p>
            <p class="text-center text-xs text-slate-600 mt-6">Developed by: M.C.  ❤️  with V.M.</p>
        </div>

        <!-- <div class="fixed bottom-0 left-0 right-0 p-4 border-t border-slate-800 bg-slate-950/40 z-50">
            <div class="flex items-center justify-center gap-3">
                <span class="relative flex h-3.5 w-3.5">
                    <span id="login-system-status-dot-ping" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span id="login-system-status-dot" class="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                </span>
            
                <div>
                    <p class="text-xs font-semibold text-slate-200">System Status</p>
                    <p id="login-system-status-text" class="text-[10px] text-emerald-500 font-medium uppercase">HEALTHY</p>
                </div>
            </div>
        </div> -->
    </div>
