# Another Documents Chat AI 🤖📄

> **Lingue disponibili**: [English](README.md) | [Italiano (corrente)](README.it.md)

## Cos'è questo progetto?

Questo è un progetto sperimentale per capire come funzionano le IA in locale, esplorando specificamente i sistemi RAG (Retrieval-Augmented Generation) e testando quanta potenza computazionale serve per interrogare anche semplici documenti PDF usando modelli AI.

## Obiettivi del progetto

- 🧠 **Apprendere IA locale**: capire come funzionano i modelli AI localmente senza dipendenze cloud
- 📚 **Sperimentazione RAG**: esplorare il question answering basato su documenti
- 💻 **Valutazione risorse**: testare i requisiti computazionali per IA locale
- 🔍 **Elaborazione PDF**: semplice analisi documenti e funzionalità chat

## Funzionalità

### Funzionalità principali
- 📄 **Caricamento documenti**: supporto per file PDF, DOCX e TXT
- 🤖 **Chat AI**: chat interattiva con i tuoi documenti usando modelli Ollama
- 💾 **Monitoraggio memoria**: tracciamento RAM in tempo reale e stima requisiti modelli
- 🌐 **Gestione modelli**: scarica ed esegui diversi modelli AI localmente
- 🔄 **Web scraping**: scoperta automatica dei modelli Ollama disponibili dalla libreria ufficiale

### Funzionalità tecniche
- ⚡ **Backend FastAPI**: framework web Python moderno
- 🐳 **Supporto Docker**: deployment containerizzato
- 🎨 **UI responsiva**: interfaccia web pulita
- 📊 **Monitoraggio sistema**: uso RAM e requisiti memoria modelli
- 🔗 **Integrazione Ollama**: esecuzione modelli AI locali

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
python-docx      # Elaborazione documenti Microsoft Word
PyPDF2           # Elaborazione documenti PDF
beautifulsoup4   # Web scraping per scoperta modelli
lxml             # Parser XML/HTML per BeautifulSoup
psutil           # Monitoraggio sistema e processi (uso RAM)
```

### Perché queste dipendenze?

- **FastAPI + Uvicorn**: Fornisce il server web e gli endpoint API per l'applicazione
- **python-multipart**: Abilita il caricamento file tramite form web
- **requests**: Comunica con l'API Ollama locale per gestire e interrogare modelli AI
- **python-docx + PyPDF2**: Estrae testo dai documenti caricati per l'elaborazione AI
- **beautifulsoup4 + lxml**: Fa scraping del sito della libreria modelli Ollama per scoprire modelli disponibili
- **psutil**: Monitora l'uso RAM del sistema e stima i requisiti memoria per diversi modelli AI

## Come funziona

### Scraping web per i modelli

L'applicazione fa automaticamente scraping della libreria ufficiale dei modelli Ollama (https://ollama.com/library) per scoprire i modelli disponibili. Questo fornisce agli utenti:

- **Lista modelli in tempo reale**: Sempre aggiornata con gli ultimi modelli disponibili
- **Stima memoria**: Calcola i requisiti RAM approssimativi basati sulla dimensione del modello
- **Categorizzazione intelligente**: Raggruppa i modelli per dimensione (Piccolo, Medio, Grande, Extra Large)

### Pipeline elaborazione documenti

1. **Caricamento**: L'utente carica file PDF, DOCX o TXT
2. **Estrazione**: Il testo viene estratto usando le librerie appropriate
3. **Archiviazione**: I documenti vengono salvati localmente per l'elaborazione
4. **Chat**: L'utente può fare domande sui documenti caricati
5. **Risposta AI**: Ollama elabora la query con il contesto del documento

### Gestione memoria

L'applicazione fornisce gestione intelligente della memoria:

- **Monitoraggio tempo reale**: Mostra l'uso RAM corrente
- **Requisiti modelli**: Stima la memoria necessaria per ogni modello
- **Avvisi intelligenti**: Aiuta gli utenti a scegliere modelli appropriati per il loro sistema

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

1. **Controlla risorse sistema**: L'app mostrerà il tuo uso RAM corrente
2. **Scarica un modello**: Scegli un modello adatto al tuo sistema (inizia con quelli più piccoli come `llama3.2:1b`)
3. **Carica documenti**: Aggiungi i tuoi file PDF, DOCX o TXT
4. **Inizia a chattare**: Fai domande sui tuoi documenti!

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

- **Deployment IA locale**: Come eseguire modelli AI senza servizi cloud
- **Sistemi RAG**: Come costruire IA che può riferirsi a documenti specifici
- **Requisiti risorse**: Necessità computazionali reali per applicazioni AI
- **Selezione modelli**: Scegliere il modello giusto per i vincoli hardware
- **Elaborazione documenti**: Gestire vari formati file per il consumo AI

## Risoluzione problemi

### Problemi comuni

1. **Memoria esaurita**: Scegli un modello più piccolo o chiudi altre applicazioni
2. **Risposte lente**: Normale per modelli più grandi su hardware limitato
3. **Download modello fallisce**: Controlla connessione internet e spazio disco disponibile
4. **Ollama non risponde**: Riavvia i container Docker

### Consigli prestazioni

- Chiudi applicazioni non necessarie per liberare RAM
- Usa storage SSD per tempi di caricamento modelli migliori
- Considera la quantizzazione modelli per efficienza memoria
- Monitora la temperatura sistema durante uso intensivo

## Disclaimer

Questo è un progetto sperimentale a scopo didattico. Prestazioni e accuratezza possono variare in base al tuo hardware e al modello AI scelto. Verifica sempre informazioni importanti dalle risposte AI.

---

## Licenza

Questo progetto è rilasciato sotto licenza MIT - vedi il file [LICENSE](LICENSE) per i dettagli.

Questo progetto è per scopi di apprendimento, educativi e sperimentali. Rispetta i termini d'uso di Ollama e dei singoli modelli AI.
