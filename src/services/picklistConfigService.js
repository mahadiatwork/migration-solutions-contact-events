import {
  defaultDurationOptions,
  defaultRegardingOptions,
  defaultResultOptions,
  defaultTypeOptions,
} from "../config/picklistDefaults";

const MODULE_API_NAMES = ["Widget_Picklist_Config", "CustomModule15"];
const CONNECTION_NAME = "zoho_crm_conn";
const COQL_URL = "https://www.zohoapis.com.au/crm/v8/coql";
const FIELDS = {
  name: "Name",
  category: "Category",
  parentType: "Parent_Type",
  sortOrder: "Sort_Order",
  active: "Active",
};

let cachedConfig = null;
let fetchPromise = null;

const fallbackConfig = () => ({
  types: defaultTypeOptions,
  typeResources: Object.fromEntries(
    defaultTypeOptions.map((type, index) => [type, index + 1])
  ),
  results: null,
  regarding: null,
  durations: defaultDurationOptions,
  _source: "fallback",
});

export const fetchPicklistConfig = async () => {
  if (cachedConfig?._source === "custom_module") return cachedConfig;
  if (fetchPromise) return fetchPromise;

  fetchPromise = loadConfig();
  try {
    const config = await fetchPromise;
    if (config?._source === "custom_module") cachedConfig = config;
    return config;
  } finally {
    fetchPromise = null;
  }
};

const loadConfig = async () => {
  const zoho = window.ZOHO;
  if (!zoho?.CRM?.API) return fallbackConfig();

  try {
    for (const entity of MODULE_API_NAMES) {
      const records = await fetchModuleRecords(zoho, entity);
      const activeRecords = records.filter(isActive);
      if (activeRecords.length) return groupRecords(activeRecords);
    }

    const coqlRecords = await fetchViaCoql(zoho);
    const activeCoqlRecords = coqlRecords.filter(isActive);
    if (activeCoqlRecords.length) return groupRecords(activeCoqlRecords);
  } catch (error) {
    console.warn(
      "Widget_Picklist_Config could not be loaded; using defaults.",
      error
    );
  }

  return fallbackConfig();
};

const fetchModuleRecords = async (zoho, entity) => {
  const records = [];
  const perPage = 200;

  for (let page = 1; page <= 10; page += 1) {
    let response;
    try {
      if (typeof zoho.CRM.API.getAllRecords === "function") {
        response = await zoho.CRM.API.getAllRecords({
          Entity: entity,
          sort_order: "asc",
          per_page: perPage,
          page,
        });
      } else if (typeof zoho.CRM.API.getRecords === "function") {
        response = await zoho.CRM.API.getRecords({
          Entity: entity,
          sort_order: "asc",
          per_page: perPage,
          page,
        });
      } else {
        return [];
      }
    } catch (error) {
      console.warn(`Pick-list SDK read failed for ${entity}:`, error);
      return [];
    }

    if (response?.status === "error" || response?.code === "INVALID_MODULE") {
      return [];
    }

    const chunk = Array.isArray(response?.data) ? response.data : [];
    records.push(...chunk);
    const hasMore =
      response?.info?.more_records === true ||
      response?.info?.more_records === "true";
    if (chunk.length < perPage || !hasMore) break;
  }

  return records;
};

const parseCoqlResponse = (response) => {
  const rawStatusMessage = response?.details?.statusMessage;
  let statusMessage = rawStatusMessage;
  if (typeof rawStatusMessage === "string" && rawStatusMessage.trim()) {
    try {
      statusMessage = JSON.parse(rawStatusMessage);
    } catch {
      statusMessage = null;
    }
  }

  for (const candidate of [statusMessage, response?.details, response]) {
    if (Array.isArray(candidate?.data) && candidate.data.length) {
      return candidate.data;
    }
  }
  return [];
};

const fetchViaCoql = async (zoho) => {
  if (!zoho?.CRM?.CONNECTION?.invoke) return [];

  const { name, category, parentType, sortOrder, active } = FIELDS;
  for (const moduleApiName of MODULE_API_NAMES) {
    const selectQuery = `select ${name}, ${category}, ${parentType}, ${sortOrder}, ${active} from ${moduleApiName} where ${active} = true order by ${sortOrder} asc LIMIT 0, 2000`;
    try {
      const response = await zoho.CRM.CONNECTION.invoke(CONNECTION_NAME, {
        url: COQL_URL,
        method: "POST",
        param_type: 2,
        parameters: { select_query: selectQuery },
      });
      const records = parseCoqlResponse(response);
      if (records.length) return records;
    } catch (error) {
      console.warn(`Pick-list COQL read failed for ${moduleApiName}:`, error);
    }
  }
  return [];
};

const fieldValue = (value) => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return (
    value.display_value ||
    value.actual_value ||
    value.name ||
    value.Name ||
    ""
  );
};

const isActive = (record) => {
  const value = record?.[FIELDS.active];
  return (
    value === true ||
    value === "true" ||
    value === 1 ||
    value === "1" ||
    value === "Yes"
  );
};

const addUnique = (list, value) => {
  if (value && !list.includes(value)) list.push(value);
};

const groupRecords = (records) => {
  const types = [];
  const typeResources = {};
  const results = {};
  const regarding = {};
  const durations = [];
  const sortedRecords = [...records].sort(
    (left, right) =>
      (Number(left?.[FIELDS.sortOrder]) || 9999) -
      (Number(right?.[FIELDS.sortOrder]) || 9999)
  );

  for (const record of sortedRecords) {
    const name = fieldValue(record?.[FIELDS.name]);
    const category = fieldValue(record?.[FIELDS.category]);
    const parent = fieldValue(record?.[FIELDS.parentType]) || "_default";
    if (!name) continue;

    if (category === "Type") {
      addUnique(types, name);
      const sortOrder = Number(record?.[FIELDS.sortOrder]);
      typeResources[name] =
        Number.isFinite(sortOrder) && sortOrder > 0 && sortOrder % 10 === 0
          ? sortOrder / 10
          : types.indexOf(name) + 1;
    }
    if (category === "Result") {
      if (!results[parent]) results[parent] = [];
      addUnique(results[parent], name);
    }
    if (category === "Regarding") {
      if (!regarding[parent]) regarding[parent] = [];
      addUnique(regarding[parent], name);
    }
    if (category === "Duration") {
      const duration = Number.parseInt(name, 10);
      if (Number.isFinite(duration)) addUnique(durations, duration);
    }
  }

  return {
    types: types.length ? types : defaultTypeOptions,
    typeResources,
    results: Object.keys(results).length ? results : null,
    regarding: Object.keys(regarding).length ? regarding : null,
    durations: durations.length ? durations : defaultDurationOptions,
    _source: "custom_module",
  };
};

const withExistingValue = (options, existingValue) => {
  const values = [...options];
  const safeExistingValue =
    existingValue == null ? "" : String(existingValue).trim();
  if (safeExistingValue && !values.some((value) => String(value) === safeExistingValue)) {
    values.unshift(existingValue);
  }
  return values;
};

export const getTypeOptionsFromConfig = (config, existingValue) =>
  withExistingValue(
    config?.types?.length ? config.types : defaultTypeOptions,
    existingValue
  );

export const getDurationOptionsFromConfig = (config, existingValue) =>
  withExistingValue(
    config?.durations?.length ? config.durations : defaultDurationOptions,
    existingValue
  );

export const getTypeResourceFromConfig = (type, config, fallbackIndex) => {
  const configuredResource = Number(config?.typeResources?.[type]);
  if (Number.isFinite(configuredResource)) return configuredResource;

  const defaultIndex = defaultTypeOptions.indexOf(type);
  return defaultIndex >= 0 ? defaultIndex + 1 : fallbackIndex;
};

export const getResultOptionsFromConfig = (type, config, existingValue) => {
  const configured = config?.results?.[type] || config?.results?._default;
  return withExistingValue(
    configured?.length ? configured : defaultResultOptions,
    existingValue
  );
};

export const getRegardingOptionsFromConfig = (
  type,
  config,
  existingValue
) => {
  const configured = config?.regarding?.[type] || config?.regarding?._default;
  return withExistingValue(
    configured?.length ? configured : defaultRegardingOptions,
    existingValue
  );
};
