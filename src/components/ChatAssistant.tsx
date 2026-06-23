import React, { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../store';
import { Send, Settings, Sparkles, MessageSquare, Plus, RefreshCw, Trash2, ShieldAlert } from 'lucide-react';
import styles from './ChatAssistant.module.css';

export const ChatAssistant: React.FC = () => {
  const project = useEditorStore(state => state.project);
  const selectedSceneId = useEditorStore(state => state.selectedSceneId);
  const addScene = useEditorStore(state => state.addScene);
  const updateScene = useEditorStore(state => state.updateScene);
  const removeScene = useEditorStore(state => state.removeScene);
  
  const openRouterKey = useEditorStore(state => state.openRouterKey);
  const openRouterModel = useEditorStore(state => state.openRouterModel);
  const setConfigModalOpen = useEditorStore(state => state.setConfigModalOpen);

  const chatMessages = useEditorStore(state => state.chatMessages);
  const addChatMessage = useEditorStore(state => state.addChatMessage);
  const clearChatMessages = useEditorStore(state => state.clearChatMessages);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Record<number, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    if (!openRouterKey) {
      alert('Por favor, configure sua chave do OpenRouter nas configurações antes de enviar mensagens.');
      setConfigModalOpen(true);
      return;
    }

    const userText = textToSend;
    setInput('');
    addChatMessage({ role: 'user', content: userText });
    setLoading(true);

    try {
      const activeScene = selectedSceneId 
        ? project.cenas.find(c => c.id === selectedSceneId)
        : null;

      const payload = {
        prompt: userText,
        project,
        selectedSceneId,
        history: chatMessages,
        model: openRouterModel
      };

      const res = await fetch('/api/chat/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-openrouter-key': openRouterKey
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        // The API returns { message: "...", suggestion?: { action: "...", scene?: ... } }
        addChatMessage({ 
          role: 'assistant', 
          content: JSON.stringify(data) // store raw JSON to parse suggestion in render
        });
      } else {
        const errText = await res.text();
        addChatMessage({ 
          role: 'assistant', 
          content: `Falha ao processar requisição: ${errText || res.statusText}` 
        });
      }
    } catch (e: any) {
      console.error('Agent error:', e);
      addChatMessage({ 
        role: 'assistant', 
        content: `Erro de rede: ${e.message || 'Não foi possível conectar com o servidor.'}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplySuggestion = (suggestion: any, index: number) => {
    const { action, scene, sceneId } = suggestion;

    if (action === 'create' && scene) {
      addScene(scene);
    } else if (action === 'update' && scene && sceneId !== undefined) {
      updateScene(sceneId, scene);
    } else if (action === 'delete' && sceneId !== undefined) {
      removeScene(sceneId);
    }

    setAppliedSuggestions(prev => ({
      ...prev,
      [index]: true
    }));
  };

  const handleSuggestClick = (prompt: string) => {
    handleSend(prompt);
  };

  // Safe JSON parse for assistant messages containing suggestions
  const renderMessageContent = (msg: { role: 'user' | 'assistant'; content: string }, index: number) => {
    if (msg.role === 'user') {
      return <p className={styles.messageText}>{msg.content}</p>;
    }

    try {
      const parsed = JSON.parse(msg.content);
      const isApplied = appliedSuggestions[index];

      return (
        <div className={styles.aiResponse}>
          <p className={styles.messageText}>{parsed.message}</p>
          
          {parsed.suggestion && parsed.suggestion.action !== 'none' && (
            <div className={styles.suggestionCard}>
              <div className={styles.suggestionHeader}>
                <Sparkles size={14} className={styles.sparkleIcon} />
                <span>Sugestão de Alteração:</span>
                <span className={styles.actionBadge}>
                  {parsed.suggestion.action === 'create' && 'Criar Cena'}
                  {parsed.suggestion.action === 'update' && 'Atualizar Cena'}
                  {parsed.suggestion.action === 'delete' && 'Remover Cena'}
                </span>
              </div>
              
              <div className={styles.suggestionDetails}>
                {parsed.suggestion.scene && (
                  <>
                    <div><strong>Template:</strong> {parsed.suggestion.scene.template?.id}</div>
                    {parsed.suggestion.scene.narracao?.texto && (
                      <div><strong>Narração:</strong> {parsed.suggestion.scene.narracao.texto}</div>
                    )}
                  </>
                )}
                {parsed.suggestion.action === 'delete' && (
                  <div>Remover cena com ID {parsed.suggestion.sceneId} da timeline.</div>
                )}
              </div>

              <button
                className={`${styles.applyBtn} ${isApplied ? styles.applied : ''}`}
                onClick={() => handleApplySuggestion(parsed.suggestion, index)}
                disabled={isApplied}
              >
                {isApplied ? 'Alterações Aplicadas' : 'Aplicar Alterações'}
              </button>
            </div>
          )}
        </div>
      );
    } catch (e) {
      // Return raw content if not parseable JSON
      return <p className={styles.messageText}>{msg.content}</p>;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleContainer}>
          <Sparkles size={16} className={styles.sparkIcon} />
          <span>Assistente Criativo de IA</span>
        </div>
        <button 
          className={styles.settingsBtn} 
          onClick={() => setConfigModalOpen(true)}
          title="Configurar API OpenRouter"
        >
          <Settings size={16} />
        </button>
      </div>

      {!openRouterKey && (
        <div className={styles.warningAlert}>
          <ShieldAlert size={18} />
          <div className={styles.warningText}>
            <span>Chave do OpenRouter não configurada.</span>
            <button className={styles.warningBtn} onClick={() => setConfigModalOpen(true)}>
              Configurar Agora
            </button>
          </div>
        </div>
      )}

      <div className={styles.messageList}>
        {chatMessages.length === 0 && (
          <div className={styles.welcome}>
            <MessageSquare size={36} className={styles.welcomeIcon} />
            <h3>Como posso ajudar você a criar seu vídeo?</h3>
            <p>Posso escrever roteiros, sugerir templates, ajustar parâmetros visuais e automatizar a montagem do vídeo de forma inteligente.</p>
            
            <div className={styles.suggestionsGrid}>
              <button 
                className={styles.suggestBtn}
                onClick={() => handleSuggestClick('Crie uma cena de introdução com título "Vídeo Analytics"')}
              >
                <Plus size={12} /> Nova Introdução
              </button>
              <button 
                className={styles.suggestBtn}
                onClick={() => handleSuggestClick('Adicione uma cena de KPI com valor "98%" e legenda "Retenção"')}
              >
                <Plus size={12} /> Adicionar KPI
              </button>
              <button 
                className={styles.suggestBtn}
                onClick={() => handleSuggestClick('Mude o texto desta cena para "Inovação tecnológica a cada etapa"')}
              >
                <RefreshCw size={12} /> Mudar Texto
              </button>
              <button 
                className={styles.suggestBtn}
                onClick={() => handleSuggestClick('Remova a cena selecionada')}
              >
                <Trash2 size={12} /> Remover Cena
              </button>
            </div>
          </div>
        )}

        {chatMessages.map((msg, index) => (
          <div 
            key={index} 
            className={`${styles.messageRow} ${msg.role === 'user' ? styles.userRow : styles.aiRow}`}
          >
            <div className={styles.messageBubble}>
              {renderMessageContent(msg, index)}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className={`${styles.messageRow} ${styles.aiRow}`}>
            <div className={`${styles.messageBubble} ${styles.loadingBubble}`}>
              <div className={styles.typingIndicator}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputArea}>
        <input
          type="text"
          className={styles.input}
          placeholder="Peça para criar ou alterar uma cena..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend(input);
          }}
        />
        <button 
          className={styles.sendBtn}
          onClick={() => handleSend(input)}
          disabled={!input.trim() || loading}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};
