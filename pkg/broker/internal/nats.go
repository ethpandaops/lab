package internal

import (
	"encoding/json"
	"fmt"

	"github.com/ethpandaops/lab/pkg/logger"
	"github.com/nats-io/nats.go"
)

// NATSBroker represents a NATS broker implementation
type NATSBroker struct {
	conn *nats.Conn
	js   nats.JetStreamContext
	log  *logger.Logger
	subs []*nats.Subscription
}

// NATSSubscription represents a NATS subscription
type NATSSubscription struct {
	sub *nats.Subscription
}

// NewNATSBroker creates a new NATS broker
func NewNATSBroker(url string, log *logger.Logger) (*NATSBroker, error) {
	// Connect to NATS
	conn, err := nats.Connect(url)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to NATS: %w", err)
	}

	// Create JetStream context
	js, err := conn.JetStream()
	if err != nil {
		return nil, fmt.Errorf("failed to create JetStream context: %w", err)
	}

	return &NATSBroker{
		conn: conn,
		js:   js,
		log:  log,
		subs: make([]*nats.Subscription, 0),
	}, nil
}

// Publish publishes a message to the given subject
func (c *NATSBroker) Publish(subject string, data interface{}) error {
	// Marshal data to JSON
	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal data: %w", err)
	}

	// Publish message
	if err := c.conn.Publish(subject, jsonData); err != nil {
		return fmt.Errorf("failed to publish message: %w", err)
	}

	return nil
}

// Subscribe subscribes to the given subject
func (c *NATSBroker) Subscribe(subject string, handler func([]byte)) (*NATSSubscription, error) {
	// Create a handler wrapper that converts NATS message to bytes
	natsHandler := func(msg *nats.Msg) {
		handler(msg.Data)
	}

	// Subscribe to subject
	sub, err := c.conn.Subscribe(subject, natsHandler)
	if err != nil {
		return nil, fmt.Errorf("failed to subscribe to subject: %w", err)
	}

	// Add subscription to list
	c.subs = append(c.subs, sub)

	return &NATSSubscription{sub: sub}, nil
}

// QueueSubscribe subscribes to the given subject with a queue group
func (c *NATSBroker) QueueSubscribe(subject string, queue string, handler func([]byte)) (*NATSSubscription, error) {
	// Create a handler wrapper that converts NATS message to bytes
	natsHandler := func(msg *nats.Msg) {
		handler(msg.Data)
	}

	// Subscribe to subject with queue group
	sub, err := c.conn.QueueSubscribe(subject, queue, natsHandler)
	if err != nil {
		return nil, fmt.Errorf("failed to queue subscribe to subject: %w", err)
	}

	// Add subscription to list
	c.subs = append(c.subs, sub)

	return &NATSSubscription{sub: sub}, nil
}

// Close closes the NATS client
func (c *NATSBroker) Close() error {
	// Unsubscribe from all subscriptions
	for _, sub := range c.subs {
		if err := sub.Unsubscribe(); err != nil {
			c.log.WithError(err).Warn("Failed to unsubscribe from subject")
		}
	}

	// Close connection
	c.conn.Close()
	return nil
}

// Unsubscribe unsubscribes from the subject
func (s *NATSSubscription) Unsubscribe() error {
	return s.sub.Unsubscribe()
}
