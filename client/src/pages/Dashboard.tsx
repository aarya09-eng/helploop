import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../api";
import { useNavigate, Link } from "react-router-dom";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nexconnToken, setNexconnToken] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [me, reqs, chatToken] = await Promise.all([
          api.getMe(),
          api.getRequests(),
          api.getNexconnToken().catch(() => null),
        ]);
        setProfileData(me);
        setRequests(reqs.items || []);
        if (chatToken?.token) {
          setNexconnToken(chatToken.token);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-16 items-center">
          <div className="flex items-center">
            <span className="text-xl font-bold text-blue-600">HelpLoop</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">Hello, {user?.fullName}</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {user?.role}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-900 font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Stats & Profile Completion */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg p-5">
            <div className="text-sm font-medium text-gray-500 truncate">Profile Completion</div>
            <div className="mt-1 text-3xl font-semibold text-gray-900">{profileData?.profileCompletion || 0}%</div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg p-5">
            <div className="text-sm font-medium text-gray-500 truncate">Nexconn Chat SDK</div>
            <div className="mt-1 text-sm font-medium text-green-600">
              {nexconnToken ? "Connected (Token Active)" : "Not Configured / Offline"}
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg p-5">
            <div className="text-sm font-medium text-gray-500 truncate">City / Locality</div>
            <div className="mt-1 text-lg font-medium text-gray-900">{user?.city}, {user?.locality}</div>
          </div>
        </div>

        {/* Community Help Requests */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Active Community Requests</h3>
            <span className="text-sm text-gray-500">{requests.length} requests available</span>
          </div>
          {requests.length === 0 ? (
            <p className="text-gray-500 text-sm">No active requests found right now.</p>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <div key={req.id} className="border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-800 rounded">{req.category}</span>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded ${req.urgency === 'HIGH' || req.urgency === 'URGENT' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{req.urgency}</span>
                    </div>
                    <h4 className="text-md font-bold text-gray-900 mt-1">{req.title}</h4>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{req.description}</p>
                    <p className="text-xs text-gray-400 mt-2">Posted by {req.owner?.fullName} in {req.locality}, {req.city}</p>
                  </div>
                  {user?.role !== "HELP_SEEKER" && (
                    <button
                      onClick={async () => {
                        try {
                          await api.offerHelp(req.id, "I would love to help with this!");
                          alert("Offer sent successfully!");
                        } catch (err: any) {
                          alert(err.message || "Failed to send offer");
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 whitespace-nowrap"
                    >
                      Offer Help
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
