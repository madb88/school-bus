/** localStorage: Plan Plus offline entitlement (validUntil YMD). */
export const OFFLINE_ENTITLEMENT_KEY = "school-bus.offline-entitlement.v1" as const;

/** IndexedDB database for Plus offline snapshots (not localStorage). */
export const OFFLINE_IDB_NAME = "school-bus-offline" as const;
export const OFFLINE_IDB_VERSION = 1 as const;

export const OFFLINE_STORE_SCHOOL = "school" as const;
export const OFFLINE_STORE_MZK_OD = "mzkOd" as const;

export const OFFLINE_SCHOOL_KEY = "snapshot" as const;

/** Grace window when Plus access is known but validUntil is missing. */
export const OFFLINE_ENTITLEMENT_GRACE_DAYS = 14 as const;

/** Custom event after entitlement changes. */
export const OFFLINE_ENTITLEMENT_EVENT = "school-bus-offline-entitlement" as const;
