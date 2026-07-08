/* Lakfa ERP Firestore Data Layer */
import { db } from "./firebase-config.js";
import { collection, getDocs, query } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const COLLECTIONS = {
  products: "products",
  customers: "customers",
  suppliers: "suppliers",
  purchases: "purchases",
  inventory: "inventory",
  production: "productionBatches",
  sales: "sales",
  orders: "orders",
  delivery: "deliveries",
  expenses: "expenses",
  income: "income",
  cashBook: "cashbook",
  bankBook: "bankbook",
  investors: "investors",
  sharing: "profitSharing"
};

export async function getCollectionRecords(collectionName) {
  const snapshot = await getDocs(query(collection(db, collectionName)));
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
}

export async function getAllCollections(collectionMap) {
  const entries = await Promise.all(
    Object.entries(collectionMap).map(async ([key, collectionName]) => [
      key,
      await getCollectionRecords(collectionName)
    ])
  );

  return Object.fromEntries(entries);
}
