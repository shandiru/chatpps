import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function ChatWindow({ friend, onMessageSent, onBack }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);
  const typingTimerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!friend) return;
    loadMessages();
  }, [friend]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      const isRelevant =
        (msg.sender._id === friend?._id && msg.receiver === user._id) ||
        (msg.sender._id === user._id && msg.receiver === friend?._id);
      if (isRelevant) {
        setMessages(prev => {
          const exists = prev.some(m => m._id === msg._id);
          if (exists) return prev;
          return [...prev, msg];
        });
        if (msg.sender._id === friend?._id) {
          socket.emit('mark_read', { senderId: friend._id });
          onMessageSent?.();
        }
      }
    };

    const handleTyping = ({ senderId, isTyping }) => {
      if (senderId === friend?._id) setIsTyping(isTyping);
    };

    socket.on('new_message', handleNewMessage);
    socket.on('typing', handleTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('typing', handleTyping);
    };
  }, [socket, friend, user]);

  const loadMessages = async () => {
    try {
      const res = await api.get(`/messages/${friend._id}`);
      setMessages(res.data);
      socket?.emit('mark_read', { senderId: friend._id });
      onMessageSent?.();
    } catch {}
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!typing) {
      setTyping(true);
      socket?.emit('typing', { receiverId: friend._id, isTyping: true });
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setTyping(false);
      socket?.emit('typing', { receiverId: friend._id, isTyping: false });
    }, 1500);
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;
    clearTimeout(typingTimerRef.current);
    socket?.emit('typing', { receiverId: friend._id, isTyping: false });
    setTyping(false);

    const content = input.trim();
    setInput('');
    setReplyTo(null);

    try {
      socket?.emit('send_message', {
        receiverId: friend._id,
        content,
        replyTo: replyTo?._id || null
      });
      onMessageSent?.();
    } catch {}
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Group messages by date
  const grouped = messages.reduce((acc, msg) => {
    const d = formatDate(msg.createdAt);
    if (!acc[d]) acc[d] = [];
    acc[d].push(msg);
    return acc;
  }, {});

  const getAvatar = (u) => {
    if (u.avatar) return <img src={u.avatar} alt="" className="w-full h-full object-cover" />;
    return <span className="text-xs font-semibold text-sepia">{u.username[0].toUpperCase()}</span>;
  };

  return (
    <div className="flex-1 flex flex-col bg-cream h-full">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-border bg-parchment flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Back button - mobile only */}
          {onBack && (
            <button onClick={onBack} className="md:hidden mr-1 p-1 text-sepia hover:text-ink transition-colors" aria-label="Back">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
          <div className="w-9 h-9 rounded-full bg-cream border border-border flex items-center justify-center overflow-hidden">
            {getAvatar(friend)}
          </div>
          <div>
            <p className="font-semibold text-ink text-sm" style={{fontFamily:'Playfair Display, serif'}}>{friend.username}</p>
            {isTyping
              ? <p className="text-xs text-sage italic">typing…</p>
              : <p className="text-xs text-sepia">{friend.isOnline ? 'Active now' : 'Offline'}</p>
            }
          </div>
        </div>
        <div className="text-sepia text-xs uppercase tracking-widest">Private</div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
        {Object.entries(grouped).map(([date, msgs]) => (
          <div key={date}>
            {/* Date divider */}
            <div className="flex items-center gap-3 my-4">
              <hr className="flex-1 border-border" />
              <span className="text-xs text-sepia uppercase tracking-widest px-2">{date}</span>
              <hr className="flex-1 border-border" />
            </div>

            {msgs.map((msg, i) => {
              const isMine = msg.sender._id === user._id || msg.sender === user._id;
              const senderId = msg.sender._id || msg.sender;
              const senderUsername = msg.sender.username || (isMine ? user.username : friend.username);
              const showAvatar = !isMine && (i === 0 || (msgs[i-1]?.sender?._id || msgs[i-1]?.sender) !== senderId);

              return (
                <div
                  key={msg._id}
                  className={`flex chat-bubble-enter ${isMine ? 'justify-end' : 'justify-start'} mb-1`}
                >
                  {/* Avatar placeholder for alignment */}
                  {!isMine && (
                    <div className="w-7 h-7 mt-1 mr-2 flex-shrink-0">
                      {showAvatar && (
                        <div className="w-7 h-7 rounded-full bg-parchment border border-border flex items-center justify-center overflow-hidden">
                          {getAvatar(friend)}
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`max-w-xs lg:max-w-sm group relative`}>
                    {/* Reply preview */}
                    {msg.replyTo && (
                      <div className={`mb-1 px-3 py-1.5 rounded-sm border-l-2 border-sepia bg-parchment/80 text-xs text-sepia truncate ${isMine ? 'text-right' : ''}`}>
                        <span className="font-medium">{msg.replyTo.sender?.username || '?'}: </span>
                        {msg.replyTo.content}
                      </div>
                    )}

                    <div
                      className={`px-4 py-2.5 rounded-sm relative cursor-pointer select-text ${
                        isMine
                          ? 'bg-ink text-cream rounded-br-none'
                          : 'bg-parchment border border-border text-ink rounded-bl-none'
                      }`}
                      onClick={() => setReplyTo(msg)}
                      title="Click to reply"
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <span className={`text-xs mt-1 block ${isMine ? 'text-cream/50 text-right' : 'text-sepia/70 text-right'}`}>
                        {formatTime(msg.createdAt)}
                        {isMine && msg.isRead && <span className="ml-1">✓✓</span>}
                      </span>
                    </div>

                    {/* Reply hint on hover */}
                    <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${isMine ? '-left-6' : '-right-6'}`}>
                      <span className="text-sepia text-xs">↩</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="text-4xl mb-3 opacity-20">✉</div>
            <p className="text-sepia text-sm italic">No messages yet.<br />Send the first one.</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Reply bar */}
      {replyTo && (
        <div className="mx-6 mb-1 px-4 py-2 bg-parchment border border-border rounded-sm flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-sepia uppercase tracking-widest mb-0.5">Replying to {replyTo.sender?.username || user.username}</p>
            <p className="text-sm text-ink truncate">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="ml-3 text-sepia hover:text-rust text-lg leading-none">×</button>
        </div>
      )}

      {/* Input */}
      <div className="px-6 py-4 border-t border-border bg-parchment">
        <form onSubmit={sendMessage} className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${friend.username}…`}
            rows={1}
            className="flex-1 bg-cream border border-border rounded-sm px-4 py-2.5 text-sm text-ink placeholder-sepia/50 focus:outline-none focus:border-ink resize-none transition-colors leading-relaxed"
            style={{ minHeight: '42px', maxHeight: '120px' }}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="bg-ink text-cream px-5 py-2.5 rounded-sm text-sm uppercase tracking-widest hover:bg-inklight transition-colors disabled:opacity-30 flex-shrink-0"
          >
            Send
          </button>
        </form>
        <p className="text-xs text-sepia/50 mt-1.5 ml-0.5">Click any message to reply · Enter to send</p>
      </div>
    </div>
  );
}
