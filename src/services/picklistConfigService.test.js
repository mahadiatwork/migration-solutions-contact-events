import test from "node:test";
import assert from "node:assert/strict";
import {
  CUSTOM_REGARDING_LABEL,
  CUSTOM_REGARDING_OPTION,
  buildConfigFromReadResult,
  clearPicklistConfigCache,
  fetchPicklistConfig,
  getDurationOptionsFromConfig,
  getPersistedRegardingValue,
  getRegardingOptions,
  getResultOptions,
  getTypeOptionsFromConfig,
  groupPicklistRecords,
} from "./picklistConfigService.js";
import {
  getActivityTypeSelection,
  getCreateActivityDefaults,
} from "../components/createActivityDefaults.js";

test.afterEach(() => {
  clearPicklistConfigCache();
  delete globalThis.window;
});

test("does not use the first CRM picklist rows as create defaults", () => {
  const defaults = getCreateActivityDefaults({
    _source: "custom_module",
    types: ["Fruit"],
    regarding: { Fruit: ["Pear"] },
    durations: [5],
  });

  assert.deepEqual(defaults, {
    Type_of_Activity: "",
    Event_Title: "New Activity",
    Regarding: "",
    duration: 5,
    Duration_Min: 5,
  });
});

test("clears Regarding when an activity type is explicitly selected", () => {
  assert.deepEqual(getActivityTypeSelection("Fruit"), {
    Type_of_Activity: "Fruit",
    Regarding: "",
  });
});

test("falls back only when the module cannot be reached", () => {
  const reachedButInactive = buildConfigFromReadResult({
    reached: true,
    records: [{ Name: "Inactive", Category: "Type", Active: false }],
  });

  assert.equal(reachedButInactive._source, "custom_module");
  assert.deepEqual(reachedButInactive.types, []);
  assert.deepEqual(reachedButInactive.results, {});
  assert.equal(
    buildConfigFromReadResult({ reached: false, records: [] })._source,
    "fallback"
  );
});

test("groups all four picklists and accepts History field aliases", () => {
  const config = groupPicklistRecords([
    {
      Name: "Configured Type",
      Category: "History Type",
      Parent_Type: "",
      Sort_Order: 1,
    },
    {
      Name: "Configured Result",
      Category: "History Result",
      Parent_Type: "Configured Type",
      Sort_Order: 2,
    },
    {
      Name: "Configured Regarding",
      Category: "Regarding",
      Parent_Type: "Configured Type",
      Sort_Order: 3,
    },
    {
      Name: "45",
      Category: "Duration",
      Parent_Type: "",
      Sort_Order: 4,
    },
  ]);

  assert.deepEqual(config.types, ["Configured Type"]);
  assert.deepEqual(config.results, {
    "Configured Type": ["Configured Result"],
  });
  assert.deepEqual(config.regarding, {
    "Configured Type": ["Configured Regarding"],
  });
  assert.deepEqual(config.durations, [45]);
});

test("custom-module rows are authoritative, including empty categories", () => {
  const config = {
    _source: "custom_module",
    types: [],
    results: {},
    regarding: {},
    durations: [],
  };

  assert.deepEqual(getTypeOptionsFromConfig(config), []);
  assert.deepEqual(getResultOptions("Meeting", config), []);
  assert.deepEqual(getRegardingOptions("Meeting", config), []);
  assert.deepEqual(getDurationOptionsFromConfig(config), []);
});

test("uses exact parent, then _default, without merging both", () => {
  const config = {
    _source: "custom_module",
    types: ["Exact", "Other"],
    results: { Exact: ["Exact Result"], _default: ["Default Result"] },
    regarding: {
      Exact: ["Exact Regarding"],
      _default: ["Default Regarding", "Other"],
    },
    durations: [30],
  };

  assert.deepEqual(getResultOptions("Exact", config), ["Exact Result"]);
  assert.deepEqual(getResultOptions("Other", config), ["Default Result"]);
  assert.deepEqual(getRegardingOptions("Exact", config), [
    "Exact Regarding",
  ]);
  assert.deepEqual(getRegardingOptions("Other", config), [
    "Default Regarding",
    "Other",
  ]);
});

test("custom Regarding text is always persisted instead of its UI sentinel", () => {
  assert.equal(getPersistedRegardingValue("Exact Regarding"), "Exact Regarding");
  assert.equal(getPersistedRegardingValue(CUSTOM_REGARDING_OPTION), "");
  assert.equal(
    getPersistedRegardingValue(CUSTOM_REGARDING_OPTION, "My own regarding"),
    "My own regarding"
  );
});

test("filters reserved Custom values without removing configured Other", () => {
  const config = {
    _source: "custom_module",
    regarding: {
      Meeting: [
        CUSTOM_REGARDING_LABEL,
        CUSTOM_REGARDING_OPTION,
        "Other",
        "Visa",
      ],
    },
  };

  assert.deepEqual(getRegardingOptions("Meeting", config), ["Other", "Visa"]);
  assert.deepEqual(
    getRegardingOptions("Meeting", config, CUSTOM_REGARDING_LABEL, true),
    ["Other", "Visa"]
  );
});

test("preserves unconfigured values only when editing", () => {
  const config = {
    _source: "custom_module",
    types: ["Configured"],
    results: { Configured: ["Configured Result"] },
    regarding: { Configured: ["Configured Regarding"] },
    durations: [30],
  };

  assert.deepEqual(getTypeOptionsFromConfig(config, "Legacy", false), [
    "Configured",
  ]);
  assert.deepEqual(getTypeOptionsFromConfig(config, "Legacy", true), [
    "Legacy",
    "Configured",
  ]);
  assert.deepEqual(getResultOptions("Configured", config, "Legacy", true), [
    "Legacy",
    "Configured Result",
  ]);
  assert.deepEqual(
    getRegardingOptions("Configured", config, "Legacy", true),
    ["Legacy", "Configured Regarding"]
  );
  assert.deepEqual(getDurationOptionsFromConfig(config, 45, true), [45, 30]);
  assert.deepEqual(getDurationOptionsFromConfig(config, "1 hour", true), [
    60,
    30,
  ]);
});

test("retries the internal module name after a nested SDK error", async () => {
  const calls = [];
  globalThis.window = {
    ZOHO: {
      CRM: {
        API: {
          getAllRecords: async ({ Entity }) => {
            calls.push(Entity);
            return Entity === "Widget_Picklist_Config"
              ? { data: [{ code: "INVALID_MODULE", status: "error" }] }
              : {
                  data: [
                    {
                      Name: "Alias Type",
                      Category: "Type",
                      Active: true,
                    },
                  ],
                };
          },
        },
      },
    },
  };

  const config = await fetchPicklistConfig();

  assert.deepEqual(config.types, ["Alias Type"]);
  assert.deepEqual(calls, ["Widget_Picklist_Config", "CustomModule15"]);
});

test("does not cache a malformed SDK response as authoritative empty", async () => {
  let calls = 0;
  globalThis.window = {
    ZOHO: {
      CRM: {
        API: {
          getAllRecords: async () => {
            calls += 1;
            return undefined;
          },
        },
      },
    },
  };

  const config = await fetchPicklistConfig();

  assert.equal(config._source, "fallback");
  assert.equal(calls, 2);
});

test("treats nested NO_DATA with an error status as authoritative empty", async () => {
  let calls = 0;
  globalThis.window = {
    ZOHO: {
      CRM: {
        API: {
          getAllRecords: async () => {
            calls += 1;
            return { data: [{ code: "NO_DATA", status: "error" }] };
          },
        },
      },
    },
  };

  const config = await fetchPicklistConfig();

  assert.equal(config._source, "custom_module");
  assert.deepEqual(config.types, []);
  assert.equal(calls, 1);
});

test("keeps earlier pages when NO_CONTENT terminates pagination", async () => {
  const firstPage = Array.from({ length: 200 }, (_, index) => ({
    Name: `Configured ${index}`,
    Category: "Type",
    Sort_Order: index + 1,
    Active: true,
  }));
  let calls = 0;
  globalThis.window = {
    ZOHO: {
      CRM: {
        API: {
          getAllRecords: async () => {
            calls += 1;
            return calls === 1
              ? { data: firstPage, info: { more_records: true } }
              : { code: "NO_CONTENT", status: "error" };
          },
        },
      },
    },
  };

  const config = await fetchPicklistConfig();

  assert.equal(config.types.length, 200);
  assert.equal(config.types[0], "Configured 0");
  assert.equal(calls, 2);
});

test("reads every SDK page instead of truncating after ten or a short page", async () => {
  let calls = 0;
  globalThis.window = {
    ZOHO: {
      CRM: {
        API: {
          getAllRecords: async ({ page }) => {
            calls += 1;
            return {
              data: [
                {
                  Name: `Configured ${page}`,
                  Category: "Type",
                  Sort_Order: page,
                  Active: true,
                },
              ],
              info: { more_records: page < 12 },
            };
          },
        },
      },
    },
  };

  const config = await fetchPicklistConfig();

  assert.equal(calls, 12);
  assert.equal(config.types.length, 12);
  assert.equal(config.types.at(-1), "Configured 12");
});

test("follows pagination metadata in wrapped SDK responses", async () => {
  let calls = 0;
  globalThis.window = {
    ZOHO: {
      CRM: {
        API: {
          getAllRecords: async ({ page }) => {
            calls += 1;
            return {
              data: {
                data: [
                  {
                    Name: `Wrapped ${page}`,
                    Category: "Type",
                    Sort_Order: page,
                    Active: true,
                  },
                ],
                info: { more_records: page === 1 },
              },
            };
          },
        },
      },
    },
  };

  const config = await fetchPicklistConfig();

  assert.equal(calls, 2);
  assert.deepEqual(config.types, ["Wrapped 1", "Wrapped 2"]);
});
