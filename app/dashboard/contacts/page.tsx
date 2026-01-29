"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useSubscription } from "@/hooks/use-subscription";

type ContactRow = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  created_at: string;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(dateString: string) {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ============================================================================
// ICONS
// ============================================================================

const Icons = {
  users: (
    <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  plus: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  close: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  edit: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  trash: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  success: (
    <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  empty: (
    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
};

// ============================================================================
// COMPONENTS
// ============================================================================

function UsageCard({ 
  used, 
  limit, 
  planName,
  canAdd,
}: { 
  used: number; 
  limit: number;
  planName: string;
  canAdd: boolean;
}) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isAtLimit = !isUnlimited && used >= limit;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-50 rounded-xl">
            {Icons.users}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Contact Usage</h2>
            <p className="text-sm text-gray-500">{planName} plan</p>
          </div>
        </div>
        {!canAdd && (
          <span className="text-xs bg-red-50 text-red-700 px-3 py-1.5 rounded-full font-medium border border-red-200">
            Limit reached
          </span>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Contacts used</span>
          <span className={`font-semibold ${isAtLimit ? "text-red-600" : "text-gray-900"}`}>
            {used} / {isUnlimited ? "∞" : limit}
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isAtLimit
                ? "bg-red-500"
                : "bg-gradient-to-r from-blue-500 to-[#3EEBBE]"
            }`}
            style={{ width: isUnlimited ? "0%" : `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
      <div className="p-4 bg-gray-100 rounded-full mb-4">
        {Icons.empty}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No contacts yet
      </h3>
      <p className="text-gray-500 mb-6 max-w-sm text-center">
        Add your first contact to get started. These are the people who will be notified when your switches trigger.
      </p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-all shadow-sm hover:shadow-md"
      >
        {Icons.plus}
        Add your first contact
      </button>
    </div>
  );
}

function ContactCard({
  contact,
  onEdit,
  onDelete,
  deleting,
}: {
  contact: ContactRow;
  onEdit: (contact: ContactRow) => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const initials = contact.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-[#3EEBBE] text-white flex items-center justify-center font-semibold text-sm shadow-sm">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 truncate">
            {contact.name}
          </div>
          <div className="text-sm text-gray-500 truncate">{contact.email}</div>
        </div>

        <div className="flex items-center gap-1">
          <div className="text-xs text-gray-400 hidden sm:block mr-3 px-2 py-1 bg-gray-50 rounded-lg">
            {formatDate(contact.created_at)}
          </div>

          <button
            type="button"
            className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200"
            onClick={() => onEdit(contact)}
            disabled={deleting}
            title="Edit contact"
          >
            {Icons.edit}
          </button>

          <button
            type="button"
            className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
            onClick={onDelete}
            disabled={deleting}
            title="Delete contact"
          >
            {Icons.trash}
          </button>
        </div>
      </div>
    </div>
  );
}

function ContactForm({
  title,
  name,
  email,
  onNameChange,
  onEmailChange,
  onSubmit,
  onCancel,
  saving,
  submitLabel,
  savingLabel,
  highlight,
}: {
  title: string;
  name: string;
  email: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
  submitLabel: string;
  savingLabel: string;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl border ${highlight ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200'} shadow-sm overflow-hidden`}>
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      
      <form onSubmit={onSubmit} className="p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Name</label>
          <input
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
            placeholder="John Doe"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            required
            disabled={saving}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Email</label>
          <input
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
            placeholder="john@example.com"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            required
            disabled={saving}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {saving ? savingLabel : submitLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-5 py-3 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 bg-gray-100 rounded-lg">
        {Icons.users}
      </div>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
        {count}
      </span>
    </div>
  );
}

function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  loading,
  contactName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  contactName: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-xl">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Delete Contact
              </h2>
              <p className="text-sm text-gray-500">
                This action cannot be undone
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-gray-900">{contactName}</span>?
          </p>

          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm text-amber-800">
                This contact will be removed from all switches they're currently assigned to.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-all disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete Contact"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ContactsPage() {
  const router = useRouter();

  const {
    canAddRecipient,
    refreshUsage,
    planName,
    maxRecipients,
    recipientsUsed,
  } = useSubscription();

  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Edit state
  const [editingContact, setEditingContact] = useState<ContactRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<ContactRow | null>(null);

  async function loadContacts() {
    const { data, error } = await supabase
      .from("recipients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      return;
    }

    setContacts(data ?? []);
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }

      await loadContacts();
      setLoading(false);
    })();
  }, [router]);

  async function createContact(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!canAddRecipient) {
      setError(
        `You've reached your ${planName} plan limit of ${maxRecipients} contacts. Please upgrade to add more.`
      );
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("recipients").insert({
      name: contactName.trim(),
      email: contactEmail.trim().toLowerCase(),
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setContactName("");
    setContactEmail("");
    setShowForm(false);
    setSuccess("Contact added successfully!");
    setTimeout(() => setSuccess(null), 3000);

    await loadContacts();
    await refreshUsage();
    setSaving(false);
  }

  function startEdit(contact: ContactRow) {
    setEditingContact(contact);
    setEditName(contact.name);
    setEditEmail(contact.email);
    setError(null);
    setSuccess(null);
    setShowForm(false);
  }

  function cancelEdit() {
    setEditingContact(null);
    setEditName("");
    setEditEmail("");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingContact) return;

    setError(null);
    setSuccess(null);

    if (!editName.trim()) {
      setError("Name is required.");
      return;
    }

    if (!editEmail.trim()) {
      setError("Email is required.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setSavingEdit(true);

    const { error } = await supabase
      .from("recipients")
      .update({
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
      })
      .eq("id", editingContact.id);

    if (error) {
      setError(error.message);
      setSavingEdit(false);
      return;
    }

    setSuccess("Contact updated successfully!");
    setTimeout(() => setSuccess(null), 3000);

    setEditingContact(null);
    setEditName("");
    setEditEmail("");

    await loadContacts();
    setSavingEdit(false);
  }

  function openDeleteModal(contact: ContactRow) {
    setContactToDelete(contact);
    setDeleteModalOpen(true);
    setError(null);
  }

  function closeDeleteModal() {
    setDeleteModalOpen(false);
    setContactToDelete(null);
  }

  async function confirmDelete() {
    if (!contactToDelete) return;

    setError(null);
    setDeleting(true);

    if (editingContact?.id === contactToDelete.id) {
      cancelEdit();
    }

    const { error } = await supabase.from("recipients").delete().eq("id", contactToDelete.id);

    if (error) {
      setError(error.message);
      setDeleting(false);
      return;
    }

    setContacts((prev) => prev.filter((c) => c.id !== contactToDelete.id));
    await refreshUsage();
    setDeleting(false);
    closeDeleteModal();
    
    setSuccess("Contact deleted successfully");
    setTimeout(() => setSuccess(null), 3000);
  }

  // Loading state
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded-lg w-48" />
          <div className="h-24 bg-gray-200 rounded-2xl" />
          <div className="h-20 bg-gray-200 rounded-2xl" />
          <div className="h-20 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Contacts
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage the people who will be notified when your switches trigger
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!canAddRecipient) {
              setError(
                `You've reached your ${planName} plan limit of ${maxRecipients} contacts. Please upgrade to add more.`
              );
              return;
            }
            setShowForm(!showForm);
            setEditingContact(null);
            setError(null);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-all shadow-sm hover:shadow-md"
        >
          {showForm ? (
            <>
              {Icons.close}
              Close
            </>
          ) : (
            <>
              {Icons.plus}
              Add Contact
            </>
          )}
        </button>
      </div>

      {/* Usage Card */}
      <UsageCard
        used={recipientsUsed}
        limit={maxRecipients}
        planName={planName}
        canAdd={canAddRecipient}
      />

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
          {Icons.error}
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
          {Icons.success}
          <p className="text-sm text-emerald-700">{success}</p>
        </div>
      )}

      {/* Add Contact Form */}
      {showForm && (
        <ContactForm
          title="Add a new contact"
          name={contactName}
          email={contactEmail}
          onNameChange={setContactName}
          onEmailChange={setContactEmail}
          onSubmit={createContact}
          onCancel={() => {
            setShowForm(false);
            setContactName("");
            setContactEmail("");
          }}
          saving={saving}
          submitLabel="Add Contact"
          savingLabel="Adding..."
        />
      )}

      {/* Edit Contact Form */}
      {editingContact && (
        <ContactForm
          title="Edit contact"
          name={editName}
          email={editEmail}
          onNameChange={setEditName}
          onEmailChange={setEditEmail}
          onSubmit={saveEdit}
          onCancel={cancelEdit}
          saving={savingEdit}
          submitLabel="Save Changes"
          savingLabel="Saving..."
          highlight
        />
      )}

      {/* Contacts List */}
      <section className="space-y-4">
        <SectionHeader title="Your Contacts" count={contacts.length} />

        {contacts.length === 0 ? (
          <EmptyState onAdd={() => setShowForm(true)} />
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onEdit={startEdit}
                onDelete={() => openDeleteModal(contact)}
                deleting={deleting}
              />
            ))}
          </div>
        )}
      </section>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        loading={deleting}
        contactName={contactToDelete?.name ?? ""}
      />
    </div>
  );
}
