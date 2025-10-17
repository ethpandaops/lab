export interface TableBounds {
  min: number;
  max: number;
}

export type Bounds = Record<string, TableBounds>;
