interface DuckDBFilter {
  id: string;
  value: any;
  operator: 
    | "eq" 
    | "ne" 
    | "lt" 
    | "lte" 
    | "gt" 
    | "gte" 
    | "like" 
    | "ilike" 
    | "in" 
    | "notIn"
    | "between"
    | "isNull"
    | "isNotNull";
  variant?: "text" | "number" | "date" | "dateRange" | "multiSelect" | "boolean" | "range";
}

export function buildDuckDBWhereClause(
  filters: DuckDBFilter[],
  joinOperator: "AND" | "OR" = "AND"
): string {
  if (filters.length === 0) return "";

  const conditions = filters
    .map((filter) => buildSingleCondition(filter))
    .filter(Boolean);

  if (conditions.length === 0) return "";

  return conditions.length === 1
    ? conditions[0] || "" 
    : `(${conditions.join(` ${joinOperator} `)})`;
}

function buildSingleCondition(filter: DuckDBFilter): string | null {
  const { id, value, operator, variant } = filter;
  const columnName = `"${id}"`;

  switch (operator) {
    case "eq":
      if (variant === "date" || variant === "dateRange") {
        const date = new Date(Number(value));
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
        return `${columnName} >= '${startOfDay.toISOString()}' AND ${columnName} <= '${endOfDay.toISOString()}'`;
      }
      if (typeof value === "string") {
        return `${columnName} = '${escapeString(value)}'`;
      }
      return `${columnName} = ${value}`;

    case "ne":
      if (typeof value === "string") {
        return `${columnName} != '${escapeString(value)}'`;
      }
      return `${columnName} != ${value}`;

    case "lt":
      if (variant === "date" && typeof value === "string") {
        const date = new Date(Number(value));
        return `${columnName} < '${date.toISOString()}'`;
      }
      return `${columnName} < ${value}`;

    case "lte":
      if (variant === "date" && typeof value === "string") {
        const date = new Date(Number(value));
        return `${columnName} <= '${date.toISOString()}'`;
      }
      return `${columnName} <= ${value}`;

    case "gt":
      if (variant === "date" && typeof value === "string") {
        const date = new Date(Number(value));
        return `${columnName} > '${date.toISOString()}'`;
      }
      return `${columnName} > ${value}`;

    case "gte":
      if (variant === "date" && typeof value === "string") {
        const date = new Date(Number(value));
        return `${columnName} >= '${date.toISOString()}'`;
      }
      return `${columnName} >= ${value}`;

    case "like":
      if (typeof value === "string") {
        return `${columnName} LIKE '%${escapeString(value)}%'`;
      }
      return null;

    case "ilike":
      if (typeof value === "string") {
        return `${columnName} ILIKE '%${escapeString(value)}%'`;
      }
      return null;

    case "in":
      if (Array.isArray(value) && value.length > 0) {
        const values = value.map(v => typeof v === "string" ? `'${escapeString(v)}'` : v).join(", ");
        return `${columnName} IN (${values})`;
      }
      return null;

    case "notIn":
      if (Array.isArray(value) && value.length > 0) {
        const values = value.map(v => typeof v === "string" ? `'${escapeString(v)}'` : v).join(", ");
        return `${columnName} NOT IN (${values})`;
      }
      return null;

    case "between":
      if (Array.isArray(value) && value.length === 2) {
        const [min, max] = value;
        if (variant === "date" || variant === "dateRange") {
          const startDate = new Date(Number(min));
          const endDate = new Date(Number(max));
          return `${columnName} BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'`;
        }
        return `${columnName} BETWEEN ${min} AND ${max}`;
      }
      return null;

    case "isNull":
      return `${columnName} IS NULL`;

    case "isNotNull":
      return `${columnName} IS NOT NULL`;

    default:
      console.log("Unsupported operator:", { operator });
      return null;
  }
}

function escapeString(str: string): string {
  return str.replace(/'/g, "''");
}

export function convertTableFiltersToSQL(tableFilters: any[]): DuckDBFilter[] {
  return tableFilters.map(filter => ({
    id: filter.id,
    value: filter.value,
    operator: mapOperator(filter.operator || "ilike"),
    variant: filter.variant
  }));
}

function mapOperator(operator: string): DuckDBFilter["operator"] {
  const operatorMap: Record<string, DuckDBFilter["operator"]> = {
    "iLike": "ilike",
    "notILike": "ilike", // Will be handled with NOT
    "eq": "eq",
    "ne": "ne",
    "lt": "lt",
    "lte": "lte",
    "gt": "gt",
    "gte": "gte",
    "inArray": "in",
    "notInArray": "notIn",
    "isBetween": "between",
    "isEmpty": "isNull",
    "isNotEmpty": "isNotNull"
  };
  
  return operatorMap[operator] || "ilike";
}