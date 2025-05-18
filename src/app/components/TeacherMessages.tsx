'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { io, Socket } from 'socket.io-client';

type Parent = {
  id: string;
  name: string;
  email: string;
  role: string;
  image: string | null;
  studentName: string;
};

type Message = {
  id: string;
  subject: string | null;
  content: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  senderId: string;
  receiverId: string;
  sender: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: string;
  };
  receiver?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: string;
  };
};

export default function TeacherMessages() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'compose'>('inbox');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Compose message state
  const [selectedParent, setSelectedParent] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  
  // Socket.IO state
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  
  // Socket.IO connection setup
  useEffect(() => {
    if (!session?.user?.id) return;
    
    // Initialize socket connection
    if (!socketRef.current) {
      // First, ping the socket endpoint to ensure it's running
      fetch('/api/socket')
        .then(() => {
          // Connect to Socket.IO server
          socketRef.current = io('', {
            path: '/api/socketio',
            autoConnect: true,
          });
          
          // Set up event handlers
          socketRef.current.on('connect', () => {
            console.log('Socket connected:', socketRef.current?.id);
            setIsConnected(true);
            
            // Join user-specific room
            socketRef.current?.emit('join-user', session.user.id);
          });
          
          socketRef.current.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
          });
          
          socketRef.current.on('new-message', (message: Message) => {
            console.log('New message received:', message);
            
            // If the message is for this user (received)
            if (message.receiverId === session.user.id) {
              setMessages(prev => [message, ...prev]);
              setNewMessageCount(prev => prev + 1);
              
              // If this message is currently selected, mark it as read
              if (selectedMessage && selectedMessage.id === message.id) {
                markAsRead(message.id);
              }
            }
            
            // If the message is from this user (sent)
            if (message.senderId === session.user.id) {
              setSentMessages(prev => [message, ...prev]);
            }
          });
          
          socketRef.current.on('message-read', (messageId: string) => {
            // Update the read status of the message in both messages and sentMessages
            setMessages(prev => prev.map(msg => 
              msg.id === messageId ? { ...msg, isRead: true, readAt: new Date().toISOString() } : msg
            ));
            
            setSentMessages(prev => prev.map(msg => 
              msg.id === messageId ? { ...msg, isRead: true, readAt: new Date().toISOString() } : msg
            ));
          });
        })
        .catch(err => {
          console.error('Error connecting to socket:', err);
        });
    }
    
    // Cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [session]);
  
  // Fetch messages and parents of students
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch received messages
        const receivedResponse = await fetch('/api/messages?type=received');
        if (!receivedResponse.ok) {
          throw new Error('Failed to fetch received messages');
        }
        const receivedData = await receivedResponse.json();
        setMessages(receivedData?.messages || []);
        
        // Fetch sent messages
        const sentResponse = await fetch('/api/messages?type=sent');
        if (!sentResponse.ok) {
          throw new Error('Failed to fetch sent messages');
        }
        const sentData = await sentResponse.json();
        setSentMessages(sentData?.messages || []);
        
        // Fetch parents of students in teacher's classes
        const parentsResponse = await fetch('/api/teacher/students/parents');
        if (!parentsResponse.ok) {
          throw new Error('Failed to fetch parents');
        }
        const parentsData = await parentsResponse.json();
        setParents(parentsData?.parents || []);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again later.');
        setLoading(false);
      }
    };
    
    if (session) {
      fetchData();
    }
  }, [session]);
  
  // Send a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedParent || !content) {
      setError('Please select a recipient and enter a message.');
      return;
    }
    
    try {
      setSending(true);
      setError(null);
      
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: selectedParent,
          subject,
          content,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }
      
      const data = await response.json();
      const newMessage = data.message;
      
      // Emit the message via Socket.IO if connected
      if (socketRef.current && isConnected) {
        socketRef.current.emit('send-message', newMessage);
      }
      
      // Reset form
      setSelectedParent('');
      setSubject('');
      setContent('');
      setSendSuccess(true);
      
      // Add the new message to sentMessages
      setSentMessages(prev => [newMessage, ...prev]);
      
      // Switch to sent tab
      setActiveTab('sent');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSendSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      setSending(false);
    } finally {
      setSending(false);
    }
  };
  
  // Mark message as read
  const markAsRead = async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/read`, {
        method: 'PUT',
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark message as read');
      }
      
      // Update the message in the state
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === messageId ? { ...msg, isRead: true, readAt: new Date().toISOString() } : msg
        )
      );
      
      // Emit the read receipt via Socket.IO if connected
      if (socketRef.current && isConnected && session?.user?.id) {
        socketRef.current.emit('mark-read', {
          messageId,
          userId: session.user.id,
        });
      }
    } catch (err) {
      console.error('Error marking message as read:', err);
    }
  };
  
  if (loading && !messages.length && !sentMessages.length && !parents.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="border-b border-gray-200">
        <div className="flex">
          <button
            className={`flex items-center justify-center px-4 py-3 flex-1 transition-all ${activeTab === 'inbox' ? 'bg-white text-indigo-700 font-medium border-b-2 border-indigo-500' : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'}`}
            onClick={() => {
              setActiveTab('inbox');
              setSelectedMessage(null);
            }}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Inbox
            {messages.filter(msg => !msg.isRead).length > 0 && (
              <span className="ml-2 bg-indigo-100 text-indigo-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                {messages.filter(msg => !msg.isRead).length}
              </span>
            )}
          </button>
          
          <button
            className={`flex items-center justify-center px-4 py-3 flex-1 transition-all ${activeTab === 'sent' ? 'bg-white text-indigo-700 font-medium border-b-2 border-indigo-500' : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'}`}
            onClick={() => {
              setActiveTab('sent');
              setSelectedMessage(null);
            }}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Sent
          </button>
          
          <button
            className={`flex items-center justify-center px-4 py-3 flex-1 transition-all ${activeTab === 'compose' ? 'bg-white text-indigo-700 font-medium border-b-2 border-indigo-500' : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'}`}
            onClick={() => {
              setActiveTab('compose');
              setSelectedMessage(null);
            }}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Compose
          </button>
        </div>
      </div>
      
      <div className="p-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
            <button
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
              onClick={() => setError(null)}
              aria-label="Close error message"
            >
              <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        {sendSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">Message sent successfully!</span>
          </div>
        )}
        
        {activeTab === 'inbox' && (
          <div>
            {selectedMessage ? (
              <div>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 mb-4"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Inbox
                </button>
                
                <div className="border border-gray-200 rounded-md p-4 mb-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{selectedMessage.subject || '(No Subject)'}</h3>
                      <div className="flex items-center text-sm text-gray-600 mt-1">
                        <span className="font-medium">From:</span>
                        <div className="flex items-center ml-2">
                          <div className="w-6 h-6 bg-gray-200 rounded-full overflow-hidden mr-2">
                            {selectedMessage.sender.image ? (
                              <Image
                                src={selectedMessage.sender.image}
                                alt={selectedMessage.sender.name || ''}
                                width={24}
                                height={24}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-500">
                                <span className="text-xs font-bold">{selectedMessage.sender.name?.charAt(0) || 'U'}</span>
                              </div>
                            )}
                          </div>
                          <span>{selectedMessage.sender.name || selectedMessage.sender.email}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(selectedMessage.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('compose');
                        setSelectedParent(selectedMessage.sender.id);
                        setSubject(`Re: ${selectedMessage.subject || '(No Subject)'}`)
                      }}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      Reply
                    </button>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4 mt-2">
                    <div className="prose prose-sm max-w-none">
                      {selectedMessage.content.split('\n').map((paragraph, idx) => (
                        <p key={idx}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-500">No messages in your inbox</h3>
                    <p className="text-gray-500 mt-1">When you receive messages, they will appear here.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`py-3 px-2 hover:bg-gray-50 cursor-pointer transition-colors ${!message.isRead ? 'bg-indigo-50' : ''}`}
                        onClick={() => {
                          setSelectedMessage(message);
                          if (!message.isRead) {
                            markAsRead(message.id);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden mr-3">
                              {message.sender.image ? (
                                <Image
                                  src={message.sender.image}
                                  alt={message.sender.name || ''}
                                  width={32}
                                  height={32}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-500">
                                  <span className="text-sm font-bold">{message.sender.name?.charAt(0) || 'U'}</span>
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center">
                                <span className={`text-sm ${!message.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                  {message.sender.name || message.sender.email}
                                </span>
                                {!message.isRead && (
                                  <span className="ml-2 bg-indigo-100 text-indigo-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                                    New
                                  </span>
                                )}
                              </div>
                              <p className={`text-sm ${!message.isRead ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                                {message.subject || '(No Subject)'}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {message.content.length > 60 ? message.content.substring(0, 60) + '...' : message.content}
                              </p>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(message.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'sent' && (
          <div>
            {selectedMessage ? (
              <div>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 mb-4"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Sent Messages
                </button>
                
                <div className="border border-gray-200 rounded-md p-4 mb-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{selectedMessage.subject || '(No Subject)'}</h3>
                      <div className="flex items-center text-sm text-gray-600 mt-1">
                        <span className="font-medium">To:</span>
                        <div className="flex items-center ml-2">
                          <div className="w-6 h-6 bg-gray-200 rounded-full overflow-hidden mr-2">
                            {selectedMessage.receiver?.image ? (
                              <Image
                                src={selectedMessage.receiver.image}
                                alt={selectedMessage.receiver.name || ''}
                                width={24}
                                height={24}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-500">
                                <span className="text-xs font-bold">{selectedMessage.receiver?.name?.charAt(0) || 'U'}</span>
                              </div>
                            )}
                          </div>
                          <span>{selectedMessage.receiver?.name || selectedMessage.receiver?.email}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(selectedMessage.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4 mt-2">
                    <div className="prose prose-sm max-w-none">
                      {selectedMessage.content.split('\n').map((paragraph, idx) => (
                        <p key={idx}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {sentMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-500">No sent messages</h3>
                    <p className="text-gray-500 mt-1">When you send messages, they will appear here.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {sentMessages.map((message) => (
                      <div
                        key={message.id}
                        className="py-3 px-2 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedMessage(message)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden mr-3">
                              {message.receiver?.image ? (
                                <Image
                                  src={message.receiver.image}
                                  alt={message.receiver.name || ''}
                                  width={32}
                                  height={32}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-500">
                                  <span className="text-sm font-bold">{message.receiver?.name?.charAt(0) || 'U'}</span>
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center">
                                <span className="text-sm text-gray-700">
                                  To: {message.receiver?.name || message.receiver?.email}
                                </span>
                                {message.isRead && (
                                  <span className="ml-2 bg-green-100 text-green-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                                    Read
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">
                                {message.subject || '(No Subject)'}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {message.content.length > 60 ? message.content.substring(0, 60) + '...' : message.content}
                              </p>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(message.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'compose' && (
          <div>
            <div className="bg-white rounded-md">
              <form onSubmit={handleSendMessage}>
                <div className="mb-4">
                  <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-1">
                    To (Parent)
                  </label>
                  <div className="relative">
                    <select
                      id="recipient"
                      value={selectedParent}
                      onChange={(e) => setSelectedParent(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    >
                      <option value="">Select a parent</option>
                      {parents.map((parent) => (
                        <option key={parent.id} value={parent.id}>
                          {parent.name || parent.email} (Parent of {parent.studentName})
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                    Subject (Optional)
                  </label>
                  <input
                    type="text"
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Enter subject"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={6}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Type your message here..."
                    required
                  ></textarea>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedParent('');
                      setSubject('');
                      setContent('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {sending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Send Message
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
