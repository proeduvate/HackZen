import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const chatSeed = [
  { id: 1, sender: 'Ava', text: 'I have updated the research notes and included the accessibility checklist.', time: '09:12', mine: false },
  { id: 2, sender: 'You', text: 'Perfect — I will review it before the final team call.', time: '09:14', mine: true },
  { id: 3, sender: 'Rohan', text: 'Can we move the prototype review to 4 PM?', time: '09:20', mine: false },
];

const StudentChat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(chatSeed);
  const [draft, setDraft] = useState('');

  const sendMessage = () => {
    if (!draft.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: 'You', text: draft, time: 'Now', mine: true },
    ]);
    setDraft('');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">Team Chat</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Chat</h1>
        </div>
        <button onClick={() => navigate('/student/teams')} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200">
          Back to teams
        </button>
      </div>

      <div className="glass overflow-hidden rounded-[2rem] border border-white/10">
        <div className="border-b border-white/10 bg-black/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-gray-400">Team</p>
              <h2 className="text-xl font-bold text-white">Nova Forge</h2>
            </div>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">
              Online
            </span>
          </div>
        </div>

        <div className="space-y-4 p-6">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.mine ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-100'}`}>
                <p className="text-sm">{message.text}</p>
                <div className={`mt-2 text-[10px] uppercase tracking-[0.2em] ${message.mine ? 'text-violet-100' : 'text-gray-400'}`}>
                  {message.sender} • {message.time}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 bg-black/10 p-4">
          <div className="flex gap-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a message..."
              className="flex-1 rounded-xl border border-white/10 bg-navy-950/60 px-4 py-3 text-white placeholder:text-gray-500 focus:border-violet-500/50 focus:outline-none"
            />
            <button onClick={sendMessage} className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentChat;
