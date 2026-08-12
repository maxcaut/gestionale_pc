<!DOCTYPE html>
<html lang="it" class="h-full bg-slate-950 text-slate-100">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <link rel="icon" type="image/png" sizes="64x64" href="{{ asset('img/favicon-20260709.png') }}?v={{ filemtime(public_path('img/favicon-20260709.png')) }}">
    <link rel="shortcut icon" type="image/png" sizes="64x64" href="{{ asset('img/favicon-20260709.png') }}?v={{ filemtime(public_path('img/favicon-20260709.png')) }}">
    <title>{{ config('app.name') }} - Protezione Civile - Coordinamento Vesuvius</title>
    
    <!-- Google Fonts: Inter per un look moderno e pulito -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <script>
    window.laravelConfig = {
        supabaseUrl: @json(config('services.supabase.url')),
        supabaseKey: @json(config('services.supabase.anon_key')),
        pdfMailTo: "{{ config('mail.pdf_recipient') }}"
    };
</script>

    @vite(['resources/css/app.css', 'resources/js/app.js'])


</head>
<body class="h-full overflow-hidden flex flex-col antialiased">

    @include('login')

    <!-- Toast Notification (per messaggi di successo) -->
    <div id="toast" class="fixed top-6 right-6 z-50 transform translate-y-[-100px] opacity-0 transition-all duration-300 pointer-events-none">
        <div class="bg-slate-800 border-l-4 border-amber-500 text-slate-100 p-4 rounded shadow-2xl flex items-center gap-3 min-w-[300px]">
            <span class="text-amber-500" id="toast-icon">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </span>
            <div>
                <p class="font-semibold text-sm" id="toast-title">Operazione Riuscita</p>
                <p class="text-xs text-slate-400" id="toast-message">Elemento salvato correttamente.</p>
            </div>
        </div>
    </div>

    <!-- Modal scelta modello PDF -->
    <div id="modal-pdf-template" class="fixed inset-0 z-[55] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 hidden">
        <div class="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl slide-in">
            <div class="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-amber-500">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    Scegli modello PDF
                </h3>
                <button type="button" onclick="closePdfTemplateModal()" class="text-slate-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div class="p-6 space-y-3">
                <p class="text-sm text-slate-400 mb-4">Seleziona il modello da generare per questo servizio completato.</p>
                <button type="button" onclick="confirmPdfTemplate('riepilogo-intervento')" class="w-full text-left bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4 transition-all group">
                    <p class="font-bold text-white group-hover:text-amber-500 transition-colors">Modello A — Presenze ODV</p>
                    <p class="text-xs text-slate-500 mt-1">Elenco volontari impiegati e veicoli associativi (formato regionale).</p>
                </button>
                <button type="button" onclick="confirmPdfTemplate('template_aib')" class="w-full text-left bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4 transition-all group">
                    <p class="font-bold text-white group-hover:text-amber-500 transition-colors">Modello AIB — Antincendio Boschivo</p>
                    <p class="text-xs text-slate-500 mt-1">Rapporto intervento AIB con dati operativi e equipaggio.</p>
                </button>
                <button type="button" onclick="confirmPdfTemplate('modello-3-2')" class="w-full text-left bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4 transition-all group">
                    <p class="font-bold text-white group-hover:text-amber-500 transition-colors">Modello 3.2</p>
                    <p class="text-xs text-slate-500 mt-1">Scheda carburante e pedaggi autostradali.</p>
                </button>
            </div>
            <div class="px-6 pb-6">
                <button type="button" onclick="closePdfTemplateModal()" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">Annulla</button>
            </div>
        </div>
    </div>

    <!-- Modal scelta invio PDF -->
    <div id="modal-pdf-delivery" class="fixed inset-0 z-[56] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 hidden">
        <div class="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl slide-in">
            <div class="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-amber-500">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5A2.25 2.25 0 0119.5 19.5h-15A2.25 2.25 0 012.25 17.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0l-7.5-4.615A2.25 2.25 0 012.25 6.993V6.75" />
                    </svg>
                    Genera PDF
                </h3>
                <button type="button" onclick="closePdfDeliveryModal()" class="text-slate-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div class="p-6 space-y-4">
                <p id="pdf-delivery-description" class="text-sm text-slate-400">Scegli se scaricare il PDF oppure inviarlo via email.</p>
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Destinatario</label>
                    <input type="email" id="pdf-delivery-to" class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Oggetto</label>
                    <input type="text" id="pdf-delivery-subject" class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Testo email</label>
                    <textarea id="pdf-delivery-body" rows="4" class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors resize-none"></textarea>
                </div>
            </div>
            <div class="px-6 pb-6 flex gap-3">
                <button type="button" onclick="closePdfDeliveryModal()" class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">Annulla</button>
                <button type="button" onclick="confirmPdfDeliveryDownload()" class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">Scarica PDF</button>
                <button type="button" onclick="confirmPdfDeliveryEmail()" class="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">Invia email</button>
            </div>
        </div>
    </div>

    <!-- Modal scelta documento volontario -->
    <div id="modal-volontario-documenti" class="fixed inset-0 z-[55] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 hidden">
        <div class="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl slide-in">
            <div class="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-amber-500">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Scegli file
                </h3>
                <button type="button" onclick="closeVolontarioDocumentiModal()" class="text-slate-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div class="p-6 space-y-3">
                <p class="text-sm text-slate-400 mb-4">Seleziona quale file visualizzare per questo volontario.</p>
                <div id="volontario-documenti-options" class="space-y-3"></div>
            </div>
            <div class="px-6 pb-6 flex gap-3">
                <button type="button" onclick="closeVolontarioDocumentiModal()" class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">Annulla</button>
                <button type="button" onclick="downloadVolontarioDocumenti()" class="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">Scarica</button>
            </div>
        </div>
    </div>

    <!-- Overlay generazione PDF -->
    <div id="pdf-export-overlay" class="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 hidden" aria-live="polite" aria-busy="true">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <p id="pdf-export-progress-title" class="text-sm font-semibold text-white mb-1">Generazione PDF in corso</p>
            <p id="pdf-export-progress-description" class="text-xs text-slate-500 mb-4">Attendere il completamento del download...</p>
            <div class="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div id="pdf-export-progress-bar" class="h-full bg-amber-500 rounded-full transition-[width] duration-300 ease-out" style="width: 0%"></div>
            </div>
        </div>
    </div>

    <!-- Overlay per chiudere la sidebar su mobile -->
    <div id="sidebar-overlay" class="fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm hidden lg:hidden" onclick="closeSidebar()"></div>

    <!-- Layout Principale (nascosto finché non autenticato) -->
    <div id="app-layout" class="hidden flex h-full w-full overflow-hidden" style="display: none;">
        
        <!-- SIDEBAR - overlay su mobile, fissa su desktop -->
        <aside id="sidebar" class="fixed lg:relative z-40 lg:z-auto w-64 h-full bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 transition-transform duration-300 -translate-x-full lg:translate-x-0">
            <!-- Header Sidebar (Logo + Titolo) -->
            <div class="p-6 border-b border-slate-800 flex items-center gap-3">
               <!-- <div class="bg-amber-500 text-slate-950 p-2 rounded-xl shadow-lg shadow-amber-500/20">-->
                <div class="">
                    <!-- Icona Protezione Civile (Scudo/Stella) -->
                    <!--<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-6 h-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>-->
                    <img src="/img/logoapp.png" alt="Logo Protezione Civile" class="w-10 h-10 object-contain">
                </div>
                <div>
                    <h2 class="font-extrabold text-base tracking-wide text-white uppercase">{{ config('app.name') }}</h2>
                    <p class="text-[9px] text-amber-500 font-bold uppercase tracking-widest">Coordinamento Vesuvius</p>
                </div>
            </div>

            <!-- Navigazione Sidebar -->
            <nav class="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                <button onclick="switchTab('dashboard')" id="nav-dashboard" data-master-only class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-slate-400 hover:text-white hover:bg-slate-800/50">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                    <span>Dashboard</span>
                </button>

                <button onclick="switchTab('volontari')" id="nav-volontari" data-volontari-access class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-slate-400 hover:text-white hover:bg-slate-800/50">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 21c-2.243 0-4.352-.648-6.124-1.773L3.892 19.2c-.417-.234-.67-.679-.69-1.148a6.478 6.478 0 011.002-3.85 4.12 4.12 0 017.332-2.18c.633.796 1.439 1.379 2.36 1.7L15 19.128zm0-10.874a3 3 0 11-6 0 3 3 0 016 0zM19.5 7.125a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                    <span>Volontari</span>
                </button>

                <button onclick="switchTab('attivita')" id="nav-attivita" data-attivita-access class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-slate-400 hover:text-white hover:bg-slate-800/50">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21.75 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    <span>Attività</span>
                </button>

                <button onclick="switchTab('mezzi')" id="nav-mezzi" data-mezzi-access class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-slate-400 hover:text-white hover:bg-slate-800/50">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177V3.75A1.125 1.125 0 0013.125 2.625h-2.25a1.125 1.125 0 00-1.125 1.125v11.177M14.25 7.5H9.75M16.5 18.75a1.875 1.875 0 11-3.75 0m3.75 0a1.875 1.875 0 00-3.75 0m-9.75 0h9.75" />
                    </svg>
                    <span>Mezzi di Soccorso</span>
                </button>

                <button onclick="switchTab('magazzino')" id="nav-magazzino" data-magazzino-access class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-slate-400 hover:text-white hover:bg-slate-800/50">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                    <span>Magazzino</span>
                </button>

                <button onclick="switchTab('squadre-aib')" id="nav-squadre-aib" data-squadre-aib-access class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-slate-400 hover:text-white hover:bg-slate-800/50">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.941 3.199l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 9.094 9.094 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                    <span>Squadre A.I.B.</span>
                </button>

                <button onclick="switchTab('dashboard-caposquadra')" id="nav-dashboard-caposquadra" data-dashboard-caposquadra-access class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-slate-400 hover:text-white hover:bg-slate-800/50">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zm8.25 3a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                    <span>Dash Caposquadra</span>
                </button>

                <button onclick="switchTab('servizi')" id="nav-servizi" data-servizi-access class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-slate-400 hover:text-white hover:bg-slate-800/50">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
                    </svg>
                    <span>Sala Operativa</span>
                </button>

                <button onclick="switchTab('statistiche')" id="nav-statistiche" data-master-only class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-slate-400 hover:text-white hover:bg-slate-800/50">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125C16.5 3.504 17.004 3 17.625 3h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                    <span>Statistiche</span>
                </button>

                <button onclick="switchTab('protocollo-ingresso')" id="nav-protocollo-ingresso" data-master-only class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-slate-400 hover:text-white hover:bg-slate-800/50">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9H8.25z" />
                    </svg>
                    <span>Protocollo in Ingresso</span>
                </button>

                <button onclick="switchTab('protocollo-associazione')" id="nav-protocollo-associazione" data-protocollo-associazione-access class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-slate-400 hover:text-white hover:bg-slate-800/50">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9H8.25z" />
                    </svg>
                    <span>Prot. Associazione</span>
                </button>

                <button onclick="switchTab('admin')" id="nav-admin" data-master-only class="nav-btn w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-slate-400 hover:text-white hover:bg-slate-800/50">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Utenti</span>
                </button>
            </nav>

            <!-- Bottom Sidebar (Stato Centrale) -->
            <div class="p-4 border-t border-slate-800 bg-slate-950/40">
                <div class="flex items-center gap-3">
                    <span class="relative flex h-3.5 w-3.5">
                        <span id="system-status-dot-ping" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span id="system-status-dot" class="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                    </span>
                    <div>
                        <p class="text-xs font-semibold text-slate-200">System Status</p>
                        <p id="system-status-text" class="text-[10px] text-emerald-500 font-medium uppercase">HEALTHLY</p>
                    </div>
                </div>
            </div>
        </aside>

        <!-- AREA DI CONTENUTO -->
        <main class="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-hidden w-full">
            
            <!-- TOP BAR: su mobile titolo su riga dedicata (no overlap con email) -->
            <header class="h-16 lg:h-20 bg-slate-900 border-b border-slate-800 px-4 lg:px-8 flex items-center gap-2 shrink-0">
                <!-- Hamburger (solo mobile) -->
                <button onclick="toggleSidebar()" class="lg:hidden p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0" aria-label="Apri menu">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                </button>

                <h1 id="page-title" class="text-base font-bold text-white tracking-tight leading-tight min-w-0 flex-1 truncate lg:text-2xl"></h1>

                <div class="ml-auto flex items-center justify-end gap-2 min-w-0 shrink-0 lg:gap-6">
                    <!-- Data/Ora Reale in tempo reale -->
                    <div class="text-right hidden sm:block">
                        <p class="text-sm font-semibold text-slate-200" id="current-date">Caricamento data...</p>
                        <p class="text-xs text-slate-400 font-mono" id="current-time">Caricamento ora...</p>
                    </div>

                    <div class="h-8 w-px bg-slate-800 hidden sm:block"></div>

                    <!-- Associazione Badge -->
                    <div class="flex items-center gap-2 min-w-0 max-w-[min(100%,11rem)] sm:max-w-[14rem] lg:max-w-none bg-slate-800/80 px-2.5 py-1.5 lg:gap-3 lg:px-4 lg:py-2 rounded-xl border border-slate-700/50">
                        <div class="bg-amber-500 w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full shrink-0"></div>
                        <span id="user-email-badge" class="text-[10px] sm:text-xs font-bold uppercase tracking-wide text-slate-200 truncate">—</span>
                    </div>

                    <div class="h-8 w-px bg-slate-800 hidden sm:block"></div>

                    <!-- Pulsante Cambio Password -->
                    <button onclick="openChangePasswordModal()" id="change-password-btn" title="Cambia password" class="flex items-center gap-2 p-2 lg:px-3 lg:py-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all duration-200 text-xs font-semibold border border-transparent hover:border-amber-500/20 shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25V19.5H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                        </svg>
                        <span class="hidden sm:inline">Password</span>
                    </button>

                    <!-- Pulsante Logout -->
                    <button onclick="handleLogout()" id="logout-btn" title="Esci dal sistema" class="flex items-center gap-2 p-2 lg:px-3 lg:py-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 text-xs font-semibold border border-transparent hover:border-rose-500/20 shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                        </svg>
                        <span class="hidden sm:inline">Esci</span>
                    </button>
                </div>
            </header>

            <!-- CONTENUTO DELLE TAB -->
            <div class="flex-1 overflow-y-auto p-4 lg:p-8 pb-20 lg:pb-8">

                <!-- ================= TAB 1: DASHBOARD ================= -->
                <section id="tab-dashboard" data-master-only class="tab-content space-y-8 hidden fade-in">
                    
                    <!-- Contatori Statistici -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <!-- Card Volontari -->
                        <div class="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300">
                            <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-all text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <h3 class="text-slate-400 text-xs font-bold uppercase tracking-widest">Volontari Registrati</h3>
                            <div class="mt-4 flex items-baseline gap-2">
                                <span class="text-4xl font-extrabold text-white tracking-tight" id="stat-volontari-totali">0</span>
                                <span class="text-emerald-500 text-xs font-bold flex items-center gap-1">
                                    <span id="stat-volontari-attivi">0</span> attivi
                                </span>
                            </div>
                            <p class="text-xs text-slate-500 mt-2 font-medium">Forza operativa totale dell'associazione.</p>
                        </div>

                        <!-- Card Mezzi -->
                        <div data-master-only class="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300">
                            <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-all text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M21 16V10a2 2 0 00-2-2h-4.25m-.75 0H14M16.5 13H21" />
                                </svg>
                            </div>
                            <h3 class="text-slate-400 text-xs font-bold uppercase tracking-widest">Mezzi di Soccorso</h3>
                            <div class="mt-4 flex items-baseline gap-2">
                                <span class="text-4xl font-extrabold text-white tracking-tight" id="stat-mezzi-totali">0</span>
                                <span class="text-emerald-500 text-xs font-bold flex items-center gap-1">
                                    <span id="stat-mezzi-disponibili">0</span> disp.
                                </span>
                            </div>
                            <p class="text-xs text-slate-500 mt-2 font-medium">Flotta di veicoli per emergenze.</p>
                        </div>

                        <!-- Card Servizi Attivi -->
                        <div data-master-only class="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300">
                            <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-all text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h3 class="text-slate-400 text-xs font-bold uppercase tracking-widest">Servizi in Corso</h3>
                            <div class="mt-4 flex items-baseline gap-2">
                                <span class="text-4xl font-extrabold text-amber-500 tracking-tight" id="stat-servizi-in-corso">0</span>
                                <span class="text-amber-500/80 text-xs font-bold flex items-center gap-1">
                                    interventi
                                </span>
                            </div>
                            <p class="text-xs text-slate-500 mt-2 font-medium">Attività emergenziali o assistenziali attive.</p>
                        </div>

                        <!-- Card Servizi Completati -->
                        <div data-master-only class="bg-slate-900 border border-slate-800/80 p-6 rounded-2xl relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300">
                            <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-all text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                            </div>
                            <h3 class="text-slate-400 text-xs font-bold uppercase tracking-widest">Servizi Completati</h3>
                            <div class="mt-4 flex items-baseline gap-2">
                                <span class="text-4xl font-extrabold text-white tracking-tight" id="stat-servizi-completati">0</span>
                                <span class="text-emerald-500 text-xs font-bold flex items-center gap-1">
                                    storico
                                </span>
                            </div>
                            <p class="text-xs text-slate-500 mt-2 font-medium">Servizi conclusi con successo.</p>
                        </div>
                    </div>

                    <!-- Sezione Widget + Grafici CSS e Dati -->
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        <!-- Colonna Sinistra/Centro: Servizi Recenti -->
                        <div data-master-only class="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col">
                            <div class="flex items-center justify-between mb-6">
                                <div>
                                    <h3 class="text-lg font-bold text-white">Riepilogo Servizi Recenti</h3>
                                    <p class="text-xs text-slate-400">Ultimi interventi pianificati ed effettuati.</p>
                                </div>
                                <button onclick="switchTab('servizi')" class="text-xs font-bold text-amber-500 hover:text-amber-400 hover:underline">Vedi Tutti</button>
                            </div>

                            <!-- Tabella dei Servizi Recenti -->
                            <div class="flex-1 overflow-x-auto">
                                <table class="mobile-card-table w-full text-left border-collapse">
                                    <thead>
                                        <tr class="border-b border-slate-800 text-slate-400 text-xs font-semibold tracking-wider">
                                            <th class="py-3 px-4">Missione / Servizio</th>
                                            <th class="py-3 px-4">Data e Ora</th>
                                            <th class="py-3 px-4">Mezzo</th>
                                            <th class="py-3 px-4">Stato</th>
                                        </tr>
                                    </thead>
                                    <tbody id="dashboard-recent-services" class="text-sm divide-y divide-slate-800/50">
                                        <!-- Generato dinamicamente via JS -->
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Colonna Destra: Stato Operativo Flotta e Personale -->
                        <div class="space-y-6">
                            <!-- Widget Stato Mezzi -->
                            <div data-master-only class="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                                <h3 class="text-md font-bold text-white mb-4">Stato Flotta Mezzi</h3>
                                <div class="space-y-4">
                                    <div>
                                        <div class="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                                            <span>Disponibili</span>
                                            <span id="widget-mezzi-disp-val">0 / 0</span>
                                        </div>
                                        <div class="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <div id="widget-mezzi-disp-bar" class="h-full bg-emerald-500 transition-all duration-500" style="width: 0%"></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div class="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                                            <span>In Servizio</span>
                                            <span id="widget-mezzi-serv-val">0 / 0</span>
                                        </div>
                                        <div class="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <div id="widget-mezzi-serv-bar" class="h-full bg-blue-500 transition-all duration-500" style="width: 0%"></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div class="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                                            <span>In Manutenzione</span>
                                            <span id="widget-mezzi-manut-val">0 / 0</span>
                                        </div>
                                        <div class="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <div id="widget-mezzi-manut-bar" class="h-full bg-rose-500 transition-all duration-500" style="width: 0%"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Widget Disponibilità Volontari -->
                            <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                                <h3 class="text-md font-bold text-white mb-4">Stato Personale</h3>
                                <div class="flex items-center gap-6">
                                    <!-- Grafico Circolare (SVG) -->
                                    <div class="relative flex items-center justify-center w-24 h-24 shrink-0">
                                        <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                            <path class="text-slate-800" stroke="currentColor" stroke-width="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                            <path id="svg-circle-progress" class="text-amber-500 transition-all duration-500" stroke-dasharray="0, 100" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                        </svg>
                                        <div class="absolute flex flex-col items-center justify-center">
                                            <span id="widget-volontari-percent" class="text-lg font-extrabold text-white">0%</span>
                                            <span class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Attivi</span>
                                        </div>
                                    </div>
                                    <div class="space-y-2">
                                        <p class="text-xs text-slate-400 font-medium">La percentuale rappresenta la quota di volontari operativi e pronti all'attivazione immediata.</p>
                                        <div class="flex items-center gap-2">
                                            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                                            <span class="text-xs font-semibold text-slate-200" id="widget-volontari-operativi-label">0 Operativi</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    <!-- Riepilogo Volontari -->
                    <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                        <div class="flex items-center justify-between mb-6">
                            <div>
                                <h3 class="text-lg font-bold text-white">Riepilogo Volontari</h3>
                                <p class="text-xs text-slate-400">Elenco del personale registrato per associazione.</p>
                            </div>
                            <button onclick="switchTab('volontari')" class="text-xs font-bold text-amber-500 hover:text-amber-400 hover:underline">Vedi Tutti</button>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="mobile-card-table w-full text-left border-collapse">
                                <thead>
                                    <tr class="border-b border-slate-800 text-slate-400 text-xs font-semibold tracking-wider">
                                        <th class="py-3 px-4">Nominativo</th>
                                        <th class="py-3 px-4">Associazione di appartenenza</th>
                                        <th class="py-3 px-4">Ruolo</th>
                                        <th class="py-3 px-4">Stato</th>
                                    </tr>
                                </thead>
                                <tbody id="dashboard-volontari-body" class="text-sm divide-y divide-slate-800/50">
                                    <!-- Generato dinamicamente via JS -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                @include('volontari')

                @include('mezzi')

                @include('magazzino')

                @include('squadre-aib')

                @include('dashboard-caposquadra')

                @include('servizi')

                @include('attivita')

                @include('statistiche')

                @include('protocollo-ingresso')

                @include('protocollo-associazione')

                @include('admin')

            </div>
        </main>
    </div>

    <!-- BOTTOM NAVIGATION BAR (solo mobile) -->
    <nav id="bottom-nav" class="bottom-nav-scroll bottom-nav-glass lg:hidden fixed left-3 right-3 z-20 flex items-center gap-1.5 overflow-x-auto overscroll-x-contain px-2.5 py-2" style="display: none;">
        <button onclick="switchTab('dashboard')" id="bottom-nav-dashboard" data-master-only class="bottom-nav-btn flex-none w-20 flex flex-col items-center gap-1 px-2 py-2 rounded-2xl text-slate-400 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <span class="text-[10px] font-bold">Dashboard</span>
        </button>
        <button onclick="switchTab('volontari')" id="bottom-nav-volontari" data-volontari-access class="bottom-nav-btn flex-none w-20 flex flex-col items-center gap-1 px-2 py-2 rounded-2xl text-slate-400 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 21c-2.243 0-4.352-.648-6.124-1.773L3.892 19.2c-.417-.234-.67-.679-.69-1.148a6.478 6.478 0 011.002-3.85 4.12 4.12 0 017.332-2.18c.633.796 1.439 1.379 2.36 1.7L15 19.128zm0-10.874a3 3 0 11-6 0 3 3 0 016 0zM19.5 7.125a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            <span class="text-[10px] font-bold">Volontari</span>
        </button>
        <button onclick="switchTab('attivita')" id="bottom-nav-attivita" data-attivita-access class="bottom-nav-btn flex-none w-20 flex flex-col items-center gap-1 px-2 py-2 rounded-2xl text-slate-400 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21.75 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <span class="text-[10px] font-bold">Attività</span>
        </button>
        <button onclick="switchTab('mezzi')" id="bottom-nav-mezzi" data-mezzi-access class="bottom-nav-btn flex-none w-20 flex flex-col items-center gap-1 px-2 py-2 rounded-2xl text-slate-400 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177V3.75A1.125 1.125 0 0013.125 2.625h-2.25a1.125 1.125 0 00-1.125 1.125v11.177M14.25 7.5H9.75M16.5 18.75a1.875 1.875 0 11-3.75 0m3.75 0a1.875 1.875 0 00-3.75 0m-9.75 0h9.75" />
            </svg>
            <span class="text-[10px] font-bold">Mezzi</span>
        </button>
        <button onclick="switchTab('magazzino')" id="bottom-nav-magazzino" data-magazzino-access class="bottom-nav-btn flex-none w-24 flex flex-col items-center gap-1 px-2 py-2 rounded-2xl text-slate-400 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <span class="text-[10px] font-bold">Magazzino</span>
        </button>
        <button onclick="switchTab('dashboard-caposquadra')" id="bottom-nav-dashboard-caposquadra" data-dashboard-caposquadra-access class="bottom-nav-btn flex-none w-24 flex flex-col items-center gap-1 px-2 py-2 rounded-2xl text-slate-400 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zm8.25 3a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <span class="text-[10px] font-bold leading-tight">Dashboard CS</span>
        </button>
        <button onclick="switchTab('servizi')" id="bottom-nav-servizi" data-servizi-access class="bottom-nav-btn flex-none w-24 flex flex-col items-center gap-1 px-2 py-2 rounded-2xl text-slate-400 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
            </svg>
            <span class="text-[10px] font-bold">Sala Operativa</span>
        </button>
        <button onclick="switchTab('statistiche')" id="bottom-nav-statistiche" data-master-only class="bottom-nav-btn flex-none w-20 flex flex-col items-center gap-1 px-2 py-2 rounded-2xl text-slate-400 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125C16.5 3.504 17.004 3 17.625 3h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <span class="text-[10px] font-bold">Statistiche</span>
        </button>
        <button onclick="switchTab('protocollo-ingresso')" id="bottom-nav-protocollo-ingresso" data-master-only class="bottom-nav-btn flex-none w-24 flex flex-col items-center gap-1 px-2 py-2 rounded-2xl text-slate-400 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9H8.25z" />
            </svg>
            <span class="text-[10px] font-bold leading-tight">Protocollo</span>
        </button>
        <button onclick="switchTab('protocollo-associazione')" id="bottom-nav-protocollo-associazione" data-protocollo-associazione-access class="bottom-nav-btn flex-none w-24 flex flex-col items-center gap-1 px-2 py-2 rounded-2xl text-slate-400 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9H8.25z" />
            </svg>
            <span class="text-[10px] font-bold leading-tight">Prot. Ass.</span>
        </button>
        <button onclick="switchTab('admin')" id="bottom-nav-admin" data-master-only class="bottom-nav-btn flex-none w-20 flex flex-col items-center gap-1 px-2 py-2 rounded-2xl text-slate-400 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span class="text-[10px] font-bold">Utenti</span>
        </button>
    </nav>


    <!-- ================= MODAL: PROTOCOLLO IN INGRESSO ================= -->
    <div id="modal-protocollo-ingresso" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start sm:items-center justify-center overflow-y-auto p-4 hidden">
        <div class="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl slide-in">
            <div class="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-amber-500">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9H8.25z" />
                    </svg>
                    <span id="modal-protocollo-ingresso-title">Nuovo Protocollo in Ingresso</span>
                </h3>
                <button type="button" onclick="toggleModal('modal-protocollo-ingresso', false)" class="text-slate-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <form onsubmit="saveProtocolloIngresso(event)" class="p-6 space-y-5">
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Numero protocollo esterno</label>
                    <input type="text" id="pi-protocollo-esterno" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 focus:outline-none transition-colors">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Data memorizzazione file <span class="text-rose-400">*</span></label>
                    <input type="date" id="pi-data-memorizzazione" required class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 focus:outline-none transition-colors">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">File <span id="pi-file-required" class="text-rose-400">*</span></label>
                    <input type="file" id="pi-file" required class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-300 file:mr-3 file:border-0 file:rounded-lg file:bg-amber-500 file:px-3 file:py-2 file:text-xs file:font-bold file:text-slate-950 hover:file:bg-amber-600 focus:border-amber-500 focus:outline-none transition-colors">
                    <p id="pi-file-current" class="hidden mt-2 text-xs text-slate-500"></p>
                </div>
                <div class="flex justify-end gap-3 pt-3 border-t border-slate-800">
                    <button type="button" onclick="toggleModal('modal-protocollo-ingresso', false)" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">Annulla</button>
                    <button type="submit" id="modal-protocollo-ingresso-submit" class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-amber-500/10">Salva</button>
                </div>
            </form>
        </div>
    </div>

    <!-- ================= MODAL: PROTOCOLLO ASSOCIAZIONE ================= -->
    <div id="modal-protocollo-associazione" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start sm:items-center justify-center overflow-y-auto p-4 hidden">
        <div class="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl slide-in">
            <div class="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-amber-500">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9H8.25z" />
                    </svg>
                    <span id="modal-protocollo-associazione-title">Nuovo Protocollo Associazione</span>
                </h3>
                <button type="button" onclick="toggleModal('modal-protocollo-associazione', false)" class="text-slate-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <form onsubmit="saveProtocolloAssociazione(event)" class="p-6 space-y-5">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Tipo <span class="text-rose-400">*</span></label>
                        <select id="pa-tipo" required onchange="toggleProtocolloAssociazioneTipoFields()" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 focus:outline-none transition-colors">
                            <option value="ingresso">Ingresso</option>
                            <option value="uscita">Uscita</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Data memorizzazione <span class="text-rose-400">*</span></label>
                        <input type="date" id="pa-data-memorizzazione" required class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 focus:outline-none transition-colors">
                    </div>
                </div>
                <div id="pa-associazione-select-wrap">
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Associazione <span class="text-rose-400">*</span></label>
                    <select id="pa-associazione" data-associazione-select required class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 focus:outline-none transition-colors"></select>
                </div>
                <div id="pa-associazione-fissa-wrap" class="hidden">
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Associazione</label>
                    <input type="hidden" id="pa-associazione-fissa" value="">
                    <p id="pa-associazione-fissa-label" class="w-full bg-slate-950 border border-slate-800 text-amber-500 font-semibold rounded-xl p-3 text-sm"></p>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Numero protocollo esterno</label>
                    <input type="text" id="pa-protocollo-esterno" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 focus:outline-none transition-colors">
                </div>
                <div id="pa-mittente-wrap">
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Mittente</label>
                    <input type="text" id="pa-mittente" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 focus:outline-none transition-colors">
                </div>
                <div id="pa-destinatario-wrap" class="hidden">
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Destinatario</label>
                    <input type="text" id="pa-destinatario" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 focus:outline-none transition-colors">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Oggetto</label>
                    <textarea id="pa-oggetto" rows="3" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 focus:outline-none transition-colors resize-none"></textarea>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">File <span id="pa-file-required" class="text-rose-400">*</span></label>
                    <input type="file" id="pa-file" required accept="application/pdf,image/jpeg,image/png,image/webp" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-300 file:mr-3 file:border-0 file:rounded-lg file:bg-amber-500 file:px-3 file:py-2 file:text-xs file:font-bold file:text-slate-950 hover:file:bg-amber-600 focus:border-amber-500 focus:outline-none transition-colors">
                    <p id="pa-file-current" class="hidden mt-2 text-xs text-slate-500"></p>
                </div>
                <div class="flex justify-end gap-3 pt-3 border-t border-slate-800">
                    <button type="button" onclick="toggleModal('modal-protocollo-associazione', false)" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">Annulla</button>
                    <button type="submit" id="modal-protocollo-associazione-submit" class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-amber-500/10">Salva</button>
                </div>
            </form>
        </div>
    </div>

    <!-- ================= MODAL: NUOVA ATTREZZATURA MAGAZZINO ================= -->
    <div id="modal-attrezzatura" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start sm:items-center justify-center overflow-y-auto p-4 hidden">
        <div class="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl slide-in">
            <div class="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-amber-500">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                    <span id="modal-attrezzatura-title">Nuova Attrezzatura</span>
                </h3>
                <button onclick="toggleModal('modal-attrezzatura', false)" class="text-slate-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <form id="form-attrezzatura" onsubmit="saveAttrezzatura(event)" class="p-6 space-y-4">
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Nome attrezzatura <span class="text-amber-500">*</span></label>
                    <input type="text" id="a-nome" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Tipo attrezzatura <span class="text-amber-500">*</span></label>
                    <select id="a-tipo" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors"></select>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Numero inventario <span class="text-amber-500">*</span></label>
                    <input type="text" id="a-numero-inventario" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Quantità <span class="text-amber-500">*</span></label>
                    <input type="number" id="a-quantita" min="0" step="1" value="0" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                </div>
                <div id="a-associazione-select-wrap">
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Associazione di appartenenza <span class="text-amber-500">*</span></label>
                    <select id="a-associazione" data-associazione-select required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                        <option value="G.C. Massa di Somma">G.C. Massa di Somma</option>
                        <option value="G.C. Cercola">G.C. Cercola</option>
                        <option value="Cobra 2">Cobra 2</option>
                        <option value="G.C. Sant'Anastasia">G.C. Sant'Anastasia</option>
                        <option value="Save Me">Save Me</option>
                        <option value="NVPC Pomigliano">NVPC Pomigliano</option>
                        <option value="COPCSV Pomigliano">COPCSV Pomigliano</option>
                    </select>
                </div>
                <div id="a-associazione-fissa-wrap" class="hidden">
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Associazione di appartenenza</label>
                    <input type="hidden" id="a-associazione-fissa" value="">
                    <p id="a-associazione-fissa-label" class="w-full bg-slate-950 border border-slate-800 text-amber-500 font-semibold rounded-xl px-4 py-2.5 text-sm"></p>
                    <p class="text-[10px] text-slate-500 mt-1 font-medium">Associazione fissa per il tuo account segreteria.</p>
                </div>
                <div class="pt-4 border-t border-slate-800 flex justify-end gap-3">
                    <button type="button" onclick="toggleModal('modal-attrezzatura', false)" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">Annulla</button>
                    <button type="submit" id="modal-attrezzatura-submit" class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-amber-500/10">Registra</button>
                </div>
            </form>
        </div>
    </div>

    <!-- ================= MODAL: PRELIEVO MAGAZZINO ================= -->
    <div id="modal-prelievo-magazzino" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start sm:items-center justify-center overflow-y-auto p-4 hidden">
        <div class="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl slide-in">
            <div class="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                    <span id="modal-prelievo-magazzino-title">Nuovo Prelievo</span>
                </h3>
                <button type="button" onclick="toggleModal('modal-prelievo-magazzino', false)" class="text-slate-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <form id="form-prelievo-magazzino" onsubmit="savePrelievoMagazzino(event)" class="p-6 space-y-5">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Data del prelievo <span class="text-amber-500">*</span></label>
                        <input type="date" id="pm-data" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Persona consegna bene <span class="text-amber-500">*</span></label>
                        <input type="text" id="pm-consegnato-a" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                    </div>
                </div>
                <div>
                    <div class="flex items-center justify-between gap-3 mb-3">
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400">Item da prelevare <span class="text-amber-500">*</span></label>
                        <button type="button" onclick="addPrelievoMagazzinoRow()" class="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-bold transition-colors">Aggiungi item</button>
                    </div>
                    <div id="pm-items" class="space-y-3"></div>
                </div>
                <div class="pt-4 border-t border-slate-800 flex justify-end gap-3">
                    <button type="button" onclick="toggleModal('modal-prelievo-magazzino', false)" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">Annulla</button>
                    <button type="submit" id="modal-prelievo-magazzino-submit" class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-amber-500/10">Registra</button>
                </div>
            </form>
        </div>
    </div>

    <!-- ================= MODAL: NUOVO TIPO ATTREZZATURA ================= -->
    <div id="modal-tipo-attrezzatura" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start sm:items-center justify-center overflow-y-auto p-4 hidden">
        <div class="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl slide-in">
            <div class="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
                <h3 class="text-lg font-bold text-white">Nuovo Tipo Attrezzatura</h3>
                <button onclick="toggleModal('modal-tipo-attrezzatura', false)" class="text-slate-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <form id="form-tipo-attrezzatura" onsubmit="saveTipoAttrezzatura(event)" class="p-6 space-y-4">
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Nome tipo <span class="text-amber-500">*</span></label>
                    <input type="text" id="ta-nome" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Tipi disponibili</label>
                    <div id="tipi-attrezzatura-list" class="space-y-2 max-h-56 overflow-y-auto pr-1"></div>
                </div>
                <div class="pt-4 border-t border-slate-800 flex justify-end gap-3">
                    <button type="button" onclick="toggleModal('modal-tipo-attrezzatura', false)" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">Annulla</button>
                    <button type="submit" class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-amber-500/10">Salva</button>
                </div>
            </form>
        </div>
    </div>


    <!-- ================= MODAL: NUOVO VOLONTARIO ================= -->
    <div id="modal-volontario" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start sm:items-center justify-center overflow-y-auto p-4 hidden">
        <div class="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl slide-in max-h-[90vh] flex flex-col">
            <!-- Modal Header -->
            <div class="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-amber-500">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.3 20c-2.243 0-4.352-.648-6.124-1.773L3.892 19.2c-.417-.234-.67-.679-.69-1.148z" />
                    </svg>
                    <span id="modal-volontario-title">Aggiungi Nuovo Volontario</span>
                </h3>
                <button onclick="toggleModal('modal-volontario', false)" class="text-slate-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <!-- Modal Form -->
            <form id="form-volontario" onsubmit="saveVolontario(event)" class="p-6 space-y-4 overflow-y-auto">
                
                <div class="flex items-center gap-4">
                    <div id="v-foto-preview" class="h-16 w-16 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden text-sm font-bold text-amber-500 shrink-0">--</div>
                        <div class="min-w-0 flex-1">
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Foto volontario</label>
                            <div class="flex items-center gap-2">
                                <input type="file" id="v-foto" accept="image/jpeg,image/png,image/webp" onchange="previewVolontarioFoto()" class="block min-w-0 flex-1 text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-800 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-slate-200 hover:file:bg-slate-700">
                                <span id="v-foto-filename" class="hidden min-w-0 max-w-[10rem] truncate rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300"></span>
                                <button type="button" id="v-foto-delete" onclick="markVolontarioFileForDelete('foto')" class="hidden shrink-0 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-colors">Elimina</button>
                            </div>
                            <p id="v-foto-current" class="text-[10px] text-slate-500 mt-1 font-medium"></p>
                        </div>
                </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Nome <span class="text-amber-500">*</span></label>
                        <input type="text" id="v-nome" required placeholder="Es. Mario" class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Cognome <span class="text-amber-500">*</span></label>
                        <input type="text" id="v-cognome" required placeholder="Es. Rossi" class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Data di nascita <span class="text-amber-500">*</span></label>
                        <input type="date" id="v-data-nascita" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Luogo di nascita <span class="text-amber-500">*</span></label>
                        <input type="text" id="v-luogo-nascita" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                    </div>
                </div>
                
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Codice Fiscale <span class="text-amber-500">*</span></label>
                    <input type="text" id="v-cf" required placeholder="Es. RSSMRA80A01H501U" class="w-full uppercase bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                </div>

               
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Comune di residenza <span class="text-amber-500">*</span></label>
                        <input type="text" id="v-comune-residenza" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Via di residenza <span class="text-amber-500">*</span></label>
                        <input type="text" id="v-via-residenza" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Carta d'identita <span class="text-amber-500">*</span></label>
                    <div class="flex items-center gap-2">
                        <input type="file" id="v-carta-identita" required accept="application/pdf,image/jpeg,image/png,image/webp" onchange="clearVolontarioFileDelete('cartaIdentita')" class="min-w-0 flex-1 bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-amber-500 file:text-slate-950 file:font-bold file:text-xs hover:file:bg-amber-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                        <span id="v-carta-identita-filename" class="hidden min-w-0 max-w-[10rem] truncate rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300"></span>
                        <button type="button" id="v-carta-identita-delete" onclick="markVolontarioFileForDelete('cartaIdentita')" class="hidden shrink-0 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-colors">Elimina</button>
                    </div>
                    <p id="v-carta-identita-current" class="mt-1 text-[11px] text-slate-500"></p>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Censito? <span class="text-amber-500">*</span></label>
                        <select id="v-censito" required onchange="toggleVolontarioMatricolaField()" class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                            <option value="No">No</option>
                            <option value="Si">Si</option>
                        </select>
                    </div>
                    <div id="v-matricola-regionale-wrap" class="hidden">
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Matricola Regionale <span class="text-amber-500">*</span></label>
                        <input type="text" id="v-matricola-regionale" class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Ruolo Operativo <span class="text-amber-500">*</span></label>
                        <select id="v-ruolo" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                            <option value="Coordinatore">Coordinatore</option>
                            <option value="Vice Coordinatore">Vice Coordinatore</option>
                            <option value="Presidente">Presidente</option>
                            <option value="Vice Presidente">Vice Presidente</option>
                            <option value="Responsabile settore Tecnico">Responsabile settore Tecnico</option>
                            <option value="Caposquadra">Caposquadra</option>
                            <option value="Consigliere direttivo">Consigliere direttivo</option>
                            <option value="Tesoriere">Tesoriere</option>
                            <option value="Volontario">Volontario</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Stato Disponibilità <span class="text-amber-500">*</span></label>
                        <select id="v-stato" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                            <option value="Operativo">Operativo (Attivo)</option>
                            <option value="In riposo">In riposo (Non disp.)</option>
                            <option value="Sospeso">Sospeso</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Qualifica Antincendio</label>
                    <div class="grid grid-cols-5 gap-2">
                        <label class="flex items-center justify-center gap-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold">
                            <input type="checkbox" name="v-qualifica-antincendio" value="P" onchange="renderVolontarioQualificationDateFields()" class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900">
                            P
                        </label>
                        <label class="flex items-center justify-center gap-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold">
                            <input type="checkbox" name="v-qualifica-antincendio" value="L" onchange="renderVolontarioQualificationDateFields()" class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900">
                            L
                        </label>
                        <label class="flex items-center justify-center gap-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold">
                            <input type="checkbox" name="v-qualifica-antincendio" value="S" onchange="renderVolontarioQualificationDateFields()" class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900">
                            S
                        </label>
                        <label class="flex items-center justify-center gap-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold">
                            <input type="checkbox" name="v-qualifica-antincendio" value="D" onchange="renderVolontarioQualificationDateFields()" class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900">
                            D
                        </label>
                        <label class="flex items-center justify-center gap-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold">
                            <input type="checkbox" name="v-qualifica-antincendio" value="CS" onchange="renderVolontarioQualificationDateFields()" class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900">
                            CS
                        </label>
                    </div>
                    <div id="v-qualifica-antincendio-date-fields" class="hidden mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3"></div>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Qualifiche Coordinamento</label>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label class="flex items-center gap-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5 text-sm">
                            <input type="checkbox" name="v-qualifiche-coordinamento" value="Corso Base Coordinamento" onchange="renderVolontarioQualificationDateFields()" class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900">
                            Corso Base Coordinamento
                        </label>
                        <label class="flex items-center gap-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5 text-sm">
                            <input type="checkbox" name="v-qualifiche-coordinamento" value="Idrogeologico" onchange="renderVolontarioQualificationDateFields()" class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900">
                            Idrogeologico
                        </label>
                        <label class="flex items-center gap-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5 text-sm">
                            <input type="checkbox" name="v-qualifiche-coordinamento" value="Segreteria" onchange="renderVolontarioQualificationDateFields()" class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900">
                            Segreteria
                        </label>
                        <label class="flex items-center gap-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5 text-sm">
                            <input type="checkbox" name="v-qualifiche-coordinamento" value="Logistica" onchange="renderVolontarioQualificationDateFields()" class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900">
                            Logistica
                        </label>
                        <label class="flex items-center gap-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5 text-sm">
                            <input type="checkbox" name="v-qualifiche-coordinamento" value="Sanitario" onchange="renderVolontarioQualificationDateFields()" class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900">
                            Sanitario
                        </label>
                        <label class="flex items-center gap-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5 text-sm">
                            <input type="checkbox" name="v-qualifiche-coordinamento" value="Telecomunicazioni" onchange="renderVolontarioQualificationDateFields()" class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900">
                            Telecomunicazioni
                        </label>
                        <label class="flex items-center gap-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5 text-sm">
                            <input type="checkbox" name="v-qualifiche-coordinamento" value="Corso BLSD" onchange="renderVolontarioQualificationDateFields()" class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900">
                            Corso BLSD
                        </label>
                        <label class="flex items-center gap-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5 text-sm">
                            <input type="checkbox" name="v-qualifiche-coordinamento" value="Corso Alto Rischio" onchange="renderVolontarioQualificationDateFields()" class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900">
                            Corso Alto Rischio
                        </label>
                    </div>
                    <div id="v-qualifiche-coordinamento-date-fields" class="hidden mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3"></div>
                    <div id="v-qualifiche-coordinamento-files-wrap" class="hidden mt-3 space-y-3">
                        <div data-qualifica-coordinamento-file="Corso BLSD" class="hidden">
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Attestato Corso BLSD</label>
                            <div class="flex items-center gap-2">
                                <input type="file" data-qualifica-coordinamento-file-input="Corso BLSD" onchange="clearVolontarioFileDelete('qualificaCoordinamento', 'Corso BLSD')" accept="application/pdf,image/jpeg,image/png,image/webp" class="block min-w-0 flex-1 text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-800 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-slate-200 hover:file:bg-slate-700">
                                <span data-qualifica-coordinamento-filename="Corso BLSD" class="hidden min-w-0 max-w-[10rem] truncate rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300"></span>
                                <button type="button" data-qualifica-coordinamento-delete="Corso BLSD" onclick="markVolontarioFileForDelete('qualificaCoordinamento', 'Corso BLSD')" class="hidden shrink-0 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-colors">Elimina</button>
                            </div>
                            <p data-qualifica-coordinamento-current="Corso BLSD" class="text-[10px] text-slate-500 mt-1 font-medium"></p>
                        </div>
                        <div data-qualifica-coordinamento-file="Corso Alto Rischio" class="hidden">
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Attestato Corso Alto Rischio</label>
                            <div class="flex items-center gap-2">
                                <input type="file" data-qualifica-coordinamento-file-input="Corso Alto Rischio" onchange="clearVolontarioFileDelete('qualificaCoordinamento', 'Corso Alto Rischio')" accept="application/pdf,image/jpeg,image/png,image/webp" class="block min-w-0 flex-1 text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-800 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-slate-200 hover:file:bg-slate-700">
                                <span data-qualifica-coordinamento-filename="Corso Alto Rischio" class="hidden min-w-0 max-w-[10rem] truncate rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300"></span>
                                <button type="button" data-qualifica-coordinamento-delete="Corso Alto Rischio" onclick="markVolontarioFileForDelete('qualificaCoordinamento', 'Corso Alto Rischio')" class="hidden shrink-0 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-colors">Elimina</button>
                            </div>
                            <p data-qualifica-coordinamento-current="Corso Alto Rischio" class="text-[10px] text-slate-500 mt-1 font-medium"></p>
                        </div>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Patente</label>
                    <select id="v-patente-presente" onchange="toggleVolontarioPatentiPresence()" class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                        <option value="No">No</option>
                        <option value="Si">Si</option>
                    </select>
                    <div id="v-patenti-fields-wrap" class="hidden mt-3 space-y-3">
                        <div>
                            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">A, B, C, D, E</p>
                            <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                <label class="flex items-center gap-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5 text-sm">
                                    <input type="checkbox" name="v-patenti" value="A" onchange="toggleVolontarioPatentiFiles()" class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900">
                                    A
                                </label>
                                <label class="flex items-center gap-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5 text-sm">
                                    <input type="checkbox" name="v-patenti" value="B" onchange="toggleVolontarioPatentiFiles()" class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900">
                                    B
                                </label>
                                <label class="flex items-center gap-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5 text-sm">
                                    <input type="checkbox" name="v-patenti" value="C" onchange="toggleVolontarioPatentiFiles()" class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900">
                                    C
                                </label>
                                <label class="flex items-center gap-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5 text-sm">
                                    <input type="checkbox" name="v-patenti" value="D" onchange="toggleVolontarioPatentiFiles()" class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900">
                                    D
                                </label>
                                <label class="flex items-center gap-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5 text-sm">
                                    <input type="checkbox" name="v-patenti" value="E" onchange="toggleVolontarioPatentiFiles()" class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900">
                                    E
                                </label>
                            </div>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">MMT</p>
                            <label class="flex items-center gap-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5 text-sm">
                                <input type="checkbox" name="v-patenti" value="MMT" onchange="toggleVolontarioPatentiFiles()" class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900">
                                MMT (Movimento terra)
                            </label>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Patente nautica</p>
                            <label class="flex items-center gap-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5 text-sm">
                                <input type="checkbox" name="v-patenti" value="Patente Nautica" onchange="toggleVolontarioPatentiFiles()" class="rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900">
                                Patente Nautica
                            </label>
                        </div>
                    </div>
                    <div id="v-patenti-files-wrap" class="hidden mt-3 space-y-3">
                        <div data-patente-file="Patenti A-B-C-D-E" class="hidden">
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">File patenti A, B, C, D, E</label>
                            <div class="flex items-center gap-2">
                                <input type="file" data-patente-file-input="Patenti A-B-C-D-E" onchange="clearVolontarioFileDelete('patente', 'Patenti A-B-C-D-E')" accept="application/pdf,image/jpeg,image/png,image/webp" class="block min-w-0 flex-1 text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-800 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-slate-200 hover:file:bg-slate-700">
                                <span data-patente-filename="Patenti A-B-C-D-E" class="hidden min-w-0 max-w-[10rem] truncate rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300"></span>
                                <button type="button" data-patente-delete="Patenti A-B-C-D-E" onclick="markVolontarioFileForDelete('patente', 'Patenti A-B-C-D-E')" class="hidden shrink-0 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-colors">Elimina</button>
                            </div>
                            <p data-patente-current="Patenti A-B-C-D-E" class="text-[10px] text-slate-500 mt-1 font-medium"></p>
                        </div>
                        <div data-patente-file="MMT" class="hidden">
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">File patente MMT</label>
                            <div class="flex items-center gap-2">
                                <input type="file" data-patente-file-input="MMT" onchange="clearVolontarioFileDelete('patente', 'MMT')" accept="application/pdf,image/jpeg,image/png,image/webp" class="block min-w-0 flex-1 text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-800 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-slate-200 hover:file:bg-slate-700">
                                <span data-patente-filename="MMT" class="hidden min-w-0 max-w-[10rem] truncate rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300"></span>
                                <button type="button" data-patente-delete="MMT" onclick="markVolontarioFileForDelete('patente', 'MMT')" class="hidden shrink-0 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-colors">Elimina</button>
                            </div>
                            <p data-patente-current="MMT" class="text-[10px] text-slate-500 mt-1 font-medium"></p>
                        </div>
                        <div data-patente-file="Patente Nautica" class="hidden">
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">File patente nautica</label>
                            <div class="flex items-center gap-2">
                                <input type="file" data-patente-file-input="Patente Nautica" onchange="clearVolontarioFileDelete('patente', 'Patente Nautica')" accept="application/pdf,image/jpeg,image/png,image/webp" class="block min-w-0 flex-1 text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-800 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-slate-200 hover:file:bg-slate-700">
                                <span data-patente-filename="Patente Nautica" class="hidden min-w-0 max-w-[10rem] truncate rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300"></span>
                                <button type="button" data-patente-delete="Patente Nautica" onclick="markVolontarioFileForDelete('patente', 'Patente Nautica')" class="hidden shrink-0 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-colors">Elimina</button>
                            </div>
                            <p data-patente-current="Patente Nautica" class="text-[10px] text-slate-500 mt-1 font-medium"></p>
                        </div>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Numero di Telefono <span class="text-amber-500">*</span></label>
                    <input type="tel" id="v-telefono" required placeholder="Es. 3331234567" class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Email</label>
                    <input type="email" id="v-email" placeholder="Es. mario.rossi@email.it" class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                </div>

                <div id="v-associazione-select-wrap">
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Associazione di appartenenza <span class="text-amber-500">*</span></label>
                    <select id="v-associazione" data-associazione-select required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                        <option value="G.C. Massa di Somma">G.C. Massa di Somma</option>
                        <option value="G.C. Cercola">G.C. Cercola</option>
                        <option value="Cobra 2">Cobra 2</option>
                        <option value="G.C. Sant'Anastasia">G.C. Sant'Anastasia</option>
                        <option value="Save Me">Save Me</option>
                        <option value="NVPC Pomigliano">NVPC Pomigliano</option>
                        <option value="COPCSV Pomigliano">COPCSV Pomigliano</option>
                    </select>
                </div>
                <div id="v-associazione-fissa-wrap" class="hidden">
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Associazione di appartenenza</label>
                    <input type="hidden" id="v-associazione-fissa" value="">
                    <p id="v-associazione-fissa-label" class="w-full bg-slate-950 border border-slate-800 text-amber-500 font-semibold rounded-xl px-4 py-2.5 text-sm"></p>
                    <p class="text-[10px] text-slate-500 mt-1 font-medium">Associazione fissa per il tuo account segreteria.</p>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Caricare se disponibile "ALLEGATO V" firmato</label>
                    <div class="flex items-center gap-2">
                        <input type="file" id="v-allegato-v" accept="application/pdf,image/jpeg,image/png,image/webp" onchange="clearVolontarioFileDelete('allegatoV')" class="min-w-0 flex-1 bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-amber-500 file:text-slate-950 file:font-bold file:text-xs hover:file:bg-amber-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                        <span id="v-allegato-v-filename" class="hidden min-w-0 max-w-[10rem] truncate rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300"></span>
                        <button type="button" id="v-allegato-v-delete" onclick="markVolontarioFileForDelete('allegatoV')" class="hidden shrink-0 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-colors">Elimina</button>
                    </div>
                    <p id="v-allegato-v-current" class="mt-1 text-[11px] text-slate-500"></p>
                </div>

                <div class="pt-4 border-t border-slate-800 flex justify-end gap-3">
                    <button type="button" onclick="toggleModal('modal-volontario', false)" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">Annulla</button>
                    <button type="submit" id="modal-volontario-submit" class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-amber-500/10">Registra</button>
                </div>
            </form>
        </div>
    </div>

    <!-- ================= MODAL: NUOVO MEZZO ================= -->
    <div id="modal-mezzo" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start sm:items-center justify-center overflow-y-auto p-4 hidden">
        <div class="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl slide-in">
            <!-- Modal Header -->
            <div class="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-amber-500">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span id="modal-mezzo-title">Aggiungi Nuovo Mezzo di Soccorso</span>
                </h3>
                <button onclick="toggleModal('modal-mezzo', false)" class="text-slate-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <!-- Modal Form -->
            <form id="form-mezzo" onsubmit="saveMezzo(event)" class="p-6 space-y-4">
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Marca e Modello <span class="text-amber-500">*</span></label>
                    <input type="text" id="m-modello" required placeholder="Es. Land Rover Defender" class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Targa <span class="text-amber-500">*</span></label>
                    <input type="text" id="m-targa" required placeholder="Es. PC 001 AA" class="w-full uppercase bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Tipologia Mezzo <span class="text-amber-500">*</span></label>
                        <select id="m-tipo" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                            <option value="Fuoristrada">Fuoristrada</option>
                            <option value="Mezzo A.I.B">Mezzo A.I.B.</option>
                            <option value="Pickup con gancio traino">Pickup con gancio traino</option>
                            <option value="Autovettura">Autovettura</option>
                            <option value="Motorino">Motorino</option>
                            <option value="Furgone">Furgone</option>
                            <option value="Camper UCM">Camper UCM</option>
                            <option value="Carrello appendice">Carrello appendice</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Stato Iniziale <span class="text-amber-500">*</span></label>
                        <select id="m-stato" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                            <option value="Disponibile">Disponibile (In Sede)</option>
                            <option value="In servizio">In servizio (Fuori Sede)</option>
                            <option value="In manutenzione">In manutenzione</option>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Scadenza RCA <span class="text-amber-500">*</span></label>
                        <input type="date" id="m-scadenza-rca" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Scadenza Revisione <span class="text-amber-500">*</span></label>
                        <input type="date" id="m-scadenza-revisione" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Dove ubicato?</label>
                    <input type="text" id="m-dove-ubicato" placeholder="Es. Sede operativa" class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                </div>

                <div id="m-associazione-select-wrap">
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Associazione di appartenenza <span class="text-amber-500">*</span></label>
                    <select id="m-associazione" data-associazione-select required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                        <option value="G.C. Massa di Somma">G.C. Massa di Somma</option>
                        <option value="G.C. Cercola">G.C. Cercola</option>
                        <option value="Cobra 2">Cobra 2</option>
                        <option value="G.C. Sant'Anastasia">G.C. Sant'Anastasia</option>
                        <option value="Save Me">Save Me</option>
                        <option value="NVPC Pomigliano">NVPC Pomigliano</option>
                        <option value="COPCSV Pomigliano">COPCSV Pomigliano</option>
                    </select>
                </div>
                <div id="m-associazione-fissa-wrap" class="hidden">
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Associazione di appartenenza</label>
                    <input type="hidden" id="m-associazione-fissa" value="">
                    <p id="m-associazione-fissa-label" class="w-full bg-slate-950 border border-slate-800 text-amber-500 font-semibold rounded-xl px-4 py-2.5 text-sm"></p>
                    <p class="text-[10px] text-slate-500 mt-1 font-medium">Associazione fissa per il tuo account segreteria.</p>
                </div>

                <div class="pt-4 border-t border-slate-800 flex justify-end gap-3">
                    <button type="button" onclick="toggleModal('modal-mezzo', false)" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">Annulla</button>
                    <button type="submit" id="modal-mezzo-submit" class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-amber-500/10">Registra</button>
                </div>
            </form>
        </div>
    </div>

    <!-- ================= MODAL: NUOVA MISSIONE / SERVIZIO ================= -->
    <div id="modal-servizio" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start sm:items-center justify-center overflow-y-auto p-4 hidden">
        <div class="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl slide-in">
            <!-- Modal Header -->
            <div class="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-amber-500">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span id="modal-servizio-title">Pianifica Servizio / Missione</span>
                </h3>
                <button onclick="toggleModal('modal-servizio', false)" class="text-slate-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <!-- Modal Form -->
            <form id="form-servizio" onsubmit="saveServizio(event)" class="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Richiedente <span class="text-amber-500">*</span></label>
                    <select id="s-richiedente" required onchange="toggleProtocolloRegionaleField()" class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                        <option value="SORU">SORU</option>
                        <option value="SOPI">SOPI</option>
                        <option value="COORDINAMENTO VESUVIUS">COORDINAMENTO VESUVIUS</option>
                        <option value="COMUNE">COMUNE</option>
                        <option value="ENTE ESTERNO">ENTE ESTERNO</option>
                        <option value="FF.OO.">FF.OO.</option>
                        <option value="V.V.F.">V.V.F.</option>
                        <option value="PRIVATO">PRIVATO</option> 
                        <option value="ALTRO COORDINAMENTO">ALTRO COORDINAMENTO</option>   
                    </select>
                </div>

                <div id="s-protocollo-regionale-block" class="hidden">
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Protocollo Regionale</label>
                    <input type="text" id="s-protocollo-regionale" class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors" placeholder="Inserisci il numero di protocollo regionale">
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Tipologia Servizio / Intervento <span class="text-amber-500">*</span></label>
                    <select id="s-tipo" required onchange="toggleServizioAibFields()" class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                        <option value="ASSISTENZA ALLA POPOLAZIONE">ASSISTENZA ALLA POPOLAZIONE</option>
                        <option value="ESERCITAZIONE">ESERCITAZIONE</option>
                        <option value="Antincendio Boschivo">ANTINCENDIO BOSCHIVO</option>
                        <option value="LOGISTICA">LOGISTICA</option>
                        <option value="Supporto Sanitario">SUPPORTO SANITARIO / SOCIALE</option>
                        <option value="FORMAZIONE">FORMAZIONE</option>
                        <option value="SEGRETERIA/SALA OPERATIVA">SEGRETERIA/SALA OPERATIVA</option>
                        <option value="EMERGENZA">EMERGENZA</option>   
                    </select>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Art.39 <span class="text-amber-500">*</span></label>
                    <select id="s-art39" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                        <option value="Si">Si</option>
                        <option value="No">No</option>
                    </select>
                </div>

                <div id="s-responsabile-servizio-block" class="hidden">
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Responsabile servizio</label>
                    <select id="s-responsabile-servizio" class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                        <option value="">Seleziona responsabile servizio</option>
                    </select>
                </div>

                <div id="s-aib-tipologia-servizio-block" class="hidden">
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Tipologia AIB <span class="text-amber-500">*</span></label>
                    <select id="s-aib-tipologia-servizio" class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                        <option value="L">Lotta attiva</option>
                        <option value="P">Pattugliamento</option>
                    </select>
                </div>

                <div id="s-aib-squadre-block" class="hidden">
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Squadre A.I.B. operative</label>
                    <div id="s-aib-squadre-list" class="bg-slate-950 border border-slate-800 rounded-xl p-4 max-h-44 overflow-y-auto space-y-2">
                        <!-- Popolato dinamicamente con le squadre operative -->
                    </div>
                    <p class="text-[10px] text-slate-500 mt-1 font-medium">Disponibile solo per interventi di antincendio boschivo.</p>
                </div>

                <section class="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 sm:p-5" aria-labelledby="s-orari-title">
                    <div class="mb-4">
                        <h4 id="s-orari-title" class="text-xs font-bold uppercase tracking-wider text-amber-500">Orari intervento</h4>
                        <p class="text-[11px] text-slate-500 mt-1">Inserisci gli orari manualmente oppure usa il pulsante Adesso.</p>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2" for="s-data">Inizio intervento <span class="text-amber-500">*</span></label>
                            <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-stretch">
                                <input type="datetime-local" id="s-data" required class="min-w-0 w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3 sm:px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                                <button type="button" onclick="setServizioCurrentTime('s-data')" class="min-h-11 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-amber-500 font-bold text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/70" aria-label="Imposta l'orario attuale come inizio intervento" title="Inserisci data e ora attuali">Adesso</button>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2" for="s-aib-ora-fine">Fine intervento</label>
                            <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-stretch">
                                <input type="time" id="s-aib-ora-fine" class="min-w-0 w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3 sm:px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                                <button type="button" onclick="setServizioCurrentTime('s-aib-ora-fine')" class="min-h-11 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-amber-500 font-bold text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/70" aria-label="Imposta l'orario attuale come fine intervento" title="Inserisci l'ora attuale">Adesso</button>
                            </div>
                        </div>

                        <div id="s-aib-ora-arrivo-block" class="hidden">
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2" for="s-aib-ora-arrivo">Arrivo sull'incendio</label>
                            <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-stretch">
                                <input type="time" id="s-aib-ora-arrivo" class="min-w-0 w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3 sm:px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                                <button type="button" onclick="setServizioCurrentTime('s-aib-ora-arrivo')" class="min-h-11 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-amber-500 font-bold text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/70" aria-label="Imposta l'orario attuale come arrivo sull'incendio" title="Inserisci l'ora attuale">Adesso</button>
                            </div>
                        </div>

                        <div id="s-aib-orari-fine" class="hidden">
                            <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2" for="s-aib-ora-rientro">Rientro in sede</label>
                            <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-stretch">
                                <input type="time" id="s-aib-ora-rientro" class="min-w-0 w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3 sm:px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                                <button type="button" onclick="setServizioCurrentTime('s-aib-ora-rientro')" class="min-h-11 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-amber-500 font-bold text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/70" aria-label="Imposta l'orario attuale come rientro in sede" title="Inserisci l'ora attuale">Adesso</button>
                            </div>
                        </div>
                    </div>
                </section>

                <div id="s-aib-section" class="hidden space-y-4">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Superficie percorsa dal fuoco (ha)</label>
                        <p class="text-[10px] text-slate-500 mb-3 font-medium">Compila i valori per tipologia (es. 0,45 ha, 1 ha).</p>

                        <div class="space-y-3">
                            <div class="bg-slate-950 border border-slate-800 rounded-xl p-4">
                                <p class="text-xs font-bold uppercase tracking-wider text-amber-500/90 mb-3">Ceduo</p>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Matricianato</label>
                                        <input type="text" id="s-aib-ceduo-matricianato" placeholder="es. 1 ha" class="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Compostato</label>
                                        <input type="text" id="s-aib-ceduo-compostato" placeholder="es. 0,45 ha" class="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Degradato</label>
                                        <input type="text" id="s-aib-ceduo-degradato" placeholder="es. 1 ha" class="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Macchia</label>
                                        <input type="text" id="s-aib-ceduo-macchia" placeholder="es. 0,45" ha class="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                                    </div>
                                </div>
                            </div>

                            <div class="bg-slate-950 border border-slate-800 rounded-xl p-4">
                                <p class="text-xs font-bold uppercase tracking-wider text-amber-500/90 mb-3">Alto fusto</p>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Resinoso</label>
                                        <input type="text" id="s-aib-alto-resinoso" placeholder="es. 0,45 ha" class="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Latifoglie</label>
                                        <input type="text" id="s-aib-alto-latifoglie" placeholder="es. 1 ha" class="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Misto</label>
                                        <input type="text" id="s-aib-alto-misto" placeholder="es. 0,45" ha class="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Rimboschimento</label>
                                        <input type="text" id="s-aib-alto-rimboschimento" placeholder="es. 0,45" ha class="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                                    </div>
                                </div>
                            </div>

                            <div class="bg-slate-950 border border-slate-800 rounded-xl p-4">
                                <p class="text-xs font-bold uppercase tracking-wider text-amber-500/90 mb-3">Non boscato</p>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Cespugliato</label>
                                        <input type="text" id="s-aib-non-cespugliato" placeholder="es. 0,45 ha" class="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Pascolo</label>
                                        <input type="text" id="s-aib-non-pascolo" placeholder="es. 0,45 ha" class="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Seminativo</label>
                                        <input type="text" id="s-aib-non-seminativo" placeholder="es. 0,45" ha class="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Incolto</label>
                                        <input type="text" id="s-aib-non-incolto" placeholder="es. 0,45 ha" class="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Coordinate Geografiche</label>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input type="number" id="s-lat" step="any" placeholder="Latitudine" class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                        <input type="number" id="s-lng" step="any" placeholder="Longitudine" class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                    </div>
                    <button type="button" onclick="fillCoordinateFromGps()" class="mt-2 w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                        Usa posizione GPS attuale
                    </button>
                    <p class="text-[10px] text-slate-500 mt-1 font-medium">In alternativa, compila l'indirizzo sotto.</p>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Indirizzo Intervento</label>
                    <input type="text" id="s-indirizzo" placeholder="Via e civico, comune..." class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                </div>

                <div data-servizio-mezzi-volontari-block>
                    <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0">Seleziona Mezzi di Soccorso <span class="text-amber-500 servizio-mezzi-required">*</span></label>
                        <div class="relative flex-1 min-w-0 sm:max-w-xs sm:ml-auto">
                            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </span>
                            <input type="text" id="s-mezzi-search" oninput="filterServizioMezziList()" placeholder="Cerca per nome o targa..." class="w-full bg-slate-950 border border-slate-800 text-slate-100 pl-9 pr-3 py-2 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                        </div>
                    </div>
                    <div id="s-mezzi-list" class="bg-slate-950 border border-slate-800 rounded-xl p-4 max-h-40 overflow-y-auto space-y-2">
                        <!-- Popolato dinamicamente con i mezzi registrati -->
                    </div>
                    <div id="s-carrelli-trainanti-list" class="hidden mt-3 bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"></div>
                    <p class="text-[10px] text-slate-500 mt-1 font-medium">Seleziona uno o più mezzi disponibili da assegnare al servizio.</p>
                </div>

                <!-- Lista Checkbox Volontari (Equipaggio) -->
                <div data-servizio-mezzi-volontari-block>
                    <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0">Seleziona Equipaggio Volontari <span class="text-amber-500 servizio-volontari-required">*</span></label>
                        <div class="relative flex-1 min-w-0 sm:max-w-xs sm:ml-auto">
                            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </span>
                            <input type="text" id="s-volontari-search" oninput="filterServizioVolontariList()" placeholder="Cerca volontario..." class="w-full bg-slate-950 border border-slate-800 text-slate-100 pl-9 pr-3 py-2 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                        </div>
                    </div>
                    <div id="s-volontari-list" class="bg-slate-950 border border-slate-800 rounded-xl p-4 max-h-40 overflow-y-auto space-y-2">
                        <!-- Popolato dinamicamente con i volontari registrati -->
                    </div>
                    <p class="text-[10px] text-slate-500 mt-1 font-medium">Seleziona uno o più volontari operativi da assegnare al servizio.</p>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Note / Dettagli Operativi</label>
                    <textarea id="s-note" rows="3" placeholder="Es. Controllo del livello dei fiumi o coordinamento con la sala radio..." class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"></textarea>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Altri Enti Coinvolti</label>
                    <input type="text" id="s-altri-enti" placeholder="Es. Vigili del Fuoco, 118, Polizia..." class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Stato Servizio <span class="text-amber-500">*</span></label>
                    <select id="s-stato" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                        <option value="Programmato">Programmato</option>
                        <option value="In corso">In corso</option>
                        <option value="Completato">Completato</option>
                    </select>
                </div>

                <div class="pt-4 border-t border-slate-800 flex justify-end gap-3">
                    <button type="button" onclick="toggleModal('modal-servizio', false)" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">Annulla</button>
                    <button type="submit" id="modal-servizio-submit" class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-amber-500/10">Pianifica</button>
                </div>
            </form>
        </div>
    </div>

    <!-- ================= MODAL: SQUADRA A.I.B. ================= -->
    <div id="modal-squadra-aib" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start sm:items-center justify-center overflow-y-auto p-4 hidden">
        <div class="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl slide-in">
            <div class="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                    <span id="modal-squadra-aib-title">Nuova Squadra A.I.B.</span>
                </h3>
                <button type="button" onclick="toggleModal('modal-squadra-aib', false)" class="text-slate-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <form id="form-squadra-aib" onsubmit="saveSquadraAib(event)" class="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Nome squadra <span class="text-amber-500">*</span></label>
                    <input type="text" id="aib-squadra-nome" required placeholder="Es. Squadra AIB 1" class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                </div>

                <div id="aib-squadra-associazione-select-wrap">
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Associazione <span class="text-amber-500">*</span></label>
                    <select id="aib-squadra-associazione" data-associazione-select required onchange="populateSquadraAibModalOptions()" class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                        <option value="G.C. Massa di Somma">G.C. Massa di Somma</option>
                        <option value="G.C. Cercola">G.C. Cercola</option>
                        <option value="Cobra 2">Cobra 2</option>
                        <option value="G.C. Sant'Anastasia">G.C. Sant'Anastasia</option>
                        <option value="Save Me">Save Me</option>
                        <option value="NVPC Pomigliano">NVPC Pomigliano</option>
                        <option value="COPCSV Pomigliano">COPCSV Pomigliano</option>
                    </select>
                </div>

                <div id="aib-squadra-associazione-fissa-wrap" class="hidden">
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Associazione</label>
                    <input type="hidden" id="aib-squadra-associazione-fissa" value="">
                    <p id="aib-squadra-associazione-fissa-label" class="w-full bg-slate-950 border border-slate-800 text-amber-500 font-semibold rounded-xl px-4 py-2.5 text-sm"></p>
                </div>

                <div>
                    <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0">Mezzi disponibili <span class="text-amber-500">*</span></label>
                        <div class="relative flex-1 min-w-0 sm:max-w-xs sm:ml-auto">
                            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </span>
                            <input type="text" id="aib-squadra-mezzi-search" oninput="filterSquadraAibMezziList()" placeholder="Cerca per nome o targa..." class="w-full bg-slate-950 border border-slate-800 text-slate-100 pl-9 pr-3 py-2 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                        </div>
                    </div>
                    <div id="aib-squadra-mezzi-list" class="bg-slate-950 border border-slate-800 rounded-xl p-4 max-h-44 overflow-y-auto space-y-2"></div>
                </div>

                <div>
                    <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0">Volontari operativi <span class="text-amber-500">*</span></label>
                        <div class="relative flex-1 min-w-0 sm:max-w-xs sm:ml-auto">
                            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </span>
                            <input type="text" id="aib-squadra-volontari-search" oninput="filterSquadraAibVolontariList()" placeholder="Cerca volontario..." class="w-full bg-slate-950 border border-slate-800 text-slate-100 pl-9 pr-3 py-2 rounded-xl text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors">
                        </div>
                    </div>
                    <div id="aib-squadra-volontari-list" class="bg-slate-950 border border-slate-800 rounded-xl p-4 max-h-44 overflow-y-auto space-y-2"></div>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Stato <span class="text-amber-500">*</span></label>
                    <select id="aib-squadra-stato" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                        <option value="Operativa">Operativa</option>
                        <option value="Non operativa">Non operativa</option>
                        <option value="Turno Terminato">Turno Terminato</option>
                    </select>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Giorno inizio disponibilità <span class="text-amber-500">*</span></label>
                        <input type="date" id="aib-squadra-disponibile-dal-data" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Ora inizio disponibilità <span class="text-amber-500">*</span></label>
                        <input type="time" id="aib-squadra-disponibile-dal-ora" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Ora fine disponibilità <span class="text-amber-500">*</span></label>
                    <input type="time" id="aib-squadra-disponibile-fino" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                </div>

                <div class="pt-4 border-t border-slate-800 flex justify-end gap-3">
                    <button type="button" onclick="toggleModal('modal-squadra-aib', false)" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">Annulla</button>
                    <button type="submit" id="modal-squadra-aib-submit" class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-amber-500/10">Salva</button>
                </div>
            </form>
        </div>
    </div>

    <!-- ================= MODAL: VISUALIZZA SERVIZIO (SOLA LETTURA) ================= -->
    <div id="modal-servizio-view" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 hidden">
        <div class="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl slide-in">
            <div class="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-cyan-500">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Dettagli Intervento</span>
                </h3>
                <button type="button" onclick="toggleModal('modal-servizio-view', false)" class="text-slate-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div id="modal-servizio-view-body" class="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <!-- Popolato dinamicamente via JS -->
            </div>
            <div class="p-6 border-t border-slate-800 flex justify-end">
                <button type="button" onclick="toggleModal('modal-servizio-view', false)" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">Chiudi</button>
            </div>
        </div>
    </div>

    <!-- ================= MODAL: CAMBIO PASSWORD ================= -->
    <div id="modal-change-password" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 hidden">
        <div class="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl slide-in">
            <div class="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-amber-500">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25V19.5H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                    </svg>
                    <span>Cambia password</span>
                </h3>
                <button type="button" onclick="toggleModal('modal-change-password', false)" class="text-slate-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <form id="form-change-password" onsubmit="saveCurrentUserPassword(event)" class="p-6 space-y-4">
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Nuova password <span class="text-amber-500">*</span></label>
                    <input type="password" id="current-user-password" minlength="6" autocomplete="new-password" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors" placeholder="Minimo 6 caratteri">
                </div>
                <div class="pt-4 border-t border-slate-800 flex justify-end gap-3">
                    <button type="button" onclick="toggleModal('modal-change-password', false)" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">Annulla</button>
                    <button type="submit" class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-amber-500/10">Salva</button>
                </div>
            </form>
        </div>
    </div>

    <!-- ================= MODAL: ASSOCIAZIONE (ADMIN) ================= -->
    <div id="modal-associazione" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start sm:items-center justify-center overflow-y-auto p-4 hidden">
        <div class="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl slide-in">
            <div class="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-amber-500">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                    <span id="modal-associazione-title">Nuova associazione</span>
                </h3>
                <button type="button" onclick="toggleModal('modal-associazione', false)" class="text-slate-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <form id="form-associazione" onsubmit="saveAssociazione(event)" class="p-6 space-y-4">
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Denominazione associazione o gruppo comunale <span class="text-amber-500">*</span></label>
                    <input type="text" id="associazione-nome" maxlength="255" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Legale Rappresentante <span class="text-amber-500">*</span></label>
                    <input type="text" id="associazione-legale-rappresentante" maxlength="255" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Recapito Telefonico</label>
                    <input type="tel" id="associazione-recapito-telefonico" maxlength="50" class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Mail PEC</label>
                    <input type="email" id="associazione-mail-pec" maxlength="255" class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                </div>
                <div class="pt-4 border-t border-slate-800 flex justify-end gap-3">
                    <button type="button" onclick="toggleModal('modal-associazione', false)" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">Annulla</button>
                    <button type="submit" id="modal-associazione-submit" class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-amber-500/10">Salva</button>
                </div>
            </form>
        </div>
    </div>

    <!-- ================= MODAL: UTENTE / PROFILO (ADMIN) ================= -->
    <div id="modal-profilo" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start sm:items-center justify-center overflow-y-auto p-4 hidden">
        <div class="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl slide-in">
            <div class="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-amber-500">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    <span id="modal-profilo-title">Nuovo utente</span>
                </h3>
                <button type="button" onclick="toggleModal('modal-profilo', false)" class="text-slate-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <form id="form-profilo" onsubmit="saveProfilo(event)" class="p-6 space-y-4">
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Email <span class="text-amber-500">*</span></label>
                    <input type="email" id="p-email" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                </div>
                <div id="p-identita-wrap" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Nome <span class="text-amber-500">*</span></label>
                        <input type="text" id="p-nome" maxlength="255" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Cognome <span class="text-amber-500">*</span></label>
                        <input type="text" id="p-cognome" maxlength="255" required class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Password <span id="p-password-required" class="text-amber-500">*</span></label>
                    <input type="password" id="p-password" minlength="6" autocomplete="new-password" class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors" placeholder="Minimo 6 caratteri">
                    <p id="p-password-hint" class="text-[10px] text-slate-500 mt-1 font-medium hidden">Lascia vuoto per non modificare la password.</p>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Ruolo <span class="text-amber-500">*</span></label>
                    <select id="p-ruolo" required onchange="toggleProfiloAssociazioneField()" class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                        <option value="segreteria">Segreteria</option>
                        <option value="capo_squadra">Capo Squadra</option>
                        <option value="sala_operativa">Sala Operativa</option>
                        <option value="master">Master</option>
                        <option value="super_user">SuperUser</option>
                    </select>
                </div>
                <div id="p-associazione-wrap">
                    <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Associazione <span class="text-amber-500">*</span></label>
                    <select id="p-associazione" data-associazione-select class="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 transition-colors">
                        <option value="G.C. Massa di Somma">G.C. Massa di Somma</option>
                        <option value="G.C. Cercola">G.C. Cercola</option>
                        <option value="Cobra 2">Cobra 2</option>
                        <option value="G.C. Sant'Anastasia">G.C. Sant'Anastasia</option>
                        <option value="Save Me">Save Me</option>
                        <option value="NVPC Pomigliano">NVPC Pomigliano</option>
                        <option value="COPCSV Pomigliano">COPCSV Pomigliano</option>
                    </select>
                </div>
                <div class="pt-4 border-t border-slate-800 flex justify-end gap-3">
                    <button type="button" onclick="toggleModal('modal-profilo', false)" class="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">Annulla</button>
                    <button type="submit" id="modal-profilo-submit" class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-amber-500/10">Salva</button>
                </div>
            </form>
        </div>
    </div>

</body>
</html>
