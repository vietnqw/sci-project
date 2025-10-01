"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import UserProfileForm from '../../components/user-profile-form';
import { competitionsAPI, Competition } from '../api/competitions';
import { apiRequest, ApiError } from '../../lib/api/utils';
import type { User } from '../../lib/api/auth';

type TabKey = 'profile' | 'competitions' | 'admin';

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium text-gray-800 text-sm uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 text-gray-700 text-sm">{value}</dd>
    </div>
  );
}

export default function AccountPage() {
  const { user, updateUser, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [userCompetitions, setUserCompetitions] = useState<Competition[]>([]);
  const [isLoadingCompetitions, setIsLoadingCompetitions] = useState(false);
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
      const savedAvatar = typeof window !== 'undefined' ? localStorage.getItem(`avatar_${user.id}`) : null;
      if (savedAvatar) setAvatar(savedAvatar);
      fetchUserCompetitions();
    }
  }, [user]);

  useEffect(() => {
    if (user && activeTab === 'admin' && user.role !== 'ADMIN') {
      setActiveTab('profile');
    }
  }, [user, activeTab]);

  const fetchUserCompetitions = async () => {
    if (!user) return;
    setIsLoadingCompetitions(true);
    try {
      const response = await competitionsAPI.getMyCompetitions({ limit: 20 });
      setUserCompetitions(response.competitions || []);
    } catch (error) {
      console.error('Error fetching user competitions:', error);
      setUserCompetitions([]);
      setToast({ type: 'error', message: 'Unable to load competitions. Please try again later.' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setIsLoadingCompetitions(false);
    }
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setAvatar(result);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`avatar_${user.id}`, result);
      }
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async (data: { full_name?: string; organization?: string; phone_number?: string; email?: string }) => {
    setIsUpdatingProfile(true);
    try {
      const updatedUser = await apiRequest<User>(`/api/v1/users/${user!.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        requireAuth: true,
      });
      updateUser(updatedUser);
      setToast({ type: 'success', message: 'Profile updated successfully!' });
      setTimeout(() => setToast(null), 2500);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to update profile';
      setToast({ type: 'error', message });
      setTimeout(() => setToast(null), 3000);
      throw err;
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleDeleteCompetition = async (competitionId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this competition? This action cannot be undone.');
    if (!confirmed) return;
    try {
      await competitionsAPI.deleteCompetition(competitionId);
      setToast({ type: 'success', message: 'Competition deleted successfully.' });
      setTimeout(() => setToast(null), 2500);
      await fetchUserCompetitions();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete competition.';
      setToast({ type: 'error', message });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleNavigateToChangePassword = () => {
    router.push('/reset-password');
  };

  const handleNavigateToCreateCompetition = () => {
    router.push('/competitions/create');
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

  const availableTabs: { id: TabKey; label: string }[] = user.role === 'ADMIN'
    ? [
        { id: 'profile', label: 'Account' },
        { id: 'competitions', label: 'Competitions' },
        { id: 'admin', label: 'Admin Tools' },
      ]
    : [
        { id: 'profile', label: 'Account' },
        { id: 'competitions', label: 'Competitions' },
      ];

  const stats = [
    { label: 'Role', value: user.role === 'ADMIN' ? 'Administrator' : 'Creator' },
    { label: 'Created Competitions', value: userCompetitions.length },
    { label: 'Member Since', value: new Date(user.created_at).toLocaleDateString() },
  ];

  return (
    <main className="min-h-screen bg-gray-50 py-10">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.message}
        </div>
      )}

      <div className="container mx-auto max-w-6xl px-4">
        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center text-3xl font-semibold text-white bg-blue-600">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt="User avatar" className="w-full h-full object-cover" />
                  ) : (
                    user.full_name.charAt(0).toUpperCase()
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer shadow transition-colors">
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
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{user.full_name}</h1>
              </div>
            </div>
            <div className="flex-1 flex justify-end">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-fit">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 text-right"
                    style={{ minWidth: '180px', maxWidth: '220px', width: '100%' }}
                  >
                    <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 border-b border-gray-200">
            <nav className="-mb-px flex flex-wrap gap-2">
              {availableTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                    activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-8 space-y-6">
            {activeTab === 'profile' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex flex-col">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
                  <dl className="space-y-3 text-sm text-gray-600 flex-1">
                    <Detail label="Full Name" value={user.full_name} />
                    <Detail label="Email" value={user.email} />
                    <Detail label="Organization" value={user.organization || 'Not provided'} />
                    <Detail label="Phone Number" value={user.phone_number || 'Not provided'} />
                  </dl>
                  <button
                    onClick={() => setIsProfileFormOpen(true)}
                    className="mt-6 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    Edit Profile
                  </button>
                </div>

                <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm flex flex-col gap-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Security & Access</h2>
                    <p className="text-sm text-gray-600">
                      Keep your account secure by updating your password regularly and ensuring your contact details are up to date.
                    </p>
                  </div>
                  <div className="space-y-3 text-sm text-gray-600">
                    <Detail label="Last Updated" value={new Date(user.updated_at).toLocaleString()} />
                  </div>
                  <div className="mt-auto flex flex-col gap-2">
                    <button
                      onClick={handleNavigateToChangePassword}
                      className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      Change Password
                    </button>
                    <p className="text-xs text-gray-400">
                      Need additional help? Visit our <Link href="/help" className="text-blue-600 hover:text-blue-700">help centre</Link> or contact support.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'competitions' && (
              <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">My Competitions</h2>
                    <p className="text-sm text-gray-600">All competitions you have created.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={fetchUserCompetitions}
                      disabled={isLoadingCompetitions}
                      className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <svg className={`w-4 h-4 ${isLoadingCompetitions ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </button>
                    <button
                      onClick={handleNavigateToCreateCompetition}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      New Competition
                    </button>
                  </div>
                </div>

                {isLoadingCompetitions ? (
                  <div className="py-12 text-center text-gray-500">Loading competitions...</div>
                ) : userCompetitions.length > 0 ? (
                  <div className="space-y-4">
                    {userCompetitions.map((competition) => (
                      <div key={competition.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-base font-semibold text-gray-900">{competition.title}</h3>
                              <span className={`px-2 py-1 text-xs rounded-full ${competition.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {competition.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">{competition.location}</p>
                            <p className="text-sm text-gray-600 mb-1 capitalize">
                              {competition.format} • {competition.scale.toLowerCase()}
                            </p>
                            {competition.registration_deadline && (
                              <p className="text-xs text-gray-500">Registration closes on {new Date(competition.registration_deadline).toLocaleDateString()}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <Link href={`/competitions/${competition.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                              View
                            </Link>
                            <button
                              className="text-green-600 hover:text-green-800 font-medium cursor-pointer"
                              onClick={() => router.push(`/competitions/${competition.id}/edit`)}
                            >
                              Edit
                            </button>
                            <button
                              className="text-red-600 hover:text-red-800 font-medium cursor-pointer"
                              onClick={() => handleDeleteCompetition(competition.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-gray-500">
                    You haven&apos;t created any competitions yet. Start by creating your first competition.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'admin' && user.role === 'ADMIN' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Users</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Review, update, or deactivate user accounts across the platform.
                  </p>
                  <Link
                    href="/admin/users"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    Go to User Management →
                  </Link>
                </div>

                <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Competitions</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Approve, feature, or edit competitions submitted by creators.
                  </p>
                  <Link
                    href="/admin/competitions"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    Go to Competition Management →
                  </Link>
                </div>

                <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Creator Assistance</h3>
                  <p className="text-sm text-gray-600">
                    Switch to a creator&apos;s perspective whenever you need to troubleshoot or update their competitions and profile settings.
                  </p>
                </div>
              </div>
            )}
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
