import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/api';
import { getMyTeams } from '../../api/teamApi';

const formatMessageTime = (value) => {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const StudentChat = () => {
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const [team, setTeam] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
  const userId = currentUser._id || currentUser.id || currentUser.userId || 'guest';
  const userName = currentUser.name || 'You';

  useEffect(() => {
    const loadTeamAndMessages = async () => {
      setLoading(true);
      try {
        const teams = await getMyTeams();
        const activeTeam = teams?.[0] || null;
        setTeam(activeTeam);

        if (!activeTeam) {
          setMessages([]);
          return;
        }

        const teamId = activeTeam.id || activeTeam._id;
        const { data } = await apiClient.get(`/chat/${teamId}/messages`);
        setMessages((data || []).map((msg) => ({
          id: msg._id || msg.id,
          sender: msg.senderName || msg.senderId || 'Team member',
          text: msg.content || '',
          time: formatMessageTime(msg.createdAt),
          mine: String(msg.senderId) === String(userId),
        })));
      } catch (error) {
        console.error('Failed to load team chat messages:', error);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    loadTeamAndMessages();
  }, [userId]);

  useEffect(() => {
    if (!team) return undefined;

    const teamId = team.id || team._id;
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const backendBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/api$/, '');
    const wsBase = backendBase.replace(/^http/, 'ws');
    const socketUrl = token ? `${wsBase}/api/chat/ws/${teamId}/${userId}?token=${encodeURIComponent(token)}` : `${wsBase}/api/chat/ws/${teamId}/${userId}`;
    const socket = new WebSocket(socketUrl);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (!payload?.message) return;
      const message = payload.message;
      setMessages((current) => {
        const exists = current.some((item) => String(item.id) === String(message._id || message.id));
        if (exists) return current;
        return [
          ...current,
          {
            id: message._id || message.id || Date.now(),
            sender: message.senderName || message.senderId || 'Team member',
            text: message.content || '',
            time: formatMessageTime(message.createdAt),
            mine: String(message.senderId) === String(userId),
          },
        ];
      });
    };

    socket.onerror = () => {
      setErrorMessage('Real-time chat is temporarily unavailable. Messages can still be loaded from the team history when available.');
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    };
  }, [team, userId]);

  const sendMessage = async () => {
    const trimmed = draft.trim();
    if (!trimmed || !team) return;

    const teamId = team.id || team._id;
    setSending(true);
    setErrorMessage('');

    try {
      const { data } = await apiClient.post(`/chat/${teamId}/send`, {
        content: trimmed,
        type: 'text',
      });

      setMessages((current) => [
        ...current,
        {
          id: data?._id || Date.now(),
          sender: data?.senderName || userName,
          text: data?.content || trimmed,
          time: formatMessageTime(data?.createdAt),
          mine: true,
        },
      ]);
      setDraft('');
    } catch (error) {
      console.error('Failed to send chat message:', error);
      const backendDetail = error?.response?.data?.error?.message || error?.response?.data?.detail || error?.message;
      const message = typeof backendDetail === 'string'
        ? backendDetail
        : 'The message could not be saved. Please try again.';
      setErrorMessage(message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-10 animate-in fade-in duration-500">
        <div className="glass rounded-[2rem] border border-white/10 p-8 text-center text-gray-300">Loading team chat…</div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="mx-auto max-w-5xl pb-10">
        <div className="glass rounded-[2rem] border border-dashed border-white/10 bg-white/5 p-10 text-center">
          <h2 className="text-2xl font-bold text-white">No team chat available</h2>
          <p className="mt-3 text-gray-400">Join or create a team to start viewing and sending team chat messages.</p>
        </div>
      </div>
    );
  }

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
              <h2 className="text-xl font-bold text-white">{team.teamName || 'Team Chat'}</h2>
            </div>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">
              Connected
            </span>
          </div>
        </div>

        <div className="space-y-4 p-6 min-h-[280px]">
          {messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-gray-400">
              No messages have been posted in this team yet.
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex ${message.mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.mine ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-100'}`}>
                  <p className="text-sm">{message.text}</p>
                  <div className={`mt-2 text-[10px] uppercase tracking-[0.2em] ${message.mine ? 'text-violet-100' : 'text-gray-400'}`}>
                    {message.sender} • {message.time}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {errorMessage && (
          <div className="mx-6 mb-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{errorMessage}</div>
        )}

        <div className="border-t border-white/10 bg-black/10 p-4">
          <div className="flex gap-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a message..."
              className="flex-1 rounded-xl border border-white/10 bg-navy-950/60 px-4 py-3 text-white placeholder:text-gray-500 focus:border-violet-500/50 focus:outline-none"
            />
            <button disabled={sending || !draft.trim()} onClick={sendMessage} className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70">
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentChat;
