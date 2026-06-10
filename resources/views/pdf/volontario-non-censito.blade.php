<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="utf-8">
    <style>
        @page {
            margin: 14mm 20mm 16mm;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: DejaVu Sans, Arial, sans-serif;
            color: #000;
            font-size: 11.5px;
            line-height: 1.15;
        }

        .page {
            position: relative;
            height: 267mm;
            page-break-after: always;
            overflow: hidden;
        }

        .page:last-child {
            page-break-after: auto;
        }

        .header {
            position: relative;
            height: 34mm;
            margin-bottom: 5mm;
            text-align: center;
        }

        .logo-left,
        .logo-right {
            position: absolute;
            top: 0;
            width: 28mm;
            height: 28mm;
            object-fit: contain;
        }

        .logo-left {
            
            width: 38mm;;
        }

        .logo-right {
            right: 4mm;
        }

        .header-small {
            padding-top: 1mm;
            font-size: 8px;
            color: #333;
            text-transform: uppercase;
        }

        .header-title {
            width: 104mm;
            margin-left: auto;
            margin-right: auto;
            margin-top: 5mm;
            font-size: 18px;
            line-height: .95;
            letter-spacing: .2px;
            text-transform: uppercase;
        }

        .header-law {
            margin-top: 6mm;
            font-size: 8.5px;
            font-style: italic;
            font-weight: bold;
            line-height: .9;
            color: #333;
        }

        .main-title {
            margin: 11mm 0 4mm;
            text-align: center;
            font-size: 16px;
            font-weight: bold;
            text-transform: uppercase;
        }

        .intro {
            margin: 0 0 3mm;
            font-size: 11.5px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 6mm;
            table-layout: fixed;
        }

        td {
            border: .8px solid #444;
            height: 5.6mm;
            padding: .7mm 2mm;
            vertical-align: middle;
            font-size: 11.5px;
        }

        td.label {
            width: 32%;
            background: #d9e2f3;
            font-weight: bold;
            text-transform: uppercase;
        }

        .section-title {
            margin: 4mm 0;
            text-align: center;
            font-weight: bold;
        }

        p {
            margin: 0 0 1.6mm;
            text-align: justify;
        }

        .dash {
            position: relative;
            padding-left: 8mm;
        }

        .dash:before {
            content: "–";
            position: absolute;
            left: 0;
        }

        .dot {
            position: relative;
            padding-left: 10mm;
        }

        .dot:before {
            content: "•";
            position: absolute;
            left: 2.5mm;
        }

        .subdash {
            position: relative;
            padding-left: 11mm;
        }

        .subdash:before {
            content: "-";
            position: absolute;
            left: 5mm;
        }

        .footnote {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            padding-top: 2mm;
            border-top: .8px solid #000;
            font-size: 7.8px;
            line-height: 1.12;
        }

        .footnote p {
            margin: 0 0 1mm;
            text-align: left;
        }

        .page-number {
            position: absolute;
            right: 0;
            bottom: 0;
            font-size: 11px;
        }

        .page-2 .content,
        .page-3 .content,
        .page-4 .content {
            font-size: 11.5px;
            line-height: 1.15;
        }

        .page-2 .content {
            padding-top: 3mm;
        }

        .page-3 .content {
            padding-top: 3mm;
            font-size: 11px;
            line-height: 1.12;
        }

        .page-4 .content {
            padding-top: 3mm;
        }

        .page-2 p,
        .page-3 p,
        .page-4 p {
            margin-bottom: 1.7mm;
        }

        .page-3 p {
            margin-bottom: 1.25mm;
        }

        .date-signature {
            margin-top: 10mm;
            font-size: 11.5px;
        }

        .signature {
            width: 82mm;
            margin: 6mm 0 0 auto;
            text-align: center;
            font-size: 11.5px;
        }

        .signature-line {
            margin-top: 8mm;
            border-top: .8px solid #000;
            height: 6mm;
        }

        .attachment {
            margin-top: 2mm;
            text-align: center;
            font-size: 11.5px;
        }

        a {
            color: #0563c1;
            text-decoration: underline;
        }
    </style>
</head>
<body>
    @php
        $field = static fn (string $key): string => trim((string) ($volontario[$key] ?? ''));
    @endphp

    <div class="page page-1">
        <div class="header">
            <img class="logo-left" src="{{ public_path('img/modello-logo-1.png') }}" alt="">
            <div class="header-small">Scheda iscrizione sezione squadre volontari AIB della Regione Campania</div>
            <div class="header-title">ALLEGATO V<br>SCHEDA ANAGRAFICA VOLONTARIO</div>
            <div class="header-law">DGR N. 75 DEL 09/03/2015<br>DGRC N.464 DEL 27/10/2021</div>
            <img class="logo-right" src="{{ public_path('img/logo-regione.png') }}" alt="">
        </div>

        <div class="main-title">ALLEGATO V - SCHEDA ANAGRAFICA VOLONTARIO</div>
        <div class="intro">Il/La sottoscritto/a:</div>

        <table>
            <tr>
                <td class="label">ODV DI APPARTENENZA</td>
                <td>{{ $field('associazione_appartenenza') }}</td>
            </tr>
            <tr>
                <td class="label">NOME</td>
                <td>{{ $field('nome') }}</td>
            </tr>
            <tr>
                <td class="label">COGNOME</td>
                <td>{{ $field('cognome') }}</td>
            </tr>
            <tr>
                <td class="label">DATA DI NASCITA</td>
                <td>{{ $field('data_nascita') }}</td>
            </tr>
            <tr>
                <td class="label">LUOGO DI NASCITA</td>
                <td>{{ $field('luogo_nascita') }}</td>
            </tr>
            <tr>
                <td class="label">CODICE FISCALE</td>
                <td>{{ $field('cf') }}</td>
            </tr>
            <tr>
                <td class="label">INDIRIZZO</td>
                <td>{{ $field('via_residenza') }}</td>
            </tr>
            <tr>
                <td class="label">COMUNE DI RESIDENZA</td>
                <td>{{ $field('comune_residenza') }}</td>
            </tr>
            <tr>
                <td class="label">TEL.</td>
                <td>{{ $field('telefono') }}</td>
            </tr>
            <tr>
                <td class="label">E-MAIL</td>
                <td></td>
            </tr>
        </table>

        <p>sotto la propria responsabilità, ai sensi degli artt. 46 e 47 del DPR 28 dicembre 2000 n. 445 e ss.mm.ii., consapevole delle conseguenze derivanti da dichiarazioni mendaci, ai sensi dell’art. 76<sup>1</sup> del predetto D.P.R. 445/2000 e ss.mm.ii. che testualmente recita:</p>

        <div class="section-title">DICHIARA:</div>

        <p class="dash">di essere iscritto all’OdV/Gruppo Comunale________________________________________________ __________________________________________________________________________________;</p>

        <p class="dash">che, per libera scelta, svolge l'attività di volontariato in favore della comunità e del bene comune, nell'ambito delle attività di protezione civile di cui all'articolo 2 del D.Lgs. n. 1/2018, mettendo a disposizione il proprio tempo e le proprie capacità per acquisire, all'interno della organizzazione di protezione civile cui aderisce, la formazione e la preparazione necessaria per concorrere alla promozione di efficaci risposte ai bisogni delle persone e delle comunità beneficiarie della propria azione in modo personale, spontaneo e gratuito, senza fini di lucro, neanche indiretti, ed esclusivamente per fini di solidarietà, partecipando, con passione e impegno ad una forza libera e organizzata che contribuisce a migliorare la vita di tutti;</p>

        <div class="footnote">
            <p>1. <sup>1</sup> Chiunque rilascia dichiarazioni mendaci, forma atti falsi o ne fa usa nei casi previsti dal presente T.U., è punito ai sensi del Codice penale e delle leggi speciali in materia.</p>
            <p>2. L'esibizione di un atto contenente dati non più rispondenti a verità equivale ad uso di atto falso.</p>
            <p>3. Le dichiarazioni sostitutive rese ai sensi degli art. 46 e 47 e le dichiarazioni rese per conto delle persone indicate nell'art. 4 comma 2 sono considerate come fatte a pubblico ufficiale.</p>
            <p>4. Se i reati indicati nei commi 1, 2 e 3 sono commessi per ottenere la nomina ad un pubblico ufficio o l'autorizzazione all'esercizio di una professione o arte, il giudice, nei casi più gravi, può applicare l'interdizione temporanea dai pubblici uffici o dalla professione e arte.</p>
            <p>5. Ferma restando, a norma del disposto dell'art. 75 dello stesso DPR n. 445/2000, la decadenza dai benefici eventualmente conseguiti a seguito del provvedimento emanato sulla base della dichiarazione non veritiera</p>
        </div>
        <div class="page-number">1</div>
    </div>

    <div class="page page-2">
        <div class="header">
            <img class="logo-left" src="{{ public_path('img/modello-logo-1.png') }}" alt="">
            <div class="header-small">Scheda iscrizione sezione squadre volontari AIB della Regione Campania</div>
            <div class="header-title">ALLEGATO V<br>SCHEDA ANAGRAFICA VOLONTARIO</div>
            <div class="header-law">DGR N. 75 DEL 09/03/2015<br>DGRC N.464 DEL 27/10/2021</div>
            <img class="logo-right" src="{{ public_path('img/logo-regione.png') }}" alt="">
        </div>

        <div class="content">
            <p class="dash">di non aver subito condanne penali, passate in giudicato, per reati che comportano l'interdizione dai pubblici uffici<sup>2</sup>;</p>
            <p class="dash">di non essere a conoscenza di essere sottoposto a procedimenti penali;</p>
            <p class="dash">di essere a conoscenza e di accettare la disciplina inerente alle attività del volontariato organizzato di protezione civile in particolare:</p>
            <p class="dot">D.Lgs. 2 gennaio 2018 n. 1 Codice della protezione civile;</p>
            <p class="dot">D.Lgs. 3 luglio 2017 n. 117 Codice del terzo settore;</p>
            <p class="dot">D.Lgs. 9 aprile 2008 n. 81 Testo unico sulla sicurezza sul lavoro;</p>
            <p class="dot">Legge 21 novembre 2000 n. 353 Legge quadro sugli incendi boschivi;</p>
            <p class="dot">Legge regionale 22 maggio 2017 n. 12 Sistema di protezione civile in Campania;</p>
            <p class="dot">D.G.R. n. 75 del 9 marzo 2015</p>
            <p class="dot">DGR n. 464 del 21 ottobre 2021</p>
            <p class="dot">tutte le altre norme, delibere, circolari e direttive in materia.</p>
            <p class="dash">di impegnarsi a non assumere comportamenti lesivi all’immagine del Dipartimento della Protezione Civile, della Regione Campania e del volontariato in generale, o comportamenti delittuosi o attribuzioni improprie di poteri e abuso degli stessi, per la diffusione, attraverso stampa, web e social network, di notizie di falsi allarmi atti a turbare l’ordine pubblico e la sicurezza, ostentazione di effigi e logotipi non autorizzati e l’uso improprio dei dispositivi di segnalazione acustica e luminosa e di palette stradali;</p>
            <p class="dash">di volere effettuare l’iscrizione, ai sensi delle DGR n. 75 del 09/03/2015 e n. 464 del 27/10/2021, all’Elenco territoriale del volontariato di P.C.– SEZIONE SQUADRE VOLONTARI AIB DELLA REGIONE CAMPANIA, così come disciplinate con D.G.R. 464 DEL 27/10/2021;</p>
            <p class="dash">di essere a conoscenza e di accettare le “PROCEDURE OPERATIVE PER LA COSTITUZIONE E GESTIONE DELLE SQUADRE VOLONTARI A.I.B. DELLA REGIONE CAMPANIA”, così come approvate con DGR n. 464/2021;</p>
            <p class="dash">di essere qualificato e formato per la specifica attività AIB, ove per formazione si intende anche la formazione e l’informazione sui rischi derivanti dalla specifica attività svolta ai sensi del D.lgs. n. 81/2008, così come ricevute dalla propria Organizzazione di appartenenza;</p>
            <p class="dash">di essere assicurato contro gli infortuni e le malattie connessi allo svolgimento dell’attività di volontariato con specifico riferimento all’attività AIB, nonché per la responsabilità civile verso i terzi, in corso di validità per la specifica attività svolta;</p>
            <p class="dash">di essere consapevole che, in caso di attivazione o intervento, occorre indossare D.P.I., così come definiti dal D. Lgs 81/08 e ss. mm. ii. per l’attività specifica AIB, idonei ai rischi connessi al tipo di attività, omologati e rispondenti alle norme vigenti, con equipaggiamenti e attrezzature conformi alle norme CE previste per il tipo di impiego;</p>
            <p class="dash">di essere consapevole che, ai sensi delle D.G.R. n. 75/2015 e n. 464 del 27/10/2021, per gli interventi di protezione civile, in particolare per gli interventi AIB è possibile:</p>
        </div>

        <div class="footnote">
            <p><sup>2</sup> I reati che possono comportare l'interdizione dai pubblici uffici sono: gli illeciti di cui al decreto legislativo 3 aprile 2006, n.152 (norme in materia ambientale); i reati connessi alla criminalità organizzata; i reati contro il patrimonio dello stato; i reati contro la personalità dello stato o contro l'ordine pubblico; i delitti contro la pubblica amministrazione; i delitti non colposi contro le persone.</p>
        </div>
        <div class="page-number">2</div>
    </div>

    <div class="page page-3">
        <div class="header">
            <img class="logo-left" src="{{ public_path('img/modello-logo-1.png') }}" alt="">
            <div class="header-small">Scheda iscrizione sezione squadre volontari AIB della Regione Campania</div>
            <div class="header-title">ALLEGATO V<br>SCHEDA ANAGRAFICA VOLONTARIO</div>
            <div class="header-law">DGR N. 75 DEL 09/03/2015<br>DGRC N.464 DEL 27/10/2021</div>
            <img class="logo-right" src="{{ public_path('img/logo-regione.png') }}" alt="">
        </div>

        <div class="content">
            <p class="dot">impiegare solo ed esclusivamente volontari iscritti all’elenco territoriale del volontariato regionale, maggiorenni, con idoneità psico-fisica certificata per la specifica attività, qualificati e formati per la specifica attività AIB, ove per formazione si intende anche la formazione e l’informazione sui rischi derivanti dalla specifica attività svolta ai sensi del D.lgs. n. 81/2008;</p>
            <p class="dot">impiegare per la specifica attività (pattugliamento, lotta attiva, DOS, sala operativa) solo ed esclusivamente i volontari che hanno conseguito idoneità all’attività mediante frequenza e superamento dell’apposito corso di formazione organizzato dalla Scuola Regionale di Protezione civile “E. Calcara”;</p>
            <p class="dot">impiegare operatori, anche in qualità di autisti o accompagnatori, che siano stati sottoposti a sorveglianza sanitaria specifica per le attività AIB;</p>
            <p class="dot">impiegare solo volontari assicurati contro gli infortuni e le malattie connessi allo svolgimento dell’attività di volontariato con specifico riferimento all’attività ANTINCENDIO BOSCHIVO, nonché per la responsabilità civile verso i terzi, in corso di validità per la specifica attività svolta;</p>

            <div class="section-title">DICHIARA, altresì:</div>

            <p class="dash">ai sensi dell’art. 3 bis del D.Lgs. n. 81/2008 smi:</p>
            <p class="subdash">che in qualità di volontario della protezione civile aderente ad una organizzazione di protezione civile, è equiparato al lavoratore esclusivamente per le attività di cui ai commi 3 e 4 dell’art. 3-bis del D.Lgs. n. 81/2008 smi, fermo restando il dovere di prendersi cura della propria salute e sicurezza e di quella delle altre persone, presenti nelle sedi delle organizzazioni nonché sui luoghi di intervento, di formazione e di esercitazione, su cui ricadono gli effetti delle sue azioni o omissioni, conformemente alla sua formazione e informazione, alle istruzioni operative, alle procedure, alle attrezzature e ai dispositivi di protezione individuale in dotazione;</p>
            <p class="subdash">di aver ricevuto dalla propria organizzazione di protezione civile, nell'ambito dello scenario di rischio di protezione civile ANTINCENDIO BOSCHIVO individuato dalle autorità competenti e sulla base dei compiti svolti, formazione, informazione e addestramento, nel rispetto di standard minimi di sicurezza definiti a livello nazionale con direttiva ai sensi dell'articolo 15 del codice della protezione civile, di cui al decreto legislativo 2 gennaio 2018, n. 1, e di essere sottoposto a controllo sanitario, anche in collaborazione con i competenti servizi regionali, nel rispetto dei principi previsti dal codice in materia di protezione dei dati personali, di cui al decreto legislativo 30 giugno 2003, n. 196, fatto salvo quanto previsto ai commi 6, 7 e 8 in materia di sorveglianza sanitaria;</p>
            <p class="subdash">di essere stato dotato dall’organizzazione di protezione civile cui aderisce, nell'ambito dello scenario di rischio di protezione civile ANTINCENDIO BOSCHIVO individuato dalle autorità competenti e sulla base dei compiti svolti, di attrezzature e dispositivi di protezione individuale idonei per lo specifico impiego e di essere stato adeguatamente formato e addestrato al loro uso conformemente alle indicazioni specificate dal fabbricante;</p>
            <p class="subdash">di essere assicurato contro gli infortuni e le malattie connessi allo svolgimento dell’attività di volontariato con specifico riferimento allo scenario di rischio di protezione civile ANTINCENDIO BOSCHIVO individuato dalle autorità competenti, nonché per la responsabilità civile verso i terzi, in corso di validità per la specifica attività svolta;</p>
            <p class="subdash">di essere consapevole che le sedi dell’organizzazione di protezione civile cui aderisce, salvi i casi in cui nelle medesime si svolga un'attività lavorativa, nonché i luoghi di esercitazione, di formazione e di intervento dei volontari di protezione civile non sono considerati luoghi di lavoro;</p>
            <p class="subdash">di essere consapevole che, in caso di attivazione o intervento, occorre indossare D.P.I., così come definiti dal D. Lgs 81/08 e ss. mm. ii. per l’attività specifica connessa allo scenario di rischio di protezione civile ANTINCENDIO BOSCHIVO individuato, omologati e rispondenti alle</p>
        </div>
        <div class="page-number">3</div>
    </div>

    <div class="page page-4">
        <div class="header">
            <img class="logo-left" src="{{ public_path('img/modello-logo-1.png') }}" alt="">
            <div class="header-small">Scheda iscrizione sezione squadre volontari AIB della Regione Campania</div>
            <div class="header-title">ALLEGATO V<br>SCHEDA ANAGRAFICA VOLONTARIO</div>
            <div class="header-law">DGR N. 75 DEL 09/03/2015<br>DGRC N.464 DEL 27/10/2021</div>
            <img class="logo-right" src="{{ public_path('img/logo-regione.png') }}" alt="">
        </div>

        <div class="content">
            <p>norme vigenti, con equipaggiamenti e attrezzature conformi alle norme CE previste per il tipo di impiego;</p>
            <p class="subdash">di essere consapevole che per gli interventi operativi di protezione civile, in particolare si possono impiegare solo ed esclusivamente volontari iscritti all’elenco territoriale del volontariato regionale, maggiorenni, con idoneità psico-fisica certificata per la specifica attività, qualificati e formati per la specifica attività, ove per formazione si intende anche la formazione e l’informazione sui rischi derivanti dalla specifica attività svolta ANTINCENDIO BOSCHIVO individuato ai sensi del D.lgs. n. 81/2008;</p>
            <p class="subdash">di essere consapevole che l’impiego per la specifica attività antincendio boschivo (pattugliamento, lotta attiva, DOS, sala operativa) è subordinato al conseguimento della relativa idoneità all’attività mediante frequenza e superamento degli appositi corsi di formazione organizzato dalla Scuola Regionale di Protezione civile “E. Calcara”;</p>
            <p class="subdash">di essere consapevole di poter impiegare solo automezzi, attrezzature e ogni altra risorsa rispondente a tutte le normative vigenti ed in regola con gli obblighi assicurativi, permessi, collaudi e certificazioni previste.</p>

            <div class="section-title">DICHIARA infine</div>

            <p class="dash">di aver preso visione dell’Informativa privacy disponibile sul sito <a href="https://portaleprotezionecivile.regione.campania.it/">https://portaleprotezionecivile.regione.campania.it/</a> - sezione Modulistica;</p>
            <p class="dash">di essere informato che i dati personali raccolti saranno trattati, anche con mezzi informatici, esclusivamente per il procedimento per il quale la dichiarazione è stata resa (art. 13 D.Lgs.196/2003) e che i propri dati, in formato digitale, verranno inseriti nel sito web della Regione Campania e di autorizzarne il trattamento.</p>

            <div class="date-signature">Li, ____________________</div>

            <div class="signature">
                <div>Firma</div>
                <div class="signature-line"></div>
                <div class="attachment">Si allega documento di identità in corso di validità</div>
            </div>
        </div>
        <div class="page-number">4</div>
    </div>
</body>
</html>
