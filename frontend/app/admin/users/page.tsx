"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { usersAPI, type UserListParams, type UserListResponse, type UserUpdate } from '../../../lib/api/users';
import type { User } from '../../../lib/api/auth';
import { apiRequest, ApiError } from '../../../lib/api/utils';

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

interface DetailModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (data: UserUpdate) => Promise<void>;
}

const DEFAULT_LIMIT = 15;

export default function AdminUsersPage() {
  const { user: authUser, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmUser, setConfirmUser] = useState<User | null>(null);

  const [filters, setFilters] = useState<{
    search: string;
    role: '' | 'ADMIN' | 'CREATOR';
    status: '' | 'true' | 'false';
  }>({ search: '', role: '', status: '' });

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
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, page, filters]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const params: UserListParams = {
        skip: (page - 1) * DEFAULT_LIMIT,
        limit: DEFAULT_LIMIT,
      };
      if (filters.role) params.role = filters.role;
      if (filters.status) params.is_active = filters.status === 'true';
      if (filters.search.trim()) params.search = filters.search.trim();

      const response: UserListResponse = await usersAPI.getUsers(params);
      setUsers(response.users);
      setTotal(response.total);
    } catch (error) {
      showToast('error', error instanceof ApiError ? error.message : 'Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (type: ToastState['type'], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const onOpenModal = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const onCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleUpdateUser = async (userId: string, payload: Partial<User>) => {
    setIsActionLoading(true);
    try {
      const updated = await usersAPI.updateUser(userId, payload);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      if (selectedUser?.id === updated.id) setSelectedUser(updated);
      showToast('success', 'User updated successfully');
    } catch (error) {
      showToast('error', error instanceof ApiError ? error.message : 'Failed to update user');
      throw error;
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleStatus = async (userItem: User) => {
    if (userItem.id === authUser?.id) {
      showToast('error', 'You cannot change your own status');
      return;
    }
    const nextState = !userItem.is_active;
    setIsActionLoading(true);
    try {
      await usersAPI.updateUserStatus(userItem.id, nextState);
      setUsers((prev) => prev.map((u) => (u.id === userItem.id ? { ...u, is_active: nextState } : u)));
      showToast('success', `User ${nextState ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      showToast('error', error instanceof ApiError ? error.message : 'Failed to update status');
    } finally {
      setIsActionLoading(false);
    }
  };

  const openRoleChangeConfirmation = (userItem: User) => {
    if (userItem.id === authUser?.id) {
      showToast('error', 'You cannot change your own role');
      return;
    }
    const nextRole = userItem.role === 'ADMIN' ? 'CREATOR' : 'ADMIN';
    const currentRoleText = userItem.role === 'ADMIN' ? 'Admin' : 'Creator';
    const nextRoleText = nextRole === 'ADMIN' ? 'Admin' : 'Creator';

    setConfirmUser(userItem);
    setConfirmMessage(`Are you sure you want to change ${userItem.full_name} from ${currentRoleText} to ${nextRoleText}?`);
    setConfirmAction(() => () => handleChangeRoleConfirm(userItem, nextRole));
    setIsConfirmOpen(true);
  };

  const handleChangeRoleConfirm = async (userItem: User, nextRole: string) => {
    setIsActionLoading(true);
    try {
      await usersAPI.changeUserRole(userItem.id, nextRole);
      setUsers((prev) => prev.map((u) => (u.id === userItem.id ? { ...u, role: nextRole } : u)));
      showToast('success', `Role updated to ${nextRole}`);
    } catch (error) {
      showToast('error', error instanceof ApiError ? error.message : 'Failed to change role');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleChangeRole = openRoleChangeConfirmation;

  const openDeleteConfirmation = (userItem: User) => {
    if (userItem.id === authUser?.id) {
      showToast('error', 'You cannot delete your own account');
      return;
    }

    setConfirmUser(userItem);
    setConfirmMessage(`Are you sure you want to delete ${userItem.full_name}? This action cannot be undone and will permanently remove the user from the system.`);
    setConfirmAction(() => () => handleDeleteUserConfirm(userItem));
    setIsConfirmOpen(true);
  };

  const handleDeleteUserConfirm = async (userItem: User) => {
    setIsActionLoading(true);
    try {
      await usersAPI.deleteUser(userItem.id);
      setUsers((prev) => prev.filter((u) => u.id !== userItem.id));
      setTotal((prev) => Math.max(0, prev - 1));
      showToast('success', 'User deleted successfully');
    } catch (error) {
      showToast('error', error instanceof ApiError ? error.message : 'Failed to delete user');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteUser = openDeleteConfirmation;

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPage(1);
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleResetFilters = () => {
    setPage(1);
    setFilters({ search: '', role: '', status: '' });
  };

  const summary = useMemo(() => {
    const active = users.filter((u) => u.is_active).length;
    const adminCount = users.filter((u) => u.role === 'ADMIN').length;
    return [
      { label: 'Total Users', value: total },
      { label: 'Active', value: active },
      { label: 'Admins', value: adminCount },
    ];
  }, [users, total]);

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
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
              <p className="text-sm text-gray-600">Review, search, and manage roles for all platform users.</p>
            </div>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back to Admin Dashboard
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {summary.map((item) => (
              <div key={item.label} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">{item.label}</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>
        </header>

        <section className="bg-white rounded-2xl shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="w-full md:w-1/2 lg:w-1/3 relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search by name or email..."
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-gray-900 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  name="role"
                  value={filters.role}
                  onChange={handleFilterChange}
                  className="cursor-pointer appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm font-medium text-gray-700 transition hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none min-w-[130px]"
                >
                  <option value="">All Roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="CREATOR">Creator</option>
                </select>
                <svg className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <div className="relative">
                <select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="cursor-pointer appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm font-medium text-gray-700 transition hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none min-w-[130px]"
                >
                  <option value="">Any Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
                <svg className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <button
                onClick={handleResetFilters}
                className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 hover:shadow-md"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reset
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Users</h2>
            <span className="text-sm text-gray-500">{total} total</span>
          </div>

          {isLoading ? (
            <div className="p-10 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="p-10 text-center text-gray-500">No users match the current filters.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <HeaderCell>User</HeaderCell>
                      <HeaderCell>Role</HeaderCell>
                      <HeaderCell>Status</HeaderCell>
                      <HeaderCell>Joined</HeaderCell>
                      <HeaderCell>Actions</HeaderCell>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((userItem) => (
                      <tr key={userItem.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">{userItem.full_name}</div>
                          <div className="text-sm text-gray-500">{userItem.email}</div>
                          {userItem.organization && (
                            <div className="text-xs text-gray-400 mt-1">{userItem.organization}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            color={userItem.role === 'ADMIN' ? 'purple' : 'blue'}
                            label={userItem.role === 'ADMIN' ? 'Admin' : 'Creator'}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            color={userItem.is_active ? 'green' : 'red'}
                            label={userItem.is_active ? 'Active' : 'Inactive'}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(userItem.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2 justify-center">
                            <ActionButton
                              label="View"
                              onClick={() => onOpenModal(userItem)}
                              className="w-22 flex justify-center"
                              icon={
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              }
                            />
                            <ActionButton
                              label={userItem.role === 'ADMIN' ? 'Make Creator' : 'Make Admin'}
                              disabled={isActionLoading || userItem.id === authUser.id}
                              onClick={() => handleChangeRole(userItem)}
                              className="w-34 flex justify-center"
                              icon={
                                userItem.role === 'ADMIN' ? (
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                ) : (
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.008h-.008v-.008z"
                                    />
                                  </svg>
                                )
                              }
                            />
                            <ActionButton
                              label={userItem.is_active ? 'Deactivate' : 'Activate'}
                              disabled={isActionLoading || userItem.id === authUser.id}
                              onClick={() => handleToggleStatus(userItem)}
                              className={`w-28 flex justify-center ${userItem.is_active ? 'text-orange-700 hover:border-orange-300 hover:bg-orange-50' : 'text-green-700 hover:border-green-300 hover:bg-green-50'}`}
                              icon={
                                userItem.is_active ? (
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
                              label="Delete"
                              disabled={isActionLoading || userItem.id === authUser.id}
                              onClick={() => handleDeleteUser(userItem)}
                              className="w-24 flex justify-center text-red-700 hover:border-red-300 hover:bg-red-50"
                              icon={
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              }
                            />
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

      <UserDetailModal
        user={selectedUser}
        isOpen={isModalOpen}
        onClose={onCloseModal}
        onUpdate={(data) => handleUpdateUser(selectedUser!.id, data)}
      />

      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          if (confirmAction) {
            confirmAction();
            setIsConfirmOpen(false);
          }
        }}
        message={confirmMessage}
        user={confirmUser}
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

function Badge({ color, label }: { color: 'green' | 'red' | 'blue' | 'purple'; label: string }) {
  const colorMap: Record<typeof color, string> = {
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${colorMap[color]}`}>
      {label}
    </span>
  );
}

function FilterField({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function UserDetailModal({ user, isOpen, onClose, onUpdate }: DetailModalProps) {
  const [formData, setFormData] = useState<UserUpdate>({});
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        organization: user.organization || '',
        phone_number: user.phone_number || '',
      });
      setErrors({});
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!formData.full_name?.trim()) nextErrors.full_name = 'Full name is required';
    if (!formData.organization?.trim()) nextErrors.organization = 'Organization is required';
    if (!formData.phone_number?.trim()) {
      nextErrors.phone_number = 'Phone number is required';
    } else if (!/^\+?[1-9]\d{1,19}$/.test(formData.phone_number)) {
      nextErrors.phone_number = 'Please enter a valid phone number (e.g., +1234567890)';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSaving(true);
    try {
      await onUpdate(formData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm px-4 py-8">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
            <p className="text-xs text-gray-500">Updating {user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Full Name" error={errors.full_name}>
              <input
                type="text"
                value={formData.full_name || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.full_name ? 'border-red-500' : 'border-gray-300'}`}
                required
              />
            </FormField>
            <FormField label="Organization" error={errors.organization}>
              <input
                type="text"
                value={formData.organization || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, organization: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.organization ? 'border-red-500' : 'border-gray-300'}`}
                required
              />
            </FormField>
            <FormField label="Phone Number" error={errors.phone_number}>
              <input
                type="tel"
                value={formData.phone_number || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone_number: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.phone_number ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="+1234567890"
                required
              />
            </FormField>
            <FormField label="Role">
              <Badge color={user.role === 'ADMIN' ? 'purple' : 'blue'} label={user.role === 'ADMIN' ? 'Admin' : 'Creator'} />
            </FormField>
            <FormField label="Status">
              <Badge color={user.is_active ? 'green' : 'red'} label={user.is_active ? 'Active' : 'Inactive'} />
            </FormField>
            <FormField label="Member Since">
              <span className="text-sm text-gray-600">{new Date(user.created_at).toLocaleString()}</span>
            </FormField>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
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

function ConfirmationModal({ isOpen, onClose, onConfirm, message, user }: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
  user: User | null;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm px-4 py-8">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Confirm Action</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-6">{message}</p>
          {user && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">
                    {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
