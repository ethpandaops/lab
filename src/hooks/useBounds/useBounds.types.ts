export interface TableBounds {
  min: number;
  max: number;
}

export interface Bounds {
  tables: Record<string, TableBounds>;
  last_updated: string;
}
