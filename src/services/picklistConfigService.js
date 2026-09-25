import {
  FALLBACK_DURATIONS,
  FALLBACK_REGARDING,
  FALLBACK_RESULTS,
  FALLBACK_TYPES,
  PICKLIST_CONFIG_FIELDS,
  PICKLIST_CONFIG_MODULES,
} from "../config/picklistConfig.js";

let cachedConfig = null;
let fetchPromise = null;

export const buildFallbackConfig = () => ({
  types: [...FALLBACK_TYPES],
  results: { ...FALLBACK_RESULTS },
  regarding: { ...FALLBACK_REGARDING },
  durations: [...FALLBACK_DURATIONS],
  _source: "fallback",
});

const fieldValue = (value) => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "object") {
    return (
      value.display_value ||
      value.actual_value ||
      value.name ||
      value.Name ||
      ""
    );
  }
  return String(value);
};

const normalizedCategory = (value) => {
  const category = fieldValue(value).trim().toLowerCase();
  if (category === "type" || category === "history type") return "type";
  if (category === "result" || category === "history result") return "result";
  if (category === "duration") return "duration";
  if (category === "regarding") return "regarding";
  return "";
};

const pushUnique = (values, value) => {
  if (value && !values.includes(value)) values.push(value);
};

const sortRank = (value) => {
  const rank = Number(value);
  return Number.isFinite(rank) ? rank : 9999;
};

export const groupPicklistRecords = (records) => {
  const { name, category, parentType, sortOrder } = PICKLIST_CONFIG_FIELDS;
  const types = [];
  const results = {};
  const regarding = {};
  const durations = [];
  const sortedRecords = [...records].sort(
    (left, right) =>
      sortRank(left?.[sortOrder]) - sortRank(right?.[sortOrder])
  );

  for (const record of sortedRecords) {
    const value = fieldValue(record?.[name]).trim();
    const recordCategory = normalizedCategory(record?.[category]);
    const parent = fieldValue(record?.[parentType]).trim() || "_default";
    if (!value || !recordCategory) continue;

    if (recordCategory === "type") pushUnique(types, value);
    if (recordCategory === "result") {
      if (!results[parent]) results[parent] = [];
      pushUnique(results[parent], value);
    }
    if (recordCategory === "regarding") {
      if (!regarding[parent]) regarding[parent] = [];
      pushUnique(regarding[parent], value);
    }
    if (recordCategory === "duration") {
      const duration = Number(value);
      if (Number.isFinite(duration) && !durations.includes(duration)) {
        durations.push(duration);
      }
    }
  }

  return {
    types,
    results,
    regarding,
    durations,
    _source: "custom_module",
  };
};

const isActive = (record) => {
  const value = record?.[PICKLIST_CONFIG_FIELDS.active];
  return (
    value === true ||
    value === "true" ||
    value === 1 ||
    value === "1" ||
    value === "Yes"
  );
};

export const buildConfigFromReadResult = ({ reached, records = [] }) =>
  reached
    ? groupPicklistRecords(records.filter(isActive))
    : buildFallbackConfig();

const extractRecords = (response) => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response)) return response;
  return [];
};

const responseEntries = (response) => [
  response,
  response?.data,
  ...(Array.isArray(response?.data) ? response.data : []),
  ...(Array.isArray(response?.data?.data) ? response.data.data : []),
].filter((entry) => entry && typeof entry === "object");

const isUnavailableResponse = (response) =>
  responseEntries(response).some(
    (entry) =>
      entry?.code === "INVALID_MODULE" ||
      entry?.code === "INVALID_MODULE_API_NAME"
  );

const isErrorResponse = (response) =>
  responseEntries(response).some((entry) => {
    const code = typeof entry?.code === "string" ? entry.code : "";
    return (
      entry?.status === "error" ||
      entry?.status === "failure" ||
      Number(entry?.statusCode) >= 400 ||
      (code !== "" &&
        code !== "SUCCESS" &&
        code !== "NO_DATA" &&
        code !== "NO_CONTENT" &&
        code !== "200")
    );
  });

const isSuccessfulEmptyResponse = (response) =>
  responseEntries(response).some(
    (entry) => entry?.code === "NO_DATA" || entry?.code === "NO_CONTENT"
  );

const hasRecordPayload = (response) =>
  Array.isArray(response?.data) ||
  Array.isArray(response?.data?.data) ||
  Array.isArray(response);

const hasMoreRecords = (response) => {
  const value = response?.info?.more_records ?? response?.data?.info?.more_records;
  return value === true || value === "true";
};

const readModule = async (ZOHO, entity) => {
  const records = [];
  const perPage = 200;

  const seenPages = new Set();
  let page = 1;

  while (true) {
    let response;
    try {
      if (typeof ZOHO?.CRM?.API?.getAllRecords === "function") {
        response = await ZOHO.CRM.API.getAllRecords({
          Entity: entity,
          sort_order: "asc",
          per_page: perPage,
          page,
        });
      } else if (typeof ZOHO?.CRM?.API?.getRecords === "function") {
        response = await ZOHO.CRM.API.getRecords({
          Entity: entity,
          sort_order: "asc",
          per_page: perPage,
          page,
        });
      } else {
        return { reached: false, records: [] };
      }
    } catch (error) {
      console.warn(`Pick-list read failed for ${entity}:`, error);
      return { reached: false, records: [] };
    }

    if (isUnavailableResponse(response)) {
      return { reached: false, records: [] };
    }

    if (isSuccessfulEmptyResponse(response)) {
      return { reached: true, records };
    }

    if (isErrorResponse(response)) {
      return { reached: false, records: [] };
    }

    if (!hasRecordPayload(response)) {
      return { reached: false, records: [] };
    }

    const chunk = extractRecords(response);
    const hasMore = hasMoreRecords(response);
    const signature = JSON.stringify(chunk);
    if (hasMore && seenPages.has(signature)) {
      return { reached: false, records: [] };
    }
    seenPages.add(signature);
    records.push(...chunk);
    if (!hasMore) break;
    if (chunk.length === 0) return { reached: false, records: [] };
    page += 1;
  }

  return { reached: true, records };
};

const loadPicklistConfig = async () => {
  const ZOHO = typeof window === "undefined" ? null : window.ZOHO;
  if (!ZOHO?.CRM?.API) return buildFallbackConfig();

  for (const entity of PICKLIST_CONFIG_MODULES) {
    const result = await readModule(ZOHO, entity);
    if (result.reached) {
      return buildConfigFromReadResult(result);
    }
  }

  console.warn("Widget_Picklist_Config is unavailable; using defaults.");
  return buildConfigFromReadResult({ reached: false, records: [] });
};

export const fetchPicklistConfig = async () => {
  if (cachedConfig?._source === "custom_module") return cachedConfig;
  if (fetchPromise) return fetchPromise;

  fetchPromise = loadPicklistConfig();
  try {
    const config = await fetchPromise;
    if (config?._source === "custom_module") cachedConfig = config;
    return config;
  } finally {
    fetchPromise = null;
  }
};

export const clearPicklistConfigCache = () => {
  cachedConfig = null;
  fetchPromise = null;
};

const preserveExisting = (options, existingValue, isEdit, equals) => {
  if (
    !isEdit ||
    existingValue === null ||
    existingValue === undefined ||
    existingValue === "" ||
    options.some((option) => equals(option, existingValue))
  ) {
    return options;
  }
  return [existingValue, ...options];
};

const configOrFallback = (config) => config || buildFallbackConfig();

export const normalizeDurationValue = (value) => {
  if (value === null || value === undefined || value === "") return "";
  const text = String(value).trim();
  const hours = text.match(/^(\d+(?:\.\d+)?)\s*hours?$/i);
  if (hours) return Number(hours[1]) * 60;
  const minutes = text.match(/^(\d+(?:\.\d+)?)\s*minutes?$/i);
  if (minutes) return Number(minutes[1]);
  const numericValue = Number(text);
  return Number.isFinite(numericValue) ? numericValue : value;
};

export const getTypeOptionsFromConfig = (
  config,
  existingValue = "",
  isEdit = false
) => {
  const options = [...(configOrFallback(config).types || [])];
  return preserveExisting(options, existingValue, isEdit, (left, right) =>
    String(left) === String(right)
  );
};

export const getDurationOptionsFromConfig = (
  config,
  existingValue = "",
  isEdit = false
) => {
  const options = (configOrFallback(config).durations || [])
    .map(Number)
    .filter(Number.isFinite);
  const normalizedExistingValue = normalizeDurationValue(existingValue);
  return preserveExisting(
    options,
    normalizedExistingValue,
    isEdit,
    (left, right) => Number(left) === Number(right)
  );
};

const getParentOptions = (mapping, parent) => {
  if (Object.prototype.hasOwnProperty.call(mapping || {}, parent)) {
    return [...(mapping[parent] || [])];
  }
  if (Object.prototype.hasOwnProperty.call(mapping || {}, "_default")) {
    return [...(mapping._default || [])];
  }
  return [];
};

export const getResultOptions = (
  type,
  config,
  existingValue = "",
  isEdit = false
) => {
  const options = getParentOptions(configOrFallback(config).results, type);
  return preserveExisting(options, existingValue, isEdit, (left, right) =>
    String(left) === String(right)
  );
};

export const getRegardingOptions = (
  type,
  config,
  existingValue = "",
  isEdit = false
) => {
  const options = getParentOptions(configOrFallback(config).regarding, type);
  return preserveExisting(options, existingValue, isEdit, (left, right) =>
    String(left) === String(right)
  );
};

export const getDefaultResult = (type, config) =>
  getResultOptions(type, config)[0] || "";

export const isManualOtherEnabled = (type, config) => {
  const resolvedConfig = configOrFallback(config);
  if (resolvedConfig._source !== "custom_module") return true;
  return getParentOptions(resolvedConfig.regarding, type).includes("Other");
};
