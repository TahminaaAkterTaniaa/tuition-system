'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface Room {
  id: string;
  name: string;
  capacity: number | null;
  building: string | null;
  floor: string | null;
  features: string | null;
}

const RoomManager = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  // Edit functionality removed as per requirement
  
  const [roomForm, setRoomForm] = useState<Partial<Room>>({
    id: '',
    name: '',
    capacity: null,
    building: '',
    floor: '',
    features: '',
  });
  
  // Fetch rooms
  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      // Ensure we're using the correct API path
      const response = await fetch('/api/admin/rooms');
      console.log('Fetch rooms response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }
      
      const data = await response.json();
      console.log('Fetched rooms:', data);
      setRooms(data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast.error('Failed to load rooms');
      // Set empty array to avoid undefined errors
      setRooms([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setRoomForm(prev => ({ ...prev, [name]: value }));
  };
  
  const resetForm = () => {
    setRoomForm({
      id: '',
      name: '',
      capacity: null,
      building: '',
      floor: '',
      features: ''
      // Remove createdAt and updatedAt as they're handled by the server
    });
    setIsAdding(false);
  };
  
  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomForm.name) {
      toast.error('Room name is required');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const roomData = {
        name: roomForm.name.trim(),
        capacity: roomForm.capacity ? parseInt(roomForm.capacity.toString()) : null,
        building: roomForm.building || '',
        floor: roomForm.floor || '',
        features: roomForm.features || ''
        // Remove createdAt and updatedAt as they're handled by the server
      };
      
      console.log('Sending room data:', roomData);
      
      const response = await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roomData),
        credentials: 'include'
      });
      
      const data = await response.json();
      console.log('Room creation response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add room');
      }
      
      fetchRooms();
      
      resetForm();
      toast.success('Room added successfully');
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding room:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add room');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteRoom = async (id: string) => {
    if (!confirm('Are you sure you want to delete this room?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('Deleting room with ID:', id);
      
      const response = await fetch(`/api/admin/rooms?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      console.log('Delete response status:', response.status);
      const data = await response.json();
      console.log('Delete response data:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete room');
      }
      
      await fetchRooms();
      toast.success('Room deleted successfully');
    } catch (error) {
      console.error('Error deleting room:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('in use by classes')) {
          toast.error('This room cannot be deleted because it is currently in use by one or more classes.');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error('Failed to delete room. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-6"></div>
        <div className="h-32 bg-gray-200 rounded mb-4"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Manage Rooms</h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Add new room"
          >
            Add Room
          </button>
        )}
      </div>
      
      {isAdding && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Add New Room
          </h3>
          <form onSubmit={handleAddRoom} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Room Name*
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={roomForm.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                  aria-label="Room name"
                />
              </div>
              
              <div>
                <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity
                </label>
                <input
                  type="number"
                  id="capacity"
                  name="capacity"
                  value={roomForm.capacity || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  aria-label="Room capacity"
                  min="1"
                />
              </div>
              
              <div>
                <label htmlFor="building" className="block text-sm font-medium text-gray-700 mb-1">
                  Building
                </label>
                <input
                  type="text"
                  id="building"
                  name="building"
                  value={roomForm.building || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  aria-label="Building name"
                />
              </div>
              
              <div>
                <label htmlFor="floor" className="block text-sm font-medium text-gray-700 mb-1">
                  Floor
                </label>
                <input
                  type="text"
                  id="floor"
                  name="floor"
                  value={roomForm.floor || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  aria-label="Floor number"
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="features" className="block text-sm font-medium text-gray-700 mb-1">
                  Features
                </label>
                <textarea
                  id="features"
                  name="features"
                  value={roomForm.features || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  rows={2}
                  placeholder="e.g., Projector, Smart Board, Air Conditioning"
                  aria-label="Room features"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Add Room
              </button>
            </div>
          </form>
        </div>
      )}
      
      {rooms.length === 0 ? (
        <div className="text-center py-10 px-6 bg-gray-50 rounded-lg border border-gray-200">
          <div className="mx-auto w-16 h-16 flex items-center justify-center bg-indigo-100 rounded-full mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Rooms Available</h3>
          <p className="text-sm text-gray-600 mb-6">You haven't added any rooms yet. Rooms are required for scheduling classes.</p>
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create Your First Room
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Room Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacity
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Features
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rooms.map((room) => (
                <tr key={room.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{room.name}</div>
                    {rooms.filter(r => r.name === room.name).length > 1 && (
                      <div className="text-xs text-gray-500 mt-1">ID: {room.id.substring(0, 8)}...</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{room.capacity || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {room.building ? `${room.building}${room.floor ? `, Floor ${room.floor}` : ''}` : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">{room.features || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {/* Edit button removed as per requirement */}
                    <div className="flex flex-col space-y-1">
                    <button
                      onClick={() => handleDeleteRoom(room.id)}
                      className="text-red-600 hover:text-red-900 flex items-center"
                      aria-label={`Delete room ${room.name}`}
                      title={`Delete room ID: ${room.id}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                    {rooms.filter(r => r.name === room.name).length > 1 && (
                      <span className="text-xs text-gray-500">(ID: {room.id.substring(0, 6)})</span>
                    )}
                  </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RoomManager;
