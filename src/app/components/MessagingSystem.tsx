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
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="border-b">
        <nav className="flex">
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'inbox'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('inbox')}
          >
            Inbox ({messages.filter(m => !m.isRead).length})
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'sent'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('sent')}
          >
            Sent
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'compose'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('compose')}
          >
            Compose
          </button>
        </nav>
      </div>
      
      <div className="p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md">
            {error}
          </div>
        )}
        
        {sendSuccess && (
          <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-md">
            Message sent successfully!
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
                  <div>
                    <button
                      onClick={() => setSelectedMessage(null)}
                      className="mb-4 text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      ← Back to messages
                    </button>
                    
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center mb-4">
                        <div className="mr-3">
                          {selectedMessage.sender.image ? (
                            <Image
                              src={selectedMessage.sender.image}
                              alt={selectedMessage.sender.name || ''}
                              width={40}
                              height={40}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                              <span className="text-indigo-800 font-medium">
                                {selectedMessage.sender.name?.charAt(0) || '?'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium">{selectedMessage.sender.name}</h3>
                          <p className="text-sm text-gray-500">{selectedMessage.sender.email}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(selectedMessage.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      {selectedMessage.subject && (
                        <h2 className="text-lg font-medium mb-2">{selectedMessage.subject}</h2>
                      )}
                      
                      <div className="prose max-w-none">
                        <p>{selectedMessage.content}</p>
                      </div>
                      
                      <div className="mt-6 pt-4 border-t">
                        <button
                          onClick={() => {
                            setActiveTab('compose');
                            setSelectedTeacher(selectedMessage.sender.id);
                            setSubject(selectedMessage.subject ? `Re: ${selectedMessage.subject}` : '');
                            setContent(`\n\n> ${selectedMessage.content}`);
                          }}
                          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      onClick={() => setSelectedMessage(message)}
                      className={`border rounded-lg p-4 cursor-pointer hover:bg-gray-50 ${
                        !message.isRead ? 'border-l-4 border-l-indigo-500' : ''
                      }`}
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
                  <div>
                    <button
                      onClick={() => setSelectedMessage(null)}
                      className="mb-4 text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      ← Back to messages
                    </button>
                    
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center mb-4">
                        <div className="mr-3">
                          {selectedMessage.receiver?.image ? (
                            <Image
                              src={selectedMessage.receiver.image}
                              alt={selectedMessage.receiver.name || ''}
                              width={40}
                              height={40}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                              <span className="text-indigo-800 font-medium">
                                {selectedMessage.receiver?.name?.charAt(0) || '?'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium">To: {selectedMessage.receiver?.name}</h3>
                          <p className="text-sm text-gray-500">{selectedMessage.receiver?.email}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(selectedMessage.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      {selectedMessage.subject && (
                        <h2 className="text-lg font-medium mb-2">{selectedMessage.subject}</h2>
                      )}
                      
                      <div className="prose max-w-none">
                        <p>{selectedMessage.content}</p>
                      </div>
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
          <form onSubmit={handleSendMessage} className="space-y-4">
            <div>
              <label htmlFor="teacher" className="block text-sm font-medium text-gray-700 mb-1">
                Recipient (Teacher)
              </label>
              <select
                id="teacher"
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              >
                <option value="">Select a teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} ({teacher.email})
                  </option>
                ))}
              </select>
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
            
            <div>
              <button
                type="submit"
                disabled={sending}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
