package service

import (
	"context"

	"github.com/sirupsen/logrus"
)

const (
	LabServiceName = "lab"
)

type Lab struct {
	log logrus.FieldLogger
}

func NewLab(log logrus.FieldLogger) *Lab {
	return &Lab{
		log: log.WithField("component", "service/lab"),
	}
}

func (l *Lab) Start(ctx context.Context) error {
	l.log.Info("Starting Lab service")

	return nil
}

func (l *Lab) Name() string {
	return LabServiceName
}
