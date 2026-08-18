export {
  MUSCLES,
  MUSCLE_GROUPS,
  MUSCLE_IDS,
  isMuscleId,
  musclesInGroup,
  type MuscleId,
  type MuscleGroup,
} from "./taxonomy.ts";

export {
  CATEGORY,
  EQUIPMENT,
  FORCE,
  LATERALITY,
  LEVEL,
  MECHANIC,
  MOVEMENT_PATTERNS,
  type Equipment,
  type Laterality,
  type MovementPattern,
} from "./axes.ts";

export {
  isLowerBodyPattern,
  isValidCombination,
  validCombinations,
  type AxisInput,
  type Combination,
} from "./combinations.ts";

export {
  BODY_REGIONS,
  BODY_REGION_IDS,
  UNDISPLAYABLE_MUSCLES,
  musclesInRegion,
  needsSplit,
  regionOf,
  type BodyRegion,
  type BodyRegionId,
} from "./body-map.ts";

export { LOAD_UNIT, type LoadUnit } from "./load.ts";

export {
  WEIGHT_SUM_TOLERANCE,
  datasetSchema,
  exerciseSchema,
  muscleWeightsSchema,
  type Exercise,
} from "./schema.ts";
