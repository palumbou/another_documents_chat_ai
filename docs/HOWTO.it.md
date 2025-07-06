# Another Documents Chat AI - Come Utilizzare

Questa guida spiega come installare, utilizzare e gestire il servizio Another Documents Chat AI.

## Avvio Rapido con Script di Gestione

Il modo più semplice per gestire il servizio è utilizzare lo script di gestione incluso:

```bash
./tools/manage.sh
```

Questo mostrerà un menu interattivo con tutte le opzioni disponibili.

## Installazione

### Installazione Automatica (Consigliata)

```bash
./tools/manage.sh install
```

Lo script:
1. Controllerà se Docker è installato
2. Installerà Docker se necessario (richiede privilegi sudo)
3. Ti farà scegliere dove salvare i documenti:
   - **Cartella del progetto** (`./web/docs`) - Bene per sviluppo
   - **Percorso personalizzato** - Specifica la tua directory
   - **Volume Docker** - Consigliato per produzione
4. Costruirà e avvierà i servizi
5. Renderà l'applicazione disponibile su http://localhost:8000

### Installazione Manuale

Se preferisci installare manualmente:

1. **Installa Docker e Docker Compose**
   
   Segui la guida ufficiale di installazione Docker per il tuo sistema operativo:
   - **📋 Guida Ufficiale Installazione Docker**: https://docs.docker.com/get-docker/
   - **🐧 Linux**: https://docs.docker.com/engine/install/
   - **🪟 Windows**: https://docs.docker.com/desktop/windows/install/
   - **🍎 macOS**: https://docs.docker.com/desktop/mac/install/
   
   **Alternativa**: Usa lo script di installazione fornito (solo Linux):
   ```bash
   sudo bash tools/install_docker.sh
   ```

2. **Scegli il metodo di archiviazione documenti**
   
   **Opzione 1: Usa cartella del progetto (predefinito)**
   ```bash
   docker compose up -d
   ```
   
   **Opzione 2: Usa percorso personalizzato**
   ```bash
   export DOCS_VOLUME="/tuo/percorso/personalizzato:/app/docs"
   docker compose up -d
   ```
   
   **Opzione 3: Usa volume Docker**
   ```bash
   docker volume create documents_data
   export DOCS_VOLUME="documents_data:/app/docs"
   docker compose up -d
   ```

## Uso Quotidiano

### Avviare il Servizio
```bash
./tools/manage.sh start
# o manualmente: docker compose up -d
```

### Fermare il Servizio
```bash
./tools/manage.sh stop
# o manualmente: docker compose down
```

### Visualizzare i Log
```bash
./tools/manage.sh logs
# o manualmente: docker compose logs -f
```

### Controllare lo Stato
```bash
./tools/manage.sh status
# o manualmente: docker compose ps
```

## Gestione Documenti

### Aggiungere Documenti

1. **Tramite Interfaccia Web** (Consigliato)
   - Apri http://localhost:8000
   - Clicca "Sfoglia" o trascina i file
   - Formati supportati: PDF, DOCX, DOC, TXT, MD

2. **Tramite File System**
   - Copia i file direttamente nella cartella docs
   - Il sistema rileva automaticamente i nuovi file
   - L'elaborazione avviene in background

### Rimuovere Documenti

1. **Tramite Interfaccia Web**
   - Clicca l'icona cestino accanto a qualsiasi documento
   
2. **Tramite File System**
   - Elimina i file dalla cartella docs
   - Scompaiono automaticamente dall'interfaccia

## Gestione Progetti

L'applicazione ora supporta **l'organizzazione dei documenti basata su progetti** con gestione intelligente delle priorità.

### Creare e Gestire Progetti

1. **Creare un Nuovo Progetto**
   - Usa il menu a tendina dei progetti nell'interfaccia web
   - Digita il nome di un nuovo progetto e premi Invio
   - I progetti vengono creati automaticamente quando carichi per la prima volta documenti in essi

2. **Passare tra Progetti**
   - Usa il selettore di progetti nel menu a tendina
   - Seleziona "Global" per lavorare con documenti al di fuori di qualsiasi progetto
   - Seleziona qualsiasi progetto esistente per lavorare nell'ambito di quel progetto

3. **Caricare Documenti nei Progetti**
   - Seleziona il progetto di destinazione dal menu a tendina
   - Carica i documenti come al solito - saranno archiviati in quel progetto
   - Ogni progetto mantiene la propria collezione di documenti isolata

### Sistema di Priorità Documenti

L'applicazione implementa un sistema di priorità intelligente durante la ricerca e la chat:

**Ordine di Priorità:**
1. **Prima i Documenti del Progetto**: Se stai lavorando in un progetto e contiene un documento con lo stesso nome di un documento globale, la versione del progetto ha la priorità
2. **Secondi i Documenti Globali**: I documenti globali vengono usati quando non esiste un documento corrispondente nel progetto corrente

**Scenari di Esempio:**
- Il progetto "ClienteA" ha `report.pdf` e Global ha `report.pdf` → Quando sei in "ClienteA", viene usato il `report.pdf` del progetto
- Il progetto "ClienteA" ha `contratto.pdf` ma Global no → Viene usato il `contratto.pdf` del progetto
- Il progetto "ClienteA" non ha `manuale.pdf` ma Global sì → Viene usato il `manuale.pdf` globale
- Lavorando nell'ambito Global → Vengono considerati solo i documenti globali

### Casi d'Uso dei Progetti

**1. Isolamento Clienti**
```
Progetti/
├── ClienteA/          # Documenti del Cliente A
│   ├── contratto.pdf
│   └── requisiti.docx
├── ClienteB/          # Documenti del Cliente B
│   ├── contratto.pdf  # Contratto diverso da ClienteA
│   └── specifiche.pdf
└── Global/            # Documenti condivisi/generali
    ├── politiche_aziendali.pdf
    └── modelli.docx
```

**2. Gestione Versioni**
```
Progetti/
├── ProgettoV1/        # Documenti versione 1
│   └── design.pdf
├── ProgettoV2/        # Documenti versione 2 (design aggiornato)
│   └── design.pdf     # Ha priorità quando sei in ProgettoV2
└── Global/
    └── risorse_condivise.pdf
```

**3. Separazione Dipartimenti**
```
Progetti/
├── Ingegneria/        # Documenti tecnici
├── Marketing/         # Materiali marketing
├── Legale/           # Documenti legali
└── Global/           # Documenti aziendali
```

### Migliori Pratiche

1. **Usa Global per Risorse Condivise**: Archivia politiche aziendali, modelli e riferimenti generali in Global
2. **Isola Dati Cliente/Progetto**: Mantieni i documenti di ogni cliente o progetto in progetti separati
3. **Naming Consistente**: Usa denominazioni chiare e consistenti per i progetti
4. **Pulizia Regolare**: Rimuovi periodicamente progetti e documenti obsoleti

## Manutenzione

### Aggiornare il Servizio
```bash
./tools/manage.sh update
```
Questo:
- Scaricherà il codice più recente dal repository
- Ricostruirà le immagini con le ultime modifiche
- Riavvierà i servizi con la nuova versione

### Resettare il Servizio
```bash
./tools/manage.sh reset
```
Questo:
- Fermerà tutti i container
- Rimuoverà container e immagini
- Ricostruirà tutto da zero
- Manterrà i tuoi documenti al sicuro

### Rimozione Completa
```bash
./tools/manage.sh remove
```
⚠️ **ATTENZIONE**: Questo eliminerà TUTTO inclusi i tuoi documenti!

## Risoluzione Problemi

### Il Servizio Non Si Avvia
1. Controlla che Docker sia in esecuzione: `docker info`
2. Controlla la disponibilità della porta: `netstat -tlnp | grep :8000`
3. Visualizza i log: `./tools/manage.sh logs`

### I Documenti Non Vengono Elaborati
1. Controlla che il formato del file sia supportato
2. Assicurati che i file siano leggibili
3. Controlla i log del container: `docker logs another-chat-web`

### Problemi di Prestazioni
1. Assicurati di avere spazio disco sufficiente
2. Controlla l'uso della memoria: `docker stats`
3. Considera l'uso di volumi Docker per migliori prestazioni

## Configurazione

### Variabili d'Ambiente
Puoi personalizzare il servizio usando il file di configurazione `env.conf`:

```bash
# Modifica il file di configurazione
nano env.conf

# Impostazioni principali:
WEB_PORT=8000                    # Porta interfaccia web
DOCS_VOLUME=./web/docs           # Percorso archiviazione documenti
OLLAMA_HOST=ollama               # Hostname servizio Ollama
OLLAMA_PORT=11434                # Porta API Ollama
NETWORK_NAME=another-chat-network # Nome rete Docker
RESTART_POLICY=unless-stopped    # Politica riavvio container
```

### Configurazione Porta
Per cambiare la porta predefinita (8000), modifica `docker-compose.yml`:
```yaml
ports:
  - "TUA_PORTA:8000"
```

## Uso Avanzato

### Accedere Direttamente a Ollama
Il servizio Ollama è disponibile su http://localhost:11434

### Modelli Personalizzati
Puoi aggiungere modelli personalizzati connettendoti al container Ollama:
```bash
docker exec -it ollama ollama pull tuo-modello
```

### Backup e Ripristino
1. **Backup documenti**: Copia la cartella docs o esporta il volume Docker
2. **Backup configurazione**: Salva le tue modifiche a docker-compose.yml
3. **Ripristino**: Copia i file indietro e esegui `./tools/manage.sh start`

## Considerazioni sulla Sicurezza

- Il servizio funziona su localhost per impostazione predefinita
- Per uso in produzione, considera:
  - Aggiungere autenticazione
  - Usare HTTPS
  - Limitare l'accesso di rete
  - Backup regolari

## Ottenere Aiuto

- Controlla prima questa documentazione
- Visualizza i log dell'applicazione: `./tools/manage.sh logs`
- Controlla lo stato dei container: `./tools/manage.sh status`
- Per problemi, controlla il repository del progetto

---

Per maggiori informazioni, vedi il file README.md principale.

## Interfaccia Utente e Temi

### 🎨 Sistema Temi Personalizzabile

L'applicazione presenta un potente sistema di temi con diversi temi integrati e supporto per temi personalizzati:

#### Temi Disponibili

1. **🎯 Tema Base**
   - Design semplice e pulito
   - Disponibile in varianti Chiaro e Scuro
   - Perfetto per uso professionale

2. **🌸 Tema Catppuccin**
   - Colori pastello rilassanti
   - Varianti Mocha, Latte, Frappé e Macchiato
   - Favorito della community per ambienti di programmazione

3. **🧛 Tema Dracula**
   - Tema scuro con accenti vibranti
   - Alto contrasto e delicato sugli occhi
   - Popolare nelle community di sviluppatori

4. **🌃 Tema Tokyo Night**
   - Varianti Notte e Giorno
   - Ispirato alle notti illuminate al neon di Tokyo
   - Aspetto moderno e raffinato

5. **� Tema Gruvbox**
   - Schema colori retrò e caldo
   - Varianti Scuro e Chiaro
   - Ispirato a badwolf e jellybeans

6. **❄️ Tema Nord**
   - Palette colori artico e bluastro del nord
   - Varianti Scuro e Chiaro
   - Design pulito e minimalista

7. **☀️ Tema Solarized**
   - Schema colori di precisione
   - Varianti Scuro e Chiaro
   - Progettato scientificamente per il comfort degli occhi

#### Come Usare i Temi

1. **Apri Impostazioni**: Clicca l'icona ingranaggio ⚙️ nella sidebar in alto a sinistra
2. **Seleziona Tema**: Usa il menu a tendina nella sezione "Opzioni"
3. **Visualizza Info Tema**: Clicca il pulsante info (ℹ️) accanto a qualsiasi tema per vedere dettagli e palette colori
4. **Salvataggio Automatico**: La tua preferenza tema viene salvata automaticamente

#### Creare Temi Personalizzati

Puoi creare i tuoi temi aggiungendo file JSON alla directory `web/static/themes/`:

##### Struttura File Tema

```json
{
  "name": "Il Mio Tema Personalizzato",
  "description": "Un bellissimo tema personalizzato",
  "author": "Il Tuo Nome",
  "version": "1.0.0",
  "variants": {
    "dark": {
      "name": "Il Mio Personalizzato Scuro",
      "description": "Descrizione variante scura",
      "type": "dark",
      "colors": {
        // Colori di Sfondo - Colori delle superfici principali
        "--background": "#1a1a1a",           // Colore di sfondo principale
        "--background-light": "#2d2d2d",     // Variante di sfondo più chiara
        "--background-dark": "#0d0d0d",      // Variante di sfondo più scura
        
        // Colori Superficie - Sfondi componenti
        "--surface": "#2d2d2d",              // Colore superficie componenti
        "--surface-light": "#404040",        // Variante superficie più chiara
        "--surface-dark": "#1a1a1a",         // Variante superficie più scura
        
        // Colori Tema Primari
        "--primary-color": "#4dabf7",        // Colore tema principale (pulsanti, link)
        "--primary-hover": "#339af0",        // Colore primario al passaggio mouse
        "--secondary-color": "#868e96",      // Colore accento secondario
        "--accent-color": "#22b8cf",         // Colore accento speciale
        
        // Colori di Stato
        "--success-color": "#51cf66",        // Stati di successo (verde)
        "--warning-color": "#ffd43b",        // Stati di avviso (giallo/arancione)
        "--error-color": "#ff6b6b",          // Stati di errore (rosso)
        "--info-color": "#22b8cf",           // Stati informativi (blu)
        
        // Colori Testo
        "--text-primary": "#f8f9fa",         // Colore testo principale
        "--text-secondary": "#e9ecef",       // Colore testo secondario
        "--text-muted": "#adb5bd",           // Testo disattivato/attenuato
        "--text-inverse": "#1a1a1a",         // Testo su sfondi colorati
        
        // Colori Bordi
        "--border-color": "#404040",         // Colore bordo predefinito
        "--border-light": "#555555",         // Variante bordo più chiara
        "--border-dark": "#2d2d2d",          // Variante bordo più scura
        
        // Colori Ombra
        "--shadow-color": "rgba(0, 0, 0, 0.3)",       // Ombra predefinita
        "--shadow-light": "rgba(0, 0, 0, 0.2)",       // Ombra leggera
        "--shadow-dark": "rgba(0, 0, 0, 0.5)",        // Ombra scura
        
        // Colori Elementi Interattivi
        "--highlight-color": "rgba(77, 171, 247, 0.2)", // Sfondi evidenziazione
        "--selection-color": "rgba(77, 171, 247, 0.3)", // Selezione testo
        
        // Colori Campi Input
        "--input-background": "#2d2d2d",     // Sfondo campi input
        "--input-border": "#404040",         // Bordo campi input
        "--input-focus": "#4dabf7",          // Bordo campo input attivo
        
        // Colori Pulsanti
        "--button-primary": "#4dabf7",       // Sfondo pulsante primario
        "--button-primary-hover": "#339af0", // Hover pulsante primario
        "--button-secondary": "#404040",     // Sfondo pulsante secondario
        "--button-secondary-hover": "#555555", // Hover pulsante secondario
        
        // Colori Specifici Layout
        "--sidebar-background": "#2d2d2d",   // Sfondo sidebar
        "--header-background": "#1a1a1a",    // Sfondo header
        "--footer-background": "#2d2d2d",    // Sfondo footer
        
        // Colori Modal
        "--modal-background": "#1a1a1a",     // Sfondo finestra modale
        "--modal-backdrop": "rgba(0, 0, 0, 0.7)", // Overlay backdrop modale
        
        // Colori Visualizzazione Codice
        "--code-background": "#0d0d0d",      // Sfondo blocchi codice
        "--code-border": "#2d2d2d",          // Bordo blocchi codice
        
        // Colori Link
        "--link-color": "#4dabf7",           // Colore link predefinito
        "--link-hover": "#339af0"            // Colore link al passaggio mouse
      }
    },
    "light": {
      "name": "Il Mio Personalizzato Chiaro",
      "description": "Descrizione variante chiara", 
      "type": "light",
      "colors": {
        // Stesse variabili di sopra, ma con colori tema chiaro
        "--background": "#ffffff",
        "--background-light": "#f8f9fa",
        "--background-dark": "#f1f3f4",
        // ... tutte le altre variabili con valori tema chiaro
      }
    }
  }
}
```

##### Guida Variabili CSS

Tutti i file tema devono includere esattamente queste 42 variabili CSS:

**Colori di Sfondo (6 variabili)**:
- `--background`: Sfondo principale applicazione
- `--background-light`: Variante più chiara per contrasto sottile
- `--background-dark`: Variante più scura per profondità
- `--surface`: Sfondi componenti (card, pannelli)
- `--surface-light`: Elementi superficie elevata
- `--surface-dark`: Elementi superficie incassata

**Colori Tema (4 variabili)**:
- `--primary-color`: Colore brand principale (pulsanti, stati attivi)
- `--primary-hover`: Stato hover colore primario
- `--secondary-color`: Accento brand secondario
- `--accent-color`: Colore evidenziazione speciale

**Colori di Stato (4 variabili)**:
- `--success-color`: Stati di successo (operazioni ✓)
- `--warning-color`: Stati di avviso/attenzione
- `--error-color`: Stati di errore/pericolo
- `--info-color`: Stati informativi

**Colori Testo (4 variabili)**:
- `--text-primary`: Testo principale leggibile
- `--text-secondary`: Testo meno prominente
- `--text-muted`: Testo disabilitato/placeholder
- `--text-inverse`: Testo su sfondi colorati

**Colori Bordi (3 variabili)**:
- `--border-color`: Bordi e divisori predefiniti
- `--border-light`: Bordi sottili
- `--border-dark`: Bordi prominenti

**Colori Ombra (3 variabili)**:
- `--shadow-color`: Ombre standard
- `--shadow-light`: Elevazione sottile
- `--shadow-dark`: Elevazione forte

**Colori Interattivi (2 variabili)**:
- `--highlight-color`: Evidenziazioni sfondo (semi-trasparenti)
- `--selection-color`: Sfondo selezione testo

**Colori Input (3 variabili)**:
- `--input-background`: Sfondi campi form
- `--input-border`: Bordi campi form
- `--input-focus`: Bordo campo attivo

**Colori Pulsanti (4 variabili)**:
- `--button-primary`: Sfondo pulsante primario
- `--button-primary-hover`: Hover pulsante primario
- `--button-secondary`: Sfondo pulsante secondario
- `--button-secondary-hover`: Hover pulsante secondario

**Colori Layout (3 variabili)**:
- `--sidebar-background`: Sfondo navigazione laterale
- `--header-background`: Sfondo navigazione superiore
- `--footer-background`: Sfondo footer

**Colori Modal (2 variabili)**:
- `--modal-background`: Sfondo dialog/popup
- `--modal-backdrop`: Overlay semi-trasparente

**Colori Codice (2 variabili)**:
- `--code-background`: Sfondo blocchi codice
- `--code-border`: Bordo blocchi codice

**Colori Link (2 variabili)**:
- `--link-color`: Colore link predefinito
- `--link-hover`: Colore link al passaggio mouse

##### Linee Guida Colori

**Per Temi Scuri**:
- Usa sfondi scuri (gamma #1a1a1a a #2d2d2d)
- Usa testo chiaro (gamma #e9ecef a #ffffff)
- Mantieni contrasto sufficiente (minimo 4.5:1 per il testo)
- Usa rgba() per overlay semi-trasparenti

**Per Temi Chiari**:
- Usa sfondi chiari (gamma #f8f9fa a #ffffff)
- Usa testo scuro (gamma #212529 a #495057)
- Assicura conformità accessibilità
- Usa ombre sottili con bassa opacità

##### Aggiungere il Tuo Tema

1. Salva il tuo file tema come `web/static/themes/nome-tuo-tema.json`
2. Riavvia l'applicazione o aggiorna la pagina
3. Il tuo tema apparirà automaticamente nel menu a tendina

##### Vantaggi Sistema Temi

**🎨 Standardizzato**: Tutti i temi usano esattamente le stesse 42 variabili CSS
**🔧 Creazione Facile**: Usa il file template.json come punto di partenza
**📱 Responsivo**: I temi funzionano automaticamente su tutti i dispositivi
**♿ Accessibile**: Le linee guida assicurano rapporti di contrasto appropriati
**🔄 Ricarica Live**: I temi si caricano dinamicamente senza modifiche al codice
**📊 Organizzato**: Variabili raggruppate per scopo con denominazione chiara
**💾 Persistente**: Selezione tema salvata tra le sessioni del browser
**🎯 Consistente**: Sistema colori unificato in tutta l'interfaccia

### 🎯 Caratteristiche Design Visivo

- **Design Responsivo**: Funziona su desktop, tablet e mobile
- **Transizioni Fluide**: Animazioni eleganti tra i temi
- **Alto Contrasto**: Rapporti colori accessibili
- **UI Moderna**: Design dell'interfaccia pulito e professionale
