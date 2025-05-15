'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

type Message = {
  id: string;
  subject: string | null;
  content: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  senderId: string;
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

type Teacher = {
  id: string;
  name: string;
  email: string;
  role: string;
  image: string | null;
};

export default function MessagingSystem() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'compose'>('inbox');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Compose message state
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  
  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        
        // Fetch received messages
        const receivedResponse = await fetch('/api/messages?type=received');
        if (!receivedResponse.ok) {
          throw new Error('Failed to fetch received messages');
        }
        const receivedData = await receivedResponse.json();
        setMessages(receivedData.messages);
        
        // Fetch sent messages
        const sentResponse = await fetch('/api/messages?type=sent');
        if (!sentResponse.ok) {
          throw new Error('Failed to fetch sent messages');
        }
        const sentData = await sentResponse.json();
        setSentMessages(sentData.messages);
        
        // Fetch teachers (for compose)
        const teachersResponse = await fetch('/api/users/teachers');
        if (teachersResponse.ok) {
          const teachersData = await teachersResponse.json();
          setTeachers(teachersData.teachers);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Failed to load messages. Please try again later.');
        setLoading(false);
      }
    };
    
    if (session) {
      fetchMessages();
    }
  }, [session]);
  
  // Send a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTeacher || !content) {
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
          receiverId: selectedTeacher,
          subject,
          content,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }
      
      // Reset form
      setSelectedTeacher('');
      setSubject('');
      setContent('');
      setSendSuccess(true);
      
      // Refresh sent messages
      const sentResponse = await fetch('/api/messages?type=sent');
      if (sentResponse.ok) {
        const sentData = await sentResponse.json();
        setSentMessages(sentData.messages);
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSendSuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };
  
  if (loading) {
    return (
      <div className="p-4">
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-6 text-indigo-800 flex items-center">
        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        Messages
      </h2>
      
      {/* Tabs */}
      <div className="flex mb-6 bg-gray-50 p-1 rounded-lg">
        <button
          className={`flex items-center justify-center px-4 py-2 rounded-md flex-1 transition-all ${activeTab === 'inbox' ? 'bg-white shadow-sm text-indigo-700 font-medium' : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-100'}`}
          onClick={() => {
            setActiveTab('inbox');
            setSelectedMessage(null);
          }}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Inbox
          {messages.filter(m => !m.isRead).length > 0 && (
            <span className="ml-1 bg-indigo-100 text-indigo-800 text-xs font-semibold px-2 py-0.5 rounded-full">
              {messages.filter(m => !m.isRead).length}
            </span>
          )}
        </button>
        <button
          className={`flex items-center justify-center px-4 py-2 rounded-md flex-1 transition-all ${activeTab === 'sent' ? 'bg-white shadow-sm text-indigo-700 font-medium' : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-100'}`}
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
          className={`flex items-center justify-center px-4 py-2 rounded-md flex-1 transition-all ${activeTab === 'compose' ? 'bg-white shadow-sm text-indigo-700 font-medium' : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-100'}`}
          onClick={() => {
            setActiveTab('compose');
            setSelectedMessage(null);
          }}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Compose
        </button>
      </div>
      
      <div className="p-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <svg className="w-6 h-6 mx-auto text-red-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-600">{error}</p>
          </div>
        )}
        
        {sendSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm text-green-700">Message sent successfully!</p>
            </div>
          </div>
        )}
        
        {/* Inbox */}
        {activeTab === 'inbox' && (
          <div>
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No messages in your inbox.
              </div>
            ) : (
              <div className="space-y-4">
                {selectedMessage ? (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-indigo-50 p-4 border-b border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                          {selectedMessage.sender.image ? (
                            <div className="relative w-10 h-10 rounded-full overflow-hidden mr-3 border-2 border-white shadow-sm">
                              <Image
                                src={selectedMessage.sender.image}
                                alt={selectedMessage.sender.name || ''}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center mr-3 text-white font-bold border-2 border-white shadow-sm">
                              {selectedMessage.sender.name?.charAt(0) || '?'}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-indigo-900">{selectedMessage.sender.name}</p>
                            <p className="text-xs text-indigo-700">{selectedMessage.sender.email}</p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded-md shadow-sm">
                          {new Date(selectedMessage.createdAt).toLocaleString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      {selectedMessage.subject && (
                        <h3 className="text-lg font-medium text-indigo-900 mt-2">{selectedMessage.subject}</h3>
                      )}
                    </div>
                    <div className="p-4 whitespace-pre-wrap text-gray-700">{selectedMessage.content}</div>
                    <div className="bg-gray-50 px-4 py-3 flex justify-end border-t border-gray-200">
                      <button
                        onClick={() => setSelectedMessage(null)}
                        className="flex items-center px-4 py-2 text-sm text-indigo-700 hover:text-indigo-900 bg-white rounded-md shadow-sm border border-indigo-200 hover:bg-indigo-50 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Messages
                      </button>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      onClick={() => setSelectedMessage(message)}
                      className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex justify-between">
                        <div className="flex items-center">
                          {message.sender.image ? (
                            <Image
                              src={message.sender.image}
                              alt={message.sender.name || ''}
                              width={32}
                              height={32}
                              className="rounded-full mr-3"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-indigo-800 font-medium">
                                {message.sender.name?.charAt(0) || '?'}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{message.sender.name}</p>
                            <p className="text-xs text-gray-500">{message.sender.role}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(message.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="mt-2">
                        {message.subject && (
                          <p className="font-medium">{message.subject}</p>
                        )}
                        <p className="text-sm text-gray-600 truncate">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Sent Messages */}
        {activeTab === 'sent' && (
          <div>
            {sentMessages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No sent messages.
              </div>
            ) : (
              <div className="space-y-4">
                {selectedMessage ? (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-indigo-50 p-4 border-b border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                          {selectedMessage.receiver?.image ? (
                            <div className="relative w-10 h-10 rounded-full overflow-hidden mr-3 border-2 border-white shadow-sm">
                              <Image
                                src={selectedMessage.receiver.image}
                                alt={selectedMessage.receiver.name || ''}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center mr-3 text-white font-bold border-2 border-white shadow-sm">
                              {selectedMessage.receiver?.name?.charAt(0) || '?'}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-indigo-900">To: {selectedMessage.receiver?.name}</p>
                            <p className="text-xs text-indigo-700">{selectedMessage.receiver?.email}</p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded-md shadow-sm">
                          {new Date(selectedMessage.createdAt).toLocaleString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      {selectedMessage.subject && (
                        <h3 className="text-lg font-medium text-indigo-900 mt-2">{selectedMessage.subject}</h3>
                      )}
                    </div>
                    <div className="p-4 whitespace-pre-wrap text-gray-700">{selectedMessage.content}</div>
                    <div className="bg-gray-50 px-4 py-3 flex justify-end border-t border-gray-200">
                      <button
                        onClick={() => setSelectedMessage(null)}
                        className="flex items-center px-4 py-2 text-sm text-indigo-700 hover:text-indigo-900 bg-white rounded-md shadow-sm border border-indigo-200 hover:bg-indigo-50 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Messages
                      </button>
                    </div>
                  </div>
                ) : (
                  sentMessages.map((message) => (
                    <div
                      key={message.id}
                      onClick={() => setSelectedMessage(message)}
                      className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex justify-between">
                        <div className="flex items-center">
                          {message.receiver?.image ? (
                            <Image
                              src={message.receiver.image}
                              alt={message.receiver.name || ''}
                              width={32}
                              height={32}
                              className="rounded-full mr-3"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-indigo-800 font-medium">
                                {message.receiver?.name?.charAt(0) || '?'}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium">To: {message.receiver?.name}</p>
                            <p className="text-xs text-gray-500">{message.receiver?.role}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(message.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="mt-2">
                        {message.subject && (
                          <p className="font-medium">{message.subject}</p>
                        )}
                        <p className="text-sm text-gray-600 truncate">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Compose Message */}
        {activeTab === 'compose' && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-indigo-900 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Compose New Message
              </h3>
            </div>
            
            <div className="p-4">
              <form onSubmit={handleSendMessage} className="space-y-4">
                {sendSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-sm text-green-700">Message sent successfully!</p>
                    </div>
                  </div>
                )}
                
                <div>
                  <label htmlFor="teacher" className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient (Teacher)
                  </label>
                  <div className="relative">
                    <select
                      id="teacher"
                      value={selectedTeacher}
                      onChange={(e) => setSelectedTeacher(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-10"
                      required
                    >
                      <option value="">Select a teacher</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name} ({teacher.email})
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div>
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
                
                <div>
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
                      setSelectedTeacher('');
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
