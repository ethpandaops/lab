import type { DataAvailabilityRow, DataAvailabilityCellData } from './DataAvailabilityHeatmap.types';

/**
 * Generates a random availability value with realistic distribution
 * Most values are high (>80%), with occasional drops
 */
const generateAvailability = (): number => {
  const random = Math.random();
  if (random < 0.7) {
    // 70% chance of high availability (90-100%)
    return 0.9 + Math.random() * 0.1;
  } else if (random < 0.9) {
    // 20% chance of medium availability (70-90%)
    return 0.7 + Math.random() * 0.2;
  } else {
    // 10% chance of low availability (0-70%)
    return Math.random() * 0.7;
  }
};

/**
 * Generates cell data for a single time period across all columns
 */
const generateCells = (identifier: string, numColumns: number = 128): DataAvailabilityCellData[] => {
  return Array.from({ length: numColumns }, (_, colIndex) => {
    const availability = generateAvailability();
    const totalCount = Math.floor(Math.random() * 50) + 10;
    const successCount = Math.floor(totalCount * availability);

    return {
      identifier,
      columnIndex: colIndex,
      availability,
      successCount,
      totalCount,
      avgResponseTimeMs: Math.floor(Math.random() * 200) + 50,
    };
  });
};

/**
 * Generates mock data for window-level heatmap (19 days × 128 columns)
 * This is the top level showing the entire custody window
 */
export const generateWindowLevelData = (numDays: number = 19): DataAvailabilityRow[] => {
  const today = new Date();
  return Array.from({ length: numDays }, (_, dayIndex) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (numDays - 1 - dayIndex));
    const dateStr = date.toISOString().split('T')[0];
    const dayLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return {
      identifier: dateStr,
      label: dayLabel,
      cells: generateCells(dateStr),
    };
  });
};

/**
 * Generates mock data for day-level heatmap (~225 epochs × 128 columns)
 * This shows all epochs within a single day
 */
export const generateDayLevelData = (dayIdentifier: string, numEpochs: number = 225): DataAvailabilityRow[] => {
  const startEpoch = 100000; // Arbitrary starting epoch
  return Array.from({ length: numEpochs }, (_, epochIndex) => {
    const epochNum = startEpoch + epochIndex;
    const identifier = `${dayIdentifier}-epoch-${epochNum}`;

    return {
      identifier,
      label: `Epoch ${epochNum}`,
      cells: generateCells(identifier),
    };
  });
};

/**
 * Generates mock data for epoch-level heatmap (32 slots × 128 columns)
 * This shows all slots within a single epoch
 */
export const generateEpochLevelData = (epochIdentifier: string, epochNum: number): DataAvailabilityRow[] => {
  const startSlot = epochNum * 32; // Each epoch has 32 slots
  return Array.from({ length: 32 }, (_, slotIndex) => {
    const slotNum = startSlot + slotIndex;
    const identifier = `${epochIdentifier}-slot-${slotNum}`;

    return {
      identifier,
      label: `Slot ${slotNum}`,
      cells: generateCells(identifier),
    };
  });
};

/**
 * Filters rows to only include a specific column
 */
export const filterByColumn = (rows: DataAvailabilityRow[], columnIndex: number): DataAvailabilityRow[] => {
  return rows.map(row => ({
    ...row,
    cells: row.cells.filter(cell => cell.columnIndex === columnIndex),
  }));
};

/**
 * Generates mock data for slot-level view showing blobs × columns
 * This is the bottom level - each row is a blob index, each column is a data column
 */
export const generateSlotLevelData = (
  slotIdentifier: string,
  _slotNum: number,
  columnRowsCount: number = 6
): DataAvailabilityRow[] => {
  return Array.from({ length: columnRowsCount }, (_, blobIndex) => {
    const identifier = `${slotIdentifier}-blob-${blobIndex}`;
    const cells = generateCells(identifier).map(cell => ({
      ...cell,
      blobIndex,
    }));

    return {
      identifier,
      label: `Blob ${blobIndex}`,
      cells,
    };
  });
};
