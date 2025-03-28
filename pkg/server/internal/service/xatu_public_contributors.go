package service

import (
	"context"

	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	"github.com/ethpandaops/lab/pkg/internal/lab/xatu"
	"github.com/sirupsen/logrus"
)

const (
	XatuPublicContributorsServiceName = "xatu_public_contributors"
)

type XatuPublicContributors struct {
	log           logrus.FieldLogger
	xatuClient    *xatu.Client
	storageClient storage.Client
}

func NewXatuPublicContributors(
	log logrus.FieldLogger,
	xatuClient *xatu.Client,
	storageClient storage.Client,
) *XatuPublicContributors {
	return &XatuPublicContributors{
		log:           log.WithField("component", "service/xatu_public_contributors"),
		xatuClient:    xatuClient,
		storageClient: storageClient,
	}
}

func (x *XatuPublicContributors) Name() string {
	return XatuPublicContributorsServiceName
}

func (x *XatuPublicContributors) Start(ctx context.Context) error {
	x.log.Info("Starting XatuPublicContributors service")

	return nil
}
