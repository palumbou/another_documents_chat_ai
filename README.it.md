# Another Documen**Per le istruzioni dettagliate di installazione e utilizzo, leggi:**
- 📖 **[HOWTO.it.md](HOWTO.it.md)** - Guida all'utilizzo
- 🛠️ **[tools/MANAGE.it.md](tools/MANAGE.it.md)** - Riferimento rapido script di gestioneChat AI 🤖📄

> **Lingue disponibili**: [English](README.md) | [Italiano (corrente)](README.it.md)

## Cos'è questo progetto?

Questo è un progetto sperimentale per capire come funzionano le IA in locale, esplorando specificamente i sistemi RAG (Retrieval-Augmented Generation) e testando quanta potenza computazionale serve per interrogare anche semplici documenti PDF usando modelli AI.

## Obiettivi del progetto

- 🧠 **Apprendere IA locale**: capire come funzionano i modelli AI localmente senza dipendenze cloud
- 📚 **Sperimentazione RAG**: esplorare il question answering basato su documenti
- 💻 **Valutazione risorse**: testare i requisiti computazionali per IA locale
- 🔍 **Elaborazione PDF**: semplice analisi documenti e funzionalità chat

## 🚀 Avvio Rapido

**Per istruzioni dettagliate di installazione e utilizzo, leggi:**
- 📖 **[HOWTO.it.md](HOWTO.it.md)** - Guida sull'utilizzo
- 🛠️ **[MANAGE.it.md](tools/MANAGE.it.md)** - Riferimento rapido script di gestione

**Installazione rapida:**
```bash
./tools/manage.sh install
```

**Avvio rapido:**
```bash
./tools/manage.sh start
```

Poi apri http://localhost:8000 nel tuo browser.

## Funzionalità

### Funzionalità principali
- 📄 **Caricamento documenti**: supporto per file PDF, DOCX e TXT con gestione intelligente delle dimensioni
- 🤖 **Chat AI**: chat interattiva con documenti usando chunking avanzato e scoring di rilevanza
- 💾 **Monitoraggio memoria**: tracciamento RAM in tempo reale e stima requisiti modelli
- 🌐 **Gestione modelli**: scarica ed esegui diversi modelli AI localmente con scoperta automatica
- 🔄 **Web scraping**: scoperta automatica dei modelli Ollama disponibili dalla libreria ufficiale
- 📊 **Gestione documenti**: visualizza chunk documenti, elimina documenti, conferma sovrascrittura
- ⚡ **Ottimizzazione prestazioni**: timeout 5 minuti, chunking intelligente, gestione file grandi
- 🎨 **Interfaccia elegante**: design Rosé Pine con cambio modalità Dawn/Moon

### Design UI e Tematizzazione
L'interfaccia presenta una bellissima palette di colori **Rosé Pine** con due modalità:

#### 🌅 Rosé Pine Dawn (Tema Chiaro - Default)
- **Sfondo**: `#faf4ed` (base crema caldo)
- **Sidebar**: `#f2e9e1` (superficie rosa tenue)
- **Testo**: `#575279` (viola smorzato)
- **Primario**: `#d7827e` (rosa polveroso)
- **Successo**: `#56949f` (verde pino)
- **Avviso**: `#ea9d34` (oro caldo)

#### 🌙 Rosé Pine Moon (Tema Scuro)
- **Sfondo**: `#232136` (base notte profonda)
- **Sidebar**: `#2a273f` (superficie più scura)
- **Testo**: `#e0def4` (lavanda tenue)
- **Primario**: `#eb6f92` (rosa brillante)
- **Successo**: `#9ccfd8` (blu schiuma)
- **Avviso**: `#f6c177` (giallo dorato)

**Caratteristiche Tema**:
- 🔄 **Cambio tema con un click** nell'header della sidebar
- 💾 **Persistenza tema** tra le sessioni del browser
- 🎯 **Palette colori consistente** in tutta l'interfaccia
- ✨ **Transizioni fluide** tra modalità chiara e scura

### Funzionalità tecniche
- ⚡ **Backend FastAPI**: framework web Python moderno con supporto async e architettura router modulare
- 🏗️ **Architettura modulare**: separazione pulita delle responsabilità con router dedicati per documenti, chat, modelli, ricerca e monitoraggio sistema
- 🐳 **Supporto Docker**: deployment containerizzato con integrazione Ollama
- 🎨 **UI responsiva**: interfaccia web pulita con dialog modali e feedback tempo reale
- 📊 **Monitoraggio sistema**: uso RAM, requisiti memoria modelli e metriche prestazioni
- 🔗 **Integrazione Ollama**: esecuzione modelli AI locali con parametri ottimizzati
- 🧠 **Chunking intelligente**: chunk da 6K caratteri con scoring rilevanza multi-criterio
- 📈 **Elaborazione scalabile**: gestisce documenti grandi (35MB+) senza timeout
- 🔍 **Ricerca avanzata**: scoring chunk multi-criterio con match esatti e bonus prossimità
- 🔄 **Elaborazione asincrona**: upload file istantaneo con estrazione testo e OCR in background
- 📊 **Tracciamento stato elaborazione**: indicatori progresso tempo reale per elaborazione documenti

### Elaborazione Documenti e Limiti

#### Limiti dimensioni file e elaborazione
- **Dimensione massima file**: 50MB per file
- **Formati supportati**: PDF, DOCX, DOC, TXT, MD
- **Limite pagine OCR**: 20 pagine per file >10MB (per gestire tempo elaborazione)
- **Limiti estrazione caratteri**:
  - PyPDF2: 500.000 caratteri per documento
  - pdfplumber: 400.000 caratteri per documento  
  - OCR: 300.000 caratteri per documento
- **Timeout elaborazione**: 5 minuti per query

#### Flusso elaborazione asincrona
1. **Upload istantaneo**: i file vengono salvati immediatamente su disco
2. **Elaborazione background**: l'estrazione testo avviene in modo asincrono
3. **Tracciamento stato**: aggiornamenti progresso tempo reale (pending → processing → completed/error)
4. **Auto-refresh**: l'UI aggiorna automaticamente lo stato elaborazione ogni 3 secondi
5. **Gestione errori**: meccanismo retry per elaborazioni fallite

#### Strategia chunking
- **Dimensione chunk**: 6.000 caratteri (ottimizzato per finestre contesto LLM)
- **Sovrapposizione**: 200 caratteri tra chunk per continuità contesto
- **Divisione intelligente**: preserva paragrafi e frasi quando possibile
- **Scoring rilevanza**: sistema scoring multi-criterio:
  - Match esatti parole chiave (peso alto)
  - Match parziali e sinonimi (peso medio)
  - Bonus prossimità per termini correlati
  - Scoring frequenza documento
- **Ottimizzazione contesto**: massimo 3 chunk più rilevanti per query

## Requisiti

### Requisiti di sistema
- **Docker** e **Docker Compose**
- **Minimo 4GB RAM** (8GB+ raccomandati per modelli più grandi)
- **Architettura x86_64** (per compatibilità Ollama)

### Dipendenze Python

```
fastapi          # Framework web moderno per API
uvicorn[standard] # Server ASGI per FastAPI
python-multipart # Supporto caricamento file
jinja2           # Template engine (anche se usiamo HTML semplice)
requests         # Client HTTP per chiamate API Ollama
python-docx      # Elaborazione documenti Microsoft Word (DOCX)
docx2txt         # Elaborazione documenti Microsoft Word legacy (DOC)
PyPDF2           # Elaborazione documenti PDF (metodo primario)
pdfplumber       # Estrazione testo PDF avanzata (metodo fallback)
beautifulsoup4   # Web scraping per scoperta modelli
lxml             # Parser XML/HTML per BeautifulSoup
psutil           # Monitoraggio sistema e processi (uso RAM)
pytesseract      # Motore OCR per PDF scansionati
Pillow           # Elaborazione immagini per OCR
pdf2image        # Conversione pagine PDF in immagini per OCR
```

### Dipendenze di sistema (installate automaticamente in Docker)

```
poppler-utils    # Strumenti conversione PDF in immagini
tesseract-ocr    # Motore OCR
tesseract-ocr-ita # Pacchetto lingua italiana per OCR
tesseract-ocr-eng # Pacchetto lingua inglese per OCR
```

### Perché queste dipendenze?

- **FastAPI + Uvicorn**: fornisce il server web e gli endpoint API per l'applicazione
- **python-multipart**: abilita caricamento file attraverso form web
- **requests**: comunica con l'API Ollama locale per gestire e interrogare modelli AI
- **python-docx**: estrae testo da documenti Microsoft Word
- **PyPDF2 + pdfplumber**: estrazione testo PDF multi-strategia (PyPDF2 prima, pdfplumber come fallback)
- **pytesseract + Pillow + pdf2image**: funzionalità OCR per PDF scansionati senza testo estraibile
- **poppler-utils + tesseract-ocr**: strumenti di sistema per conversione PDF-in-immagini e riconoscimento ottico caratteri
- **beautifulsoup4 + lxml**: scraping del sito libreria modelli Ollama per scoprire modelli disponibili
- **psutil**: monitora uso RAM sistema e stima requisiti memoria per diversi modelli AI

## Come funziona

### Estrazione testo PDF migliorata con approccio multi-strategia

L'applicazione implementa un robusto sistema di estrazione testo PDF a tre livelli:

#### 1. Estrazione PyPDF2 (Primaria)
- Veloce ed efficiente per PDF standard con testo incorporato
- Gestisce la maggior parte dei formati PDF comuni
- Successo limitato con PDF scansionati o basati su immagini

#### 2. Estrazione pdfplumber (Fallback)
- Estrazione testo più robusta per layout PDF complessi
- Migliore gestione di tabelle, colonne e testo formattato
- Estrazione alternativa quando PyPDF2 fallisce

#### 3. Estrazione OCR (Fallback finale)
- Riconoscimento Ottico Caratteri per PDF scansionati e immagini
- Converte pagine PDF in immagini ed estrae testo usando Tesseract OCR
- Supporta riconoscimento testo italiano e inglese
- Fallback automatico quando entrambi i metodi di estrazione testuale producono risultati minimi
- Limiti elaborazione intelligenti per gestire prestazioni

#### Configurazione e limiti OCR
```python
{
    "languages": ["ita", "eng"],           # Pacchetti lingua italiana e inglese
    "dpi": 150,                           # Risoluzione immagine per OCR (bilanciamento qualità/velocità)
    "config": "--psm 3 --oem 3",          # Modalità segmentazione pagina 3, modalità motore OCR 3
    "max_pages": 20,                      # Limite pagine per file grandi (>10MB)
    "max_chars": 300000,                  # Limite estrazione caratteri per OCR
    "timeout": 300,                       # Timeout 5 minuti per elaborazione OCR
    "image_format": "PNG",                # Formato conversione per pagine PDF
    "preprocessing": True                  # Miglioramento immagine prima dell'OCR
}
```

#### Limiti estrazione testo per metodo
- **PyPDF2**: 500.000 caratteri per documento (estrazione veloce)
- **pdfplumber**: 400.000 caratteri per documento (estrazione completa)
- **OCR**: 300.000 caratteri per documento (elaborazione intensiva risorse)
- **Limiti pagine**: massimo 20 pagine per OCR su file >10MB
- **Limiti dimensione file**: massimo 50MB per file caricato

### Sistema di chunking intelligente dei documenti

L'applicazione implementa una strategia di chunking avanzata per gestire documenti grandi in modo efficiente:

#### Parametri chunking
- **Dimensione chunk**: 6.000 caratteri per chunk (ottimizzato per l'uso della finestra di contesto)
- **Sovrapposizione**: 200 caratteri tra chunk per mantenere continuità del contesto
- **Massimo chunk elaborati**: 5 chunk più rilevanti per query
- **Timeout elaborazione**: 300 secondi (5 minuti) per gestione documenti grandi

#### Algoritmo divisione testo intelligente
```
1. Dividi per paragrafi (doppie newline) per prima cosa
2. Se paragrafo > dimensione_chunk, dividi per singole newline
3. Se ancora troppo grande, dividi per fine frase (. ! ?)
4. Fallback finale: divisione basata su caratteri con confini parola
```

#### Scoring rilevanza multi-criterio

Il sistema usa un algoritmo di scoring sofisticato per trovare i chunk più rilevanti:

**Componenti scoring:**
- **Match frase esatta**: +10 punti per match
- **Match parole individuali**: +2 punti per parola
- **Match parole parziali**: +1 punto per match parziale
- **Bonus prossimità frase**: +5 punti quando parole query appaiono vicine
- **Bonus lunghezza**: +1 punto per 100 caratteri (premia chunk comprensivi)

**Pesi scoring:**
- Matching case-insensitive per migliore recall
- Rilevamento confini parola per evitare falsi match parziali
- Scoring prossimità basato su distanza (parole entro 50 caratteri ottengono bonus)

### Pipeline elaborazione documenti

1. **Caricamento**: l'utente carica file PDF, DOCX o TXT
2. **Estrazione**: il testo viene estratto con ottimizzazioni basate su dimensione:
   - **File grandi (>10MB)**: limitati alle prime 50 pagine per prevenire timeout
   - **Limiti caratteri**: 500.000 caratteri max per documento
   - **Elaborazione memory-efficient**: estrazione streaming per PDF grandi
3. **Chunking**: i documenti vengono divisi intelligentemente usando l'algoritmo chunking
4. **Archiviazione**: sia documenti originali che chunk elaborati vengono salvati localmente
5. **Chat**: le query utente vengono matchate contro chunk usando il sistema scoring
6. **Risposta AI**: i top 5 chunk rilevanti vengono inviati a Ollama per risposte context-aware

### Integrazione e configurazione Ollama

#### Parametri modello
```python
{
    "model": modello_selezionato,
    "prompt": prompt_formattato_con_contesto,
    "stream": false,
    "options": {
        "temperature": 0.7,      # Creatività bilanciata vs consistenza
        "top_p": 0.9,           # Nucleus sampling per risposte diverse
        "num_ctx": 8192,        # Finestra contesto estesa (8K token)
        "num_predict": 1024,    # Lunghezza massima risposta (1K token)
        "stop": ["User:", "Assistant:"]  # Confini conversazione
    }
}
```

#### Configurazione timeout API
- **Timeout connessione**: 300 secondi (5 minuti)
- **Timeout lettura**: 300 secondi per generazione risposta modello
- **Logica retry**: fallback automatico per problemi connessione

### Web scraping per modelli

L'applicazione fa automaticamente scraping della libreria ufficiale modelli Ollama (https://ollama.com/library) per scoprire modelli disponibili:

#### Funzionalità scraping
- **Scoperta modelli tempo reale**: sempre aggiornata con ultimi modelli
- **Stima memoria**: requisiti RAM calcolati da dimensioni modello
- **Modelli fallback**: lista curata assicura funzionalità base
- **Gestione errori**: degradazione elegante se scraping fallisce

#### Algoritmo categorizzazione modelli
```python
categorie_dimensione = {
    "Piccolo": "< 4GB RAM",      # Modelli 1B-3B parametri
    "Medio": "4-8GB RAM",        # Modelli 7B parametri  
    "Grande": "8-16GB RAM",      # Modelli 8B-13B parametri
    "Extra Large": "> 16GB RAM"  # Modelli 70B+ parametri
}
```

### Gestione e monitoraggio memoria

#### Monitoraggio sistema
- **Uso RAM tempo reale**: aggiornato ad ogni caricamento pagina usando `psutil`
- **Calcolo memoria disponibile**: memoria totale - memoria usata
- **Stima requisiti modello**: basata su conteggio parametri e quantizzazione

#### Formula stima memoria
```python
def stima_memoria_gb(nome_modello):
    # Stime base per dimensioni modello comuni
    mappa_dimensioni = {
        "1b": 2,    # 1B parametri ≈ 2GB RAM
        "3b": 4,    # 3B parametri ≈ 4GB RAM  
        "7b": 9,    # 7B parametri ≈ 9GB RAM
        "8b": 12,   # 8B parametri ≈ 12GB RAM
        "70b": 40,  # 70B parametri ≈ 40GB RAM
    }
    # Include pesi modello + contesto + overhead
```

### Ottimizzazioni prestazioni

#### Ottimizzazioni elaborazione documenti
- **Limiti pagine**: 50 pagine max per file >10MB
- **Limiti caratteri**: 500K caratteri max per documento
- **Estrazione streaming**: elaborazione PDF memory-efficient
- **Chunking intelligente**: divisione testo preservando contesto

#### Ottimizzazione risposte
- **Pre-filtro chunk**: elabora solo chunk più rilevanti
- **Gestione finestra contesto**: uso ottimale del limite 8K token
- **Gestione timeout**: degradazione elegante per operazioni lunghe

## Avvio rapido

### 1. Clona e avvia

```bash
git clone git@github.com:palumbou/another_documents_chat_ai.git
cd another_documents_chat_ai
docker compose up -d --build
```

### 2. Accedi all'applicazione

Apri il tuo browser e vai su: http://localhost:8000

### 3. Primi passi

1. **Controlla risorse sistema**: l'app mostrerà il tuo uso RAM corrente
2. **Scarica un modello**: scegli un modello adatto al tuo sistema (inizia con quelli più piccoli come `llama3.2:1b`)
3. **Carica documenti**: aggiungi i tuoi file PDF, DOCX o TXT
4. **Inizia a chattare**: fai domande sui tuoi documenti!

## Endpoint API

### Endpoint applicazione principale

#### `GET /`
- **Descrizione**: serve l'interfaccia HTML principale
- **Risposta**: pagina HTML con interfaccia chat e tematizzazione Rosé Pine
- **Uso**: punto di ingresso principale per l'applicazione web

#### `POST /upload`
- **Descrizione**: gestisce caricamento asincrono documenti (PDF, DOCX, TXT)
- **Parametri**: 
  - `files`: Lista di file da caricare
  - `overwrite`: Boolean per sovrascrivere file esistenti
- **Risposta**: risultati caricamento con stato elaborazione
- **Funzionalità**: 
  - Upload file istantaneo (salvato immediatamente)
  - Estrazione testo e OCR in background
  - Tracciamento stato elaborazione
  - Supporto file fino a 50MB

#### `POST /chat`
- **Descrizione**: esegue query chat AI con o senza contesto documenti
- **Parametri**:
  - `query`: Domanda/query utente
  - `model`: Modello AI da usare (opzionale, usa engine corrente)
- **Risposta**: risposta AI con metadata contesto
- **Funzionalità**: 
  - Funziona con documenti caricati (modalità RAG)
  - Chat AI generale senza documenti
  - Selezione chunk intelligente e formattazione contesto
  - Risposta fino a 2048 token

### Endpoint gestione documenti

#### `GET /documents`
- **Descrizione**: lista tutti i documenti caricati con stato elaborazione
- **Risposta**: lista documenti con stato elaborazione, info chunk e metadata
- **Funzionalità**: 
  - Stato elaborazione tempo reale (pending/processing/completed/error)
  - Tracciamento progresso per elaborazione background
  - Informazioni chunk e conteggio caratteri
  - Statistiche riepilogo elaborazione

#### `GET /documents/status`
- **Descrizione**: ottieni stato elaborazione per tutti i documenti
- **Risposta**: panoramica stato completa con informazioni progresso
- **Funzionalità**: aggiornamenti stato tempo reale per elaborazione asincrona

#### `GET /documents/status/{filename}`
- **Descrizione**: ottieni stato elaborazione dettagliato per documento specifico
- **Risposta**: stato documento individuale con progresso e metadata
- **Uso**: monitora progresso elaborazione documento specifico

#### `GET /documents/{filename}/chunks`
- **Descrizione**: ottieni informazioni chunk dettagliate per documento specifico
- **Risposta**: lista di chunk con anteprime e metadata
- **Uso**: debug elaborazione documenti e chunking
- **Nota**: disponibile solo per documenti completati

#### `DELETE /documents/{filename}`
- **Descrizione**: elimina un documento dall'archivio
- **Risposta**: conferma eliminazione
- **Funzionalità**: rimuove file, dati elaborati e tracciamento stato

#### `POST /documents/{filename}/retry`
- **Descrizione**: riprova elaborazione per documento fallito
- **Risposta**: avvio nuovo task elaborazione
- **Uso**: recupero da errori elaborazione

#### `POST /documents/reprocess/{filename}`
- **Descrizione**: rielabora un documento esistente con le attuali impostazioni di estrazione
- **Risposta**: avvio task rielaborazione con stato aggiornato
- **Uso**: migliorare risultati estrazione dopo aggiornamenti sistema o modifiche impostazioni
- **Funzionalità**: 
  - Sovrascrive dati elaborati esistenti
  - Usa algoritmi ed impostazioni estrazione più recenti
  - Mantiene timestamp caricamento documento

### Ricerca e gestione chunk

#### `POST /search-chunks`
- **Descrizione**: cerca chunk rilevanti in tutti i documenti elaborati
- **Parametri**:
  - `query`: Query di ricerca
  - `max_results`: Numero massimo risultati (default: 5)
- **Risposta**: lista classificata di chunk documenti rilevanti
- **Funzionalità**: 
  - Scoring rilevanza multi-criterio
  - Match esatti e bonus prossimità
  - Selezione chunk consapevole del contesto

### Endpoint debug e diagnostica

#### `GET /debug/pdf/{filename}`
- **Descrizione**: testa estrazione PyPDF2 su PDF specifico
- **Risposta**: testo estratto e metadata
- **Uso**: diagnosi problemi estrazione testo PDF

#### `GET /debug/pdf-plumber/{filename}`
- **Descrizione**: testa estrazione pdfplumber su PDF specifico
- **Risposta**: testo estratto e metadata
- **Uso**: diagnosi estrazione PDF alternativa

#### `GET /debug/pdf-ocr/{filename}`
- **Descrizione**: testa estrazione OCR su PDF specifico
- **Risposta**: testo estratto OCR e metadata
- **Uso**: diagnosi elaborazione OCR per documenti scansionati

### Gestione modelli AI

#### `GET /models`
- **Descrizione**: lista modelli disponibili locali e remoti
- **Risposta**: catalogo modelli completo con requisiti memoria
- **Funzionalità**: 
  - Scoperta modelli tempo reale dalla libreria Ollama
  - Stima memoria per ogni modello
  - Categorizzazione per famiglia e dimensione modello

#### `POST /models/pull`
- **Descrizione**: scarica modello dalla libreria Ollama
- **Parametri**: `name`: Nome modello da scaricare
- **Risposta**: conferma download
- **Funzionalità**: download modelli in background

#### `POST /models/run`
- **Descrizione**: imposta modello AI attivo per chat
- **Parametri**: `name`: Nome modello da attivare
- **Risposta**: conferma attivazione modello con verifica
- **Funzionalità**: 
  - Verifica disponibilità modello
  - Controllo salute e aggiornamento stato engine
  - Validazione requisiti memoria

### Monitoraggio sistema e salute

#### `GET /status`
- **Descrizione**: controlla stato sistema e engine AI
- **Risposta**: informazioni complete salute sistema
- **Funzionalità**: 
  - Stato connettività Ollama
  - Verifica engine corrente
  - Controllo disponibilità modelli
  - Indicatori salute engine

#### `GET /system/memory`
- **Descrizione**: ottieni uso memoria sistema corrente
- **Risposta**: statistiche uso RAM e memoria disponibile
- **Funzionalità**: monitoraggio memoria tempo reale per selezione modelli

#### Chat con documenti
```bash
curl -X POST "http://localhost:8000/chat" \
  -F "query=Qual è l'argomento principale?" \
  -F "model=llama3.2:1b"
```

#### Testa estrazione PDF
```bash
curl "http://localhost:8000/debug/pdf-ocr/documento.pdf"
```

#### Scarica un modello
```bash
curl -X POST "http://localhost:8000/models/pull" \
  -H "Content-Type: application/json" \
  -d '{"name": "llama3.2:1b"}'
```

#### Controlla stato sistema
```bash
curl "http://localhost:8000/status"
```

## Raccomandazioni modelli

### Per RAM limitata (< 8GB)
- `llama3.2:1b` (2GB RAM) - Buono per attività di base
- `phi3.5:mini` (3GB RAM) - Modello piccolo efficiente
- `gemma3:1b` (2GB RAM) - Modello leggero di Google

### Per RAM moderata (8-16GB)
- `llama3.2:3b` (4GB RAM) - Migliori prestazioni
- `mistral:7b` (9GB RAM) - Eccellente equilibrio
- `codellama:7b` (9GB RAM) - Ottimo per documenti legati al codice

### Per RAM elevata (16GB+)
- `llama3.1:8b` (12GB RAM) - Risposte di alta qualità
- `mixtral:8x7b` (26GB RAM) - Modello molto capace
- `llama3.1:70b` (40GB RAM) - Prestazioni top (richiede hardware potente)

## Obiettivi di apprendimento

Questo progetto è progettato per esplorare e capire:

- **Deployment IA locale**: come eseguire modelli AI senza servizi cloud
- **Sistemi RAG**: strategie avanzate di chunking e retrieval documenti
- **Requisiti risorse**: necessità computazionali reali per applicazioni AI
- **Selezione modelli**: scegliere il modello giusto per i vincoli hardware
- **Elaborazione documenti**: gestire vari formati file con ottimizzazioni dimensione
- **Ottimizzazione prestazioni**: gestione timeout, efficienza memoria e scalabilità
- **Scoring rilevanza**: algoritmi multi-criterio per trovare chunk documenti rilevanti
- **Monitoraggio sistema**: tracciamento risorse tempo reale e pianificazione capacità

## Specifiche tecniche

### Limiti elaborazione documenti
- **Dimensione file massima**: 35MB+ supportati con ottimizzazioni
- **Gestione file grandi**: 50 pagine max per file >10MB
- **Limite caratteri**: 500.000 caratteri per documento
- **Formati supportati**: PDF, DOCX, DOC, TXT, MD

### Parametri sistema chunking
- **Dimensione chunk**: 6.000 caratteri (ottimale per finestra contesto 8K)
- **Sovrapposizione**: 200 caratteri tra chunk
- **Massimo chunk per query**: 5 chunk più rilevanti
- **Timeout elaborazione**: 300 secondi (5 minuti)

### Configurazione modelli AI
- **Finestra contesto**: 8.192 token (num_ctx)
- **Lunghezza risposta**: 1.024 token max (num_predict)
- **Temperature**: 0.7 (creatività bilanciata)
- **Top-p**: 0.9 (nucleus sampling)
- **Timeout**: 300 secondi per risposte modello

### Pesi algoritmo scoring
- **Match frase esatta**: +10 punti
- **Match parola**: +2 punti
- **Match parziale**: +1 punto
- **Bonus prossimità**: +5 punti (parole entro 50 caratteri)
- **Bonus lunghezza**: +1 punto per 100 caratteri

## Risoluzione problemi

### Problemi comuni

1. **Memoria esaurita**: scegli un modello più piccolo o chiudi altre applicazioni
2. **Risposte lente**: normale per modelli più grandi su hardware limitato
3. **Download modello fallisce**: controlla connessione internet e spazio disco disponibile
4. **Ollama non risponde**: riavvia i container Docker
5. **Timeout documento grande**: file >35MB potrebbero richiedere chunking manuale
6. **Errori elaborazione chunk**: controlla formato documento e codifica
7. **Estrazione OCR fallisce**: verifica che il PDF contenga immagini/contenuto scansionato
8. **Qualità OCR scarsa**: il documento potrebbe avere bassa risoluzione o scansione di scarsa qualità
9. **Rilevamento lingua OCR**: attualmente supporta solo italiano e inglese

### Risoluzione problemi estrazione PDF

#### Nessun testo estratto dal PDF
1. **Controlla tipo PDF**: usa `/debug/pdf/{filename}` per analizzare struttura PDF
2. **Testa metodi estrazione**: usa `/debug/pdf-plumber/{filename}` per confronto metodi
3. **Prova OCR**: usa `/debug/pdf-ocr/{filename}` per PDF scansionati
4. **Rielabora documento**: usa `/documents/reprocess/{filename}` dopo miglioramenti

#### Problemi specifici OCR
- **"poppler not found"**: dipendenze sistema mancanti (installate automaticamente in Docker)
- **"tesseract not found"**: motore OCR non installato (installato automaticamente in Docker)
- **Elaborazione OCR lenta**: normale per documenti scansionati ad alta risoluzione
- **Timeout OCR**: documenti grandi potrebbero richiedere diversi minuti per l'elaborazione
- **Qualità testo scarsa**: documenti scansionati con bassa risoluzione o scarsa qualità

### Consigli prestazioni

- **Gestione memoria**: chiudi applicazioni non necessarie per liberare RAM
- **Ottimizzazione storage**: usa storage SSD per tempi caricamento modelli migliori
- **Selezione modelli**: considera quantizzazione modelli per efficienza memoria
- **Monitoraggio sistema**: monitora temperatura durante uso intensivo
- **Ottimizzazione documenti**: spezza documenti molto grandi in file più piccoli
- **Strategia chunking**: usa il visualizzatore chunk per capire elaborazione documenti
- **Ottimizzazione OCR**: per migliori risultati OCR, assicurati che i documenti scansionati abbiano buona qualità e contrasto

### Configurazione avanzata

#### Regolazioni timeout
```python
# In main.py, modifica questi valori:
PROCESSING_TIMEOUT = 300  # 5 minuti per elaborazione documenti
OLLAMA_TIMEOUT = 300     # 5 minuti per risposte AI
```

#### Parametri chunking
```python
# Regola queste costanti per comportamento chunking diverso:
CHUNK_SIZE = 6000        # Caratteri per chunk
CHUNK_OVERLAP = 200      # Sovrapposizione tra chunk  
MAX_CHUNKS = 5           # Massimo chunk per query
```

#### Parametri modello
```python
# Le opzioni richiesta Ollama possono essere modificate:
options = {
    "temperature": 0.7,      # 0.0-1.0 (creatività vs consistenza)
    "top_p": 0.9,           # 0.0-1.0 (nucleus sampling)
    "num_ctx": 8192,        # Dimensione finestra contesto
    "num_predict": 1024,    # Token risposta max
}
```

## Disclaimer

Questo è un progetto sperimentale a scopo didattico. Prestazioni e accuratezza possono variare in base al tuo hardware e al modello AI scelto. Verifica sempre informazioni importanti dalle risposte AI.

---

## Licenza

Questo progetto è rilasciato sotto licenza MIT - vedi il file [LICENSE](LICENSE) per i dettagli.

Questo progetto è per scopi di apprendimento, educativi e sperimentali. Rispetta i termini d'uso di Ollama e dei singoli modelli AI.
