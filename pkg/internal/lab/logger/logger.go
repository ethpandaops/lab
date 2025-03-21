package logger

import (
	"github.com/sirupsen/logrus"
)

// New creates a new logger
func New(level string, serviceName string) (logrus.FieldLogger, error) {
	log := logrus.New()

	// Set log level
	logLevel, err := logrus.ParseLevel(level)
	if err != nil {
		return nil, err
	}
	log.SetLevel(logLevel)

	// Set log format.
	log.SetFormatter(&logrus.TextFormatter{
		FullTimestamp: true,
	})

	return log.WithField("service", serviceName), nil
}
