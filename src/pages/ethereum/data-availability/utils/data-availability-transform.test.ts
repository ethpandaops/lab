import { describe, it, expect } from 'vitest';
import {
  transformDailyToRows,
  transformHourlyToRows,
  transformEpochsToRows,
  transformSlotsToRows,
  transformBlobsToRows,
} from './data-availability-transform';
import type {
  FctDataColumnAvailabilityDaily,
  FctDataColumnAvailabilityHourly,
  FctDataColumnAvailabilityByEpoch,
  FctDataColumnAvailabilityBySlot,
  FctDataColumnAvailabilityBySlotBlob,
} from '@/api/types.gen';

describe('transformDailyToRows', () => {
  it('should transform daily data into heatmap rows', () => {
    const dailyData: FctDataColumnAvailabilityDaily[] = [
      {
        date: '2024-01-15',
        column_index: 0,
        avg_availability_pct: 95.5,
        total_success_count: 100,
        total_probe_count: 105,
        avg_p50_response_time_ms: 150,
      },
      {
        date: '2024-01-15',
        column_index: 1,
        avg_availability_pct: 98.0,
        total_success_count: 98,
        total_probe_count: 100,
        avg_p50_response_time_ms: 120,
      },
      {
        date: '2024-01-14',
        column_index: 0,
        avg_availability_pct: 100.0,
        total_success_count: 50,
        total_probe_count: 50,
        avg_p50_response_time_ms: 100,
      },
    ];

    const result = transformDailyToRows(dailyData);

    expect(result).toHaveLength(2); // 2 unique dates
    expect(result[0].identifier).toBe('2024-01-15'); // Sorted descending
    expect(result[0].label).toBe('Jan 15');
    expect(result[0].cells).toHaveLength(128); // All 128 columns
    expect(result[0].cells[0].availability).toBe(0.955);
    expect(result[0].cells[0].successCount).toBe(100);
    expect(result[0].cells[0].totalCount).toBe(105);
    expect(result[0].cells[1].availability).toBe(0.98);
  });

  it('should handle empty data', () => {
    const result = transformDailyToRows([]);
    expect(result).toEqual([]);
  });

  it('should handle undefined data', () => {
    const result = transformDailyToRows(undefined);
    expect(result).toEqual([]);
  });

  it('should fill missing columns with placeholders', () => {
    const dailyData: FctDataColumnAvailabilityDaily[] = [
      {
        date: '2024-01-15',
        column_index: 0,
        avg_availability_pct: 95.0,
        total_success_count: 95,
        total_probe_count: 100,
      },
      // Column 1 missing
      {
        date: '2024-01-15',
        column_index: 2,
        avg_availability_pct: 90.0,
        total_success_count: 90,
        total_probe_count: 100,
      },
    ];

    const result = transformDailyToRows(dailyData);

    expect(result[0].cells).toHaveLength(128);
    expect(result[0].cells[0].availability).toBe(0.95);
    expect(result[0].cells[1].availability).toBe(0); // Placeholder
    expect(result[0].cells[1].totalCount).toBe(0);
    expect(result[0].cells[2].availability).toBe(0.9);
  });

  it('should skip items without date', () => {
    const dailyData: FctDataColumnAvailabilityDaily[] = [
      {
        date: '2024-01-15',
        column_index: 0,
        avg_availability_pct: 95.0,
        total_success_count: 95,
        total_probe_count: 100,
      },
      {
        // No date
        column_index: 1,
        avg_availability_pct: 98.0,
        total_success_count: 98,
        total_probe_count: 100,
      },
    ];

    const result = transformDailyToRows(dailyData);

    expect(result).toHaveLength(1);
    expect(result[0].identifier).toBe('2024-01-15');
  });

  it('should sort dates in descending order (most recent first)', () => {
    const dailyData: FctDataColumnAvailabilityDaily[] = [
      { date: '2024-01-10', column_index: 0, avg_availability_pct: 90 },
      { date: '2024-01-15', column_index: 0, avg_availability_pct: 95 },
      { date: '2024-01-12', column_index: 0, avg_availability_pct: 92 },
    ];

    const result = transformDailyToRows(dailyData);

    expect(result[0].identifier).toBe('2024-01-15');
    expect(result[1].identifier).toBe('2024-01-12');
    expect(result[2].identifier).toBe('2024-01-10');
  });
});

describe('transformHourlyToRows', () => {
  it('should transform hourly data into heatmap rows', () => {
    const hourlyData: FctDataColumnAvailabilityHourly[] = [
      {
        hour_start_date_time: 1705334400, // Jan 15, 2024 16:00:00 GMT
        column_index: 0,
        avg_availability_pct: 95.5,
        total_success_count: 100,
        total_probe_count: 105,
        avg_p50_response_time_ms: 150,
      },
      {
        hour_start_date_time: 1705334400,
        column_index: 1,
        avg_availability_pct: 98.0,
        total_success_count: 98,
        total_probe_count: 100,
      },
    ];

    const result = transformHourlyToRows(hourlyData);

    expect(result).toHaveLength(1);
    expect(result[0].identifier).toBe('1705334400');
    expect(result[0].label).toMatch(/\d{2}:\d{2}/); // Hour label in HH:MM format
    expect(result[0].cells).toHaveLength(128);
    expect(result[0].cells[0].availability).toBe(0.955);
  });

  it('should handle empty data', () => {
    const result = transformHourlyToRows([]);
    expect(result).toEqual([]);
  });

  it('should handle undefined data', () => {
    const result = transformHourlyToRows(undefined);
    expect(result).toEqual([]);
  });

  it('should skip items without hour_start_date_time', () => {
    const hourlyData: FctDataColumnAvailabilityHourly[] = [
      {
        hour_start_date_time: 1705334400,
        column_index: 0,
        avg_availability_pct: 95.0,
      },
      {
        // No hour_start_date_time
        column_index: 1,
        avg_availability_pct: 98.0,
      },
    ];

    const result = transformHourlyToRows(hourlyData);

    expect(result).toHaveLength(1);
  });

  it('should sort hours in ascending order', () => {
    const hourlyData: FctDataColumnAvailabilityHourly[] = [
      { hour_start_date_time: 1705338000, column_index: 0, avg_availability_pct: 90 }, // 17:00
      { hour_start_date_time: 1705334400, column_index: 0, avg_availability_pct: 95 }, // 16:00
      { hour_start_date_time: 1705341600, column_index: 0, avg_availability_pct: 92 }, // 18:00
    ];

    const result = transformHourlyToRows(hourlyData);

    expect(result[0].identifier).toBe('1705334400'); // 16:00 first
    expect(result[1].identifier).toBe('1705338000'); // 17:00
    expect(result[2].identifier).toBe('1705341600'); // 18:00
  });
});

describe('transformEpochsToRows', () => {
  it('should transform epoch data into heatmap rows', () => {
    const epochData: FctDataColumnAvailabilityByEpoch[] = [
      {
        epoch: 100,
        column_index: 0,
        avg_availability_pct: 95.5,
        total_success_count: 100,
        total_probe_count: 105,
        avg_p50_response_time_ms: 150,
      },
      {
        epoch: 100,
        column_index: 1,
        avg_availability_pct: 98.0,
        total_success_count: 98,
        total_probe_count: 100,
      },
    ];

    const result = transformEpochsToRows(epochData);

    expect(result).toHaveLength(1);
    expect(result[0].identifier).toBe('100');
    expect(result[0].label).toBe('100');
    expect(result[0].cells).toHaveLength(128);
    expect(result[0].cells[0].availability).toBe(0.955);
  });

  it('should handle empty data', () => {
    const result = transformEpochsToRows([]);
    expect(result).toEqual([]);
  });

  it('should handle undefined data', () => {
    const result = transformEpochsToRows(undefined);
    expect(result).toEqual([]);
  });

  it('should skip items without epoch', () => {
    const epochData: FctDataColumnAvailabilityByEpoch[] = [
      {
        epoch: 100,
        column_index: 0,
        avg_availability_pct: 95.0,
      },
      {
        // No epoch
        column_index: 1,
        avg_availability_pct: 98.0,
      },
    ];

    const result = transformEpochsToRows(epochData);

    expect(result).toHaveLength(1);
  });

  it('should sort epochs in ascending order', () => {
    const epochData: FctDataColumnAvailabilityByEpoch[] = [
      { epoch: 102, column_index: 0, avg_availability_pct: 90 },
      { epoch: 100, column_index: 0, avg_availability_pct: 95 },
      { epoch: 101, column_index: 0, avg_availability_pct: 92 },
    ];

    const result = transformEpochsToRows(epochData);

    expect(result[0].identifier).toBe('100');
    expect(result[1].identifier).toBe('101');
    expect(result[2].identifier).toBe('102');
  });
});

describe('transformSlotsToRows', () => {
  it('should transform slot data into heatmap rows', () => {
    const slotData: FctDataColumnAvailabilityBySlot[] = [
      {
        slot: 3200,
        column_index: 0,
        availability_pct: 95.5,
        success_count: 100,
        probe_count: 105,
        p50_response_time_ms: 150,
      },
      {
        slot: 3200,
        column_index: 1,
        availability_pct: 98.0,
        success_count: 98,
        probe_count: 100,
      },
    ];

    const result = transformSlotsToRows(slotData);

    expect(result).toHaveLength(1);
    expect(result[0].identifier).toBe('3200');
    expect(result[0].label).toBe('3200');
    expect(result[0].cells).toHaveLength(128);
    expect(result[0].cells[0].availability).toBe(0.955);
    expect(result[0].cells[0].successCount).toBe(100);
    expect(result[0].cells[0].totalCount).toBe(105);
  });

  it('should handle empty data', () => {
    const result = transformSlotsToRows([]);
    expect(result).toEqual([]);
  });

  it('should handle undefined data', () => {
    const result = transformSlotsToRows(undefined);
    expect(result).toEqual([]);
  });

  it('should skip items without slot', () => {
    const slotData: FctDataColumnAvailabilityBySlot[] = [
      {
        slot: 3200,
        column_index: 0,
        availability_pct: 95.0,
      },
      {
        // No slot
        column_index: 1,
        availability_pct: 98.0,
      },
    ];

    const result = transformSlotsToRows(slotData);

    expect(result).toHaveLength(1);
  });

  it('should sort slots in ascending order', () => {
    const slotData: FctDataColumnAvailabilityBySlot[] = [
      { slot: 3202, column_index: 0, availability_pct: 90 },
      { slot: 3200, column_index: 0, availability_pct: 95 },
      { slot: 3201, column_index: 0, availability_pct: 92 },
    ];

    const result = transformSlotsToRows(slotData);

    expect(result[0].identifier).toBe('3200');
    expect(result[1].identifier).toBe('3201');
    expect(result[2].identifier).toBe('3202');
  });
});

describe('transformBlobsToRows', () => {
  it('should transform blob data into heatmap rows', () => {
    const blobData: FctDataColumnAvailabilityBySlotBlob[] = [
      {
        blob_index: 0,
        column_index: 0,
        availability_pct: 95.5,
        success_count: 100,
        probe_count: 105,
        p50_response_time_ms: 150,
      },
      {
        blob_index: 0,
        column_index: 1,
        availability_pct: 98.0,
        success_count: 98,
        probe_count: 100,
      },
    ];

    const result = transformBlobsToRows(blobData);

    expect(result).toHaveLength(1);
    expect(result[0].identifier).toBe('0');
    expect(result[0].label).toBe('0 · UNKNOWN'); // No submitter provided, defaults to UNKNOWN
    expect(result[0].cells).toHaveLength(128);
    expect(result[0].cells[0].availability).toBe(0.955);
    expect(result[0].cells[0].blobIndex).toBe(0);
  });

  it('should include submitter name in label when provided', () => {
    const blobData: FctDataColumnAvailabilityBySlotBlob[] = [
      { blob_index: 0, column_index: 0, availability_pct: 95 },
      { blob_index: 1, column_index: 0, availability_pct: 92 },
      { blob_index: 2, column_index: 0, availability_pct: 88 },
    ];
    const blobSubmitters = ['base', 'optimism', 'Unknown'];

    const result = transformBlobsToRows(blobData, blobSubmitters);

    expect(result).toHaveLength(3);
    expect(result[0].label).toBe('0 · base');
    expect(result[1].label).toBe('1 · optimism');
    expect(result[2].label).toBe('2 · Unknown');
  });

  it('should handle empty data', () => {
    const result = transformBlobsToRows([]);
    expect(result).toEqual([]);
  });

  it('should handle undefined data', () => {
    const result = transformBlobsToRows(undefined);
    expect(result).toEqual([]);
  });

  it('should skip items without blob_index', () => {
    const blobData: FctDataColumnAvailabilityBySlotBlob[] = [
      {
        blob_index: 0,
        column_index: 0,
        availability_pct: 95.0,
      },
      {
        // No blob_index
        column_index: 1,
        availability_pct: 98.0,
      },
    ];

    const result = transformBlobsToRows(blobData);

    expect(result).toHaveLength(1);
  });

  it('should sort blobs in ascending order', () => {
    const blobData: FctDataColumnAvailabilityBySlotBlob[] = [
      { blob_index: 2, column_index: 0, availability_pct: 90 },
      { blob_index: 0, column_index: 0, availability_pct: 95 },
      { blob_index: 1, column_index: 0, availability_pct: 92 },
    ];

    const result = transformBlobsToRows(blobData);

    expect(result[0].identifier).toBe('0');
    expect(result[1].identifier).toBe('1');
    expect(result[2].identifier).toBe('2');
  });

  it('should include blob index in cell data', () => {
    const blobData: FctDataColumnAvailabilityBySlotBlob[] = [
      {
        blob_index: 3,
        column_index: 0,
        availability_pct: 95.0,
        success_count: 95,
        probe_count: 100,
      },
    ];

    const result = transformBlobsToRows(blobData);

    expect(result[0].cells[0].blobIndex).toBe(3);
  });

  it('should handle multiple blobs without submitters', () => {
    const blobData: FctDataColumnAvailabilityBySlotBlob[] = [
      { blob_index: 0, column_index: 0, availability_pct: 90 },
      { blob_index: 0, column_index: 1, availability_pct: 92 },
      { blob_index: 1, column_index: 0, availability_pct: 95 },
      { blob_index: 1, column_index: 1, availability_pct: 97 },
      { blob_index: 2, column_index: 0, availability_pct: 88 },
    ];

    const result = transformBlobsToRows(blobData);

    expect(result).toHaveLength(3);
    expect(result[0].label).toBe('0 · UNKNOWN');
    expect(result[1].label).toBe('1 · UNKNOWN');
    expect(result[2].label).toBe('2 · UNKNOWN');
  });
});

describe('column filling behavior', () => {
  it('should ensure all 128 columns are present in daily data', () => {
    const dailyData: FctDataColumnAvailabilityDaily[] = [
      {
        date: '2024-01-15',
        column_index: 0,
        avg_availability_pct: 95.0,
      },
      {
        date: '2024-01-15',
        column_index: 127, // Last column
        avg_availability_pct: 90.0,
      },
    ];

    const result = transformDailyToRows(dailyData);

    expect(result[0].cells).toHaveLength(128);
    expect(result[0].cells[0].columnIndex).toBe(0);
    expect(result[0].cells[127].columnIndex).toBe(127);
  });

  it('should fill gaps between columns with placeholders', () => {
    const dailyData: FctDataColumnAvailabilityDaily[] = [
      {
        date: '2024-01-15',
        column_index: 0,
        avg_availability_pct: 95.0,
        total_success_count: 95,
        total_probe_count: 100,
      },
      {
        date: '2024-01-15',
        column_index: 5,
        avg_availability_pct: 90.0,
        total_success_count: 90,
        total_probe_count: 100,
      },
    ];

    const result = transformDailyToRows(dailyData);

    // Check columns 1-4 are placeholders
    for (let i = 1; i <= 4; i++) {
      expect(result[0].cells[i].columnIndex).toBe(i);
      expect(result[0].cells[i].availability).toBe(0);
      expect(result[0].cells[i].totalCount).toBe(0);
      expect(result[0].cells[i].successCount).toBe(0);
    }
  });
});

describe('data field mapping', () => {
  it('should correctly map percentage fields to decimal availability', () => {
    const dailyData: FctDataColumnAvailabilityDaily[] = [
      {
        date: '2024-01-15',
        column_index: 0,
        avg_availability_pct: 100.0,
      },
      {
        date: '2024-01-15',
        column_index: 1,
        avg_availability_pct: 50.0,
      },
      {
        date: '2024-01-15',
        column_index: 2,
        avg_availability_pct: 0.0,
      },
    ];

    const result = transformDailyToRows(dailyData);

    expect(result[0].cells[0].availability).toBe(1.0);
    expect(result[0].cells[1].availability).toBe(0.5);
    expect(result[0].cells[2].availability).toBe(0.0);
  });

  it('should handle missing optional fields gracefully', () => {
    const dailyData: FctDataColumnAvailabilityDaily[] = [
      {
        date: '2024-01-15',
        column_index: 0,
        avg_availability_pct: 95.0,
        // Missing total_success_count, total_probe_count, avg_p50_response_time_ms
      },
    ];

    const result = transformDailyToRows(dailyData);

    expect(result[0].cells[0].availability).toBe(0.95);
    expect(result[0].cells[0].successCount).toBeUndefined();
    expect(result[0].cells[0].totalCount).toBeUndefined();
    expect(result[0].cells[0].avgResponseTimeMs).toBeUndefined();
  });
});
