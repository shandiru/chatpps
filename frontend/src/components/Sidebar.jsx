import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function Sidebar({ selectedFriend, onSelectFriend, unreadCounts }) {
  const { user, logout } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [tab, setTab] = useState('friends'); // 'friends' | 'search' | 'requests'
  const [notification, setNotification] = useState('');

  useEffect(() => {
    fetchFriends();
    fetchPendingRequests();
  }, []);

  // Real-time: refresh pending requests when a friend request arrives
  useEffect(() => {
    if (!socket) return;
    const handleFriendRequest = () => {
      fetchPendingRequests();
    };
    const handleFriendAccepted = () => {
      fetchFriends();
      fetchPendingRequests();
    };
    socket.on('friend_request_received', handleFriendRequest);
    socket.on('friend_request_accepted', handleFriendAccepted);
    return () => {
      socket.off('friend_request_received', handleFriendRequest);
      socket.off('friend_request_accepted', handleFriendAccepted);
    };
  }, [socket]);

  const fetchFriends = async () => {
    try {
      const res = await api.get('/friends');
      setFriends(res.data);
    } catch {}
  };

  const fetchPendingRequests = async () => {
    try {
      const res = await api.get('/friends/pending');
      setPendingRequests(res.data);
    } catch {}
  };

  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    try {
      const res = await api.get(`/users/search?q=${q}`);
      setSearchResults(res.data);
    } catch {}
  };

  const sendFriendRequest = async (receiverId) => {
    try {
      await api.post('/friends/request', { receiverId });
      // Emit socket event so receiver gets real-time notification
      socket?.emit('friend_request_sent', { receiverId });
      setNotification('Friend request sent!');
      setTimeout(() => setNotification(''), 3000);
    } catch (err) {
      setNotification(err.response?.data?.message || 'Failed');
      setTimeout(() => setNotification(''), 3000);
    }
  };

  const respondRequest = async (requestId, action) => {
    try {
      await api.post('/friends/respond', { requestId, action });
      fetchPendingRequests();
      if (action === 'accept') fetchFriends();
    } catch {}
  };

  const isFriend = (userId) => friends.some(f => f._id === userId);

  const getAvatar = (u) => {
    if (u.avatar) return <img src={u.avatar} alt={u.username} className="w-full h-full object-cover" />;
    return <span className="text-sm font-semibold text-sepia">{u.username[0].toUpperCase()}</span>;
  };

  return (
    <div className="w-72 bg-parchment border-r border-border flex flex-col h-full">
      {/* User header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-cream border border-border flex items-center justify-center overflow-hidden">
            {getAvatar(user)}
          </div>
          <div>
            <p className="text-sm font-semibold text-ink leading-tight" style={{fontFamily:'Playfair Display, serif'}}>{user.username}</p>
            <p className="text-xs text-sepia">Online</p>
          </div>
        </div>
        <button onClick={logout} title="Sign out" className="text-sepia hover:text-rust text-xs uppercase tracking-widest transition-colors">
          Exit
        </button>
      </div>

      {/* Notification */}
      {notification && (
        <div className="mx-4 mt-3 px-3 py-2 bg-sage/10 border border-sage/30 text-sage text-xs rounded-sm">
          {notification}
        </div>
      )}

      {/* Search input */}
      <div className="px-4 pt-4 pb-2">
        <input
          value={searchQuery}
          onChange={handleSearch}
          onFocus={() => setTab('search')}
          placeholder="Search people…"
          className="w-full bg-cream border border-border rounded-sm px-3 py-2 text-sm text-ink placeholder-sepia/50 focus:outline-none focus:border-ink transition-colors"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mx-4 mb-1">
        {[
          { key: 'friends', label: 'Friends' },
          { key: 'requests', label: `Requests${pendingRequests.length ? ` (${pendingRequests.length})` : ''}` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSearchQuery(''); setSearchResults([]); }}
            className={`flex-1 py-2 text-xs uppercase tracking-widest transition-colors ${
              tab === t.key ? 'text-ink border-b-2 border-ink' : 'text-sepia hover:text-inklight'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Search results */}
        {tab === 'search' && (
          <div className="px-3 py-2">
            {searchQuery && searchResults.length === 0 && (
              <p className="text-xs text-sepia text-center py-6">No users found</p>
            )}
            {searchResults.map(u => (
              <div key={u._id} className="flex items-center justify-between px-2 py-2.5 hover:bg-cream/50 rounded-sm transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-cream border border-border flex items-center justify-center overflow-hidden">
                    {getAvatar(u)}
                  </div>
                  <div>
                    <p className="text-sm text-ink font-medium">{u.username}</p>
                    <p className="text-xs text-sepia">{u.email}</p>
                  </div>
                </div>
                {isFriend(u._id) ? (
                  <span className="text-xs text-sage">Friend</span>
                ) : (
                  <button
                    onClick={() => sendFriendRequest(u._id)}
                    className="text-xs text-ink border border-ink px-2 py-1 rounded-sm hover:bg-ink hover:text-cream transition-colors"
                  >
                    + Add
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Friends list */}
        {tab === 'friends' && (
          <div className="px-3 py-2">
            {friends.length === 0 && (
              <p className="text-xs text-sepia text-center py-8 italic">No friends yet.<br />Search to add people.</p>
            )}
            {friends.map(f => {
              const isOnline = onlineUsers[f._id] ?? f.isOnline;
              const unread = unreadCounts[f._id] || 0;
              const isSelected = selectedFriend?._id === f._id;
              return (
                <button
                  key={f._id}
                  onClick={() => onSelectFriend(f)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-sm transition-colors text-left ${
                    isSelected ? 'bg-ink text-cream' : 'hover:bg-cream/60 text-ink'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className={`w-9 h-9 rounded-full border flex items-center justify-center overflow-hidden ${isSelected ? 'border-cream/30' : 'border-border bg-cream'}`}>
                      {getAvatar(f)}
                    </div>
                    <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 ${isSelected ? 'border-ink' : 'border-parchment'} ${isOnline ? 'bg-sage' : 'bg-border'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-cream' : 'text-ink'}`}>{f.username}</p>
                    <p className={`text-xs truncate ${isSelected ? 'text-cream/60' : 'text-sepia'}`}>{isOnline ? 'Active now' : 'Offline'}</p>
                  </div>
                  {unread > 0 && !isSelected && (
                    <span className="bg-ink text-cream text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                      {unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Pending requests */}
        {tab === 'requests' && (
          <div className="px-3 py-2">
            {pendingRequests.length === 0 && (
              <p className="text-xs text-sepia text-center py-8 italic">No pending requests</p>
            )}
            {pendingRequests.map(req => (
              <div key={req._id} className="px-2 py-3 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-full bg-cream border border-border flex items-center justify-center overflow-hidden">
                    {getAvatar(req.sender)}
                  </div>
                  <div>
                    <p className="text-sm text-ink font-medium">{req.sender.username}</p>
                    <p className="text-xs text-sepia">{req.sender.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => respondRequest(req._id, 'accept')}
                    className="flex-1 bg-ink text-cream text-xs py-1.5 rounded-sm hover:bg-inklight transition-colors uppercase tracking-wider"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => respondRequest(req._id, 'reject')}
                    className="flex-1 bg-cream text-ink border border-border text-xs py-1.5 rounded-sm hover:border-rust hover:text-rust transition-colors uppercase tracking-wider"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
