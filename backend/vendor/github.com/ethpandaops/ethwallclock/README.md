# EthWallclock

An Ethereum Wallclock Go package

## Installation

```bash
go get github.com/ethpandaops/ethwallclock
```

## Usage

```go
package main

import (
  "fmt"
  "time"

  "github.com/ethpandaops/ethwallclock"
)
 
func main() {
  genesisTime, _ := time.Parse(time.RFC3339, "2020-01-01T12:00:23Z")

  wallclock := ethwallclock.NewEthereumBeaconChain(genesisTime, 12*time.Second, 32)

  slot, epoch, err := wallclock.Now()
  if err != nil {
    panic(err)
  }

  fmt.Println("Slot: ", slot)
  fmt.Println("Epoch: ", epoch)
}
```
