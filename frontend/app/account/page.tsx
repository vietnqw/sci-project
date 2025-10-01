"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();

  // Get initial tab from URL or default to 'profile'
  const tabFromUrl = (searchParams.get('tab') as TabKey) || 'profile';
  const [activeTab, setActiveTab] = useState<TabKey>(tabFromUrl);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [userCompetitions, setUserCompetitions] = useState<Competition[]>([]);
  const [isLoadingCompetitions, setIsLoadingCompetitions] = useState(false);
  const [isProfileFormOpen, setIsProfileFormOpen] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Competition filters and search
  const [competitionSearch, setCompetitionSearch] = useState('');
  const [competitionStatusFilter, setCompetitionStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [competitionSortBy, setCompetitionSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');

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

  // Sync activeTab with URL parameter
  useEffect(() => {
    const urlTab = (searchParams.get('tab') as TabKey) || 'profile';
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && activeTab === 'admin' && user.role !== 'ADMIN') {
      handleTabChange('profile');
    }
  }, [user, activeTab]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    // Update URL with the new tab parameter
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`/account?${params.toString()}`, { scroll: false });
  };

  const fetchUserCompetitions = async () => {
    if (!user) return;
    setIsLoadingCompetitions(true);
    try {
      const response = await competitionsAPI.getMyCompetitions(user.id, { limit: 100 });
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

  const handleToggleActiveStatus = async (competitionId: string, currentStatus: boolean) => {
    try {
      await competitionsAPI.toggleCompetitionActiveStatus(competitionId, !currentStatus);
      setToast({ type: 'success', message: `Competition ${!currentStatus ? 'activated' : 'deactivated'} successfully.` });
      setTimeout(() => setToast(null), 2500);
      await fetchUserCompetitions();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update competition status.';
      setToast({ type: 'error', message });
      setTimeout(() => setToast(null), 3000);
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

  // Filter and sort competitions
  const filteredAndSortedCompetitions = userCompetitions
    .filter(comp => {
      // Search filter
      const matchesSearch = !competitionSearch ||
        comp.title.toLowerCase().includes(competitionSearch.toLowerCase()) ||
        comp.location?.toLowerCase().includes(competitionSearch.toLowerCase());

      // Status filter
      const matchesStatus = competitionStatusFilter === 'all' ||
        (competitionStatusFilter === 'active' && comp.is_active) ||
        (competitionStatusFilter === 'inactive' && !comp.is_active);

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (competitionSortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (competitionSortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else {
        return a.title.localeCompare(b.title);
      }
    });

  const activeCompetitionsCount = userCompetitions.filter(c => c.is_active).length;
  const featuredCompetitionsCount = userCompetitions.filter(c => c.is_featured).length;

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
                  onClick={() => handleTabChange(tab.id)}
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
              <div className="space-y-6">
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm font-medium">Total Competitions</p>
                        <p className="text-3xl font-bold mt-1">{userCompetitions.length}</p>
                      </div>
                      <div className="bg-white/20 rounded-full p-3">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm font-medium">Active</p>
                        <p className="text-3xl font-bold mt-1">{activeCompetitionsCount}</p>
                      </div>
                      <div className="bg-white/20 rounded-full p-3">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-amber-50 text-sm font-medium">Featured</p>
                        <p className="text-3xl font-bold mt-1">{featuredCompetitionsCount}</p>
                      </div>
                      <div className="bg-white/20 rounded-full p-3">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Competitions Section */}
                <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Manage Competitions</h2>
                      <p className="text-sm text-gray-600 mt-1">View, edit, and manage all your competitions</p>
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

                  {/* Search and Filters */}
                  {userCompetitions.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-200">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          placeholder="Search competitions..."
                          value={competitionSearch}
                          onChange={(e) => setCompetitionSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors text-sm"
                        />
                      </div>

                      <div className="relative">
                        <select
                          value={competitionStatusFilter}
                          onChange={(e) => setCompetitionStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors appearance-none cursor-pointer text-sm bg-white"
                        >
                          <option value="all">All Status</option>
                          <option value="active">Active Only</option>
                          <option value="inactive">Inactive Only</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      <div className="relative">
                        <select
                          value={competitionSortBy}
                          onChange={(e) => setCompetitionSortBy(e.target.value as 'newest' | 'oldest' | 'title')}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors appearance-none cursor-pointer text-sm bg-white"
                        >
                          <option value="newest">Newest First</option>
                          <option value="oldest">Oldest First</option>
                          <option value="title">Title (A-Z)</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Competitions List */}
                  {isLoadingCompetitions ? (
                    <div className="py-12 text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-500">Loading competitions...</p>
                    </div>
                  ) : filteredAndSortedCompetitions.length > 0 ? (
                    <div className="space-y-3">
                      {filteredAndSortedCompetitions.map((competition) => (
                        <div key={competition.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:border-blue-300">
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-3 mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <h3 className="text-base font-semibold text-gray-900 truncate">{competition.title}</h3>
                                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full flex-shrink-0 ${competition.is_active ? 'bg-green-100 text-green-700 ring-1 ring-green-300' : 'bg-gray-100 text-gray-700 ring-1 ring-gray-300'}`}>
                                      {competition.is_active ? '● Active' : '○ Inactive'}
                                    </span>
                                    {competition.is_featured && (
                                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300 flex-shrink-0">
                                        ⭐ Featured
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 mb-2">
                                    <span className="flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                      {competition.location}
                                    </span>
                                    <span className="capitalize">{competition.format?.toLowerCase() || 'N/A'}</span>
                                    <span className="capitalize">{competition.scale?.toLowerCase() || 'N/A'}</span>
                                  </div>
                                  {competition.registration_deadline && (
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      Registration deadline: {new Date(competition.registration_deadline).toLocaleDateString()}
                                    </p>
                                  )}
                                  <p className="text-xs text-gray-400 mt-1">
                                    Created {new Date(competition.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
                              <button
                                onClick={() => handleToggleActiveStatus(competition.id, competition.is_active)}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                                  competition.is_active
                                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                                title={competition.is_active ? 'Deactivate' : 'Activate'}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={competition.is_active ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                                </svg>
                                {competition.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                              <Link
                                href={`/competitions/${competition.id}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View
                              </Link>
                              <button
                                onClick={() => router.push(`/competitions/${competition.id}/edit`)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteCompetition(competition.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : userCompetitions.length === 0 ? (
                    <div className="py-16 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No competitions yet</h3>
                      <p className="text-gray-600 mb-6">You haven&apos;t created any competitions. Start by creating your first competition.</p>
                      <button
                        onClick={handleNavigateToCreateCompetition}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create Your First Competition
                      </button>
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No competitions found</h3>
                      <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
                    </div>
                  )}
                </div>
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
