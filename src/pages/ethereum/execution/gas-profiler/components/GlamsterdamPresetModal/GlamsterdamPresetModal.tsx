import { type JSX, useState, useCallback, useMemo } from 'react';
import { ArrowTopRightOnSquareIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Dialog } from '@/components/Overlays/Dialog';
import { Button } from '@/components/Elements/Button';
import type { GasScheduleDefaults } from '../../SimulatePage.types';
import { GLAMSTERDAM_PRESET } from '../../SimulatePage.types';

/**
 * EIP section definition for the preset modal
 */
interface EipSection {
  eip: string;
  name: string;
  description: string;
  url: string;
  parameters: { key: string; label: string }[];
  /** If true, values are placeholders (TBD) and shown with a muted indicator */
  placeholder?: boolean;
  /** Additional note shown below parameters (e.g. to explain unsimulated parts of the EIP) */
  note?: string;
}

/**
 * EIP sections that cannot be simulated (structural changes)
 */
interface UnsupportedEip {
  eip: string;
  name: string;
  reason: string;
  url: string;
}

/** EIP sections with overridable parameters */
const EIP_SECTIONS: EipSection[] = [
  {
    eip: 'EIP-7904',
    name: 'Compute Repricing',
    description: 'Adjusts gas costs for compute-heavy opcodes and precompiles to better reflect actual resource usage.',
    url: 'https://eips.ethereum.org/EIPS/eip-7904',
    parameters: [
      { key: 'DIV', label: 'DIV' },
      { key: 'SDIV', label: 'SDIV' },
      { key: 'MOD', label: 'MOD' },
      { key: 'MULMOD', label: 'MULMOD' },
      { key: 'KECCAK256', label: 'KECCAK256' },
      { key: 'PC_BLAKE2F_BASE', label: 'BLAKE2F Base' },
      { key: 'PC_BLAKE2F_PER_ROUND', label: 'BLAKE2F /Round' },
      { key: 'PC_BLS12_G1ADD', label: 'BLS12 G1Add' },
      { key: 'PC_BLS12_G2ADD', label: 'BLS12 G2Add' },
      { key: 'PC_BN254_ADD', label: 'BN254 Add' },
      { key: 'PC_BN254_PAIRING_PER_PAIR', label: 'BN254 Pairing /Pair' },
      { key: 'PC_KZG_POINT_EVALUATION', label: 'KZG Point Eval' },
    ],
  },
  {
    eip: 'EIP-7976',
    name: 'Calldata Floor Cost',
    description: 'Increases the calldata floor cost per token, discouraging using calldata for data availability.',
    url: 'https://eips.ethereum.org/EIPS/eip-7976',
    parameters: [{ key: 'TX_FLOOR_PER_TOKEN', label: 'Floor Per Token' }],
  },
  {
    eip: 'EIP-2780',
    name: 'Transaction Repricing',
    description:
      'Reprices transaction costs: reduces the base cost from 21,000 to 4,500, and restructures value transfer and cold account access pricing.',
    url: 'https://eips.ethereum.org/EIPS/eip-2780',
    parameters: [{ key: 'TX_BASE', label: 'TX Base' }],
    note: 'This EIP also introduces structural changes (new account surcharge, cold account cost splitting by code presence, value transfer repricing) that cannot be simulated as parameter overrides.',
  },
  {
    eip: 'EIP-8038',
    name: 'State Access Repricing',
    description:
      'Reprices state access opcodes (SLOAD, SSTORE, CALL cold/warm). Values are still under discussion and may change.',
    url: 'https://eips.ethereum.org/EIPS/eip-8038',
    placeholder: true,
    parameters: [
      { key: 'SLOAD_COLD', label: 'SLOAD Cold' },
      { key: 'SLOAD_WARM', label: 'SLOAD Warm' },
      { key: 'SSTORE_RESET', label: 'SSTORE Reset' },
      { key: 'CALL_COLD', label: 'CALL Cold' },
      { key: 'TX_ACCESS_LIST_ADDR', label: 'Access List Addr' },
      { key: 'TX_ACCESS_LIST_KEY', label: 'Access List Key' },
    ],
    note: 'SSTORE clear refund and EXTCODESIZE/EXTCODECOPY formula changes in this EIP cannot be simulated as parameter overrides.',
  },
];

/** EIPs that involve structural changes and cannot be simulated via parameter overrides */
const UNSUPPORTED_EIPS: UnsupportedEip[] = [
  {
    eip: 'EIP-8037',
    name: 'State Growth Costs',
    reason:
      'Introduces new gas costs for account/storage creation that require protocol-level changes, not just parameter adjustments.',
    url: 'https://eips.ethereum.org/EIPS/eip-8037',
  },
  {
    eip: 'EIP-7981',
    name: 'Access List Data Gas',
    reason:
      'Adds a new intrinsic gas mechanism for access list data that cannot be expressed as a simple price override.',
    url: 'https://eips.ethereum.org/EIPS/eip-7981',
  },
];

/**
 * Derive slider constraints from the default and preset values
 */
function getSliderRange(defaultValue: number, presetValue: number): { min: number; max: number; step: number } {
  const maxVal = Math.max(defaultValue, presetValue);
  if (maxVal === 0) return { min: 0, max: 100, step: 1 };
  if (maxVal <= 10) return { min: 0, max: Math.max(50, maxVal * 5), step: 1 };
  if (maxVal <= 100) return { min: 0, max: Math.max(500, maxVal * 5), step: 1 };
  if (maxVal <= 1000) return { min: 0, max: Math.max(5000, maxVal * 5), step: 10 };
  if (maxVal <= 10000) return { min: 0, max: Math.max(50000, maxVal * 5), step: 100 };
  return { min: 0, max: maxVal * 5, step: 1000 };
}

export interface GlamsterdamPresetModalProps {
  open: boolean;
  onClose: () => void;
  onApplyAndSimulate: (values: Record<string, number>) => void;
  onCancel: () => void;
  defaults: GasScheduleDefaults | null;
}

/**
 * Modal that explains the Glamsterdam (EIP-8007) gas schedule preset,
 * shows all parameter changes with adjustable sliders, and allows
 * the user to apply the preset and start simulation.
 */
export function GlamsterdamPresetModal({
  open,
  onClose,
  onApplyAndSimulate,
  onCancel,
  defaults,
}: GlamsterdamPresetModalProps): JSX.Element {
  // Local copy of preset values that the user can tweak before applying
  const [values, setValues] = useState<Record<string, number>>({ ...GLAMSTERDAM_PRESET });

  // Reset local values when modal opens
  const handleOpen = useCallback(() => {
    setValues({ ...GLAMSTERDAM_PRESET });
  }, []);

  // Reset local values when modal becomes visible
  // (useEffect-like behavior via checking open state)
  useMemo(() => {
    if (open) handleOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleParamChange = useCallback((key: string, value: number) => {
    setValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleResetParam = useCallback((key: string) => {
    setValues(prev => ({ ...prev, [key]: GLAMSTERDAM_PRESET[key] }));
  }, []);

  // Count how many values differ from GLAMSTERDAM_PRESET defaults
  const tweakedCount = useMemo(
    () => Object.entries(values).filter(([key, val]) => val !== GLAMSTERDAM_PRESET[key]).length,
    [values]
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Glamsterdam Gas Schedule"
      size="xl"
      noPadding
      footer={
        <div className="flex w-full items-center justify-between">
          <span className="text-xs text-muted">
            {tweakedCount > 0
              ? `${tweakedCount} value${tweakedCount !== 1 ? 's' : ''} adjusted from preset defaults`
              : `${Object.keys(GLAMSTERDAM_PRESET).length} parameters will be applied`}
          </span>
          <div className="flex gap-3">
            <Button
              variant="soft"
              onClick={() => {
                onCancel();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                onApplyAndSimulate(values);
                onClose();
              }}
            >
              Apply & Simulate
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-0 divide-y divide-border">
        {/* Intro */}
        <div className="px-6 py-5">
          <p className="text-sm/6 text-muted">
            This preset applies all gas parameter changes proposed in{' '}
            <a
              href="https://eips.ethereum.org/EIPS/eip-8007"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              EIP-8007 (Glamsterdam)
              <ArrowTopRightOnSquareIcon className="size-3.5" />
            </a>
            , the upcoming Ethereum execution layer upgrade. It bundles compute repricing, calldata floor increases, and
            transaction base cost reductions into a single preset you can simulate against real blocks.
          </p>
          <p className="mt-2 text-sm/6 text-muted">
            Values below are pre-filled with the proposed changes. You can adjust any parameter before simulating.
          </p>
        </div>

        {/* EIP Sections */}
        {EIP_SECTIONS.map(section => (
          <div key={section.eip} className="px-6 py-4">
            {/* Section Header */}
            <div className="mb-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-xs bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {section.eip}
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">{section.name}</h3>
                  {section.placeholder && (
                    <span className="rounded-xs bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 uppercase dark:text-amber-400">
                      Values TBD
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs/5 text-muted">{section.description}</p>
              </div>
              <a
                href={section.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-muted transition-colors hover:text-primary"
                title={`View ${section.eip}`}
              >
                <ArrowTopRightOnSquareIcon className="size-4" />
              </a>
            </div>

            {/* Parameter Rows */}
            <div className="space-y-1.5">
              {section.parameters.map(param => {
                const defaultValue = defaults?.parameters[param.key]?.value ?? 0;
                const presetValue = GLAMSTERDAM_PRESET[param.key] ?? defaultValue;
                const currentValue = values[param.key] ?? presetValue;
                const isModified = currentValue !== defaultValue;
                const isTweaked = currentValue !== presetValue;
                const { min, max, step } = getSliderRange(defaultValue, presetValue);

                return (
                  <div
                    key={param.key}
                    className={clsx('flex items-center gap-2 rounded-xs py-1.5', isModified && 'bg-primary/5 px-2')}
                  >
                    {/* Label */}
                    <div className="w-36 shrink-0">
                      <span
                        className={clsx(
                          'font-mono text-xs',
                          isModified ? 'font-semibold text-primary' : 'text-foreground'
                        )}
                      >
                        {param.label}
                      </span>
                    </div>

                    {/* Default → New indicator */}
                    <span className="w-24 shrink-0 text-right font-mono text-[10px] text-muted">
                      {defaultValue.toLocaleString()}
                      <span className="mx-1 text-muted/50">&rarr;</span>
                    </span>

                    {/* Number Input */}
                    <input
                      type="number"
                      value={currentValue}
                      min={min}
                      max={max}
                      step={step}
                      onChange={e => handleParamChange(param.key, Number(e.target.value))}
                      className={clsx(
                        'w-20 shrink-0 rounded-xs border bg-surface px-2 py-1 text-right font-mono text-xs focus:ring-1 focus:ring-primary focus:outline-hidden',
                        isModified ? 'border-primary/30 text-primary' : 'border-border text-foreground'
                      )}
                    />

                    {/* Slider */}
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={currentValue}
                      onChange={e => handleParamChange(param.key, Number(e.target.value))}
                      className={clsx(
                        'min-w-0 flex-1 cursor-pointer appearance-none bg-transparent',
                        '[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-xs [&::-webkit-slider-runnable-track]:bg-border',
                        '[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-xs [&::-moz-range-track]:bg-border',
                        '[&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
                        isModified ? '[&::-webkit-slider-thumb]:bg-primary' : '[&::-webkit-slider-thumb]:bg-muted',
                        '[&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0',
                        isModified ? '[&::-moz-range-thumb]:bg-primary' : '[&::-moz-range-thumb]:bg-muted'
                      )}
                    />

                    {/* Reset to preset value button (only if tweaked) */}
                    {isTweaked && (
                      <button
                        type="button"
                        onClick={() => handleResetParam(param.key)}
                        className="shrink-0 text-muted transition-colors hover:text-foreground"
                        title="Reset to preset value"
                      >
                        <ArrowPathIcon className="size-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Optional note about unsimulated parts */}
            {section.note && (
              <div className="mt-2.5 flex items-start gap-2 rounded-xs bg-amber-500/5 px-3 py-2">
                <ExclamationTriangleIcon className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                <p className="text-[11px]/4 text-muted">{section.note}</p>
              </div>
            )}
          </div>
        ))}

        {/* Not Covered EIPs */}
        <div className="px-6 py-4">
          <div className="mb-3 flex items-center gap-2">
            <ExclamationTriangleIcon className="size-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">Not Simulated</h3>
          </div>
          <p className="mb-3 text-xs/5 text-muted">
            The following EIPs in Glamsterdam involve structural protocol changes that cannot be expressed as gas
            parameter overrides. Their effects are not reflected in this simulation.
          </p>
          <div className="space-y-2">
            {UNSUPPORTED_EIPS.map(eip => (
              <div key={eip.eip} className="flex items-start gap-3 rounded-xs bg-surface px-3 py-2.5">
                <span className="shrink-0 rounded-xs bg-muted/10 px-2 py-0.5 text-xs font-semibold text-muted">
                  {eip.eip}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">{eip.name}</span>
                    <a
                      href={eip.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted transition-colors hover:text-primary"
                    >
                      <ArrowTopRightOnSquareIcon className="size-3.5" />
                    </a>
                  </div>
                  <p className="mt-0.5 text-[11px]/4 text-muted">{eip.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
