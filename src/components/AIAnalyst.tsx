'use client';

import { useState, useRef, useEffect } from 'react';
import { Brain, Send, Loader2, X } from 'lucide-react';

interface AIAnalystProps {
  messages: any[];
  loading: boolean;
  onSendMessage: (message: string) => void;
  onClose?: () => void;
  isMobile?: boolean;
}

export default function AIAnalyst({ messages, loading, onSendMessage, onClose, isMobile }: AIAnalystProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const quickCommands = [
    { label: '📊 Analyze Chart', command: 'Analyze the chart for buy/sell signals' },
    { label: '🎯 Trade Setup', command: 'Give me a trade setup with entry, SL, TP' },
    { label: '📍 ICT Levels', command: 'Show me ICT levels and order blocks' },
  ];

  return (
    <div className={`${isMobile ? 'w-full' : 'w-80'} flex-shrink-0 border-r border-[#00f5ff]/10 flex flex-col bg-[#1a1a1a] h-full`}>
      {/* Neural Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#00f5ff]/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-2xl flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-white text-sm">AI Analyst</h2>
            <p className="text-[10px] text-[#00f5ff]">PRO • Powered by Neural Engine</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-[#00f5ff]/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Brain className="w-6 h-6 text-[#00f5ff]" />
            </div>
            <p className="text-sm text-gray-400">Ready to analyze</p>
            <p className="text-xs text-gray-500 mt-1">XAUUSD 15M using ICT/SMC</p>
          </div>
        )}
        
        {messages.map((message, index) => {
          const isUser = message.role === 'user';
          const displayContent = message.content.replace(/```json[\s\S]*?```/g, '').trim();
          
          return (
            <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser 
                    ? 'bg-[#00f5ff] text-black' 
                    : message.err 
                      ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                      : 'bg-[#252525] text-gray-300'
                }`}
              >
                {displayContent}
              </div>
            </div>
          );
        })}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#252525] px-4 py-3 rounded-2xl flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-[#00f5ff] animate-spin" />
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-[#00f5ff] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-[#00f5ff] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-[#00f5ff] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Commands */}
      <div className="p-4 border-t border-[#00f5ff]/10">
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Quick Commands</p>
        <div className="flex flex-wrap gap-2">
          {quickCommands.map((cmd, i) => (
            <button
              key={i}
              onClick={() => onSendMessage(cmd.command)}
              className="px-3 py-1.5 bg-[#252525] hover:bg-[#00f5ff] hover:text-black text-gray-400 text-xs font-medium rounded-full border border-[#00f5ff]/20 hover:border-[#00f5ff] transition-all"
            >
              {cmd.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-[#00f5ff]/20">
        <div className="flex bg-[#252525] rounded-2xl px-4 py-3 items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI to analyze the chart..."
            className="flex-1 bg-transparent outline-none text-sm text-white placeholder-gray-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="text-[#00f5ff] disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-center text-gray-500 mt-2">Ask anything • Real-time neural analysis</p>
      </form>
    </div>
  );
}
