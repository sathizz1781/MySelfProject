// Icon mappings (exported separately so components can use them)
export const ICON_NAMES = {
  food: "UtensilsCrossed",
  shopping: "ShoppingCart",
  transport: "Car",
  entertainment: "Film",
  health: "Pill",
  bills: "Lightbulb",
  housing: "Home",
  travel: "Plane",
  education: "BookOpen",
  other: "Package",
  salary: "Briefcase",
  freelance: "Laptop",
  investment: "TrendingUp",
  gift: "Gift",
  other_income: "DollarSign",
};

export const EXPENSE_CATEGORIES = [
  {
    key: "food",
    label: "Food & Drinks",
    icon: "UtensilsCrossed",
    color: "#ff6b6b",
  },
  {
    key: "shopping",
    label: "Shopping",
    icon: "ShoppingCart",
    color: "#ffa94d",
  },
  { key: "transport", label: "Transport", icon: "Car", color: "#69db7c" },
  {
    key: "entertainment",
    label: "Entertainment",
    icon: "Film",
    color: "#748ffc",
  },
  { key: "health", label: "Health", icon: "Pill", color: "#f783ac" },
  {
    key: "bills",
    label: "Bills & Utilities",
    icon: "Lightbulb",
    color: "#ffd43b",
  },
  { key: "housing", label: "Housing", icon: "Home", color: "#66d9e8" },
  { key: "travel", label: "Travel", icon: "Plane", color: "#a9e34b" },
  { key: "education", label: "Education", icon: "BookOpen", color: "#9775fa" },
  { key: "other", label: "Other", icon: "Package", color: "#8888aa" },
];

export const INCOME_CATEGORIES = [
  { key: "salary", label: "Salary", icon: "Briefcase", color: "#63ffb2" },
  { key: "freelance", label: "Freelance", icon: "Laptop", color: "#4dc9e6" },
  {
    key: "investment",
    label: "Investment",
    icon: "TrendingUp",
    color: "#a9e34b",
  },
  { key: "gift", label: "Gift", icon: "Gift", color: "#ffd43b" },
  {
    key: "other_income",
    label: "Other Income",
    icon: "DollarSign",
    color: "#8b85ff",
  },
];

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export function getCategoryMeta(key) {
  return (
    ALL_CATEGORIES.find((c) => c.key === key) || {
      key,
      label: key,
      icon: "Package",
      color: "#8888aa",
    }
  );
}

export const CHART_COLORS = [
  "#6c63ff",
  "#ff6b6b",
  "#63ffb2",
  "#ffd43b",
  "#f783ac",
  "#66d9e8",
  "#a9e34b",
  "#ffa94d",
  "#748ffc",
  "#8888aa",
];
