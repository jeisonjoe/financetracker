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
    name: "Categories",
    url: "/dashboard/categories",
  },
  {
    name: "Budgets",
    url: "/dashboard/budgets",
  },
  {
    name: "Planning",
    url: "/dashboard/planning",
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
