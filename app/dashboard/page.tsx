"use client";

import { useSession, signOut } from "@/lib/auth-client";
import Image from "next/image";
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
  customerPhone: string;
  dueDate: string;
  totalAmount: number;
  amountPaid: number;
  status: "PENDING" | "DUE" | "OVERDUE" | "PARTIALLY_PAID" | "PAID";
  createdAt: string;
  items: CreditItem[];
};

type StockItem = {
  id: string;
  product: string;
  buyingPrice: number;
  sellingPrice: number;
  quantity: number;
  supplierPhone: string;
  createdAt: string;
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
  const [reminderBalance, setReminderBalance] = useState(0);
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "warning";
  } | null>(null);
  const [credits, setCredits] = useState<CreditRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isTopupOpen, setIsTopupOpen] = useState(false);
  const [topupPhone, setTopupPhone] = useState("");
  const [topupAmount, setTopupAmount] = useState("10");
  const [isTopupSubmitting, setIsTopupSubmitting] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [isStockSubmitting, setIsStockSubmitting] = useState(false);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stockReduceAmounts, setStockReduceAmounts] = useState<
    Record<string, string>
  >({});
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);
  const [stockForm, setStockForm] = useState({
    product: "",
    buyingPrice: "",
    sellingPrice: "",
    quantity: "",
    supplierPhone: "",
  });
  const [formState, setFormState] = useState({
    customerName: "",
    customerPhone: "",
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
      setReminderBalance(Number(data.balance || 0));
    };

    const fetchStock = async () => {
      const response = await fetch(`/api/stock?userId=${session.user.id}`);
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setStockItems(data.items || []);
    };

    fetchCredits();
    fetchStock();
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
  const stockValue = useMemo(
    () =>
      stockItems.reduce(
        (sum, item) => sum + Number(item.buyingPrice) * item.quantity,
        0
      ),
    [stockItems]
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
  const overdueCount = useMemo(
    () => credits.filter((record) => record.status === "OVERDUE").length,
    [credits]
  );
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

    if (
      !formState.customerName ||
      !formState.customerPhone ||
      !formState.dueDate ||
      items.length === 0
    ) {
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
          customerPhone: formState.customerPhone.trim(),
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
        customerPhone: "",
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

  const handleDeleteCredit = async (recordId: string) => {
    const response = await fetch(`/api/credits/${recordId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setToast({
        message: "Failed to delete credit. Please try again.",
        variant: "warning",
      });
      return;
    }
    setCredits((prev) => prev.filter((record) => record.id !== recordId));
    if (selectedRecord?.id === recordId) {
      setSelectedRecord(null);
    }
    setToast({ message: "Credit deleted.", variant: "success" });
  };

  const handleRemind = async (creditId: string) => {
    if (reminderBalance === 0) {
      setToast({
        message: "Reminders are finished. Please recharge your account.",
        variant: "warning",
      });
      return;
    }
    if (!session?.user?.id) {
      return;
    }
    const response = await fetch("/api/reminders/send-single", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: session.user.id, creditId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.sent) {
      setToast({
        message: data?.error || "Failed to send reminder. Please try again.",
        variant: "warning",
      });
      return;
    }
    console.log("[Remind] client success", data);
    setReminderBalance(Number(data.balance ?? reminderBalance));
    setToast({ message: "Reminder sent.", variant: "success" });
  };

  const handleSendAllDueToday = async () => {
    if (dueTodayCount === 0) {
      return;
    }
    if (reminderBalance === 0) {
      setToast({
        message: "Reminders are finished. Please recharge your account.",
        variant: "warning",
      });
      return;
    }
    if (reminderBalance < dueTodayCount) {
      setToast({
        message:
          "Not enough reminders to send all due today. Please recharge your account.",
        variant: "warning",
      });
      return;
    }
    if (!session?.user?.id) {
      return;
    }
    const response = await fetch("/api/reminders/send-due-today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: session.user.id }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setToast({
        message: data?.error || "Failed to send reminders. Please try again.",
        variant: "warning",
      });
      return;
    }
    if (!data?.sentCount && data?.error) {
      setToast({ message: data.error, variant: "warning" });
      return;
    }
    setReminderBalance(Number(data.balance ?? reminderBalance));
    setToast({ message: "Reminders sent.", variant: "success" });
  };

  const handleSendOverdue = async () => {
    if (overdueCount === 0) {
      return;
    }
    if (reminderBalance === 0) {
      setToast({
        message: "Reminders are finished. Please recharge your account.",
        variant: "warning",
      });
      return;
    }
    if (reminderBalance < overdueCount) {
      setToast({
        message:
          "Not enough reminders to send all overdue. Please recharge your account.",
        variant: "warning",
      });
      return;
    }
    if (!session?.user?.id) {
      return;
    }
    const response = await fetch("/api/reminders/send-overdue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: session.user.id }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setToast({
        message: data?.error || "Failed to send reminders. Please try again.",
        variant: "warning",
      });
      return;
    }
    if (!data?.sentCount && data?.error) {
      setToast({ message: data.error, variant: "warning" });
      return;
    }
    setReminderBalance(Number(data.balance ?? reminderBalance));
    setToast({ message: "Reminders sent.", variant: "success" });
  };

  const handleStockInputChange = (field: keyof typeof stockForm) => {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      setStockForm((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };
  };

  const handleAddStock = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session?.user?.id) {
      return;
    }
    if (
      !stockForm.product ||
      !stockForm.buyingPrice ||
      !stockForm.sellingPrice ||
      !stockForm.quantity ||
      !stockForm.supplierPhone
    ) {
      return;
    }

    setIsStockSubmitting(true);
    try {
      const response = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.id,
          product: stockForm.product.trim(),
          buyingPrice: Number(stockForm.buyingPrice),
          sellingPrice: Number(stockForm.sellingPrice),
          quantity: Number(stockForm.quantity),
          supplierPhone: stockForm.supplierPhone.trim(),
        }),
      });

      if (!response.ok) {
        setToast({
          message: "Failed to add stock. Please try again.",
          variant: "warning",
        });
        return;
      }
      const data = await response.json();
      setStockItems((prev) => [data.item, ...prev]);
      setStockForm({
        product: "",
        buyingPrice: "",
        sellingPrice: "",
        quantity: "",
        supplierPhone: "",
      });
      setIsStockDialogOpen(false);
      setToast({ message: "Stock item added.", variant: "success" });
    } finally {
      setIsStockSubmitting(false);
    }
  };

  const handleReduceStock = async (itemId: string) => {
    if (!session?.user?.id) {
      return;
    }
    const reduceBy = Number(stockReduceAmounts[itemId] || 0);
    if (!Number.isFinite(reduceBy) || reduceBy <= 0) {
      setToast({
        message: "Enter a valid quantity to reduce.",
        variant: "warning",
      });
      return;
    }

    const response = await fetch(`/api/stock/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reduceBy }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setToast({
        message: data?.error || "Failed to reduce stock.",
        variant: "warning",
      });
      return;
    }
    setStockItems((prev) =>
      prev.map((item) => (item.id === itemId ? data.item : item))
    );
    setStockReduceAmounts((prev) => ({ ...prev, [itemId]: "" }));
    setToast({ message: "Stock updated.", variant: "success" });
  };

  const handleNotifySupplier = async (itemId: string) => {
    if (!session?.user?.id) {
      return;
    }
    const response = await fetch("/api/stock/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: session.user.id, itemId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setToast({
        message: data?.error || "Failed to notify supplier.",
        variant: "warning",
      });
      return;
    }
    setToast({ message: "Supplier notified.", variant: "success" });
  };

  const handleTopup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session?.user?.id) {
      return;
    }
    if (!topupPhone.startsWith("+")) {
      setToast({
        message: "Enter a phone number in +254... format.",
        variant: "warning",
      });
      return;
    }
    const amount = Number(topupAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount % 10 !== 0) {
      setToast({
        message: "Amount must be a multiple of 10.",
        variant: "warning",
      });
      return;
    }

    setIsTopupSubmitting(true);
    try {
      const response = await fetch("/api/credits/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.id,
          phone: topupPhone.trim(),
          amount,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setToast({
          message: data?.error || "Failed to start STK push.",
          variant: "warning",
        });
        return;
      }
      setToast({
        message: "STK Push sent. Confirm on your phone.",
        variant: "success",
      });
      setIsTopupOpen(false);
      setTopupPhone("");
      setTopupAmount("10");
    } finally {
      setIsTopupSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <Image src="/logo.jpeg" alt="Holwa logo" width={32} height={32} />
              <h1 className="text-2xl font-bold text-blue-700">Holwa</h1>
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
        <div className="grid gap-6 md:grid-cols-4">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Total money owed</p>
            <h2 className="text-2xl font-semibold text-gray-800 mt-2">
              {formatMoney(totalOwed)}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Stock value: {formatMoney(stockValue)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Reminders</p>
            <div className="mt-2 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-gray-800">
                {reminderBalance}
              </h2>
              <button
                onClick={() => setIsTopupOpen(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800"
              >
                Recharge
              </button>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Due today</p>
            <h2 className="text-2xl font-semibold text-gray-800 mt-2">
              {dueTodayCount}
            </h2>
            <button
              onClick={handleSendAllDueToday}
              disabled={dueTodayCount === 0}
              className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send due today
            </button>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Overdue</p>
            <h2 className="text-2xl font-semibold text-gray-800 mt-2">
              {overdueCount}
            </h2>
            <button
              onClick={handleSendOverdue}
              disabled={overdueCount === 0}
              className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send overdue
            </button>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow">
          <div className="flex flex-col gap-3 px-6 py-4 border-b md:flex-row md:items-center md:justify-between">
            <div className="flex items-center justify-between gap-3 md:justify-start">
              <h3 className="text-lg font-semibold text-gray-800">
                List of Creditors
              </h3>
              <button
                onClick={() => setIsAddDialogOpen(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 md:hidden"
              >
                Add Credit
              </button>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center md:flex-1 md:justify-center">
              <div className="w-full max-w-xs">
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search customers"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
            <button
              onClick={() => setIsAddDialogOpen(true)}
              className="hidden md:inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800"
            >
              Add Credit
            </button>
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
                  className="mt-1 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50"
                >
                  View
                </button>
                <button
                  onClick={() => handleRemind(record.id)}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Remind
                </button>
                <button
                  onClick={() => handleDeleteCredit(record.id)}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                >
                  Delete
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

        <div className="bg-white rounded-lg shadow">
          <div className="flex flex-col gap-3 px-6 py-4 border-b md:flex-row md:items-center md:justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Stock items</h3>
            <button
              onClick={() => setIsStockDialogOpen(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800"
            >
              Add stock
            </button>
          </div>
          <div className="divide-y">
            {stockItems.length === 0 ? (
              <div className="px-6 py-6 text-sm text-gray-500">
                No stock items added yet.
              </div>
            ) : (
              stockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between px-6 py-4 gap-4"
                >
                  <div>
                    <p className="text-sm text-gray-500">Product</p>
                    <p className="text-base font-semibold text-gray-800">
                      {item.product}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Alert</p>
                    <p
                      className={`text-base font-semibold ${
                        item.quantity < 5
                          ? "text-red-600"
                          : item.quantity < 10
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {item.quantity < 5
                        ? "Extremely low"
                        : item.quantity < 10
                        ? "Low"
                        : "Normal"}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedStock(item)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleNotifySupplier(item.id)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800"
                  >
                    Notify supplier
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {isAddDialogOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
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
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Customer phone
                </label>
                <input
                  type="tel"
                  value={formState.customerPhone}
                  onChange={handleInputChange("customerPhone")}
                  placeholder="+254..."
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                    className="text-sm font-medium text-blue-700 hover:text-blue-600"
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
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800"
                >
                  {isSubmitting ? "Saving..." : "Save Credit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isTopupOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                Load Credits
              </h3>
              <button
                onClick={() => setIsTopupOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form className="mt-4 space-y-4" onSubmit={handleTopup}>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone number
                </label>
                <input
                  type="tel"
                  value={topupPhone}
                  onChange={(event) => setTopupPhone(event.target.value)}
                  placeholder="+254..."
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Amount (KES)
                </label>
                <input
                  type="number"
                  min="10"
                  step="10"
                  value={topupAmount}
                  onChange={(event) => setTopupAmount(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                Each Ksh 10 adds 3 reminder credits.
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTopupOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTopupSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800"
                >
                  {isTopupSubmitting ? "Sending..." : "Send STK Push"}
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
                <span className="text-gray-500">Phone</span>
                <span className="font-medium">{selectedRecord.customerPhone}</span>
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
                onClick={() => handleDeleteCredit(selectedRecord.id)}
                className="mr-3 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
              >
                Delete
              </button>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isStockDialogOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Add stock</h3>
              <button
                onClick={() => setIsStockDialogOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form className="mt-4 space-y-4" onSubmit={handleAddStock}>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Product
                </label>
                <input
                  type="text"
                  value={stockForm.product}
                  onChange={handleStockInputChange("product")}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Buying price
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={stockForm.buyingPrice}
                  onChange={handleStockInputChange("buyingPrice")}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Selling price
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={stockForm.sellingPrice}
                  onChange={handleStockInputChange("sellingPrice")}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={stockForm.quantity}
                  onChange={handleStockInputChange("quantity")}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Supplier phone
                </label>
                <input
                  type="tel"
                  value={stockForm.supplierPhone}
                  onChange={handleStockInputChange("supplierPhone")}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStockDialogOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isStockSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800"
                >
                  {isStockSubmitting ? "Saving..." : "Save stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {selectedStock ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                Stock details
              </h3>
              <button
                onClick={() => setSelectedStock(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-500">Product</span>
                <span className="font-medium">{selectedStock.product}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Buying price</span>
                <span className="font-medium">
                  {formatMoney(Number(selectedStock.buyingPrice))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Selling price</span>
                <span className="font-medium">
                  {formatMoney(Number(selectedStock.sellingPrice))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Quantity</span>
                <span className="font-medium">{selectedStock.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Supplier phone</span>
                <span className="font-medium">
                  {selectedStock.supplierPhone}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="font-medium">
                  {formatDate(selectedStock.createdAt)}
                </span>
              </div>
              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-700">
                  Reduce quantity
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={stockReduceAmounts[selectedStock.id] || ""}
                    onChange={(event) =>
                      setStockReduceAmounts((prev) => ({
                        ...prev,
                        [selectedStock.id]: event.target.value,
                      }))
                    }
                    placeholder="Qty sold"
                    className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    onClick={() => handleReduceStock(selectedStock.id)}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50"
                  >
                    Reduce
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => handleNotifySupplier(selectedStock.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800"
              >
                Notify supplier
              </button>
              <button
                onClick={() => setSelectedStock(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
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
