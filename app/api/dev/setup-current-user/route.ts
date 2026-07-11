import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isUserRole, needsBusinessProfile, type UserRole } from "@/lib/user-profile";

type SetupBody = {
  userId: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role: UserRole;
  secret?: string;
};

const demoSupplierUserId = "demo-supplier-user";
const demoBusinessUserId = "demo-business-user";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function ensureUser({
  id,
  email,
  name,
  image,
}: {
  id: string;
  email: string;
  name: string;
  image?: string | null;
}) {
  const existingByEmail = await prisma.user.findUnique({ where: { email } });
  const storedEmail =
    existingByEmail && existingByEmail.id !== id ? `${id}@firebase.local` : email;

  return prisma.user.upsert({
    where: { id },
    update: {
      email: storedEmail,
      name,
      image: image || null,
      emailVerified: true,
    },
    create: {
      id,
      email: storedEmail,
      name,
      image: image || null,
      emailVerified: true,
    },
  });
}

async function ensureStockItem({
  userId,
  product,
  buyingPrice,
  sellingPrice,
  quantity,
  supplierPhone,
  offers,
}: {
  userId: string;
  product: string;
  buyingPrice: number;
  sellingPrice: number;
  quantity: number;
  supplierPhone: string;
  offers?: string | null;
}) {
  const existing = await prisma.stockItem.findFirst({
    where: {
      userId,
      product: { equals: product, mode: "insensitive" },
    },
  });

  if (existing) {
    return prisma.stockItem.update({
      where: { id: existing.id },
      data: {
        buyingPrice,
        sellingPrice,
        quantity,
        supplierPhone,
        offers: offers || null,
      },
    });
  }

  return prisma.stockItem.create({
    data: {
      userId,
      product,
      buyingPrice,
      sellingPrice,
      quantity,
      supplierPhone,
      offers: offers || null,
    },
  });
}

async function ensureDemoSupplier() {
  await ensureUser({
    id: demoSupplierUserId,
    email: "demo-supplier@holwa.local",
    name: "Holwa Demo Supplier",
  });

  const profile = await prisma.userProfile.upsert({
    where: { userId: demoSupplierUserId },
    update: {
      role: "SUPPLIER",
      businessName: "Holwa Demo Supplies",
      county: "Nairobi",
      town: "Westlands",
      estate: "Muthangari",
      phoneNumber: "+254712345678",
      paymentMode: "TILL",
      description: "Demo supplier with everyday shop goods for testing orders.",
    },
    create: {
      userId: demoSupplierUserId,
      role: "SUPPLIER",
      businessName: "Holwa Demo Supplies",
      county: "Nairobi",
      town: "Westlands",
      estate: "Muthangari",
      phoneNumber: "+254712345678",
      paymentMode: "TILL",
      description: "Demo supplier with everyday shop goods for testing orders.",
    },
  });

  await Promise.all([
    ensureStockItem({
      userId: demoSupplierUserId,
      product: "Salt",
      buyingPrice: 45,
      sellingPrice: 70,
      quantity: 40,
      supplierPhone: "+254712345678",
      offers: "Free delivery for 10 packets and above.",
    }),
    ensureStockItem({
      userId: demoSupplierUserId,
      product: "Sugar",
      buyingPrice: 120,
      sellingPrice: 155,
      quantity: 25,
      supplierPhone: "+254712345678",
      offers: "KES 5 off per kg on bulk orders.",
    }),
    ensureStockItem({
      userId: demoSupplierUserId,
      product: "Cooking Oil",
      buyingPrice: 280,
      sellingPrice: 340,
      quantity: 16,
      supplierPhone: "+254712345678",
      offers: "Wholesale price available for cartons.",
    }),
  ]);

  return profile;
}

async function ensureDemoBusiness() {
  await ensureUser({
    id: demoBusinessUserId,
    email: "demo-business@holwa.local",
    name: "Holwa Demo Business",
  });

  const profile = await prisma.userProfile.upsert({
    where: { userId: demoBusinessUserId },
    update: {
      role: "BUSINESS",
      businessName: "Holwa Demo Shop",
      county: "Kiambu",
      town: "Thika",
      estate: "Makongeni",
      phoneNumber: "+254704837081",
      paymentMode: "POCHI",
      description: "Demo shop used to test supplier restock requests.",
    },
    create: {
      userId: demoBusinessUserId,
      role: "BUSINESS",
      businessName: "Holwa Demo Shop",
      county: "Kiambu",
      town: "Thika",
      estate: "Makongeni",
      phoneNumber: "+254704837081",
      paymentMode: "POCHI",
      description: "Demo shop used to test supplier restock requests.",
    },
  });

  await Promise.all([
    ensureStockItem({
      userId: demoBusinessUserId,
      product: "Salt",
      buyingPrice: 55,
      sellingPrice: 80,
      quantity: 3,
      supplierPhone: "+254712345678",
      offers: null,
    }),
    ensureStockItem({
      userId: demoBusinessUserId,
      product: "Sugar",
      buyingPrice: 125,
      sellingPrice: 165,
      quantity: 8,
      supplierPhone: "+254712345678",
      offers: null,
    }),
  ]);

  return profile;
}

async function ensureOrderRelationship({
  supplierId,
  buyerUserId,
  buyerName,
  buyerPhone,
}: {
  supplierId: string;
  buyerUserId: string;
  buyerName: string;
  buyerPhone: string;
}) {
  const existing = await prisma.supplierOrder.findFirst({
    where: {
      supplierId,
      buyerUserId,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.supplierOrder.create({
    data: {
      supplierId,
      buyerUserId,
      buyerName,
      buyerPhone,
      totalAmount: 235,
      smsStatus: "SENT",
      smsMessageId: "dev-seeded-order",
      items: {
        create: [
          {
            product: "Salt",
            price: 70,
            quantity: 2,
            offers: "Free delivery for 10 packets and above.",
          },
          {
            product: "Sugar",
            price: 155,
            quantity: 1,
            offers: "KES 5 off per kg on bulk orders.",
          },
        ],
      },
    },
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as SetupBody;
  const userId = clean(body.userId);
  const email = clean(body.email) || `${userId}@firebase.local`;
  const name = clean(body.name) || "Holwa User";
  const image = clean(body.image);
  const role = body.role;

  if (process.env.NODE_ENV === "production") {
    const expectedSecret = process.env.DEV_SETUP_SECRET;
    if (!expectedSecret || body.secret !== expectedSecret) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  if (!userId || !isUserRole(role)) {
    return NextResponse.json(
      { error: "Missing current user or invalid role" },
      { status: 400 }
    );
  }

  await ensureUser({ id: userId, email, name, image });

  const profileData = needsBusinessProfile(role)
    ? role === "BUSINESS"
      ? {
          role,
          businessName: "My Holwa Shop",
          county: "Kiambu",
          town: "Thika",
          estate: "Makongeni",
          phoneNumber: "+254704837081",
          paymentMode: "POCHI" as const,
          description: "Retail shop testing Holwa stock and supplier orders.",
        }
      : {
          role,
          businessName: "My Holwa Supplies",
          county: "Nairobi",
          town: "Westlands",
          estate: "Muthangari",
          phoneNumber: "+254712345678",
          paymentMode: "TILL" as const,
          description: "Supplier testing Holwa store and restock requests.",
        }
    : {
        role,
        businessName: null,
        county: null,
        town: null,
        estate: null,
        phoneNumber: null,
        paymentMode: null,
        description: null,
      };

  const profile = await prisma.userProfile.upsert({
    where: { userId },
    update: profileData,
    create: {
      userId,
      ...profileData,
    },
  });

  let seeded = "profile";

  if (role === "BUSINESS") {
    const supplier = await ensureDemoSupplier();
    await Promise.all([
      ensureStockItem({
        userId,
        product: "Salt",
        buyingPrice: 55,
        sellingPrice: 80,
        quantity: 3,
        supplierPhone: "+254712345678",
      }),
      ensureStockItem({
        userId,
        product: "Sugar",
        buyingPrice: 125,
        sellingPrice: 165,
        quantity: 8,
        supplierPhone: "+254712345678",
      }),
    ]);
    await ensureOrderRelationship({
      supplierId: supplier.id,
      buyerUserId: userId,
      buyerName: profile.businessName || "My Holwa Shop",
      buyerPhone: profile.phoneNumber || "+254704837081",
    });
    seeded = "business profile, demo supplier, store items, and order";
  }

  if (role === "SUPPLIER") {
    const demoBusiness = await ensureDemoBusiness();
    await Promise.all([
      ensureStockItem({
        userId,
        product: "Salt",
        buyingPrice: 45,
        sellingPrice: 70,
        quantity: 40,
        supplierPhone: profile.phoneNumber || "+254712345678",
        offers: "Free delivery for 10 packets and above.",
      }),
      ensureStockItem({
        userId,
        product: "Sugar",
        buyingPrice: 120,
        sellingPrice: 155,
        quantity: 25,
        supplierPhone: profile.phoneNumber || "+254712345678",
        offers: "KES 5 off per kg on bulk orders.",
      }),
    ]);
    await ensureOrderRelationship({
      supplierId: profile.id,
      buyerUserId: demoBusiness.userId,
      buyerName: demoBusiness.businessName || "Holwa Demo Shop",
      buyerPhone: demoBusiness.phoneNumber || "+254704837081",
    });
    seeded = "supplier profile, store items, demo business, and order";
  }

  return NextResponse.json({ profile, seeded });
}
