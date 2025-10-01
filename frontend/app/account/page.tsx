"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// TODO: implement these components next (UI parity)
// import CreateCompetitionForm from '../../components/create-competition-form';
// import EditCompetitionForm from '../../components/edit-competition-form';
import UserProfileForm from '../../components/user-profile-form';
import { CompetitionCreate, competitionsAPI, Competition } from '../api/competitions';
// TODO: implement usersAPI
// import { usersAPI, UserUpdate } from '../../lib/api/users';
import { useMode } from '../contexts/ModeContext';
import { apiRequest, ApiError } from '../../lib/api/utils';

interface StoredCompetition {
  id: string;
  name: string;
  location: string;
  description: string;
  homepage: string;
}

export default function AccountPage() {
  const { user, updateUser, isLoading: isAuthLoading } = useAuth();
  const { isCreatorsMode } = useMode();
  const router = useRouter();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<StoredCompetition[]>([]);
  const [likedCompetitions, setLikedCompetitions] = useState<StoredCompetition[]>([]);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [userCompetitions, setUserCompetitions] = useState<Competition[]>([]);
  const [isLoadingUserCompetitions, setIsLoadingUserCompetitions] = useState(false);
  const [isProfileFormOpen, setIsProfileFormOpen] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace('/login');
    }
  }, [isAuthLoading, user, router]);

  useEffect(() => {
    if (user) {
      const savedAvatar = localStorage.getItem(`avatar_${user.id}`);
      if (savedAvatar) setAvatar(savedAvatar);

      const savedRecent = localStorage.getItem(`recently_viewed_${user.id}`);
      if (savedRecent) setRecentlyViewed(JSON.parse(savedRecent));

      const savedLiked = localStorage.getItem(`liked_competitions_${user.id}`);
      if (savedLiked) setLikedCompetitions(JSON.parse(savedLiked));

      fetchUserCompetitions();
    }
  }, [user]);

  const fetchUserCompetitions = async () => {
    if (!user) return;
    setIsLoadingUserCompetitions(true);
    try {
      const response = await competitionsAPI.getMyCompetitions({ limit: 10 });
      setUserCompetitions(response.competitions || []);
    } catch (error) {
      console.error('Error fetching user competitions:', error);
      setUserCompetitions([]);
    } finally {
      setIsLoadingUserCompetitions(false);
    }
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && user) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setAvatar(result);
        localStorage.setItem(`avatar_${user.id}`, result);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLikedCompetition = (competitionId: string) => {
    if (user) {
      const updatedLiked = likedCompetitions.filter(comp => comp.id !== competitionId);
      setLikedCompetitions(updatedLiked);
      localStorage.setItem(`liked_competitions_${user.id}`, JSON.stringify(updatedLiked));
    }
  };

  const handleCreateCompetition = async (data: CompetitionCreate) => {
    setIsCreating(true);
    try {
      if (!data.title?.trim()) throw new Error('Competition title is required.');
      const created = await competitionsAPI.createCompetition(data);
      alert('Competition created successfully!');
      setIsCreateFormOpen(false);
      await fetchUserCompetitions();
    } catch (error) {
      console.error('Error creating competition:', error);
      alert(error instanceof Error ? error.message : 'Failed to create competition.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditCompetition = (competition: Competition) => {
    setEditingCompetition(competition);
    setIsEditFormOpen(true);
  };

  const handleUpdateCompetition = (updatedCompetition: Competition) => {
    setUserCompetitions(prev => prev.map(c => c.id === updatedCompetition.id ? updatedCompetition : c));
  };

  const handleDeleteCompetition = async (competitionId: string) => {
    if (!confirm('Are you sure you want to delete this competition?')) return;
    try {
      await competitionsAPI.deleteCompetition(competitionId);
      alert('Competition deleted successfully!');
      await fetchUserCompetitions();
    } catch (error) {
      console.error('Error deleting competition:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete competition.');
    }
  };

  // Placeholder until users API is implemented
  const handleUpdateProfile = async (data: { full_name?: string; organization?: string; phone_number?: string; email?: string; }) => {
    setIsUpdatingProfile(true);
    try {
      const updatedUser = await apiRequest(`/api/v1/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        requireAuth: true,
      });
      updateUser(updatedUser);
      setToast({ type: 'success', message: 'Profile updated successfully!' });
      setTimeout(() => setToast(null), 2500);
      return;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : (err instanceof Error ? err.message : 'Failed to update profile');
      setToast({ type: 'error', message });
      setTimeout(() => setToast(null), 3000);
      throw err;
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.message}
        </div>
      )}
      <div className="container mx-auto max-w-6xl px-4">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="User avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer transition-colors">
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={isUploading} />
                {isUploading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                )}
              </label>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{user.full_name}</h1>
              <p className="text-gray-600 mb-1">{user.email}</p>
              {user.organization && <p className="text-gray-600 mb-1">{user.organization}</p>}
              {user.phone_number && <p className="text-gray-600 mb-1">{user.phone_number}</p>}
              <p className="text-sm text-gray-500">Member since {new Date(user.created_at).toLocaleDateString()}</p>
              <button onClick={() => setIsProfileFormOpen(true)} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Recently Viewed</h2>
            {(recentlyViewed && recentlyViewed.length > 0) ? (
              <div className="space-y-4">
                {(recentlyViewed || []).slice(0, 5).map((competition) => (
                  <div key={competition.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <h3 className="font-semibold text-gray-900 mb-1">{competition.name}</h3>
                    <p className="text-gray-600 text-sm mb-2">{competition.location}</p>
                    <p className="text-gray-700 text-sm line-clamp-2">{competition.description}</p>
                    <Link href={`/competitions/${competition.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">View Details →</Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <p className="text-gray-500">No recently viewed competitions</p>
                <Link href="/competitions" className="text-blue-600 hover:text-blue-800 font-medium mt-2 inline-block">Browse Competitions</Link>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Liked Competitions</h2>
            {(likedCompetitions && likedCompetitions.length > 0) ? (
              <div className="space-y-4">
                {(likedCompetitions || []).map((competition) => (
                  <div key={competition.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{competition.name}</h3>
                        <p className="text-gray-600 text-sm mb-2">{competition.location}</p>
                        <p className="text-gray-700 text-sm line-clamp-2">{competition.description}</p>
                        <Link href={`/competitions/${competition.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">View Details →</Link>
                      </div>
                      <button onClick={() => removeLikedCompetition(competition.id)} className="text-red-500 hover:text-red-700 p-1" aria-label="Remove from liked">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <p className="text-gray-500">No liked competitions yet</p>
                <Link href="/competitions" className="text-blue-600 hover:text-blue-800 font-medium mt-2 inline-block">Discover Competitions</Link>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">My Created Competitions</h2>
            <div className="flex items-center gap-2">
              <button onClick={fetchUserCompetitions} disabled={isLoadingUserCompetitions} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
                <svg className={`w-4 h-4 ${isLoadingUserCompetitions ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <button onClick={() => setIsCreateFormOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Competition
              </button>
            </div>
          </div>

          {isLoadingUserCompetitions ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your competitions...</p>
            </div>
          ) : (userCompetitions && userCompetitions.length > 0) ? (
            <div className="space-y-4">
              {(userCompetitions || []).map((competition) => (
                <div key={competition.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{competition.title}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${competition.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {competition.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">{competition.location}</p>
                      <p className="text-gray-700 text-sm line-clamp-2 mb-2">{competition.introduction}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="capitalize">{competition.format}</span>
                        <span className="capitalize">{competition.scale}</span>
                        {competition.registration_deadline && (
                          <span>Deadline: {new Date(competition.registration_deadline).toLocaleDateString()}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-3">
                        <Link href={`/competitions/${competition.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">View Details →</Link>
                        <button onClick={() => handleEditCompetition(competition)} className="text-green-600 hover:text-green-800 text-sm font-medium">Edit</button>
                        <button onClick={() => handleDeleteCompetition(competition.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Delete</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-gray-500 mb-2">You haven't created any competitions yet</p>
              <p className="text-sm text-gray-400">Start by creating your first competition</p>
            </div>
          )}
        </div>

        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {user.role === 'ADMIN' && (
              <Link href="/admin" className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Admin Dashboard</h3>
                  <p className="text-sm text-gray-600">Manage platform</p>
                </div>
              </Link>
            )}

            <Link href="/competitions" className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Browse Competitions</h3>
                <p className="text-sm text-gray-600">Discover new opportunities</p>
              </div>
            </Link>

            <button onClick={() => setIsCreateFormOpen(true)} className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Add Competition</h3>
                <p className="text-sm text-gray-600">Create a new competition</p>
              </div>
            </button>

            <Link href="/reset-password" className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Change Password</h3>
                <p className="text-sm text-gray-600">Update your security</p>
              </div>
            </Link>

            <button onClick={() => router.push('/')} className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Go Home</h3>
                <p className="text-sm text-gray-600">Return to homepage</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <UserProfileForm
        user={user}
        isOpen={isProfileFormOpen}
        onClose={() => setIsProfileFormOpen(false)}
        onUpdate={handleUpdateProfile}
        isLoading={isUpdatingProfile}
      />
    </main>
  );
}
