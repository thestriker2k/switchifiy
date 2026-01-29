"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useSubscription } from "@/hooks/use-subscription";
import { useSwitches } from "@/hooks/use-switches";
import { useRecipients } from "@/hooks/use-recipients";
import { formatDateTime } from "@/lib/utils";

import {
  StatCard,
  SectionHeader,
  EmptyState,
  Icons,
  SwitchCard,
  CreateSwitchForm,
} from "@/components/dashboard";

export default function DashboardPage() {
  const router = useRouter();

  // Subscription hook for plan limits
  const {
    canCreateSwitch,
    canAddRecipient,
    refreshUsage,
    planName,
    maxSwitches,
    maxRecipients,
  } = useSubscription();

  // Switches hook
  const {
    loading,
    error,
    setError,
    clearError,
    activeCount,
    inactiveCount,
    completedCount,
    activeSwitches,
    inactiveSwitches,
    completedSwitches,
    switchRecipients,
    lastCheckInAt,
    togglingId,
    browserTZ,
    initialize,
    refreshOverview,
    loadSwitchRecipients,
    toggleSwitchStatus,
    getNextDefaultSwitchName,
  } = useSwitches();

  // Recipients hook
  const { recipients, loadRecipients, createRecipient, validateNewRecipient } =
    useRecipients();

  // Local UI state
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Initialize on mount
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.replace("/login");
        return;
      }

      await Promise.all([initialize(), loadRecipients()]);
    })();
  }, [router, initialize, loadRecipients]);

  // Handlers
  function handleOpenCreate() {
    if (!canCreateSwitch) {
      setError(
        `You've reached your ${planName} plan limit of ${maxSwitches} switch${maxSwitches === 1 ? "" : "es"}. Please upgrade to create more.`,
      );
      return;
    }
    setEditingId(null);
    clearError();
    setShowCreate(true);
  }

  function handleCloseCreate() {
    setShowCreate(false);
    clearError();
  }

  async function handleCreateSuccess() {
    await Promise.all([refreshOverview(), loadSwitchRecipients()]);
    setShowCreate(false);
  }

  async function handleToggle(switchId: string, makeActive: boolean) {
    if (editingId === switchId) setEditingId(null);
    await toggleSwitchStatus(switchId, makeActive);
  }

  async function handleSwitchSave() {
    await refreshOverview();
  }

  async function handleSwitchDelete() {
    setEditingId(null);
    await Promise.all([refreshOverview(), loadSwitchRecipients()]);
    await refreshUsage();

    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleRecipientsChange() {
    await loadSwitchRecipients();
  }

  async function handleCreateRecipient(name: string, email: string) {
    const validationError = validateNewRecipient(name, email);
    if (validationError) {
      return { data: null, error: validationError, isExisting: false };
    }
    return createRecipient(name, email);
  }

  function scrollToSection(sectionId: string) {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded-lg w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-2xl" />
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your switches and check-ins
          </p>
        </div>

        <button
          type="button"
          onClick={showCreate ? handleCloseCreate : handleOpenCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-all shadow-sm hover:shadow-md"
        >
          {showCreate ? (
            <>
              {Icons.close}
              Close
            </>
          ) : (
            <>
              {Icons.plus}
              New Switch
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
          {Icons.error}
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Create Switch Form */}
      {showCreate && (
        <CreateSwitchForm
          recipients={recipients}
          onClose={handleCloseCreate}
          onSuccess={handleCreateSuccess}
          onError={setError}
          canCreateSwitch={canCreateSwitch}
          canAddRecipient={canAddRecipient}
          planName={planName}
          maxSwitches={maxSwitches}
          maxRecipients={maxRecipients}
          getNextDefaultSwitchName={getNextDefaultSwitchName}
          onCreateRecipient={handleCreateRecipient}
          refreshUsage={refreshUsage}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active"
          value={activeCount}
          icon={Icons.active}
          onClick={() => scrollToSection("active-switches")}
        />
        <StatCard
          title="Inactive"
          value={inactiveCount}
          icon={Icons.inactive}
          onClick={() => scrollToSection("inactive-switches")}
        />
        <StatCard
          title="Completed"
          value={completedCount}
          icon={Icons.completed}
          onClick={() => scrollToSection("completed-switches")}
        />
        <StatCard
          title="Last Check-in"
          value={
            lastCheckInAt
              ? formatDateTime(new Date(lastCheckInAt), browserTZ)
              : "â€”"
          }
          footer={browserTZ}
          icon={Icons.clock}
          compact
        />
      </div>

      {/* Active Switches */}
      <section className="space-y-4">
        <SectionHeader
          id="active-switches"
          title="Active Switches"
          count={activeSwitches.length}
          icon={Icons.active}
        />

        {activeSwitches.length === 0 ? (
          <EmptyState
            message="No active switches yet. Create one to get started!"
            icon={Icons.empty}
          />
        ) : (
          <div className="space-y-3">
            {activeSwitches.map((s) => (
              <SwitchCard
                key={s.id}
                switchData={s}
                recipients={recipients}
                switchRecipients={switchRecipients}
                isOpen={editingId === s.id}
                isToggling={togglingId === s.id}
                onToggle={(makeActive) => handleToggle(s.id, makeActive)}
                onEdit={() => {
                  setShowCreate(false);
                  setEditingId(s.id);
                }}
                onClose={() => setEditingId(null)}
                onSave={handleSwitchSave}
                onDelete={handleSwitchDelete}
                onRecipientsChange={handleRecipientsChange}
                onError={setError}
                canAddRecipient={canAddRecipient}
                planName={planName}
                maxRecipients={maxRecipients}
                onCreateRecipient={handleCreateRecipient}
                refreshUsage={refreshUsage}
              />
            ))}
          </div>
        )}
      </section>

      {/* Inactive Switches */}
      <section className="space-y-4">
        <SectionHeader
          id="inactive-switches"
          title="Inactive Switches"
          count={inactiveSwitches.length}
          icon={Icons.inactive}
        />

        {inactiveSwitches.length === 0 ? (
          <EmptyState message="No inactive switches" icon={Icons.empty} />
        ) : (
          <div className="space-y-3">
            {inactiveSwitches.map((s) => (
              <SwitchCard
                key={s.id}
                switchData={s}
                recipients={recipients}
                switchRecipients={switchRecipients}
                isOpen={editingId === s.id}
                isToggling={togglingId === s.id}
                onToggle={(makeActive) => handleToggle(s.id, makeActive)}
                onEdit={() => {
                  setShowCreate(false);
                  setEditingId(s.id);
                }}
                onClose={() => setEditingId(null)}
                onSave={handleSwitchSave}
                onDelete={handleSwitchDelete}
                onRecipientsChange={handleRecipientsChange}
                onError={setError}
                canAddRecipient={canAddRecipient}
                planName={planName}
                maxRecipients={maxRecipients}
                onCreateRecipient={handleCreateRecipient}
                refreshUsage={refreshUsage}
              />
            ))}
          </div>
        )}
      </section>

      {/* Completed Switches */}
      <section className="space-y-4">
        <SectionHeader
          id="completed-switches"
          title="Completed Switches"
          count={completedSwitches.length}
          icon={Icons.completed}
        />

        {completedSwitches.length === 0 ? (
          <EmptyState message="No completed switches" icon={Icons.empty} />
        ) : (
          <div className="space-y-3">
            {completedSwitches.map((s) => (
              <SwitchCard
                key={s.id}
                switchData={s}
                recipients={recipients}
                switchRecipients={switchRecipients}
                isOpen={editingId === s.id}
                isToggling={false}
                onToggle={() => {}}
                onEdit={() => {
                  setShowCreate(false);
                  setEditingId(s.id);
                }}
                onClose={() => setEditingId(null)}
                onSave={handleSwitchSave}
                onDelete={handleSwitchDelete}
                onRecipientsChange={handleRecipientsChange}
                onError={setError}
                canAddRecipient={canAddRecipient}
                planName={planName}
                maxRecipients={maxRecipients}
                onCreateRecipient={handleCreateRecipient}
                refreshUsage={refreshUsage}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
