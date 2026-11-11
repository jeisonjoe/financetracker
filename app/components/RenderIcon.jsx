import * as Bi from "react-icons/bi";
import * as Fc from "react-icons/fc";

const DEFAULT_CATEGORY_ICON_RULES = [
  { match: ["food", "dining", "restaurant", "meal"], icon: "BiRestaurant" },
  { match: ["coffee", "cafe", "tea"], icon: "BiCoffee" },
  { match: ["grocer", "supermarket", "mart"], icon: "BiCart" },
  { match: ["shop", "cloth", "retail", "mall"], icon: "BiShoppingBag" },
  { match: ["travel", "transport", "fuel", "cab", "uber", "flight"], icon: "BiCar" },
  { match: ["bill", "utilit", "electric", "water", "internet", "phone"], icon: "BiReceipt" },
  { match: ["rent", "home", "housing", "mortgage"], icon: "BiHomeAlt" },
  { match: ["entertain", "movie", "music", "game", "subscri"], icon: "BiMoviePlay" },
  { match: ["health", "medic", "doctor", "pharmacy", "gym", "fitness"], icon: "BiPlusMedical" },
  { match: ["invest", "stock", "mutual", "sip", "saving"], icon: "BiTrendingUp" },
  { match: ["transfer", "send"], icon: "BiTransfer" },
  { match: ["salary", "income", "payroll", "freelance", "bonus"], icon: "BiWallet" },
  { match: ["educat", "book", "course", "tuition"], icon: "BiBook" },
];

export function resolveCategoryIconName(icon, categoryName = "") {
  const explicitName = typeof icon === "string" ? icon : icon?.name;
  if (explicitName) return explicitName;

  const normalized = String(categoryName || "").trim().toLowerCase();
  if (normalized) {
    const matched = DEFAULT_CATEGORY_ICON_RULES.find((rule) =>
      rule.match.some((keyword) => normalized.includes(keyword))
    );
    if (matched) return matched.icon;
  }

  return "BiCategory";
}

export default function RenderIcon({ icon, name: categoryName, categoryName: explicitCategoryName, props = {} }) {
  const iconName = resolveCategoryIconName(icon, explicitCategoryName || categoryName);
  const IconSet = iconName.startsWith("Fc") ? Fc : Bi;
  const Icon = IconSet[iconName] || Bi.BiCategory;
  return <Icon className={props.className || "text-xl"} />;
}
