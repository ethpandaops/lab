package logger

import (
	"github.com/sirupsen/logrus"
)

// Logger represents a logger instance
type Logger struct {
	*logrus.Logger
}

// New creates a new logger
func New(level string) (*Logger, error) {
	log := logrus.New()

	// Set log level
	logLevel, err := logrus.ParseLevel(level)
	if err != nil {
		return nil, err
	}
	log.SetLevel(logLevel)

	// Set log format (JSON for production, text for development)
	log.SetFormatter(&logrus.TextFormatter{
		FullTimestamp: true,
	})

	return &Logger{
		Logger: log,
	}, nil
}

// WithFields adds a map of fields to the logger
func (l *Logger) WithFields(fields map[string]interface{}) *logrus.Entry {
	return l.Logger.WithFields(fields)
}

// WithField adds a field to the logger
func (l *Logger) WithField(key string, value interface{}) *logrus.Entry {
	return l.Logger.WithField(key, value)
}

// GetLogrusLogger returns the underlying logrus logger
func (l *Logger) GetLogrusLogger() *logrus.Logger {
	return l.Logger
}
