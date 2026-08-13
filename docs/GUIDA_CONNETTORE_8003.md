# Il connettore per altri programmi (porta 8003)

La console può inoltrare tutto quello che accade sulla rete radio a un altro
programma: una mappa esterna, un archivio storico, un software di sala
operativa, un foglio che raccoglie i dati.

Il collegamento è semplice: una connessione TCP e **un oggetto JSON per
riga**, ogni riga chiusa da `\n`. Non serve nessuna libreria particolare:
basta aprire una connessione e leggere righe di testo.

---

## 1. Configurazione

Dalla console, in **Impostazioni → Connettore per applicazioni esterne**:

1. Attiva il connettore e conferma la porta (di norma **8003**).
2. Imposta una **parola d'ordine di lettura**, di almeno 16 caratteri.
3. Se il programma esterno deve anche *mandare* messaggi, attiva
   **Consenti l'invio di messaggi** e imposta una **seconda parola d'ordine**,
   diversa dalla prima.
4. Premi **Applica**.

> Tenere distinte le due parole d'ordine permette di dare a un programma il
> solo ascolto, senza rischiare che possa trasmettere sulla rete radio.

---

## 2. Apertura del collegamento

Il programma esterno apre una connessione TCP verso l'indirizzo del server,
porta 8003. Il server risponde subito con una riga di benvenuto:

```json
{"tipo":"benvenuto","ts":1786577297.7,"dati":{"servizio":"ARGO-X","protocollo":2,"solo_lettura":true,"comandi":false}}
```

Il client manda allora la parola d'ordine, che deve essere **la prima cosa
che invia**, da sola su una riga:

```
parolachiavelunga123\n
```

Se è sbagliata il server risponde con un errore e **chiude il collegamento**:
nessun evento viene inoltrato.

```json
{"tipo":"errore","dati":{"detail":"token non valido"}}
```

Finché la parola d'ordine non è stata accettata, il connettore **non accetta
nient'altro**: nessun comando viene eseguito e nessun evento viene inoltrato.

Il collegamento va **tenuto aperto**: non serve riconnettersi a ogni evento.

### Protezione contro i tentativi a raffica

Chi sbaglia la parola d'ordine viene contato. Il conteggio è **per indirizzo**
e si azzera ogni giorno:

- dopo i primi errori la risposta arriva con un **ritardo crescente**, fino a
  cinque secondi: rallenta i tentativi automatici senza dare fastidio a chi
  sbaglia una volta;
- superati **100 tentativi falliti in un giorno**, l'indirizzo viene
  **bloccato**: le sue connessioni vengono chiuse subito, senza nemmeno il
  messaggio di benvenuto;
- un accesso riuscito **azzera il conto**, così un errore di configurazione
  risolto non lascia strascichi.

Nel registro della console ogni tentativo fallito compare con l'indirizzo e il
numero di tentativi del giorno.

---

## 3. Gli eventi che arrivano

Ogni evento ha sempre la stessa forma:

```json
{"tipo": "<nome>", "ts": <quando è stato pubblicato>, "dati": { ... }}
```

### Posizione ricevuta — `posizione`

L'evento più usato. Porta **due orari distinti**, e la differenza conta:

```json
{"tipo":"posizione","ts":1786577240.5,
 "dati":{"radio_id":1000023,
         "lat":40.90420,"lon":14.40596,
         "rilevata_il":1786576940.5,
         "ricevuta_il":1786577240.5,
         "nome":"MTR 13 (TLC)",
         "talkgroup":1000150}}
```

| Campo | Significato |
|---|---|
| `radio_id` | Identificativo DMR della radio |
| `lat`, `lon` | Coordinate in gradi decimali |
| `rilevata_il` | **Quando il GPS ha rilevato la posizione** |
| `ricevuta_il` | Quando la posizione è arrivata alla console |
| `nome` | Nome dato alla radio, se assegnato |
| `talkgroup` | Gruppo della radio, se impostato |

> **Perché due orari.** Se una radio resta fuori copertura e poi rientra, può
> consegnare una posizione rilevata parecchi minuti prima. Chi archivia i dati
> deve usare `rilevata_il`, non l'orario di arrivo: altrimenti il percorso
> ricostruito risulta sbagliato.
>
> `rilevata_il` compare **solo quando la radio lo comunica**. Se manca, il
> campo non c'è: non viene inventato.

### Chiamata vocale — `chiamata`

Arriva sia all'inizio sia alla fine di ogni trasmissione.

```json
{"tipo":"chiamata","ts":1786577301.2,
 "dati":{"busy":true,"radio_id":1000023,"group_id":1000150,
         "since":1786577301.0,
         "chiamante":"MTR 13 (TLC)","chiamato":"Coordinamento"}}
```

`busy` vale `true` mentre qualcuno sta parlando, `false` quando il canale
torna libero. `chiamante` e `chiamato` sono i nomi leggibili, presenti solo
mentre la chiamata è in corso.

### Messaggio di testo — `messaggio`

```json
{"tipo":"messaggio","ts":1786577330.0,
 "dati":{"radio_id":1000023,"text":"Rientro in sede","incoming":true}}
```

`incoming` vale `true` se il messaggio arriva da una radio, `false` se è stato
mandato dalla console.

> I messaggi **fra operatori** della console non vengono inoltrati: sono
> riservati a chi scrive e a chi riceve.

### Accensione e spegnimento — `ars`

```json
{"tipo":"ars","ts":1786577110.4,
 "dati":{"radio_id":1000023,"acceso":true,"transizione":true}}
```

`transizione` è `true` quando lo stato è davvero cambiato, e distingue una
vera accensione da un semplice riannuncio della radio.

### Presenza verificata — `presenza`

Esito di una verifica di presenza chiesta dalla console.

```json
{"tipo":"presenza","ts":1786577150.9,
 "dati":{"radio_id":1000023,"present":true,"via":"xcmp"}}
```

`via` dice come è stata verificata: `xcmp` con il comando nativo della radio,
`lrrp` con una richiesta di posizione.

### Altri eventi

Possono arrivare anche `operatore` (un operatore si collega o si scollega) e
`ptt` (qualcuno prende o lascia il microfono). Nelle versioni future se ne
potranno aggiungere altri.

> **Regola importante per chi scrive il programma ricevente:** ignora in
> silenzio i tipi che non conosci, invece di considerarli un errore. Così il
> tuo programma continuerà a funzionare anche con le versioni successive.

---

## 4. Chiedere l'elenco delle radio

Oltre a ricevere gli eventi man mano che accadono, il programma esterno può
**chiedere in qualsiasi momento** la situazione attuale: tutte le radio, gli
operatori collegati e le loro posizioni. Utile all'avvio, per partire con un
quadro completo senza aspettare che qualcosa si muova.

Queste richieste sono di **sola lettura**: bastano con la parola d'ordine di
lettura, non serve quella di scrittura.

### Tutto l'elenco

```json
{"id":"q1","comando":"elenco_radio"}
```

La risposta:

```json
{"tipo":"risposta","id":"q1","dati":{
  "ok": true,
  "quante": 2,
  "quando": 1786607671.4,
  "radio": [
    {"radio_id": 1000023,
     "identificativo": "1000023",
     "nome": "MTR 13 (TLC)",
     "tipo": "portable",
     "operatore_web": false,
     "talkgroup": 1000150,
     "nome_talkgroup": "Coordinamento Vesuvio",
     "lat": 40.90420, "lon": 14.40596,
     "posizione_fissa": false,
     "ricevuta_il": 1786607600.2,
     "rilevata_il": 1786607580.0},

    {"radio_id": 9000001,
     "identificativo": "W000001",
     "nome": "Base 1",
     "tipo": "web",
     "operatore_web": true,
     "online": true,
     "talkgroup": 1000150,
     "nome_talkgroup": "Coordinamento Vesuvio"}
  ]}}
```

| Campo | Significato |
|---|---|
| `radio_id` | Identificativo numerico, quello che viaggia via radio |
| `identificativo` | Come mostrarlo alle persone: il numero per le radio, `W000001` per gli operatori |
| `nome` | Nome assegnato; se manca, non c'è il campo |
| `tipo` | `portable`, `mobile`, `base` oppure `web` |
| `operatore_web` | `true` se è un operatore della console, non una radio |
| `online` | Solo per gli operatori: se è collegato adesso |
| `lat`, `lon` | Ultima posizione nota, se c'è |
| `posizione_fissa` | `true` se è una posizione indicata a mano, non dal GPS |

### Solo le radio, o solo gli operatori

```json
{"id":"q2","comando":"elenco_apparati"}
{"id":"q3","comando":"elenco_operatori"}
```

### Una sola radio

Si può cercare per identificativo o per nome:

```json
{"id":"q4","comando":"dettaglio_radio","radio_id":1000023}
{"id":"q5","comando":"dettaglio_radio","nome":"MTR 13"}
```

### Stato della console

```json
{"id":"q6","comando":"stato"}
```

Risponde con la modalità in corso, l'identificativo della radio collegata al
server e se la sessione di comando è aperta.


---

## 5. Mandare messaggi

Serve la parola d'ordine di **scrittura** e la modalità **attiva** sulla
console. Ogni comando è una riga JSON.

### A una singola radio

```json
{"id":"richiesta-001","comando":"sms_radio","radio_id":1000023,"testo":"Rientrare in sede"}
```

### A un gruppo

```json
{"id":"richiesta-002","comando":"sms_talkgroup","talkgroup":1000150,"testo":"Adunata alle 18"}
```

Il campo `id` è facoltativo ma consigliato: viene riportato nella risposta,
così si capisce a quale richiesta si riferisce.

### Le risposte

```json
{"tipo":"risposta","id":"richiesta-001","dati":{"ok":true,"consegnato":true}}
```

In caso di problema:

```json
{"tipo":"risposta","id":"richiesta-001","dati":{"ok":false,"errore":"Il messaggio supera i 200 caratteri."}}
```

Errori possibili: messaggio vuoto o troppo lungo (oltre 200 caratteri),
destinazione non valida o fuori intervallo, comando non riconosciuto,
servizio non ancora pronto, modalità non attiva.

---

## 6. Limiti e comportamento

| Aspetto | Comportamento |
|---|---|
| Applicazioni collegate | Al massimo **32**. Oltre, le connessioni vengono rifiutate con un messaggio, per non esaurire la memoria del server. |
| Programma lento | Ogni applicazione ha una coda propria: se non legge abbastanza in fretta perde gli eventi **più vecchi**, senza rallentare le altre né la console. |
| Caduta improvvisa | Un programma che sparisce viene rimosso senza conseguenze per gli altri. |
| Dato non rappresentabile | Non ferma il connettore né gli altri servizi della console. |
| Lunghezza dei messaggi | 200 caratteri. |
| Direzione | Di sola lettura, salvo attivare esplicitamente i comandi. |
| Parola d'ordine | Almeno 16 caratteri. Va inviata per prima; prima di allora nulla è consentito. |
| Tentativi falliti | Ritardo crescente dopo i primi errori; **100 al giorno per indirizzo**, poi blocco fino al giorno seguente. |
| Confronto della parola d'ordine | A tempo costante, per non lasciar capire quanti caratteri sono giusti. |

Il connettore è pensato per **non poter danneggiare la console**: un
programma esterno difettoso, lento o inaffidabile non deve poter fermare le
funzioni radio.

---

## 7. Esempio completo in Python

```python
import json
import socket
import time

HOST = "10.7.2.20"
PORTA = 8003
PAROLA = "parolachiavelunga123"


def ascolta():
    s = socket.create_connection((HOST, PORTA), timeout=30)
    s.sendall((PAROLA + "\n").encode())
    righe = s.makefile("r", encoding="utf-8")

    for riga in righe:
        try:
            evento = json.loads(riga)
        except ValueError:
            continue                    # riga incompleta: la salto

        tipo = evento.get("tipo")
        dati = evento.get("dati", {})

        if tipo == "posizione":
            # per l'archivio uso l'orario del RILEVAMENTO, non quello di arrivo
            quando = dati.get("rilevata_il") or dati.get("ricevuta_il")
            nome = dati.get("nome") or dati["radio_id"]
            print(f"{nome}: {dati['lat']:.5f}, {dati['lon']:.5f}  ({quando})")

        elif tipo == "chiamata" and dati.get("busy"):
            print(f"Sta parlando {dati.get('chiamante') or dati.get('radio_id')}")

        elif tipo == "messaggio" and dati.get("incoming"):
            print(f"Messaggio da {dati['radio_id']}: {dati['text']}")

        elif tipo == "ars" and dati.get("transizione"):
            stato = "accesa" if dati.get("acceso") else "spenta"
            print(f"Radio {dati['radio_id']} {stato}")

        # i tipi non riconosciuti si ignorano: così il programma continuerà
        # a funzionare anche con le versioni future della console


# se il collegamento cade (riavvio della console, rete interrotta) si
# riprova da soli, senza insistere troppo
while True:
    try:
        ascolta()
    except OSError as e:
        print("collegamento perso:", e)
    time.sleep(5)
```

---

## 8. Prova rapida senza scrivere codice

Da un altro computer, per vedere se il connettore risponde:

```
python -c "import socket,sys; s=socket.create_connection(('10.7.2.20',8003)); s.sendall(b'parolachiavelunga123\n'); [sys.stdout.write(l) for l in s.makefile()]"
```

Se scorrono righe JSON, il connettore funziona.

Se non si collega, controlla nell'ordine:

1. che il connettore sia **attivo** nelle Impostazioni della console;
2. che la parola d'ordine sia quella giusta (almeno 16 caratteri);
3. che il **firewall** del server consenta la porta 8003;
4. che l'indirizzo del server sia raggiungibile dalla rete del programma.
