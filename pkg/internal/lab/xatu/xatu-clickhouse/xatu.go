package xatu_clickhouse

import (
	"context"

	"github.com/ethpandaops/lab/pkg/internal/lab/clickhouse"
)

type xatu struct {
	clickhouse *clickhouse.Client
}

func New(clickhouse *clickhouse.Client) *xatu {
	return &xatu{
		clickhouse: clickhouse,
	}
}

func (x *xatu) Start(ctx context.Context) error {
	return nil
}
