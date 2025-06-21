# Utilizzo dello Script di Gestione

## Riferimento Rapido

```bash
# Mostra menu interattivo
./manage.sh

# Comandi diretti
./manage.sh install    # Installazione iniziale
./manage.sh start      # Avvia i servizi
./manage.sh stop       # Ferma i servizi
./manage.sh restart    # Riavvia i servizi
./manage.sh status     # Mostra stato dei container
./manage.sh logs       # Mostra log in tempo reale
./manage.sh update     # Aggiorna e ricostruisce
./manage.sh reset      # Resetta tutto (mantiene i dati)
./manage.sh remove     # Rimozione completa (CANCELLA I DATI!)
./manage.sh help       # Mostra aiuto
```

## Opzioni di Archiviazione Documenti

Durante l'installazione, puoi scegliere:

1. **Cartella del progetto** (`./web/docs`) - Buona per lo sviluppo
2. **Percorso personalizzato** - La tua directory
3. **Volume Docker** - Migliore per la produzione (sopravvive alla rimozione del container)

La scelta è salvata nel file `env.conf` e può essere modificata editando `DOCS_VOLUME`.

## Configurazione Ambiente

Modifica il file `env.conf` per personalizzare tutte le impostazioni:

```bash
# Servizio web
WEB_PORT=8000                    # Porta interfaccia web
WEB_CONTAINER_NAME=another-chat-web

# Servizio Ollama
OLLAMA_HOST=ollama               # Hostname Ollama
OLLAMA_PORT=11434                # Porta API Ollama
OLLAMA_CONTAINER_NAME=ollama

# Archiviazione documenti
DOCS_VOLUME=./web/docs           # Percorso archiviazione documenti

# Configurazione Docker
NETWORK_NAME=another-chat-network
RESTART_POLICY=unless-stopped
```

## Risoluzione Problemi

1. **Script non funziona**: Assicurati che sia eseguibile: `chmod +x manage.sh`
2. **Docker non trovato**: Lo script offrirà di installare Docker automaticamente
3. **Porte in uso**: Cambia `WEB_PORT` nel file `env.conf`
4. **Problemi di permessi**: Esegui con `sudo` se necessario per le operazioni Docker

Per istruzioni dettagliate, vedi [HOWTO.it.md](../HOWTO.it.md).

## Monitoraggio Salute e Endpoint API

### Monitoraggio Stato Sistema

Puoi monitorare la salute dell'applicazione usando questi endpoint:

```bash
# Controlla stato sistema generale
curl http://localhost:8000/status

# Monitora uso memoria
curl http://localhost:8000/system/memory

# Elenca modelli AI disponibili
curl http://localhost:8000/models
```

### Risposta Endpoint Status

```json
{
  "connected": true,
  "engine": {
    "name": "llama3.2:1b",
    "available": true,
    "responding": true,
    "verified": true
  },
  "local_models": ["llama3.2:1b", "gemma3:latest"],
  "total_models": 2,
  "error": null
}
```

### Monitoraggio Memoria

```json
{
  "total_gb": 7.72,
  "available_gb": 2.31,
  "used_gb": 5.41,
  "percent_used": 70.1
}
```

### Esempi Integrazione

```bash
# Script controllo salute
#!/bin/bash
STATUS=$(curl -s http://localhost:8000/status | jq -r '.connected')
if [ "$STATUS" = "true" ]; then
  echo "✅ Il servizio è in salute"
else
  echo "❌ Il servizio necessita attenzione"
fi

# Avviso memoria
MEMORY_USAGE=$(curl -s http://localhost:8000/system/memory | jq -r '.percent_used')
if (( $(echo "$MEMORY_USAGE > 90" | bc -l) )); then
  echo "⚠️  Alto uso memoria: ${MEMORY_USAGE}%"
fi
```
