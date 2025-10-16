import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, User, AlertTriangle } from 'lucide-react';

interface RoleDebugProps {
  showDebugInfo?: boolean;
}

const RoleDebug: React.FC<RoleDebugProps> = ({ showDebugInfo = false }) => {
  const { user, isAuthenticated } = useAuth();

  if (!showDebugInfo) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-4 h-4 text-blue-600" />
        <span className="font-semibold text-sm">Auth Debug Info</span>
      </div>
      
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <User className="w-3 h-3" />
          <span>Authenticated: {isAuthenticated ? '✅' : '❌'}</span>
        </div>
        
        {user ? (
          <>
            <div>
              <strong>User:</strong> {user.name}
            </div>
            <div>
              <strong>Email:</strong> {user.email}
            </div>
            <div className={`font-semibold ${user.role === 'admin' ? 'text-green-600' : 'text-blue-600'}`}>
              <strong>Role:</strong> {user.role}
            </div>
            <div>
              <strong>User ID:</strong> {user._id}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-1 text-red-600">
            <AlertTriangle className="w-3 h-3" />
            <span>No user data</span>
          </div>
        )}
        
        <div className="pt-2 border-t border-gray-200">
          <div className="text-gray-600">
            <strong>Route Access:</strong>
          </div>
          <div>
            Admin Routes: {user?.role === 'admin' ? '✅ Allowed' : '❌ Denied'}
          </div>
          <div>
            Worker Routes: {['wc1', 'wc2', 'wc3'].includes(user?.role || '') ? '✅ Allowed' : '❌ Denied'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleDebug;