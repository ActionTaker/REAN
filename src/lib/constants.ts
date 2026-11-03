export const PROPERTY_TYPES = [
  { value: "SINGLE_FAMILY", label: "Single-family", units: 1 },
  { value: "CONDO", label: "Condo", units: 1 },
  { value: "TOWNHOUSE", label: "Townhouse", units: 1 },
  { value: "DUPLEX", label: "Duplex", units: 2 },
  { value: "TRIPLEX", label: "Triplex", units: 3 },
  { value: "FOURPLEX", label: "Fourplex", units: 4 },
  { value: "MULTIFAMILY", label: "Multifamily (5+)", units: 5 },
] as const;

export type PropertyTypeValue = (typeof PROPERTY_TYPES)[number]["value"];

export const DEAL_STATUSES = [
  { value: "ANALYZING", label: "Analyzing" },
  { value: "OFFER_MADE", label: "Offer made" },
  { value: "UNDER_CONTRACT", label: "Under contract" },
  { value: "OWNED", label: "Owned" },
  { value: "PASSED", label: "Passed" },
] as const;

export type DealStatusValue = (typeof DEAL_STATUSES)[number]["value"];

export const propertyTypeLabel = (v: string) => PROPERTY_TYPES.find((t) => t.value === v)?.label ?? v;
export const dealStatusLabel = (v: string) => DEAL_STATUSES.find((s) => s.value === v)?.label ?? v;

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD",
  "TN","TX","UT","VT","VA","WA","WV","WI","WY",
] as const;

export const MAX_COMPARE = 4;
