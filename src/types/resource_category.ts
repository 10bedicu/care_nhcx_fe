import { MonetaryComponent, SlugConfig } from "@/types/base";

import { User } from "@/types/user";

export enum ResourceCategoryResourceType {
  product_knowledge = "product_knowledge",
  activity_definition = "activity_definition",
  charge_item_definition = "charge_item_definition",
}

export enum ResourceCategorySubType {
  charge_item_definition_location_bed_charges = "charge_item_definition:location:bed_charges",
  charge_item_definition_schedule_practitioner = "charge_item_definition:schedule:practitioner",
  charge_item_definition_schedule_location = "charge_item_definition:schedule:location",
  charge_item_definition_schedule_healthcare_service = "charge_item_definition:schedule:healthcare_service",
  other = "all:other",
}

export interface ResourceCategory {
  id: string;
  title: string;
  description?: string;
  level_cache: number;
  has_children: boolean;
  parent?: ResourceCategory;
  slug: string;
  resource_type: ResourceCategoryResourceType;
  resource_sub_type: ResourceCategorySubType;
  slug_config: SlugConfig;
  calculated_monetary_components?: MonetaryComponent[];
  configured_monetary_components?: MonetaryComponent[];
  created_at: string;
  updated_at: string;
  created_by: User;
  updated_by: User;
}
