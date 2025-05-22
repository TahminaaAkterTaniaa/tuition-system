import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

interface AdminDeleteButtonProps {
  entityType: string;
  entityId: string;
  onSuccess?: () => void;
  className?: string;
}

const AdminDeleteButton: React.FC<AdminDeleteButtonProps> = ({
  entityType,
  entityId,
  onSuccess,
  className = '',
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    if (!entityId) return;

    setIsDeleting(true);
    try {
      // Determine the API endpoint based on the entity type
      let endpoint = '';
      switch (entityType.toLowerCase()) {
        case 'teacher':
          endpoint = `/api/admin/teachers/${entityId}`;
          break;
        case 'class':
          endpoint = `/api/admin/classes/${entityId}`;
          break;
        case 'student':
          endpoint = `/api/admin/students/${entityId}`;
          break;
        case 'user':
          endpoint = `/api/admin/users/${entityId}`;
          break;
        default:
          toast.error(`Unsupported entity type: ${entityType}`);
          setIsDeleting(false);
          return;
      }

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success(`${entityType} deleted successfully`);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const data = await response.json();
        toast.error(data.error || `Failed to delete ${entityType.toLowerCase()}`);
        
        // If there are details about related records, show them
        if (data.details) {
          const details = Object.entries(data.details)
            .filter(([_, count]) => (count as number) > 0)
            .map(([name, count]) => `${name}: ${count}`)
            .join(', ');
          
          if (details) {
            toast.error(`Related records: ${details}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error deleting ${entityType}:`, error);
      toast.error(`An error occurred while deleting the ${entityType.toLowerCase()}`);
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="relative inline-block">
      {!showConfirm ? (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className={`px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors ${className}`}
          disabled={isDeleting}
        >
          Delete
        </button>
      ) : (
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleDelete}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Confirm'}
          </button>
          <button
            type="button"
            onClick={() => setShowConfirm(false)}
            className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
            disabled={isDeleting}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminDeleteButton;
