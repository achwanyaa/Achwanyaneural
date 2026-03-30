'use client';

import { useState, useRef, useEffect } from 'react';
import { Brain, Send, Loader2, User, Bot } from 'lucide-react';

interface AIAnalystProps {
  messages: any[];
  loading: boolean;
  onSendMessage: (message: string) => void;
}

export default function AIAnalyst({ messages, loading, onSendMessage }: AIAnalystProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !loading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div className="w-64 flex-shrink-0 border-r border-[var(--border-primary)] flex flex-col bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-primary)] bg-[var(--bg-card)]">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-[var(--accent-cyan)]" />
          <span className="font-bold text-sm text-[var(--text-primary)]">AI Analyst</span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] font-medium">PRO</span>
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-b border-[var(--border-primary)]">
        <p className="text-xs text-[var(--text-muted)] mb-2">Quick Commands:</p>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => onSendMessage('Analyze the chart for buy/sell signals')}
            className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            📊 Analyze Chart
          </button>
          <button 
            onClick={() => onSendMessage('Give me a trade setup with entry, SL, TP')}
            className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            🎯 Trade Setup
          </button>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
            <p className="text-sm text-[var(--text-muted)]">Ready to analyze</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">XAUUSD 15M using ICT/SMC concepts</p>
          </div>
        )}
        
        {messages.map((message, index) => {
          const isUser = message.role === 'user';
          const displayContent = message.content.replace(/```json[\s\S]*?```/g, '').trim();
          
          return (
            <div 
              key={index}
              className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                isUser ? 'bg-[var(--accent-blue)]' : 'bg-[var(--accent-cyan)]/20'
              }`}>
                {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-[var(--accent-cyan)]" />}
              </div>
              
              <div className={`flex-1 max-w-[85%] ${isUser ? 'text-right' : ''}`}>
                <div 
                  className={`inline-block px-3 py-2 rounded-lg text-xs leading-relaxed whitespace-pre-wrap break-words text-left ${
                    isUser 
                      ? 'bg-[var(--accent-blue)] text-white' 
                      : message.err 
                      ? 'bg-[var(--bearish)]/10 border border-[var(--bearish)]/30 text-[var(--bearish)]'
                      : 'bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)]'
                  }`}
                >
                  {displayContent}
                </div>
                <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                  {new Date(message.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        
        {loading && (
          <div className="flex gap-2">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--accent-cyan)]/20 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-[var(--accent-cyan)] animate-spin" />
            </div>
            <div className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)]">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)] animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)] animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)] animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-[var(--border-primary)] bg-[var(--bg-card)]">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about market analysis..."
            rows={2}
            className="flex-1 resize-none text-xs leading-relaxed bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] px-3 py-2 rounded-lg outline-none focus:border-[var(--accent-cyan)] transition-colors"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-3 py-2 rounded-lg bg-[var(--accent-blue)] text-white font-semibold flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--accent-cyan)] transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
