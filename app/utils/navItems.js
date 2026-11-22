import {
  IoHelpCircleOutline,
  IoSettingsOutline,
  IoCloudUploadOutline,
} from "react-icons/io5";

export const nav = [
  {
    name: "Overview",
    url: "/dashboard",
  },
  {
    name: "Transactions",
    url: "/dashboard/transactions",
  },
  {
    name: "Wallets",
    url: "/dashboard/wallets",
  },
  {
    name: "Budgets",
    url: "/dashboard/budgets",
  },
  {
    name: "Categories",
    url: "/dashboard/categories",
  },
  {
    name: "Debts & Loans",
    url: "/dashboard/debts",
  },
  {
    name: "Planning",
    url: "/dashboard/planning",
  },
  {
    name: "Insights",
    url: "/dashboard/insights",
  },
];

export const navBottom = [
  {
    name: "Import Data",
    url: "/import",
    icon: IoCloudUploadOutline,
  },
  {
    name: "Preferences",
    url: "/dashboard/preferences",
    icon: IoSettingsOutline,
  },
  {
    name: "Help",
    url: "/help",
    icon: IoHelpCircleOutline,
  },
];
