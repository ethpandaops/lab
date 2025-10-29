package srv

import (
	"fmt"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/geolocation"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/storage"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/grpc"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/cartographoor"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/experiments"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/state_analytics"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/xatu_cbt"
)

type Config struct {
	LogLevel       string                     `yaml:"logLevel" default:"info"`
	Server         *grpc.Config               `yaml:"grpc"`
	Storage        *storage.Config            `yaml:"storage"`
	Cache          *cache.Config              `yaml:"cache"`
	Geolocation    *geolocation.Config        `yaml:"geolocation"`
	XatuCBT        *xatu_cbt.Config           `yaml:"xatu_cbt"`
	Cartographoor  *cartographoor.Config      `yaml:"cartographoor"`
	Experiments    *experiments.Config        `yaml:"experiments"`
	StateAnalytics *state_analytics.Config    `yaml:"state_analytics"`
}

func (x *Config) Validate() error {
	if x.Geolocation == nil {
		return fmt.Errorf("geolocation config is required")
	}

	if x.XatuCBT == nil {
		return fmt.Errorf("xatu_cbt config is required")
	}

	if err := x.XatuCBT.Validate(); err != nil {
		return fmt.Errorf("xatu_cbt config is invalid: %w", err)
	}

	if x.Cartographoor == nil {
		return fmt.Errorf("cartographoor config is required")
	}

	if err := x.Cartographoor.Validate(); err != nil {
		return fmt.Errorf("cartographoor config is invalid: %w", err)
	}

	return nil
}
