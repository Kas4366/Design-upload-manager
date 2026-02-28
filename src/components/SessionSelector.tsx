import { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { getAllActiveSessions, deleteSession, SessionInfo } from '../lib/sessionService';
import { deleteSessionFiles } from '../lib/cloudStorage';

interface SessionSelectorProps {
  onSessionSelected: (sessionId: string, csvFilename: string) => void;
  onClose: () => void;
}

export function SessionSelector({ onSessionSelected, onClose }: SessionSelectorProps) {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const activeSessions = await getAllActiveSessions();
      setSessions(activeSessions);
    } catch (err) {
      setError('Failed to load sessions');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string, csvFilename: string) => {
    const confirmed = confirm(`Delete session "${csvFilename}"? This will remove all uploaded files and order data.`);
    if (!confirmed) return;

    setDeletingSessionId(sessionId);
    try {
      await deleteSessionFiles(sessionId);

      await deleteSession(sessionId);

      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch (err) {
      setError('Failed to delete session');
      console.error(err);
    } finally {
      setDeletingSessionId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getProgressColor = (completed: number, total: number) => {
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    if (percentage === 100) return 'text-green-600';
    if (percentage > 50) return 'text-blue-600';
    return 'text-gray-600';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Load Existing Session</h2>
              <p className="text-gray-600 mt-1">Resume working on a previously uploaded CSV file</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
              <span className="ml-3 text-gray-600">Loading sessions...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <span className="ml-3 text-red-600">{error}</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Sessions Found</h3>
              <p className="text-gray-600">Upload a CSV file to create a new session</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map(session => (
                <div
                  key={session.id}
                  className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
                  onClick={() => onSessionSelected(session.id, session.csvFilename)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <h3 className="text-lg font-semibold text-gray-900">{session.csvFilename}</h3>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(session.lastAccessedAt)}</span>
                        </div>
                        <div className={`flex items-center gap-2 font-medium ${getProgressColor(session.completedOrders, session.totalOrders)}`}>
                          <CheckCircle className="w-4 h-4" />
                          <span>{session.completedOrders} of {session.totalOrders} orders completed</span>
                        </div>
                      </div>

                      {session.totalOrders > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${(session.completedOrders / session.totalOrders) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(session.id, session.csvFilename);
                      }}
                      disabled={deletingSessionId === session.id}
                      className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete session"
                    >
                      {deletingSessionId === session.id ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <button
              onClick={loadSessions}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
