'use client';

import { useState, useRef, useEffect } from 'react';

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
    <div className="w-56 flex-shrink-0 border-r border-border flex flex-col bg-panel">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-border text-muted font-mono text-xs flex-shrink-0">
        <span className="text-cyan">▸</span> AI ANALYST
      </div>
      
      <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2">
        {messages.map((message, index) => {
          const isUser = message.role === 'user';
          const displayContent = message.content.replace(/```json[\s\S]*?```/g, '').trim();
          
          return (
            <div 
              key={index}
              className="flex flex-col items-start animate-slide-in"
              style={{ alignItems: isUser ? 'flex-end' : 'flex-start' }}
            >
              <div 
                className={`max-w-[92%] px-2 py-1.5 rounded text-xs leading-relaxed whitespace-pre-wrap break-words ${
                  isUser 
                    ? 'bg-blue/20 border border-blue/40 text-text rounded-r-none' 
                    : message.err 
                    ? 'bg-red/10 border border-red/20 text-red rounded-l-none'
                    : 'bg-surface border border-border text-text rounded-l-none'
                }`}
              >
                {displayContent}
              </div>
              <span className="text-xs text-muted mt-0.5 font-mono">
                {new Date(message.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        
        {loading && (
          <div className="flex gap-1 p-1.5 items-center">
            <div className="w-1 h-1 rounded-full bg-cyan animate-pulse"></div>
            <div className="w-1 h-1 rounded-full bg-cyan animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-1 h-1 rounded-full bg-cyan animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            <span className="text-xs text-muted ml-1">analyzing...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="p-1.5 border-t border-border flex gap-1.5 items-end flex-shrink-0">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Analyze this chart..."
          rows={2}
          className="flex-1 resize-none text-xs leading-relaxed bg-surface border border-border text-text px-2 py-1 rounded outline-none focus:border-blue"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-2.5 py-1.5 rounded bg-blue text-white font-bold flex-shrink-0 text-sm disabled:bg-muted disabled:text-muted cursor-pointer hover:bg-blue/80 transition-colors"
        >
          ↑
        </button>
      </form>
    </div>
  );
}
