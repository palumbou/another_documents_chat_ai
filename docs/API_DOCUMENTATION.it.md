# Documentazione API

Questo documento fornisce una panoramica completa di tutti gli endpoint API disponibili nell'applicazione Document Chat AI.

## 📋 Indice

- [Sistema e Stato](#sistema-e-stato)
- [Gestione Progetti](#gestione-progetti)
- [Gestione Documenti](#gestione-documenti)
- [Chat e Cronologia Chat](#chat-e-cronologia-chat)
- [Gestione Modelli](#gestione-modelli)
- [Ricerca e Debug](#ricerca-e-debug)
- [Gestione Engine](#gestione-engine)

---

## 🖥️ Sistema e Stato

### GET `/status`
**Descrizione**: Ottiene lo stato generale del sistema inclusa connessione Ollama e informazioni engine  
**Risposta**: 
```json
{
  "connected": true,
  "engine": {
    "name": "llama3.1:8b",
    "available": true,
    "verified": true
  },
  "local_models": ["model1", "model2"]
}
```

### GET `/system/memory`
**Descrizione**: Ottiene informazioni sull'utilizzo corrente della memoria di sistema  
**Risposta**:
```json
{
  "total_gb": 16.0,
  "used_gb": 8.5,
  "available_gb": 7.5,
  "percent_used": 53.1
}
```

---

## 📁 Gestione Progetti

### GET `/projects`
**Descrizione**: Elenca tutti i progetti disponibili  
**Risposta**: Array di oggetti progetto con conteggio documenti e metadati

### POST `/projects`
**Descrizione**: Crea un nuovo progetto  
**Body**: `{"name": "nome_progetto"}`

### DELETE `/projects/{project_name}`
**Descrizione**: Elimina un progetto e tutti i suoi documenti

### GET `/projects/names`
**Descrizione**: Ottiene solo la lista dei nomi dei progetti

### GET `/projects/{project_name}/overview`
**Descrizione**: Ottiene panoramica dettagliata di un progetto specifico con statistiche documenti

### POST `/projects/{project_name}/refresh`
**Descrizione**: Aggiorna i dati del progetto e sincronizza con filesystem

### POST `/projects/move-document`
**Descrizione**: Sposta un documento da un progetto all'altro  
**Body**: `{"filename": "doc.pdf", "from_project": "vecchio", "to_project": "nuovo"}`

---

## 📄 Gestione Documenti

### GET `/documents`
**Descrizione**: Elenca tutti i documenti nel progetto corrente con stato di elaborazione
**Parametri Query**: `?project=nome_progetto`

### POST `/upload`
**Descrizione**: Carica nuovi file documento  
**Content-Type**: `multipart/form-data`

### DELETE `/documents/{doc_key}`
**Descrizione**: Elimina un documento specifico

### GET `/documents/{filename}/chunks`
**Descrizione**: Ottiene tutti i chunk/segmenti di un documento elaborato

### POST `/documents/reprocess/{filename}`
**Descrizione**: Rielabora un documento (utile se l'elaborazione è fallita)

### GET `/documents/status`
**Descrizione**: Ottiene lo stato di elaborazione di tutti i documenti

### GET `/documents/status/{filename}`
**Descrizione**: Ottiene lo stato di elaborazione di un documento specifico

### POST `/documents/{filename}/retry`
**Descrizione**: Riprova l'elaborazione di un documento fallito

### GET `/documents/watch`
**Descrizione**: Endpoint WebSocket per aggiornamenti real-time elaborazione documenti

---

## 💬 Chat e Cronologia Chat

### POST `/chat`
**Descrizione**: Invia un messaggio chat e ottiene risposta AI  
**Body**: 
```json
{
  "query": "La tua domanda qui",
  "model": "llama3.1:8b",
  "debug": false
}
```

### GET `/chats/{project_name}`
**Descrizione**: Ottiene tutte le sessioni chat per un progetto

### GET `/chats/{project_name}/{chat_id}`
**Descrizione**: Ottiene messaggi da una sessione chat specifica

### POST `/chats/{project_name}/new`
**Descrizione**: Crea una nuova sessione chat

### POST `/chats/{project_name}/{chat_id}/chat`
**Descrizione**: Invia messaggio in una sessione chat specifica

### DELETE `/chats/{project_name}/{chat_id}`
**Descrizione**: Elimina una sessione chat

### GET `/chats/{project_name}/{chat_id}/export`
**Descrizione**: Esporta sessione chat come file (JSON/Markdown)

---

## 🤖 Gestione Modelli

### GET `/models`
**Descrizione**: Ottiene tutti i modelli disponibili (locali e remoti) con informazioni sistema

### POST `/models/pull`
**Descrizione**: Scarica/pull un nuovo modello  
**Body**: `{"name": "llama3.1:8b"}`

### POST `/models/pull/stream`
**Descrizione**: Stream progresso download modello (Server-Sent Events)

### POST `/models/run`
**Descrizione**: Carica ed esegue un modello specifico  
**Body**: `{"name": "llama3.1:8b"}`

### DELETE `/models/{model_name}`
**Descrizione**: Elimina un modello locale

### POST `/models/validate`
**Descrizione**: Valida se un modello esiste ed è accessibile

### POST `/models/refresh_cache`
**Descrizione**: Aggiorna la cache dei modelli

### GET `/models/grouped`
**Descrizione**: Ottiene modelli raggruppati per categorie (dimensione, tipo, ecc.)

### POST `/models/cancel`
**Descrizione**: Annulla download modello in corso

---

## 🔍 Ricerca e Debug

### POST `/search-chunks`
**Descrizione**: Cerca attraverso i chunk dei documenti  
**Body**: 
```json
{
  "query": "termine ricerca",
  "project": "nome_progetto",
  "limit": 10
}
```

### GET `/debug/pdf/{filename}`
**Descrizione**: Ottiene informazioni debug sull'elaborazione PDF

### GET `/debug/pdf-plumber/{filename}`
**Descrizione**: Ottiene info debug estrazione testo PDF usando pdf-plumber

### GET `/debug/pdf-ocr/{filename}`
**Descrizione**: Ottiene info debug estrazione OCR PDF

---

## ⚙️ Gestione Engine

### POST `/engine/verify`
**Descrizione**: Verifica connettività e funzionalità engine AI corrente

### GET `/engine/health`
**Descrizione**: Ottiene stato di salute dettagliato dell'engine AI

---

## 📝 Formato Risposta

Tutte le risposte API seguono questo formato generale:

### Risposta Successo
```json
{
  "data": { ... },
  "message": "Operazione riuscita",
  "status": "success"
}
```

### Risposta Errore
```json
{
  "detail": "Descrizione errore",
  "status": "error"
}
```

## 🔒 Autenticazione

Attualmente, l'API non richiede autenticazione. Tutti gli endpoint sono pubblicamente accessibili quando l'applicazione è in esecuzione.

## 📊 Limitazione Rate

Nessuna limitazione rate è attualmente implementata, ma si raccomanda di evitare richieste concorrenti eccessive, specialmente per operazioni sui modelli e upload file.

## 🌐 URL Base

Quando in esecuzione localmente: `http://localhost:8000`  
Quando in esecuzione con Docker: `http://localhost:8000`

## 💡 Esempi d'Uso

### Controlla Stato Sistema
```bash
curl http://localhost:8000/status
```

### Carica un Documento
```bash
curl -X POST -F "files=@documento.pdf" -F "project=mio_progetto" \
  http://localhost:8000/upload
```

### Invia Messaggio Chat
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"query":"Spiega questo documento","debug":false}' \
  http://localhost:8000/chat
```

### Scarica un Modello
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"llama3.1:8b"}' \
  http://localhost:8000/models/pull
```
