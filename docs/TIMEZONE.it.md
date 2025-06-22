# Gestione del Fuso Orario

Questo documento spiega come gestire la configurazione del fuso orario per i container Docker di Another Documents Chat AI.

## Problema

Per impostazione predefinita, i container Docker funzionano con il fuso orario UTC, il che può causare discrepanze temporali tra:
- Timestamp dei messaggi chat mostrati nell'interfaccia
- Timestamp dei log delle chat salvate
- Orario del sistema host

## Soluzione

Il progetto ora include la gestione automatica del fuso orario che:
1. Sincronizza l'orario dei container con il fuso orario del sistema host
2. Fornisce strumenti per configurare manualmente il fuso orario
3. Valida le impostazioni del fuso orario
4. Supporta il rilevamento automatico del fuso orario dell'host

## Configurazione

### Variabili d'Ambiente

Aggiungi in `env.conf`:
```bash
# Fuso orario dei container (predefinito: Europe/Rome)
# Puoi cambiarlo con qualsiasi fuso orario valido da /usr/share/zoneinfo/
# Esempi: Europe/London, America/New_York, Asia/Tokyo, UTC
TIMEZONE=Europe/Rome
```

### Docker Compose

Il file `docker-compose.yml` è stato aggiornato per:
- Montare `/etc/localtime` per la sincronizzazione del fuso orario di sistema
- Impostare la variabile d'ambiente `TZ` per la configurazione esplicita del fuso orario
- Applicare le impostazioni del fuso orario sia ai container `ollama` che `web`

## Strumento di Gestione Fuso Orario

Usa lo script `tools/timezone_manager.sh` per la gestione del fuso orario:

### Mostra Configurazione Corrente
```bash
./tools/timezone_manager.sh show
```

### Rileva Automaticamente il Fuso Orario dell'Host
```bash
./tools/timezone_manager.sh auto
```

### Imposta un Fuso Orario Specifico
```bash
./tools/timezone_manager.sh set Europe/Rome
./tools/timezone_manager.sh set America/New_York
./tools/timezone_manager.sh set Asia/Tokyo
```

### Elenca Fusi Orari Comuni
```bash
./tools/timezone_manager.sh list
```

### Riavvia i Container
```bash
./tools/timezone_manager.sh restart
```

## Integrazione con lo Script di Gestione

Il gestore del fuso orario è integrato nello script di gestione principale:

```bash
# Gestione interattiva del fuso orario
./tools/manage.sh timezone

# Comandi diretti per il fuso orario
./tools/manage.sh timezone show
./tools/manage.sh timezone auto
./tools/manage.sh timezone set Europe/London
```

## Validazione del Fuso Orario

Il sistema valida le impostazioni del fuso orario:
1. Controllando se il fuso orario esiste in `/usr/share/zoneinfo/`
2. Gestendo casi speciali come `UTC`
3. Fornendo messaggi di errore user-friendly per fusi orari non validi
4. Suggerendo alternative quando la validazione fallisce

## Fusi Orari Comuni

| Regione | Fuso Orario | Descrizione |
|---------|-------------|-------------|
| Europa | Europe/Rome | Italia |
| Europa | Europe/London | Regno Unito |
| Europa | Europe/Berlin | Germania |
| Europa | Europe/Paris | Francia |
| Europa | Europe/Madrid | Spagna |
| America | America/New_York | USA Est |
| America | America/Chicago | USA Centro |
| America | America/Denver | USA Montagna |
| America | America/Los_Angeles | USA Pacifico |
| Asia | Asia/Tokyo | Giappone |
| Asia | Asia/Shanghai | Cina |
| Asia | Asia/Kolkata | India |
| Globale | UTC | Tempo Universale Coordinato |

## Risoluzione dei Problemi

### Il Container Mostra il Fuso Orario Sbagliato
1. Controlla `env.conf` per l'impostazione corretta di `TIMEZONE`
2. Riavvia i container: `./tools/timezone_manager.sh restart`
3. Verifica il fuso orario dell'host: `timedatectl` o `date`

### Il Container Ollama Mostra "Europe" Invece di "CEST"
Questo è un problema di visualizzazione noto con il container Ollama. La funzionalità è corretta (l'orario ha l'offset appropriato), ma la visualizzazione del nome del fuso orario potrebbe mostrare "Europe" invece dell'abbreviazione del fuso orario prevista. Questo non influisce sul calcolo dell'orario effettivo o sul logging.

### Il Rilevamento Automatico Fallisce
Se il rilevamento automatico del fuso orario fallisce:
1. Imposta il fuso orario manualmente: `./tools/timezone_manager.sh set <fuso_orario>`
2. Controlla se `/etc/localtime` esiste sull'host
3. Verifica che il comando `timedatectl` sia disponibile

### I Cambiamenti Non Si Applicano
1. Assicurati che i container siano riavviati dopo i cambiamenti di configurazione
2. Controlla i log di Docker: `docker compose logs`
3. Verifica che la sintassi di `env.conf` sia corretta

## Dettagli Tecnici

### Metodi di Rilevamento del Fuso Orario dell'Host
Il sistema prova più metodi per rilevare il fuso orario dell'host:
1. `timedatectl show --property=Timezone --value`
2. `readlink /etc/localtime | sed 's|.*/zoneinfo/||'`
3. `cat /etc/timezone`

### Sincronizzazione dei Container
Entrambi i container utilizzano:
- Variabile d'ambiente `TZ` per l'impostazione del fuso orario
- Mount di `/etc/localtime` per la sincronizzazione a livello di sistema
- Validazione prima di applicare i cambiamenti

Questo garantisce una rappresentazione temporale coerente in tutta l'applicazione.
