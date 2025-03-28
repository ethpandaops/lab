package broker

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/nats-io/nats.go"
	"github.com/sirupsen/logrus"
)

// Config contains the configuration for the message broker
type Config struct {
	URL     string `yaml:"url"`
	Subject string `yaml:"subject"`
}

// Client represents a message broker
type Client interface {
	// Start starts the broker
	Start(ctx context.Context) error

	// Publish publishes a message to the given subject
	Publish(subject string, data interface{}) error

	// Subscribe subscribes to the given subject
	Subscribe(subject string, handler func([]byte)) (Subscription, error)

	// QueueSubscribe subscribes to the given subject with a queue group
	QueueSubscribe(subject string, queue string, handler func([]byte)) (Subscription, error)

	// Stop stops the broker
	Stop() error
}

// Subscription represents a subscription to a subject
type Subscription interface {
	// Unsubscribe unsubscribes from the subject
	Unsubscribe() error
}

// broker implements the Broker interface
type broker struct {
	config *Config
	conn   *nats.Conn
	js     nats.JetStreamContext
	log    logrus.FieldLogger
	subs   []*nats.Subscription
}

// subscription implements the Subscription interface
type subscription struct {
	sub *nats.Subscription
}

// New creates a new broker
func New(config *Config, log logrus.FieldLogger) (Client, error) {
	return &broker{
		config: config,
		log:    log.WithField("module", "broker"),
		subs:   make([]*nats.Subscription, 0),
	}, nil
}

func (b *broker) Start(ctx context.Context) error {
	b.log.Info("Starting broker")

	// Connect to NATS
	conn, err := nats.Connect(b.config.URL)
	if err != nil {
		return fmt.Errorf("failed to connect to NATS: %w", err)
	}

	// Create JetStream context
	js, err := conn.JetStream()
	if err != nil {
		return fmt.Errorf("failed to create JetStream context: %w", err)
	}

	b.conn = conn
	b.js = js

	b.log.Info("Broker started")

	return nil
}

// Publish publishes a message to the given subject
func (b *broker) Publish(subject string, data interface{}) error {
	// Marshal data to JSON
	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal data: %w", err)
	}

	// Publish message
	if err := b.conn.Publish(subject, jsonData); err != nil {
		return fmt.Errorf("failed to publish message: %w", err)
	}

	return nil
}

// Subscribe subscribes to the given subject
func (b *broker) Subscribe(subject string, handler func([]byte)) (Subscription, error) {
	// Create a handler wrapper that converts NATS message to bytes
	natsHandler := func(msg *nats.Msg) {
		handler(msg.Data)
	}

	// Subscribe to subject
	sub, err := b.conn.Subscribe(subject, natsHandler)
	if err != nil {
		return nil, fmt.Errorf("failed to subscribe to subject: %w", err)
	}

	// Add subscription to list
	b.subs = append(b.subs, sub)

	return &subscription{sub: sub}, nil
}

// QueueSubscribe subscribes to the given subject with a queue group
func (b *broker) QueueSubscribe(subject string, queue string, handler func([]byte)) (Subscription, error) {
	// Create a handler wrapper that converts NATS message to bytes
	natsHandler := func(msg *nats.Msg) {
		handler(msg.Data)
	}

	// Subscribe to subject with queue group
	sub, err := b.conn.QueueSubscribe(subject, queue, natsHandler)
	if err != nil {
		return nil, fmt.Errorf("failed to queue subscribe to subject: %w", err)
	}

	// Add subscription to list
	b.subs = append(b.subs, sub)

	return &subscription{sub: sub}, nil
}

// Stop gracefully stops the broker
func (b *broker) Stop() error {
	// Unsubscribe from all subscriptions
	for _, sub := range b.subs {
		if err := sub.Unsubscribe(); err != nil {
			b.log.WithError(err).Warn("Failed to unsubscribe from subject")
		}
	}

	// Close connection
	b.conn.Close()
	return nil
}

// Unsubscribe unsubscribes from the subject
func (s *subscription) Unsubscribe() error {
	return s.sub.Unsubscribe()
}
