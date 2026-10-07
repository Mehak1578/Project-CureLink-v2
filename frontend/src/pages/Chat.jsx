import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api';
import { useLocation } from 'react-router-dom';

const formatMessageTime = (date) =>
  new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export default function Chat() {
  const location = useLocation();
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedPeerId, setSelectedPeerId] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setUser(JSON.parse(localStorage.getItem('user') || '{}'));
  }, [location.pathname]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const doctorId = params.get('doctorId');
    if (doctorId) setSelectedPeerId(doctorId);
  }, [location.search]);

  const loadThreads = async () => {
    try {
      const response = await axios.get('/api/messages/conversations');
      const nextThreads = response.data || [];
      setThreads(nextThreads);
      if (!selectedPeerId && nextThreads.length) {
        const nextPeer = user?.role === 'doctor' ? nextThreads[0].patientId : nextThreads[0].doctorId;
        setSelectedPeerId(nextPeer || '');
      }
    } catch (error) {
      console.error('Unable to load threads', error);
    }
  };

  useEffect(() => {
    loadThreads();
  }, [user?.id]);

  useEffect(() => {
    const loadConversation = async () => {
      if (!selectedPeerId) {
        setMessages([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(`/api/messages/conversation/${selectedPeerId}`);
        setMessages(response.data || []);
      } catch (error) {
        console.error('Unable to load conversation', error);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    loadConversation();
  }, [selectedPeerId, user?.id]);

  const activePeerName = useMemo(() => {
    if (!selectedPeerId) return 'No conversation selected';

    const thread = threads.find((item) =>
      user?.role === 'doctor'
        ? item.patientId === selectedPeerId
        : item.doctorId === selectedPeerId,
    );

    return thread
      ? (user?.role === 'doctor' ? thread.patientName : thread.doctorName)
      : 'Conversation';
  }, [selectedPeerId, threads, user?.role]);

  const sendMessage = async () => {
    if (!selectedPeerId || !text.trim()) return;

    setSending(true);
    try {
      const payload = user?.role === 'doctor'
        ? { patientId: selectedPeerId, text: text.trim() }
        : { doctorId: selectedPeerId, text: text.trim() };

      await axios.post('/api/messages/send', payload);
      setText('');
      await loadThreads();
      const response = await axios.get(`/api/messages/conversation/${selectedPeerId}`);
      setMessages(response.data || []);
    } catch (error) {
      console.error('Unable to send message', error);
      alert(error.response?.data?.msg || 'Could not send the message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="container-max max-w-6xl">
        <div className="card overflow-hidden p-0">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
            <p className="mt-1 text-sm text-slate-500">
              Private conversations with your care team.
            </p>
          </div>

          <div className="grid min-h-[620px] lg:grid-cols-[320px_1fr]">
            <aside className="border-b border-slate-200 bg-white lg:border-b-0 lg:border-r">
              <div className="max-h-[620px] overflow-y-auto">
                {threads.length === 0 ? (
                  <div className="p-5 text-sm text-slate-500">
                    No private conversations yet.
                  </div>
                ) : (
                  threads.map((thread) => {
                    const peerId = user?.role === 'doctor' ? thread.patientId : thread.doctorId;
                    const peerName = user?.role === 'doctor' ? thread.patientName : thread.doctorName;

                    return (
                      <button
                        key={peerId}
                        type="button"
                        onClick={() => setSelectedPeerId(peerId)}
                        className={`w-full border-b border-slate-100 p-4 text-left transition-colors ${selectedPeerId === peerId ? 'bg-sky-50' : 'hover:bg-slate-50'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-900">{peerName}</p>
                          </div>
                          {thread.unreadCount > 0 && (
                            <span className="rounded-full bg-sky-600 px-2 py-0.5 text-xs font-semibold text-white">
                              {thread.unreadCount}
                            </span>
                          )}
                        </div>

                        <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                          {thread.lastMessage}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          {formatMessageTime(thread.lastMessageAt)}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            <div className="flex min-h-[620px] flex-col bg-white">
              {!selectedPeerId ? (
                <div className="flex flex-1 items-center justify-center p-6 text-center text-slate-500">
                  Select a conversation to view the thread.
                </div>
              ) : (
                <>
                  <div className="border-b border-slate-200 px-5 py-4">
                    <h2 className="text-lg font-bold text-slate-900">{activePeerName}</h2>
                  </div>

                  <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-5">
                    {loading ? (
                      <div className="text-sm text-slate-500">Loading messages...</div>
                    ) : messages.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                        No messages in this conversation yet. Send the first message.
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isMine = String(message.from) === String(user?.id);
                        return (
                          <div key={message._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                                isMine ? 'bg-sky-600 text-white' : 'bg-white text-slate-800'
                              }`}
                            >
                              <p className="whitespace-pre-wrap text-sm leading-6">{message.text}</p>
                              <p className={`mt-2 text-[10px] ${isMine ? 'text-sky-100' : 'text-slate-400'}`}>
                                {formatMessageTime(message.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="border-t border-slate-200 bg-white p-4">
                    <div className="flex gap-3">
                      <textarea
                        rows={3}
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        placeholder="Type your message..."
                        className="field-input min-h-[88px] flex-1 resize-none"
                      />
                      <button
                        type="button"
                        disabled={sending || !text.trim()}
                        onClick={sendMessage}
                        className="btn btn-primary self-end"
                      >
                        {sending ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
