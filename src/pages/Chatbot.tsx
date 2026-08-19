import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, BookOpen, Map, ArrowRight } from 'lucide-react';
import { cn } from '../utils';

export default function Chatbot() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Halo! Saya Compass AI, asisten akademikmu di FTMM Universitas Airlangga. Ada yang bisa saya bantu terkait rencana studimu hari ini?' }
  ]);
  const [input, setInput] = useState('');
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    const userMsg = input;
    setInput('');

    // Simulate AI response
    setTimeout(() => {
      let aiResponse = "Maaf, saya belum memahami pertanyaan itu. Bisa tolong ulangi?";
      if (userMsg.toLowerCase().includes('data science') || userMsg.toLowerCase().includes('rekomendasi')) {
        aiResponse = "Untuk track Data Science, saya sangat merekomendasikan mata kuliah: \n1. Machine Learning (II4042)\n2. Deep Learning (II4050)\n3. Data Visualization (II4045)\nPastikan kamu sudah mengambil Aljabar Linear sebagai prasyaratnya ya!";
      } else if (userMsg.toLowerCase().includes('krs') || userMsg.toLowerCase().includes('planning')) {
        aiResponse = "Tentu, mari kita lihat rencana KRS-mu. Saat ini ada konflik jadwal antara Machine Learning dan Data Visualization di hari Selasa. Ingin saya carikan kelas alternatif?";
      }

      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    }, 1000);
  };

  return (
    <div className="h-full flex flex-col bg-surface border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="p-4 border-b border-border bg-navy text-white flex justify-between items-center relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-gold/20 rounded-full blur-3xl" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
            <Sparkles className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg">Compass AI</h3>
            <p className="text-xs text-teal-light font-mono">Online • Powered by FTMM</p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background/30">
        {messages.map((msg, idx) => (
          <div key={idx} className={cn("flex gap-3 max-w-[80%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
              msg.role === 'user' ? "bg-teal text-white" : "bg-navy text-white"
            )}>
              {msg.role === 'user' ? 'U' : 'AI'}
            </div>
            <div className={cn(
              "p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm",
              msg.role === 'user' 
                ? "bg-teal text-white rounded-tr-none" 
                : "bg-surface border border-border text-foreground rounded-tl-none"
            )}>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div className="px-6 py-4 flex gap-2 overflow-x-auto scrollbar-hide border-t border-border bg-background/50">
          {[
            { icon: BookOpen, text: "Info Prasyarat Matkul" },
            { icon: Map, text: "Review Rencana Studi" },
            { icon: Sparkles, text: "Rekomendasi Track Data Science" }
          ].map((sug, i) => (
            <button 
              key={i}
              onClick={() => setInput(sug.text)}
              className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-full text-xs font-medium text-navy hover:border-gold hover:text-gold transition-colors whitespace-nowrap"
            >
              <sug.icon className="w-3.5 h-3.5" />
              {sug.text}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-surface border-t border-border">
        <div className="relative flex items-center">
          <input 
            type="text" 
            placeholder="Tanyakan sesuatu tentang akademikmu..."
            className="w-full pl-4 pr-12 py-3 rounded-xl border border-border bg-background focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all text-sm font-sans"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim()}
            className="absolute right-2 p-2 bg-navy text-white rounded-lg hover:bg-navy-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-center text-muted mt-2">
          Compass AI dapat membuat kesalahan. Harap verifikasi informasi penting dengan Dosen Wali.
        </p>
      </div>

    </div>
  );
}
