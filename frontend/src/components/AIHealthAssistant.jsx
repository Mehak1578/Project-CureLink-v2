import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import axios from '../api';
import { AuthContext } from '../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ─── Rich UI sub-components ──────────────────────────────────────────────────

function StarRating({ rating, count }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="flex items-center gap-1 text-xs">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= full ? 'text-amber-400' : i === full + 1 && half ? 'text-amber-300' : 'text-slate-300'}>
          ★
        </span>
      ))}
      <span className="text-slate-500 ml-0.5">{rating > 0 ? rating.toFixed(1) : 'No ratings'}{count > 0 ? ` (${count})` : ''}</span>
    </span>
  );
}

function DoctorCard({ doctor, onSelect }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-sky-300 transition-all duration-200 flex flex-col gap-2">
      <div className="flex items-start gap-2.5">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
          {doctor.avatar
            ? <img src={doctor.avatar} alt={doctor.name} className="w-full h-full object-cover" />
            : doctor.name.charAt(0).toUpperCase()
          }
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-slate-800 text-sm leading-tight">{doctor.name}</p>
            {doctor.verified && (
              <span className="inline-flex items-center gap-0.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-1.5 py-0.5 font-medium">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                Verified
              </span>
            )}
          </div>
          <p className="text-sky-600 text-xs font-medium">{doctor.specialization}</p>
          <StarRating rating={doctor.rating} count={doctor.ratingCount} />
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {doctor.experience > 0 ? `${doctor.experience} yrs exp` : 'Experienced'}
        </span>
        {doctor.fees > 0 && (
          <span className="font-semibold text-slate-700">₹{doctor.fees}</span>
        )}
        {doctor.clinic && (
          <span className="truncate max-w-[80px]" title={doctor.clinic}>📍 {doctor.clinic}</span>
        )}
      </div>
      <button
        onClick={() => onSelect(doctor)}
        className="w-full mt-0.5 py-1.5 px-3 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1"
      >
        Select Doctor
      </button>
    </div>
  );
}

function SlotPicker({ richData, onSlotSelect }) {
  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });
    } catch { return dateStr; }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
      <p className="text-xs font-semibold text-slate-600 mb-2">
        📅 {richData.doctorName} — {formatDate(richData.date)}
      </p>
      <p className="text-xs text-slate-500 mb-2">Available slots:</p>
      <div className="flex flex-wrap gap-1.5">
        {richData.slots.map((slot) => (
          <button
            key={slot.value}
            onClick={() => onSlotSelect(slot)}
            className="px-2.5 py-1 bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold rounded-lg hover:bg-sky-600 hover:text-white hover:border-sky-600 transition-all focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {slot.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BookingConfirmCard({ richData }) {
  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-semibold text-emerald-800 text-sm">Appointment Booked!</p>
      </div>
      <div className="space-y-1 text-xs text-slate-700">
        <p><span className="font-medium">Doctor:</span> {richData.doctorName}{richData.specialization ? ` — ${richData.specialization}` : ''}</p>
        <p><span className="font-medium">Date:</span> {richData.date}</p>
        <p><span className="font-medium">Time:</span> {richData.timeSlot}</p>
        <p><span className="font-medium">Status:</span> <span className="capitalize text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">{richData.status}</span></p>
      </div>
      <p className="text-xs text-slate-500 mt-2">You can view this appointment in your dashboard.</p>
    </div>
  );
}

function DoctorListRich({ doctors, onSelectDoctor }) {
  return (
    <div className="space-y-2">
      {doctors.map((doctor) => (
        <DoctorCard key={doctor.doctorId} doctor={doctor} onSelect={onSelectDoctor} />
      ))}
    </div>
  );
}

// ─── Typing indicator ────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" />
        <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

// ─── Message bubble ──────────────────────────────────────────────────────────

function MessageBubble({ msg, onSelectDoctor, onSlotSelect }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`min-w-0 max-w-[90%] flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Text bubble */}
        {msg.content && (
          <div className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
            isUser
              ? 'bg-sky-600 text-white rounded-tr-none'
              : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
          }`}>
            {isUser ? (
              <p className="whitespace-pre-wrap">{msg.content}</p>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({node, ...props}) => <p className="mb-2 last:mb-0 whitespace-pre-wrap leading-relaxed" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 last:mb-0 space-y-1" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2 last:mb-0 space-y-1" {...props} />,
                  li: ({node, ...props}) => <li {...props} />,
                  strong: ({node, ...props}) => <strong className="font-semibold text-slate-900" {...props} />,
                  h1: ({node, ...props}) => <h1 className="text-base font-bold text-slate-900 mt-3 mb-1" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-base font-bold text-slate-900 mt-3 mb-1" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-sm font-bold text-slate-900 mt-2 mb-1" {...props} />,
                  table: ({node, ...props}) => (
                    <div className="overflow-x-auto mb-2 border border-slate-200 rounded-lg">
                      <table className="min-w-full text-left text-sm border-collapse" {...props} />
                    </div>
                  ),
                  th: ({node, ...props}) => <th className="border-b border-slate-200 py-1.5 px-3 font-semibold bg-slate-50 text-slate-800" {...props} />,
                  td: ({node, ...props}) => <td className="border-b border-slate-100 py-1.5 px-3" {...props} />,
                }}
              >
                {msg.content}
              </ReactMarkdown>
            )}
          </div>
        )}

        {/* Rich data rendering */}
        {msg.richData && msg.richData.type === 'doctorList' && (
          <DoctorListRich doctors={msg.richData.doctors} onSelectDoctor={onSelectDoctor} />
        )}
        {msg.richData && msg.richData.type === 'slotPicker' && (
          <SlotPicker richData={msg.richData} onSlotSelect={onSlotSelect} />
        )}
        {msg.richData && msg.richData.type === 'bookingConfirm' && (
          <BookingConfirmCard richData={msg.richData} />
        )}
      </div>
    </div>
  );
}

// ─── Quick action suggestions ─────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: '🔍 Find a cardiologist', msg: 'I need to see a cardiologist' },
  { label: '📅 Book appointment', msg: 'Help me book an appointment' },
  { label: '💊 Medicine info', msg: 'I have a health question' },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function AIHealthAssistant() {
  const { user } = useContext(AuthContext);
  const userKey = user?.id || user?._id || 'guest';
  const storageKey = `curelink_chat_history_${userKey}`;

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showNewChatConfirm, setShowNewChatConfirm] = useState(false);
  const defaultMessages = [
    {
      role: 'assistant',
      content: "Hi! I'm your CureLink AI Health Assistant. I can help you:\n\n• **Find doctors** and check availability\n• **Book appointments** through conversation\n• Answer **health and medicine questions**\n\nWhat can I help you with today?",
      richData: null,
    },
  ];

  const readStoredMessages = useCallback(() => {
    try {
      if (!userKey || userKey === 'guest') return defaultMessages;
      const saved = localStorage.getItem(storageKey);
      if (!saved) return defaultMessages;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) && parsed.length ? parsed : defaultMessages;
    } catch {
      return defaultMessages;
    }
  }, [defaultMessages, storageKey, userKey]);

  const [messages, setMessages] = useState(() => readStoredMessages());
  const [isResettingConversation, setIsResettingConversation] = useState(false);

  useEffect(() => {
    if (!userKey || userKey === 'guest') return;
    const stored = readStoredMessages();
    setMessages((prev) => {
      const hasSavedMessages = Array.isArray(stored) && stored.length > 1;
      if (hasSavedMessages && prev.length <= 1) {
        return stored;
      }
      if (!hasSavedMessages && prev.length <= 1) {
        return defaultMessages;
      }
      return prev;
    });
  }, [defaultMessages, readStoredMessages, userKey]);

  useEffect(() => {
    if (!userKey || userKey === 'guest') return;
    if (isResettingConversation) {
      localStorage.removeItem(storageKey);
      setIsResettingConversation(false);
      return;
    }
    if (Array.isArray(messages) && messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, storageKey, userKey, isResettingConversation]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  // Voice Interaction State
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);

  // Track pending booking context for confirmation flow
  const pendingBooking = useRef(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  // Track unread when closed
  useEffect(() => {
    if (!isOpen) {
      const assistantMessages = messages.filter(m => m.role === 'assistant');
      if (assistantMessages.length > 1) {
        setUnreadCount(1);
      }
    } else {
      setUnreadCount(0);
    }
  }, [isOpen, messages]);

  // Count only user messages (for context limit)
  const userMessageCount = messages.filter(m => m.role === 'user').length;
  const MAX_USER_MESSAGES = 20;

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        // Automatically send after setting input, wait a tick for state to update
        setTimeout(() => sendMessage(transcript), 100);
      };
      recognitionRef.current = recognition;
    }
  }, []); // eslint-disable-next-line react-hooks/exhaustive-deps

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const speakText = (text) => {
    stopSpeaking();
    if (!text) return;
    
    // Remove markdown symbols for better speech
    const cleanText = text.replace(/[#*`_]/g, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isLoading) return;
    if (userMessageCount >= MAX_USER_MESSAGES) {
      setError('Message limit reached. Please start a new session.');
      return;
    }

    const newUserMsg = { role: 'user', content: text.trim(), richData: null };
    const newMessages = [...messages, newUserMsg];

    setMessages(newMessages);
    setInput('');
    setError('');
    setIsLoading(true);

    try {
      // Send entire message objects (filtering out frontend richData)
      const apiMessages = newMessages.map(m => {
        const { richData, ...rest } = m;
        return rest;
      });
      const response = await axios.post('/api/ai/chat-with-tools', { messages: apiMessages });

      const appendedContext = response.data.newContext || [];
      if (appendedContext.length === 0) {
        appendedContext.push({ role: 'assistant', content: response.data.message || '' });
      }
      
      const lastMsg = appendedContext[appendedContext.length - 1];
      lastMsg.richData = response.data.richData || null;
      
      if (lastMsg.richData && lastMsg.richData.type === 'bookingConfirm') {
        window.dispatchEvent(new CustomEvent('appointmentBooked'));
        
        // Ensure there is some text confirmation in the chat
        if (!lastMsg.content) {
          lastMsg.content = `✓ Appointment confirmed with ${lastMsg.richData.doctorName}.`;
        }
        
        setMessages(prev => [...prev, ...appendedContext]);
        
        const { doctorName, date, timeSlot } = lastMsg.richData;
        speakText(`Your appointment with ${doctorName} has been successfully booked for ${date} at ${timeSlot}.`);
      } else {
        setMessages(prev => [...prev, ...appendedContext]);
        speakText(lastMsg.content);
      }
    } catch (err) {
      console.error('AI chat-with-tools error:', err);
      const errMsg = err.response?.data?.msg || 'Failed to get a response. Please try again.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, userMessageCount]);

  const handleSend = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  // When user clicks "Select Doctor" in a doctor card
  const handleSelectDoctor = useCallback((doctor) => {
    pendingBooking.current = { doctor };
    sendMessage(`I'd like to book an appointment with ${doctor.name}`);
  }, [sendMessage]);

  // When user clicks a time slot button
  const handleSlotSelect = useCallback((slot) => {
    sendMessage(`I'll take the ${slot.label} slot`);
  }, [sendMessage]);

  // Quick action handler
  const handleQuickAction = (msg) => {
    sendMessage(msg);
  };

  if (user?.role !== 'patient') return null;

  const hasMessages = messages.length > 1;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div
          className="mb-4 flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden transition-all duration-300"
          style={{
            width: '400px',
            maxWidth: 'calc(100vw - 3rem)',
            height: isMinimized ? '56px' : '580px',
            maxHeight: 'calc(100vh - 8rem)',
          }}
        >
          {/* ── Header ── */}
          <div className="bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-3 flex justify-between items-center text-white flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-base">🤖</div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-tight">AI Health Assistant</h3>
                <p className="text-xs text-sky-100">Find doctors · Book appointments · Health info</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowNewChatConfirm(true)}
                className="text-[11px] font-medium text-sky-100 hover:text-white px-2 py-1 rounded-md border border-white/20 hover:bg-white/10 transition-colors"
                title="Start a new chat"
              >
                ＋ New Chat
              </button>
              <button
                onClick={() => setIsMinimized(v => !v)}
                className="text-sky-100 hover:text-white p-1.5 rounded-lg transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized
                  ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                  : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                }
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-sky-100 hover:text-white p-1.5 rounded-lg transition-colors"
                title="Close"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {/* ── Body (hidden when minimized) ── */}
          {!isMinimized && (
            <>
              {showNewChatConfirm && (
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 shadow-sm">
                    <p className="font-medium mb-2">Start a new conversation? Your current chat history will be cleared.</p>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowNewChatConfirm(false)}
                        className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const resetMessages = [{
                            role: 'assistant',
                            content: "Hi! I'm your CureLink AI Health Assistant. I can help you find doctors, book appointments, and answer health questions. What can I help you with today?",
                            richData: null,
                          }];
                          setMessages(resetMessages);
                          setIsResettingConversation(true);
                          localStorage.removeItem(storageKey);
                          setShowNewChatConfirm(false);
                          setError('');
                          pendingBooking.current = null;
                        }}
                        className="px-3 py-1.5 text-xs font-medium rounded-md bg-sky-600 text-white hover:bg-sky-700 transition-colors"
                      >
                        New Chat
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50" id="ai-chat-messages">
                {/* Safety notice */}
                <div className="flex justify-center">
                  <span className="text-xs text-slate-400 bg-white border border-slate-100 rounded-full px-3 py-1">
                    🔒 General information only — not medical advice
                  </span>
                </div>

                {messages
                  .filter(msg => (msg.role === 'user' || msg.role === 'assistant') && (msg.content || msg.richData))
                  .map((msg, idx) => (
                    <MessageBubble
                      key={idx}
                      msg={msg}
                      onSelectDoctor={handleSelectDoctor}
                      onSlotSelect={handleSlotSelect}
                    />
                ))}

                {isLoading && <TypingIndicator />}

                {/* Quick actions (show only at start) */}
                {!hasMessages && !isLoading && (
                  <div className="flex flex-col gap-1.5 mt-2">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => handleQuickAction(action.msg)}
                        className="text-left px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 transition-all"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="p-3 bg-white border-t border-slate-100 flex-shrink-0">
                {error && (
                  <div className="mb-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 text-center">
                    {error}
                  </div>
                )}
                {userMessageCount >= MAX_USER_MESSAGES && (
                  <div className="mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-center">
                    Message limit reached. Please refresh to start a new session.
                  </div>
                )}
                <form onSubmit={handleSend} className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      userMessageCount >= MAX_USER_MESSAGES
                        ? 'Message limit reached'
                        : isLoading
                        ? 'AI is thinking...'
                        : isListening 
                        ? 'Listening...'
                        : 'Ask anything or describe symptoms...'
                    }
                    disabled={isLoading || userMessageCount >= MAX_USER_MESSAGES}
                    className="flex-1 rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:bg-slate-100 disabled:opacity-60 transition-colors"
                    id="ai-chat-input"
                  />
                  {recognitionRef.current && (
                    <button
                      type="button"
                      onClick={toggleListening}
                      disabled={isLoading || userMessageCount >= MAX_USER_MESSAGES}
                      className={`flex-shrink-0 rounded-full px-3 py-2 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                        isListening 
                          ? 'bg-red-500 hover:bg-red-600 focus:ring-red-500 animate-pulse' 
                          : 'bg-indigo-500 hover:bg-indigo-600 focus:ring-indigo-500'
                      }`}
                      title={isListening ? "Stop listening" : "Start speaking"}
                    >
                      🎤
                    </button>
                  )}
                  {isSpeaking && (
                    <button
                      type="button"
                      onClick={stopSpeaking}
                      className="flex-shrink-0 rounded-full bg-amber-500 hover:bg-amber-600 px-3 py-2 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors animate-pulse"
                      title="Stop speaking"
                    >
                      🔊
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading || userMessageCount >= MAX_USER_MESSAGES}
                    className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                    id="ai-chat-send"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </form>
                {/* Reset link */}
                {messages.length > 3 && (
                  <div className="mt-2 text-center">
                    <button
                      onClick={() => {
                        const resetMessages = [{
                          role: 'assistant',
                          content: "Hi! I'm your CureLink AI Health Assistant. I can help you find doctors, book appointments, and answer health questions. What can I help you with today?",
                          richData: null,
                        }];
                        setMessages(resetMessages);
                        setIsResettingConversation(true);
                        localStorage.removeItem(storageKey);
                        setError('');
                        pendingBooking.current = null;
                      }}
                      className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Start new conversation
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Toggle FAB ── */}
      <button
        onClick={() => {
          setIsOpen(v => !v);
          setIsMinimized(false);
          setUnreadCount(0);
        }}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-lg shadow-sky-500/40 hover:shadow-xl hover:shadow-sky-500/50 hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
        aria-label="Open AI Health Assistant"
        id="ai-assistant-toggle"
      >
        {isOpen
          ? <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          : <span className="text-2xl">🤖</span>
        }
        {/* Unread badge */}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center border-2 border-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
