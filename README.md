# CROM Video Studio - GUI (Interface do Usuário)

Este pacote contém a interface web (**React**) e o servidor ponte de execução (**Express**) do CROM Video Studio.

---

## 📂 Estrutura do Pacote

* **`src/`**: Aplicação frontend em React + TypeScript.
  * **`components/`**: Componentes da UI (como Timeline, PropertiesPanel, MediaGallery, ChatAssistant e ApiKeyModal).
  * **`store/`**: Estado global da aplicação gerenciado pelo **Zustand** (`index.ts`).
  * **`data/`**: Schemas de validação estática de templates.
* **`server/`**: Servidor intermediário Express (`server.cjs`). Ele se encarrega de:
  * Servir arquivos estáticos dos templates e ativos locais.
  * Executar a renderização física do vídeo chamando o binário `crom_bin` local.
  * Intermediar chamadas com o SDK de agentes inteligentes pela rota `/api/chat/agent`.
* **`output/`**: Diretório temporário gerado para depositar os arquivos MP4 gerados pelo renderizador e audios sintetizados via Edge-TTS.

---

## 🛠️ Como Executar

A partir deste diretório ou via proxy no diretório raiz:

### Executar Apenas o Frontend
```bash
npm run dev
```

### Executar Apenas o Servidor Ponte
```bash
npm run server
```

### Executar Ambos Simultaneamente
```bash
npm run dev:all
```

---

## 🧪 Testes

Este pacote vem equipado com testes automatizados integrando **Vitest**, **React Testing Library** e **JSDOM** cobrindo E2E de componentes de UI e rotas de servidores.

Para executar os testes:
```bash
npm run test
```
Para ver o painel visual do Vitest:
```bash
npm run test:ui
```
