import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';

const SocketContext = createContext();

// Polling interval in ms — 3 seconds
const POLL_INTERVAL = 3000;

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState({});
  const [newMessages, setNewMessages] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [friendRequestAlert, setFriendRequestAlert] = useState(false);
  const lastPollTime = useRef(new Date().toISOString());
  const intervalRef = useRef(null);

  const poll = useCallback(async () => {
    try {
      const res = await api.get(`/messages/poll-status?since=${lastPollTime.current}`);
      const data = res.data;
      lastPollTime.current = data.serverTime;

      // Update online statuses
      if (data.onlineStatuses?.length) {
        setOnlineUsers(prev => {
          const updated = { ...prev };
          data.onlineStatuses.forEach(({ userId, isOnline }) => {
            updated[userId] = isOnline;
          });
          return updated;
        });
      }

      // Push new incoming messages for listeners
      if (data.newMessages?.length) {
        setNewMessages(data.newMessages);
      }

      // Update unread counts
      if (data.unreadCounts) {
        setUnreadCounts(data.unreadCounts);
      }

      // Friend request check — if pending count changed, signal sidebar
      if (data.pendingFriendRequests > 0) {
        setFriendRequestAlert(true);
      }
    } catch {
      // Silently ignore poll errors (network blip etc.)
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    // Initial poll immediately
    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [user, poll]);

  return (
    <SocketContext.Provider value={{ onlineUsers, newMessages, unreadCounts, friendRequestAlert, setFriendRequestAlert }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
