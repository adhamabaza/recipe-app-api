export interface User {
  email: string;
  name: string;
}

export interface Attribute {
  id: number;
  name: string;
}

export type AttributeKind = 'tags' | 'ingredients';

export interface Recipe {
  id: number;
  title: string;
  time_minutes: number;
  price: string;
  link: string;
  tags: Attribute[];
  ingredients: Attribute[];
}

export interface RecipeDetail extends Recipe {
  description: string;
  image: string | null;
}

export interface RecipeInput {
  title: string;
  time_minutes: number;
  price: string;
  link: string;
  description: string;
  tags: { name: string }[];
  ingredients: { name: string }[];
}
