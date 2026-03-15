import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import api from '../utils/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export default function ChatPage() {
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [showSidebar, setShowSidebar] = useState(true);
  const { socket } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    fetchUnreadCounts();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('new_message', (msg) => {
      const senderId = msg.sender._id || msg.sender;
      if (senderId !== user._id && senderId !== selectedFriend?._id) {
        setUnreadCounts(prev => ({
          ...prev,
          [senderId]: (prev[senderId] || 0) + 1
        }));
      }
    });

    socket.on('friend_request_received', () => {
      // Sidebar handles re-fetch via its own socket listener
    });

    return () => {
      socket.off('new_message');
      socket.off('friend_request_received');
    };
  }, [socket, user, selectedFriend]);

  const fetchUnreadCounts = async () => {
    try {
      const res = await api.get('/messages/unread');
      setUnreadCounts(res.data);
    } catch {}
  };

  const handleSelectFriend = (friend) => {
    setSelectedFriend(friend);
    setUnreadCounts(prev => ({ ...prev, [friend._id]: 0 }));
    // On mobile: hide sidebar, show chat
    setShowSidebar(false);
  };

  const handleMessageSent = () => {
    fetchUnreadCounts();
  };

  const handleBack = () => {
    setSelectedFriend(null);
    setShowSidebar(true);
  };

  return (
    <div className="h-screen flex bg-cream overflow-hidden">
      {/* Sidebar: always visible on md+, toggled on mobile */}
      <div className={`flex-shrink-0 w-72 h-full flex-col ${showSidebar ? 'flex' : 'hidden'} md:flex`}>
        <Sidebar
          selectedFriend={selectedFriend}
          onSelectFriend={handleSelectFriend}
          unreadCounts={unreadCounts}
        />
      </div>

      {/* Main area: always visible on md+, toggled on mobile */}
      <div className={`flex-1 min-w-0 ${!showSidebar ? 'flex' : 'hidden'} md:flex`}>
        {selectedFriend ? (
          <ChatWindow
            key={selectedFriend._id}
            friend={selectedFriend}
            onMessageSent={handleMessageSent}
            onBack={handleBack}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-cream text-center px-8">
            <div className="mb-6 opacity-10">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <rect x="8" y="16" width="64" height="48" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M8 24l32 22 32-22" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-ink/30 mb-2" style={{fontFamily:'Playfair Display, serif'}}>
              Select a conversation
            </h2>
            <p className="text-sm text-sepia/50 italic">Choose a friend from the sidebar to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
