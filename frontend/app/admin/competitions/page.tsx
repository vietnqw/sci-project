"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { competitionsAPI, type Competition, type CompetitionListResponse } from '../../api/competitions';
import { ApiError } from '../../../lib/api/utils';

type TabKey = 'pending' | 'all';

const DEFAULT_LIMIT = 15;

export default function AdminCompetitionsPage() {
  const { user: authUser, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters (for All tab)
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'any' | 'active' | 'inactive'>('any');
  const [featuredFilter, setFeaturedFilter] = useState<'any' | 'featured' | 'not_featured'>('any');

  // Rejection modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [competitionToReject, setCompetitionToReject] = useState<Competition | null>(null);

  useEffect(() => {
    if (!isAuthLoading) {
      if (!authUser) {
        router.replace('/login');
      } else if (authUser.role !== 'ADMIN') {
        router.replace('/account');
      }
    }
  }, [authUser, isAuthLoading, router]);

  useEffect(() => {
    if (authUser?.role === 'ADMIN') {
      fetchCompetitions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, page, activeTab, statusFilter, featuredFilter, search]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCompetitions = async () => {
    setIsLoading(true);
    try {
      let resp: CompetitionListResponse;
      if (activeTab === 'pending') {
        resp = await competitionsAPI.getPendingCompetitions({ skip: (page - 1) * DEFAULT_LIMIT, limit: DEFAULT_LIMIT });
      } else {
        const params: any = {
          skip: (page - 1) * DEFAULT_LIMIT,
          limit: DEFAULT_LIMIT,
        };
        if (statusFilter !== 'any') params.is_active = statusFilter === 'active';
        if (featuredFilter !== 'any') params.is_featured = featuredFilter === 'featured';
        if (search.trim()) params.search = search.trim();
        resp = await competitionsAPI.getCompetitions(params);
      }
      setCompetitions(resp.competitions || []);
      setTotal(resp.total || 0);
    } catch (error) {
      showToast('error', error instanceof ApiError ? error.message : 'Failed to load competitions');
    } finally {
      setIsLoading(false);
    }
  };

  const summary = useMemo(() => {
    const active = competitions.filter((c) => c.is_active).length;
    const featured = competitions.filter((c) => c.is_featured).length;
    return [
      { label: 'Total Competitions', value: total },
      { label: 'Active (current page)', value: active },
      { label: 'Featured (current page)', value: featured },
    ];
  }, [competitions, total]);

  const handleFeatureToggle = async (comp: Competition) => {
    setIsActionLoading(true);
    try {
      if (comp.is_featured) {
        await competitionsAPI.unfeatureCompetition(comp.id);
        showToast('success', 'Competition unfeatured');
      } else {
        await competitionsAPI.featureCompetition(comp.id);
        showToast('success', 'Competition featured');
      }
      await fetchCompetitions();
    } catch (error) {
      showToast('error', error instanceof ApiError ? error.message : 'Failed to update featured status');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleActiveToggle = async (comp: Competition) => {
    setIsActionLoading(true);
    try {
      if (comp.is_active) {
        await competitionsAPI.deactivateCompetition(comp.id);
        showToast('success', 'Competition deactivated');
      } else {
        await competitionsAPI.activateCompetition(comp.id);
        showToast('success', 'Competition activated');
      }
      await fetchCompetitions();
    } catch (error) {
      showToast('error', error instanceof ApiError ? error.message : 'Failed to update active status');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleApprove = async (comp: Competition) => {
    setIsActionLoading(true);
    try {
      await competitionsAPI.approveCompetition(comp.id);
      showToast('success', 'Competition approved');
      await fetchCompetitions();
    } catch (error) {
      showToast('error', error instanceof ApiError ? error.message : 'Failed to approve');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = (comp: Competition) => {
    setCompetitionToReject(comp);
    setRejectReason('');
    setIsRejectModalOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!competitionToReject) return;

    setIsActionLoading(true);
    try {
      await competitionsAPI.rejectCompetition(competitionToReject.id, rejectReason || undefined);
      showToast('success', 'Competition rejected');
      await fetchCompetitions();
      setIsRejectModalOpen(false);
      setCompetitionToReject(null);
      setRejectReason('');
    } catch (error) {
      showToast('error', error instanceof ApiError ? error.message : 'Failed to reject');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isAuthLoading || !authUser || authUser.role !== 'ADMIN') {
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_LIMIT));

  return (
    <main className="min-h-screen bg-gray-50 py-10">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.message}
        </div>
      )}

      <div className="container mx-auto max-w-7xl px-4">
        <header className="bg-white rounded-2xl shadow-sm p-6 md:p-8 mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Competition Management</h1>
              <p className="text-sm text-gray-600">Review, approve, feature, and manage competitions.</p>
            </div>
          </div>

          {/* Stats cards */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Competitions</p>
                  <p className="text-3xl font-bold mt-1">{summary.find(i => i.label === 'Total Competitions')?.value}</p>
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
                  <p className="text-3xl font-bold mt-1">{summary.find(i => i.label === 'Active (current page)')?.value}</p>
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
                  <p className="text-3xl font-bold mt-1">{summary.find(i => i.label === 'Featured (current page)')?.value}</p>
                </div>
                <div className="bg-white/20 rounded-full p-3">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
          <div className="flex items-center gap-2 border-b border-gray-200 mb-4">
            {(['pending', 'all'] as TabKey[]).map((tab) => (
              <button
                key={tab}
                onClick={() => { setPage(1); setActiveTab(tab); }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                {tab === 'pending' ? 'Pending Approval' : 'All Competitions'}
              </button>
            ))}
          </div>

          {/* Filters for All tab */}
          {activeTab === 'all' && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="w-full md:w-1/2 lg:w-1/3 relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                  placeholder="Search by title or description..."
                  className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-gray-900 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => { setPage(1); setStatusFilter(e.target.value as any); }}
                    className="cursor-pointer appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm font-medium text-gray-700 transition hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none min-w-[140px]"
                  >
                    <option value="any">Any Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <svg className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div className="relative">
                  <select
                    value={featuredFilter}
                    onChange={(e) => { setPage(1); setFeaturedFilter(e.target.value as any); }}
                    className="cursor-pointer appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm font-medium text-gray-700 transition hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none min-w-[160px]"
                  >
                    <option value="any">Any Featured</option>
                    <option value="featured">Featured Only</option>
                    <option value="not_featured">Not Featured</option>
                  </select>
                  <svg className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <button
                  onClick={() => { setSearch(''); setStatusFilter('any'); setFeaturedFilter('any'); setPage(1); }}
                  className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:shadow-md"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{activeTab === 'pending' ? 'Pending Approval' : 'All Competitions'}</h2>
            <span className="text-sm text-gray-500">{total} total</span>
          </div>

          {isLoading ? (
            <div className="p-10 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
              Loading competitions...
            </div>
          ) : competitions.length === 0 ? (
            <div className="p-10 text-center text-gray-500">No competitions match the current filters.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <HeaderCell>Title</HeaderCell>
                      <HeaderCell>Owner</HeaderCell>
                      <HeaderCell>Status</HeaderCell>
                      <HeaderCell>Created</HeaderCell>
                      <HeaderCell>Actions</HeaderCell>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {competitions.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900 line-clamp-2 max-w-[400px]">{c.title}</div>
                          {c.competition_link && (
                            <a href={c.competition_link} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-800">{c.competition_link}</a>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {c.owner?.full_name || '—'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {c.owner?.email || ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Badge color={c.is_approved ? 'blue' : (c.is_rejected ? 'red' : 'orange')} label={c.is_approved ? 'Approved' : (c.is_rejected ? 'Rejected' : 'Pending')} />
                            <Badge color={c.is_active ? 'green' : 'red'} label={c.is_active ? 'Active' : 'Inactive'} />
                            {c.is_featured && <Badge color="amber" label="Featured" />}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2 justify-center">
                            <ActionButton
                              label="View"
                              onClick={() => router.push(`/competitions/${c.id}`)}
                              className="w-22 flex justify-center"
                              icon={
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              }
                            />
                            {activeTab === 'pending' ? (
                              <>
                                <ActionButton
                                  label="Approve"
                                  disabled={isActionLoading}
                                  onClick={() => handleApprove(c)}
                                  className="w-26 flex justify-center text-green-700 hover:border-green-300 hover:bg-green-50"
                                  icon={
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  }
                                />
                                <ActionButton
                                  label="Reject"
                                  disabled={isActionLoading}
                                  onClick={() => handleReject(c)}
                                  className="w-24 flex justify-center text-red-700 hover:border-red-300 hover:bg-red-50"
                                  icon={
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  }
                                />
                              </>
                            ) : (
                              <>
                                <ActionButton
                                  label={c.is_featured ? 'Unfeature' : 'Feature'}
                                  disabled={isActionLoading}
                                  onClick={() => handleFeatureToggle(c)}
                                  className="w-28 flex justify-center"
                                  icon={
                                    c.is_featured ? (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                                      </svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
                                      </svg>
                                    )
                                  }
                                />
                                <ActionButton
                                  label={c.is_active ? 'Deactivate' : 'Activate'}
                                  disabled={isActionLoading}
                                  onClick={() => handleActiveToggle(c)}
                                  className={`w-28 flex justify-center ${c.is_active ? 'text-orange-700 hover:border-orange-300 hover:bg-orange-50' : 'text-green-700 hover:border-green-300 hover:bg-green-50'}`}
                                  icon={
                                    c.is_active ? (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                                      </svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
                                      </svg>
                                    )
                                  }
                                />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Showing {Math.min((page - 1) * DEFAULT_LIMIT + 1, total)}-
                    {Math.min(page * DEFAULT_LIMIT, total)} of {total}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <RejectModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        onConfirm={handleRejectConfirm}
        competition={competitionToReject}
        reason={rejectReason}
        setReason={setRejectReason}
        isLoading={isActionLoading}
      />
    </main>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      {children}
    </th>
  );
}

function Badge({ color, label }: { color: 'green' | 'red' | 'blue' | 'purple' | 'amber' | 'orange' | 'gray'; label: string }) {
  const colorMap: Record<typeof color, string> = {
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    amber: 'bg-amber-100 text-amber-700',
    orange: 'bg-orange-100 text-orange-700',
    gray: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${colorMap[color]}`}>
      {label}
    </span>
  );
}

function RejectModal({ isOpen, onClose, onConfirm, competition, reason, setReason, isLoading }: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  competition: Competition | null;
  reason: string;
  setReason: (reason: string) => void;
  isLoading: boolean;
}) {
  if (!isOpen || !competition) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Reject Competition</h3>
              <p className="text-sm text-gray-500">Provide a reason for rejection</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-2">
              Are you sure you want to reject <strong>"{competition.title}"</strong>?
            </p>
            <p className="text-xs text-gray-500">
              This action will mark the competition as rejected and it will no longer appear in the pending approval list.
            </p>
          </div>

          <div className="mb-6">
            <label htmlFor="reject-reason" className="block text-sm font-medium text-gray-700 mb-2">
              Rejection Reason (Optional)
            </label>
            <textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              placeholder="Provide a reason for rejecting this competition..."
              rows={3}
              maxLength={500}
            />
            <p className="mt-1 text-xs text-gray-500">
              {reason.length}/500 characters
            </p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Rejecting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reject Competition
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ label, icon, onClick, disabled, className }: { label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean; className?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {icon}
      {label}
    </button>
  );
}
