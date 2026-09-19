import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Shield,
  ShieldCheck,
  Users,
  UserCheck,
  Clock,
  Ban,
  Search,
  CheckCircle2,
  AlertCircle,
  Save,
  Trash2,
  Edit3,
  Sparkles,
  ExternalLink,
  Filter,
  RefreshCw
} from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, SUPER_ADMIN_EMAIL } from '../lib/firebase';
import { UserProfile, UserStatus, SubscriptionPlan } from '../types';
import { useAuth } from '../context/AuthContext';

export const AdminPanelModal: React.FC = () => {
  const { isAdminModalOpen, closeAdminModal, isAdmin } = useAuth();

  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
  const [editingNotesUid, setEditingNotesUid] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<string>('');
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Real-time listener on all users for admin
  useEffect(() => {
    if (!isAdminModalOpen || !isAdmin) return;

    setLoading(true);
    const usersCol = collection(db, 'users');

    const unsubscribe = onSnapshot(
      usersCol,
      snapshot => {
        const loaded: UserProfile[] = [];
        snapshot.forEach(docSnap => {
          loaded.push(docSnap.data() as UserProfile);
        });

        // Sort: pending first, then by createdAt desc
        loaded.sort((a, b) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (b.status === 'pending' && a.status !== 'pending') return 1;
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });

        setUsersList(loaded);
        setLoading(false);
      },
      error => {
        setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    );

    return () => unsubscribe();
  }, [isAdminModalOpen, isAdmin]);

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = usersList.length;
    const active = usersList.filter(u => u.status === 'active').length;
    const pending = usersList.filter(u => u.status === 'pending').length;
    const blocked = usersList.filter(u => u.status === 'blocked' || u.status === 'expired').length;
    return { total, active, pending, blocked };
  }, [usersList]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return usersList.filter(u => {
      const matchSearch =
        !term ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        (u.displayName && u.displayName.toLowerCase().includes(term)) ||
        (u.notes && u.notes.toLowerCase().includes(term));

      const matchStatus = statusFilter === 'all' || u.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [usersList, searchTerm, statusFilter]);

  if (!isAdminModalOpen || !isAdmin) return null;

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // 1-Click Activate / Block
  const handleToggleStatus = async (user: UserProfile) => {
    const nextStatus: UserStatus = user.status === 'active' ? 'blocked' : 'active';
    setUpdatingUid(user.uid);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
      showFeedback(
        nextStatus === 'active'
          ? `Acesso liberado para ${user.email}!`
          : `Acesso bloqueado para ${user.email}.`
      );
    } catch (err) {
      console.error('Error updating user status:', err);
      alert('Erro ao atualizar status do usuário.');
    } finally {
      setUpdatingUid(null);
    }
  };

  // Change Subscription Plan
  const handleChangePlan = async (user: UserProfile, newPlan: SubscriptionPlan) => {
    setUpdatingUid(user.uid);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        plan: newPlan,
        updatedAt: new Date().toISOString()
      });
      showFeedback(`Plano de ${user.email} alterado para ${newPlan.toUpperCase()}.`);
    } catch (err) {
      console.error('Error updating user plan:', err);
      alert('Erro ao atualizar plano.');
    } finally {
      setUpdatingUid(null);
    }
  };

  // Save Internal Notes
  const handleSaveNotes = async (user: UserProfile) => {
    setUpdatingUid(user.uid);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        notes: notesDraft,
        updatedAt: new Date().toISOString()
      });
      setEditingNotesUid(null);
      showFeedback(`Anotações salvas para ${user.email}.`);
    } catch (err) {
      console.error('Error saving notes:', err);
      alert('Erro ao salvar anotações.');
    } finally {
      setUpdatingUid(null);
    }
  };

  // Delete User
  const handleDeleteUser = async (user: UserProfile) => {
    if (user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      alert('O Super Administrador não pode ser excluído.');
      return;
    }

    const confirmDelete = window.confirm(
      `Deseja realmente remover o cadastro de ${user.email}? Esta ação é irreversível.`
    );
    if (!confirmDelete) return;

    setUpdatingUid(user.uid);
    try {
      const userRef = doc(db, 'users', user.uid);
      await deleteDoc(userRef);
      showFeedback(`Usuário ${user.email} removido do sistema.`);
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Erro ao excluir usuário.');
    } finally {
      setUpdatingUid(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl text-[#08121E] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#1E5E3A] via-[#E5A93C] to-[#08121E]" />

        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-white relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E5E3A]/10 flex items-center justify-center text-[#1E5E3A] border border-[#1E5E3A]/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-[#08121E]">
                  Painel de Assinaturas & Controle de Acesso
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#E5A93C]/20 text-[#92400E] text-[10px] font-bold uppercase">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Gerencie solicitações pendentes, libere clientes e acompanhe o uso do Semântico Studio.
              </p>
            </div>
          </div>

          <button
            onClick={closeAdminModal}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
            title="Fechar Painel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert if action occurred */}
        {actionFeedback && (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#1E5E3A] shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#FAF9F6] border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Total Cadastros</span>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <span className="text-2xl font-serif font-bold text-[#08121E]">{metrics.total}</span>
              <span className="text-[10px] text-slate-500 mt-1">Registros no Firestore</span>
            </div>

            <div className="bg-[#FAF9F6] border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Assinantes Ativos</span>
                <UserCheck className="w-4 h-4 text-[#1E5E3A]" />
              </div>
              <span className="text-2xl font-serif font-bold text-[#1E5E3A]">{metrics.active}</span>
              <span className="text-[10px] text-emerald-700 mt-1">Acesso destravado</span>
            </div>

            <div className="bg-[#FAF9F6] border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Pendentes</span>
                <Clock className="w-4 h-4 text-[#E5A93C]" />
              </div>
              <span className="text-2xl font-serif font-bold text-[#92400E]">{metrics.pending}</span>
              <span className="text-[10px] text-amber-700 mt-1">Aguardando liberação</span>
            </div>

            <div className="bg-[#FAF9F6] border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Bloqueados</span>
                <Ban className="w-4 h-4 text-rose-500" />
              </div>
              <span className="text-2xl font-serif font-bold text-rose-600">{metrics.blocked}</span>
              <span className="text-[10px] text-rose-700 mt-1">Paywall ativo</span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FAF9F6] p-3 rounded-xl border border-slate-200">
            <div className="relative w-full sm:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por e-mail, nome ou notas PIX..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 focus:border-[#08121E] rounded-lg text-xs text-[#08121E] placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] text-slate-500 font-semibold mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Filtrar:
              </span>

              {(['all', 'pending', 'active', 'blocked'] as const).map(status => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    statusFilter === status
                      ? 'bg-[#08121E] text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {status === 'all' && `Todos (${metrics.total})`}
                  {status === 'pending' && `Pendentes (${metrics.pending})`}
                  {status === 'active' && `Ativos (${metrics.active})`}
                  {status === 'blocked' && `Bloqueados (${metrics.blocked})`}
                </button>
              ))}
            </div>
          </div>

          {/* Users Table / List */}
          <div className="space-y-3">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-xs text-slate-400 space-y-2">
                <div className="w-6 h-6 border-2 border-[#1E5E3A] border-t-transparent rounded-full animate-spin" />
                <span>Carregando assinantes do Firestore em tempo real...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 bg-[#FAF9F6] rounded-xl border border-slate-200 p-6">
                Nenhum usuário encontrado com os filtros selecionados.
              </div>
            ) : (
              filteredUsers.map(u => {
                const isSuperAdminUser = u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                const isEditingNotes = editingNotesUid === u.uid;
                const isUpdatingThis = updatingUid === u.uid;

                return (
                  <div
                    key={u.uid}
                    className={`bg-white border rounded-xl p-4 sm:p-5 transition-all space-y-3 ${
                      u.status === 'pending'
                        ? 'border-amber-300 shadow-xs ring-1 ring-amber-200'
                        : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      {/* User Info */}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-[#08121E]">
                            {u.displayName || u.email.split('@')[0]}
                          </span>

                          <span className="text-xs text-slate-500 font-mono">({u.email})</span>

                          {isSuperAdminUser ? (
                            <span className="px-2 py-0.5 rounded-full bg-[#E5A93C]/20 text-[#92400E] text-[10px] font-bold">
                              SUPER ADMIN
                            </span>
                          ) : u.role === 'admin' ? (
                            <span className="px-2 py-0.5 rounded-full bg-[#1E5E3A]/10 text-[#1E5E3A] text-[10px] font-bold">
                              ADMIN
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">
                              CLIENTE
                            </span>
                          )}

                          {/* Status Badge */}
                          {u.status === 'active' && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                              ATIVO
                            </span>
                          )}
                          {u.status === 'pending' && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-bold animate-pulse">
                              PENDENTE DE LIBERAÇÃO
                            </span>
                          )}
                          {(u.status === 'blocked' || u.status === 'expired') && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-300 text-[10px] font-bold">
                              BLOQUEADO
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                          <span>
                            Cadastrado em:{' '}
                            <strong className="text-slate-700">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : 'N/D'}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Execuções da ferramenta:{' '}
                            <strong className="text-[#1E5E3A] font-mono">{u.usageCount || 0}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Controls & Quick Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Plan Selector */}
                        <div className="flex items-center gap-1.5 bg-[#FAF9F6] px-2.5 py-1.5 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 uppercase font-bold">Plano:</span>
                          <select
                            value={u.plan || 'trial'}
                            disabled={isUpdatingThis}
                            onChange={e => handleChangePlan(u, e.target.value as SubscriptionPlan)}
                            className="bg-transparent text-xs font-bold text-[#08121E] focus:outline-none cursor-pointer"
                          >
                            <option value="trial">Trial</option>
                            <option value="monthly">Mensal</option>
                            <option value="annual">Anual</option>
                            <option value="lifetime">Vitalício</option>
                          </select>
                        </div>

                        {/* 1-Click Liberar Acesso / Bloquear */}
                        {!isSuperAdminUser && (
                          <button
                            type="button"
                            disabled={isUpdatingThis}
                            onClick={() => handleToggleStatus(u)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer ${
                              u.status === 'active'
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300'
                                : 'bg-[#1E5E3A] hover:bg-[#16482C] text-white shadow-xs'
                            }`}
                          >
                            {u.status === 'active' ? 'Bloquear Acesso' : 'Liberar Acesso (1 Clique)'}
                          </button>
                        )}

                        {/* Delete User */}
                        {!isSuperAdminUser && (
                          <button
                            type="button"
                            disabled={isUpdatingThis}
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 rounded-lg border border-transparent hover:border-rose-300 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Excluir cadastro do Firestore"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Internal Notes Row (PIX, receipts, internal flags) */}
                    <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex-1">
                        {isEditingNotes ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={notesDraft}
                              onChange={e => setNotesDraft(e.target.value)}
                              placeholder="Ex: PIX confirmado em 04/09, comprovante arquivado..."
                              className="w-full px-2.5 py-1.5 bg-[#FAF9F6] border border-[#1E5E3A] rounded-lg text-xs text-[#08121E] placeholder-slate-400 focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveNotes(u)}
                              className="px-3 py-1.5 bg-[#1E5E3A] hover:bg-[#16482C] text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Salvar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingNotesUid(null)}
                              className="px-2 py-1.5 text-slate-500 hover:text-slate-800 text-xs cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-500">
                            <span className="text-[11px] font-bold text-slate-700 shrink-0">
                              Notas Internas:
                            </span>
                            <span className="text-slate-600 italic truncate max-w-xl">
                              {u.notes || 'Nenhuma anotação registrada ainda.'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNotesUid(u.uid);
                                setNotesDraft(u.notes || '');
                              }}
                              className="text-[#1E5E3A] hover:underline text-[11px] font-semibold flex items-center gap-1 cursor-pointer shrink-0 ml-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Editar</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#322e35] bg-[#24202a] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Escuta em tempo real do Firestore conectada ao projeto <strong>blogsemantico</strong></span>
          </div>
          <button
            type="button"
            onClick={closeAdminModal}
            className="px-4 py-2 bg-[#383340] hover:bg-[#484252] text-white rounded-lg font-bold text-xs cursor-pointer"
          >
            Fechar Painel
          </button>
        </div>
      </div>
    </div>
  );
};
