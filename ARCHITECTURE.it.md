# Documentazione Architettura JavaScript

## 📁 Struttura Modulare

Questa applicazione utilizza un'architettura JavaScript modulare per migliorare la manutenibilità e la scalabilità.

### 🆕 Sistema Modulare (Nuovo)

#### `/static/js/modules/`

##### **Models** (`/modules/models/`)
- `models-main.js` - Inizializzazione e coordinamento principale
- `model-utils.js` - Funzioni utility per operazioni sui modelli
- `model-list.js` - Logica per visualizzazione lista modelli
- `model-download.js` - Gestione download/pull modelli
- `model-management.js` - Gestione cancellazione e operazioni sui modelli

##### **Chat** (`/modules/chat/`)
- `chat-main.js` - Coordinamento principale moduli chat
- `chat-ui.js` - Gestione interfaccia chat
- `chat-api.js` - Layer di comunicazione API
- `chat-debug.js` - Funzionalità di debug

##### **Document** (`/modules/document/`)
- `document-utils.js` - Utility per elaborazione documenti
- `document-list.js` - Gestione e visualizzazione lista documenti
- `document-upload.js` - Funzionalità upload file

##### **UI** (`/modules/ui/`)
- `ui-main.js` - Controller principale UI con auto-inizializzazione
- `modal-manager.js` - Gestione modali generica e riutilizzabile
- `settings-manager.js` - Gestione impostazioni e preferenze

##### **Utils** (`/modules/utils/`)
- `general-utils.js` - Funzioni utility generali (formattazione, validazione, etc.)
- `system-status.js` - Monitoraggio stato sistema e controlli salute

### 🔧 Sistema Legacy (Mantenuto per compatibilità)

#### `/static/js/`

##### **File Attivi**
- `themes.js` - Sistema temi (ben strutturato, rimane attivo)
- `chat.js` - Logica core chat (ben strutturato, rimane attivo)  
- `chat-history.js` - Gestione cronologia chat (classe ES6, rimane attivo)
- `main.js` - Inizializzazione principale (aggiornato, rimane attivo)
- `documents-main.js` - Coordinatore moduli documenti (rimane attivo)

## 🚀 Inizializzazione

### Ordine di Caricamento

1. **File Legacy**: Caricati tramite tag `<script>` tradizionali
2. **Moduli ES6**: Caricati tramite `import` nel blocco `<script type="module">`
3. **Auto-inizializzazione**: I moduli si inizializzano automaticamente

### Come Funziona

```html
<!-- File legacy per compatibilità -->
<script src="/static/js/themes.js"></script>
<script src="/static/js/chat.js"></script>
<script src="/static/js/chat-history.js"></script>

<!-- Moduli ES6 moderni -->
<script type="module">
  import initializeModels from '/static/js/modules/models/models-main.js';
  import '/static/js/modules/ui/ui-main.js'; // Auto-inizializza
  import '/static/js/modules/chat/chat-main.js'; // Auto-inizializza
  
  initializeModels();
</script>

<!-- Inizializzazione legacy -->
<script src="/static/js/main.js"></script>
```

## 🔄 Migrazione e Compatibilità

### Strategie

1. **Graduale**: I nuovi moduli coesistono con il sistema legacy
2. **Retrocompatibile**: Le funzioni globali rimangono disponibili
3. **Auto-inizializzazione**: I nuovi moduli si avviano automaticamente
4. **Documentazione**: Ogni file legacy ha note sulla migrazione

### Raccomandazioni Future

1. **Nuove funzionalità**: Utilizzare sempre il sistema modulare
2. **Refactoring**: Migrare gradualmente il codice legacy esistente
3. **Testing**: Testare ogni migrazione per assicurare compatibilità
4. **Documentazione**: Mantenere aggiornata questa documentazione

## 🎯 Benefici del Sistema Modulare

### Vantaggi Tecnici
- **Separazione delle responsabilità**: Ogni modulo ha uno scopo specifico
- **Riutilizzabilità**: Componenti riutilizzabili (es. modal-manager)
- **Manutenibilità**: Codice più facile da debuggare e modificare
- **Scalabilità**: Facile aggiungere nuove funzionalità
- **Performance**: Caricamento modulare e lazy loading

### Vantaggi Sviluppo
- **Documentazione**: JSDoc completo per tutti i moduli
- **Standard moderni**: Moduli ES6, classi, async/await
- **Gestione errori**: Gestione errori migliorata
- **Testing**: Più facile testare moduli isolati

## 📝 Note per Sviluppatori

### Aggiungere Nuove Funzionalità

1. Creare nuovo modulo in `/modules/[categoria]/`
2. Esportare funzioni/classi con `export`
3. Importare nel modulo principale appropriato
4. Documentare con JSDoc
5. Aggiornare questa documentazione

### Debugging

1. Utilizzare il sistema di debug modulare
2. Ogni modulo ha il proprio namespace console
3. Eventi personalizzati per comunicazione inter-modulo
4. Settings manager per abilitare/disabilitare debug

### Best Practices

1. **Singleton**: Usare pattern singleton per servizi condivisi
2. **Eventi**: Usare eventi personalizzati per comunicazione
3. **Gestione Errori**: Sempre try-catch con fallback graceful
4. **Documentazione**: JSDoc completo per tutte le funzioni pubbliche
5. **Naming**: Nomi descrittivi e namespace chiari
