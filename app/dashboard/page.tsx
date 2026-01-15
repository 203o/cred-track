"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type CreditItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type CreditItemDraft = {
  id: string;
  name: string;
  quantity: string;
  unitPrice: string;
};

type CreditRecord = {
  id: string;
  customerName: string;
  dueDate: string;
  totalAmount: number;
  amountPaid: number;
  status: "PENDING" | "DUE" | "OVERDUE" | "PARTIALLY_PAID" | "PAID";
  createdAt: string;
  items: CreditItem[];
};

const today = new Date();

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "KES",
    currencyDisplay: "narrowSymbol",
  }).format(amount);
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

function isReminder(dueDate: string, status: CreditRecord["status"]) {
  if (status === "PAID") {
    return false;
  }
  const due = new Date(dueDate);
  const diffDays = Math.ceil(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diffDays <= 7;
}

const statusLabels: Record<CreditRecord["status"], string> = {
  PENDING: "Pending",
  DUE: "Due",
  OVERDUE: "Overdue",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
};

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CreditRecord | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reminderCount, setReminderCount] = useState(10);
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "warning";
  } | null>(null);
  const [credits, setCredits] = useState<CreditRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [formState, setFormState] = useState({
    customerName: "",
    dueDate: "",
    amountPaid: "",
    items: [{ id: crypto.randomUUID(), name: "", quantity: "", unitPrice: "" }],
  });

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (!session?.user?.id) {
      return;
    }

    const fetchCredits = async () => {
      const response = await fetch(`/api/credits?userId=${session.user.id}`);
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setCredits(data.credits || []);
    };

    fetchCredits();
  }, [session?.user?.id]);

  const totalOwed = useMemo(
    () =>
      credits
        .filter((record) => record.status !== "PAID")
        .reduce(
          (sum, record) => sum + (record.totalAmount - record.amountPaid),
          0
        ),
    [credits]
  );

  const reminders = useMemo(
    () => credits.filter((record) => isReminder(record.dueDate, record.status)),
    [credits]
  );
  const dueTodayCount = useMemo(() => {
    const todayString = new Date().toDateString();
    return credits.filter((record) => {
      if (record.status === "PAID") {
        return false;
      }
      return new Date(record.dueDate).toDateString() === todayString;
    }).length;
  }, [credits]);
  const filteredCredits = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return credits;
    }
    return credits.filter((record) =>
      record.customerName.toLowerCase().includes(term)
    );
  }, [credits, searchTerm]);
  const pageSize = 5;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredCredits.length / pageSize)
  );
  const paginatedCredits = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredCredits.slice(startIndex, startIndex + pageSize);
  }, [filteredCredits, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const handleInputChange = (field: keyof typeof formState) => {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormState((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };
  };

  const handleItemChange = (
    index: number,
    field: "name" | "quantity" | "unitPrice",
    value: string
  ) => {
    setFormState((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const handleAddItem = () => {
    setFormState((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { id: crypto.randomUUID(), name: "", quantity: "", unitPrice: "" },
      ],
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormState((prev) => {
      const items = prev.items.filter((_, idx) => idx !== index);
      return {
        ...prev,
        items: items.length
          ? items
          : [{ id: crypto.randomUUID(), name: "", quantity: "", unitPrice: "" }],
      };
    });
  };

  const handleAddCredit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session.user?.id) {
      return;
    }

    const items = formState.items
      .filter((item) => item.name.trim())
      .map((item) => ({
        name: item.name.trim(),
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
      }));
    const amountPaid = Number(formState.amountPaid || 0);

    if (!formState.customerName || !formState.dueDate || items.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.id,
          customerName: formState.customerName.trim(),
          dueDate: formState.dueDate,
          amountPaid,
          items,
        }),
      });

      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setCredits((prev) => [data.credit, ...prev]);
      setFormState({
        customerName: "",
        dueDate: "",
        amountPaid: "",
        items: [{ id: crypto.randomUUID(), name: "", quantity: "", unitPrice: "" }],
      });
      setIsAddDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (
    recordId: string,
    status: CreditRecord["status"]
  ) => {
    const response = await fetch(`/api/credits/${recordId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    setCredits((prev) =>
      prev.map((record) =>
        record.id === recordId ? data.credit : record
      )
    );
    if (selectedRecord?.id === recordId) {
      setSelectedRecord(data.credit);
    }
  };

  const handleRemind = () => {
    setReminderCount((prev) => {
      if (prev === 0) {
        return 0;
      }
      const next = prev - 1;
      return next;
    });
    if (reminderCount === 0) {
      setToast({
        message: "Reminders are finished. Please recharge your account.",
        variant: "warning",
      });
      return;
    }
    setToast({ message: "Reminder sent.", variant: "success" });
  };

  const handleSendAllDueToday = () => {
    if (dueTodayCount === 0) {
      return;
    }
    if (reminderCount === 0) {
      setToast({
        message: "Reminders are finished. Please recharge your account.",
        variant: "warning",
      });
      return;
    }
    if (reminderCount < dueTodayCount) {
      setToast({
        message:
          "Not enough reminders to send all due today. Please recharge your account.",
        variant: "warning",
      });
      return;
    }
    setReminderCount((prev) => prev - dueTodayCount);
    setToast({ message: "Reminders sent.", variant: "success" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-indigo-600">Cred</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-700">
                {session.user?.name || session.user?.email}
              </span>
              <button
                onClick={() => signOut()}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Total money owed</p>
            <h2 className="text-2xl font-semibold text-gray-800 mt-2">
              {formatMoney(totalOwed)}
            </h2>
          </div>
          <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Reminders available</p>
                <h2 className="text-2xl font-semibold text-gray-800 mt-2">
                  {reminderCount} reminder{reminderCount === 1 ? "" : "s"}
                </h2>
                <p className="mt-2 text-xs text-gray-500">
                  Mpesa reminders will show here once money is loaded.
                </p>
              </div>
              <button
                onClick={() => setIsAddDialogOpen(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                Add Credit
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-600">
                Due today: {dueTodayCount} customer{dueTodayCount === 1 ? "" : "s"}
              </p>
              <button
                onClick={handleSendAllDueToday}
                disabled={dueTodayCount === 0}
                className="inline-flex items-center justify-center rounded-lg border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send all due today
              </button>
            </div>
            {reminders.length > 0 ? (
              <p className="mt-4 text-sm text-gray-600">
                You have reminders waiting to be sent.
              </p>
            ) : (
              <p className="mt-4 text-sm text-gray-500">
                No reminders due in the next 7 days.
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="flex flex-col gap-3 px-6 py-4 border-b md:flex-row md:items-center md:justify-between">
            <h3 className="text-lg font-semibold text-gray-800">
              Customers Owed
            </h3>
            <div className="w-full max-w-xs">
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search customers"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="divide-y">
            {paginatedCredits.map((record) => (
              <div
                key={record.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between px-6 py-4 gap-4"
              >
                <div>
                  <p className="text-sm text-gray-500">Customer</p>
                  <p className="text-base font-semibold text-gray-800">
                    {record.customerName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount owed</p>
                  <p className="text-base font-semibold text-gray-800">
                    {formatMoney(record.totalAmount - record.amountPaid)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Due date</p>
                  <p className="text-base font-semibold text-gray-800">
                    {formatDate(record.dueDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <select
                    value={record.status}
                    onChange={(event) =>
                      handleStatusChange(
                        record.id,
                        event.target.value as CreditRecord["status"]
                      )
                    }
                    className="mt-1 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => setSelectedRecord(record)}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50"
                >
                  View
                </button>
                <button
                  onClick={handleRemind}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Remind
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>

      {isAddDialogOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                Add Credit
              </h3>
              <button
                onClick={() => setIsAddDialogOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form className="mt-4 space-y-4" onSubmit={handleAddCredit}>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Customer name
                </label>
                <input
                  type="text"
                  value={formState.customerName}
                  onChange={handleInputChange("customerName")}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Items taken
                </label>
                <div className="mt-2 space-y-3 max-h-72 overflow-y-auto pr-1">
                  {formState.items.map((item, index) => (
                    <div
                      key={item.id}
                      className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-center"
                    >
                      <input
                        type="text"
                        value={item.name}
                        onChange={(event) =>
                          handleItemChange(index, "name", event.target.value)
                        }
                        placeholder="Item name"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity}
                        onChange={(event) =>
                          handleItemChange(index, "quantity", event.target.value)
                        }
                        placeholder="Qty"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(event) =>
                          handleItemChange(index, "unitPrice", event.target.value)
                        }
                        placeholder="Unit price"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                      <div className="flex items-center rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700 md:justify-end">
                        {formatMoney(
                          Number(item.quantity || 0) * Number(item.unitPrice || 0)
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 md:justify-self-end"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    + Add another item
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Amount paid (optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.amountPaid}
                  onChange={handleInputChange("amountPaid")}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Due date
                </label>
                <input
                  type="date"
                  value={formState.dueDate}
                  onChange={handleInputChange("dueDate")}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddDialogOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  {isSubmitting ? "Saving..." : "Save Credit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selectedRecord ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                Credit Details
              </h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-500">Customer</span>
                <span className="font-medium">{selectedRecord.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount owed</span>
                <span className="font-medium">
                  {formatMoney(
                    selectedRecord.totalAmount - selectedRecord.amountPaid
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount paid</span>
                <span className="font-medium">
                  {formatMoney(selectedRecord.amountPaid)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Due date</span>
                <span className="font-medium">
                  {formatDate(selectedRecord.dueDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="font-medium">
                  {statusLabels[selectedRecord.status]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Items</span>
                <span className="font-medium">
                  {selectedRecord.items.length}
                </span>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs uppercase text-gray-400">Item details</p>
                <div className="mt-2 space-y-2">
                  {selectedRecord.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-sm text-gray-700"
                    >
                      <span>
                        {item.name} ({item.quantity} ×{" "}
                        {formatMoney(item.unitPrice)})
                      </span>
                      <span className="font-medium">{formatMoney(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="font-medium">
                  {formatDate(selectedRecord.createdAt)}
                </span>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {toast ? (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
              toast.variant === "success"
                ? "bg-emerald-600 text-white"
                : "bg-amber-500 text-white"
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}
    </div>
  );
}
