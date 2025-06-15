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
