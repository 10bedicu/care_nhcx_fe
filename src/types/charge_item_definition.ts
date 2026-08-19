import { MonetaryComponent, SlugConfig } from "@/types/base";

import { ResourceCategory } from "@/types/resource_category";
import { TagConfig } from "@/types/tag_config";

export enum ChargeItemDefinitionStatus {
  draft = "draft",
  active = "active",
  retired = "retired",
}

export interface ChargeItemDefinition {
  id: string;
  status: ChargeItemDefinitionStatus;
  title: string;
  slug: string;
  derived_from_uri?: string;
  description?: string;
  purpose?: string;
  price_components: MonetaryComponent[];
  category: ResourceCategory;
  slug_config: SlugConfig;
  tags: TagConfig[];
  can_edit_charge_item: boolean;
}
