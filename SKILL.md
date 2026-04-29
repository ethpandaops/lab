---
name: lab-deep-links
description: Guide for constructing deep links into ethPandaOps Lab for exploring Ethereum beacon chain data. Use when you need to generate URLs for specific Lab routes, navigate to slot/epoch/contract details, switch between networks (mainnet, sepolia, holesky), or understand how to link to Lab instances via cartographoor service discovery.
---

# Lab Deep Links

This skill provides patterns for constructing URLs to deep-link into ethPandaOps Lab, a platform for exploring Ethereum beacon chain data and network statistics.

## Base URLs

Lab instances are accessible at different base URLs:

- **Primary Lab**: `https://lab.ethpandaops.io`
- **Local Development**: `http://localhost:5173` (default Vite dev server)
- **Custom Instances**: Discovered via cartographoor service discovery

## Network Selection

Lab supports multiple Ethereum networks via the `?network=` query parameter:

| Network   | Parameter Value | Default? |
|-----------|-----------------|----------|
| Mainnet   | `mainnet`       | Yes (omitted from URL) |
| Sepolia   | `sepolia`       | No |
| Holesky   | `holesky`       | No |
| Custom    | Custom name from config | No |

**Important**: The `mainnet` network is the default and should be omitted from URLs. Only include `?network=` for non-mainnet networks.

### Network URL Examples

```
# Mainnet (default - no network param)
https://lab.ethpandaops.io/ethereum/slots

# Sepolia
https://lab.ethpandaops.io/ethereum/slots?network=sepolia

# Holesky
https://lab.ethpandaops.io/ethereum/slots?network=holesky
```

## Route Structure

Lab uses TanStack Router with the following route hierarchy:

```
/                                    # Home/Landing page
/ethereum/                           # Ethereum section layout
  ├── slots                          # Slot browser/listing
  │   └── $slot                      # Individual slot details
  ├── epochs                         # Epoch browser/listing
  │   └── $epoch                     # Individual epoch details
  ├── live                           # Live slot stream
  ├── execution                      # Execution layer data
  │   ├── overview
  │   ├── timings
  │   ├── payloads
  │   ├── state-growth
  │   └── state-expiry
  ├── contracts                      # Contract listing
  │   └── $address                   # Contract storage analysis
  ├── forks                          # Fork/upgrade listing
  │   └── $fork                      # Individual fork details
  ├── entities                       # Entity (pool/organization) listing
  └── data-availability              # Data availability metrics
      ├── probes
      └── custody
/xatu/                               # Xatu-specific metrics
  ├── contributors                   # Contributor listing
  │   └── $id                       # Individual contributor
  ├── fork-readiness                 # Fork readiness dashboard
  ├── geographical-checklist         # Geographic distribution
  └── locally-built-blocks           # Block production analysis
/experiments/                        # Experimental features
  ├── block-production-flow
  └── live-slots
```

## Deep Link Patterns

### Slots

View a specific slot with optional tab selection:

```
Pattern: /ethereum/slots/{slot}?tab={tab}

Tabs available:
- overview (default)
- timeline
- block
- attestations
- propagation
- blobs
- execution
- mev

Examples:
https://lab.ethpandaops.io/ethereum/slots/9000000
https://lab.ethpandaops.io/ethereum/slots/9000000?tab=attestations
https://lab.ethpandaops.io/ethereum/slots/9000000?tab=propagation&network=sepolia
```

### Epochs

View a specific epoch with optional tab selection:

```
Pattern: /ethereum/epochs/{epoch}?tab={tab}

Tabs available:
- slots (default)
- blocks
- validators
- mev

Examples:
https://lab.ethpandaops.io/ethereum/epochs/281250
https://lab.ethpandaops.io/ethereum/epochs/281250?tab=validators
https://lab.ethpandaops.io/ethereum/epochs/281250?tab=mev&network=holesky
```

### Forks

View fork/upgrade details:

```
Pattern: /ethereum/forks/{fork-name}

Examples:
https://lab.ethpandaops.io/ethereum/forks/pectra
https://lab.ethpandaops.io/ethereum/forks/dencun
https://lab.ethpandaops.io/ethereum/forks/bpo1
```

### Contracts

View contract storage analysis:

```
Pattern: /ethereum/contracts/{address}

Examples:
https://lab.ethpandaops.io/ethereum/contracts/0x00000000219ab540356cBB839Cbe05303d7705Fa
```

### Contributors

View Xatu contributor details:

```
Pattern: /xatu/contributors/{id}

Examples:
https://lab.ethpandaops.io/xatu/contributors/lighthouse
```

### Embed Mode

Any route can be loaded in embed mode (minimal UI without sidebar):

```
Pattern: {any-route}?embed=true

Examples:
https://lab.ethpandaops.io/ethereum/live?embed=true
https://lab.ethpandaops.io/ethereum/slots/9000000?embed=true&tab=propagation
```

### Theme Override

Force a specific theme:

```
Pattern: {any-route}?theme={theme}

Themes available:
- light
- dark
- star

Examples:
https://lab.ethpandaops.io/ethereum/slots?theme=dark
https://lab.ethpandaops.io/ethereum/live?embed=true&theme=star
```

## Cartographoor Service Discovery

Lab instances can be discovered dynamically using the cartographoor service discovery mechanism.

### Discovery Endpoint

```
https://cartographoor.ethpandaops.io/api/v1/services/lab
```

### Response Format

```json
{
  "services": [
    {
      "name": "lab-mainnet",
      "url": "https://lab.ethpandaops.io",
      "network": "mainnet",
      "region": "europe-west1",
      "health": "healthy"
    },
    {
      "name": "lab-sepolia",
      "url": "https://lab-sepolia.ethpandaops.io",
      "network": "sepolia",
      "region": "europe-west1",
      "health": "healthy"
    }
  ]
}
```

### Usage Pattern

1. Query the cartographoor API for available Lab instances
2. Filter by network or region as needed
3. Use the returned `url` as the base URL for deep links

### Example: Finding Lab for a Specific Network

```typescript
async function findLabInstance(network: string): Promise<string | null> {
  const response = await fetch('https://cartographoor.ethpandaops.io/api/v1/services/lab');
  const data = await response.json();
  
  const service = data.services.find(
    (s: any) => s.network === network && s.health === 'healthy'
  );
  
  return service?.url || 'https://lab.ethpandaops.io';
}

// Usage
const baseUrl = await findLabInstance('sepolia');
const slotUrl = `${baseUrl}/ethereum/slots/1000000?network=sepolia`;
```

## Common URL Construction Patterns

### Slot Detail URL Builder

```typescript
function buildSlotUrl(slot: number, options?: {
  network?: 'mainnet' | 'sepolia' | 'holesky';
  tab?: 'overview' | 'timeline' | 'block' | 'attestations' | 'propagation' | 'blobs' | 'execution' | 'mev';
  embed?: boolean;
  theme?: 'light' | 'dark' | 'star';
}): string {
  const baseUrl = 'https://lab.ethpandaops.io';
  let url = `${baseUrl}/ethereum/slots/${slot}`;
  
  const params = new URLSearchParams();
  
  if (options?.network && options.network !== 'mainnet') {
    params.set('network', options.network);
  }
  if (options?.tab && options.tab !== 'overview') {
    params.set('tab', options.tab);
  }
  if (options?.embed) {
    params.set('embed', 'true');
  }
  if (options?.theme) {
    params.set('theme', options.theme);
  }
  
  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}
```

### Epoch Detail URL Builder

```typescript
function buildEpochUrl(epoch: number, options?: {
  network?: 'mainnet' | 'sepolia' | 'holesky';
  tab?: 'slots' | 'blocks' | 'validators' | 'mev';
  embed?: boolean;
}): string {
  const baseUrl = 'https://lab.ethpandaops.io';
  let url = `${baseUrl}/ethereum/epochs/${epoch}`;
  
  const params = new URLSearchParams();
  
  if (options?.network && options.network !== 'mainnet') {
    params.set('network', options.network);
  }
  if (options?.tab && options.tab !== 'slots') {
    params.set('tab', options.tab);
  }
  if (options?.embed) {
    params.set('embed', 'true');
  }
  
  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}
```

## Quick Reference

| Destination | URL Pattern | Example |
|-------------|-------------|---------|
| Home | `/` | `https://lab.ethpandaops.io/` |
| Slots List | `/ethereum/slots` | `https://lab.ethpandaops.io/ethereum/slots` |
| Slot Detail | `/ethereum/slots/{slot}` | `https://lab.ethpandaops.io/ethereum/slots/9000000` |
| Epochs List | `/ethereum/epochs` | `https://lab.ethpandaops.io/ethereum/epochs` |
| Epoch Detail | `/ethereum/epochs/{epoch}` | `https://lab.ethpandaops.io/ethereum/epochs/281250` |
| Live View | `/ethereum/live` | `https://lab.ethpandaops.io/ethereum/live` |
| Forks List | `/ethereum/forks` | `https://lab.ethpandaops.io/ethereum/forks` |
| Fork Detail | `/ethereum/forks/{name}` | `https://lab.ethpandaops.io/ethereum/forks/pectra` |
| Contracts | `/ethereum/contracts` | `https://lab.ethpandaops.io/ethereum/contracts` |
| Contract Detail | `/ethereum/contracts/{address}` | `https://lab.ethpandaops.io/ethereum/contracts/0x...` |
| Contributors | `/xatu/contributors` | `https://lab.ethpandaops.io/xatu/contributors` |
| Embed Mode | `?embed=true` | `https://lab.ethpandaops.io/ethereum/live?embed=true` |
| Network Switch | `?network={name}` | `https://lab.ethpandaops.io/ethereum/slots?network=sepolia` |
