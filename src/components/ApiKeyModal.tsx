import React, { useState } from 'react';
import { useEditorStore } from '../store';
import { Eye, EyeOff, Check, X, ShieldAlert, Key } from 'lucide-react';
import styles from './ApiKeyModal.css.module.css';

export const ApiKeyModal: React.FC = () => {
  const isConfigModalOpen = useEditorStore(state => state.isConfigModalOpen);
  const setConfigModalOpen = useEditorStore(state => state.setConfigModalOpen);
  const openRouterKey = useEditorStore(state => state.openRouterKey);
  const setOpenRouterKey = useEditorStore(state => state.setOpenRouterKey);
  const openRouterModel = useEditorStore(state => state.openRouterModel);
  const setOpenRouterModel = useEditorStore(state => state.setOpenRouterModel);

  const [tempKey, setTempKey] = useState(openRouterKey);
  const [tempModel, setTempModel] = useState(openRouterModel);
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState('');

  if (!isConfigModalOpen) return null;

  const handleSave = () => {
    setOpenRouterKey(tempKey);
    setOpenRouterModel(tempModel);
    setConfigModalOpen(false);
  };

  const handleTestConnection = async () => {
    if (!tempKey.trim()) {
      setTestError('Insira uma chave de API para testar.');
      setTestStatus('error');
      return;
    }

    setTestStatus('testing');
    setTestError('');

    try {
      // Call our backend API agent endpoint with a dummy payload to test the credentials
      const res = await fetch('/api/chat/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-openrouter-key': tempKey
        },
        body: JSON.stringify({
          prompt: 'Diga "Conexão de teste bem-sucedida!" em poucas palavras.',
          project: {
            titulo: 'Test',
            configuracoes_globais: {
              resolucao: '1920x1080',
              fps: 30,
              formato_saida: 'mp4',
              audio: { sample_rate: 48000, bitrate: '320k', canais: 2, codec: 'aac', normalizar_volume: true }
            },
            trilha_sonora: { arquivo: '', volume: 0.1, loop: true },
            cenas: []
          },
          selectedSceneId: null,
          history: [],
          model: tempModel
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.error) {
          setTestError(data.error);
          setTestStatus('error');
        } else {
          setTestStatus('success');
        }
      } else {
        const errText = await res.text();
        setTestError(errText || 'Falha na resposta do servidor.');
        setTestStatus('error');
      }
    } catch (e: any) {
      console.error('Connection test failed:', e);
      setTestError(e.message || 'Erro de rede.');
      setTestStatus('error');
    }
  };

  return (
    <div className={styles.overlay} onClick={() => setConfigModalOpen(false)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleContainer}>
            <Key className={styles.headerIcon} />
            <h2 className={styles.title}>Configurações da API</h2>
          </div>
          <button className={styles.closeBtn} onClick={() => setConfigModalOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          <p className={styles.description}>
            Configure sua chave da API do <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className={styles.link}>OpenRouter</a> para poder usar o assistente de inteligência artificial. Sua chave é guardada localmente de forma segura em seu navegador.
          </p>

          <div className={styles.field}>
            <label className={styles.label}>Chave de API OpenRouter</label>
            <div className={styles.inputWrapper}>
              <input
                type={showKey ? 'text' : 'password'}
                className={styles.input}
                value={tempKey}
                placeholder="sk-or-v1-..."
                onChange={(e) => setTempKey(e.target.value)}
              />
              <button 
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Modelo da IA</label>
            <select
              className={styles.input}
              value={tempModel}
              onChange={(e) => setTempModel(e.target.value)}
            >
              <option value="google/gemini-2.5-flash">Gemini 2.5 Flash (Recomendado)</option>
              <option value="google/gemini-2.0-flash-lite:free">Gemini 2.0 Flash Lite (Grátis)</option>
              <option value="meta-llama/llama-3.3-70b-instruct">Llama 3.3 70B Instruct</option>
              <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (Avançado)</option>
            </select>
          </div>

          {testStatus === 'testing' && (
            <div className={styles.testAlert}>Testando credenciais da API do OpenRouter...</div>
          )}

          {testStatus === 'success' && (
            <div className={`${styles.testAlert} ${styles.alertSuccess}`}>
              <Check size={16} />
              <span>Conexão estabelecida com sucesso!</span>
            </div>
          )}

          {testStatus === 'error' && (
            <div className={`${styles.testAlert} ${styles.alertError}`}>
              <ShieldAlert size={16} />
              <div className={styles.errorContent}>
                <strong>Falha na conexão:</strong>
                <span>{testError}</span>
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button 
            className={styles.testBtn} 
            onClick={handleTestConnection}
            disabled={testStatus === 'testing'}
          >
            Testar Conexão
          </button>
          <div className={styles.actions}>
            <button className={styles.cancelBtn} onClick={() => setConfigModalOpen(false)}>
              Cancelar
            </button>
            <button className={styles.saveBtn} onClick={handleSave}>
              Salvar Configuração
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
