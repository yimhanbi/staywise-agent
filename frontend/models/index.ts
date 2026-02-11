/**
 * Model layer — data types, entities, domain schemas.
 */

export type AiDisclosureConfig = {
  disclosureText: string;
};

export type LayoutConfig = {
  appName: string;
  aiDisclosure: AiDisclosureConfig;
};
