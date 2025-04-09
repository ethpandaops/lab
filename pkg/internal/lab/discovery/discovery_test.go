package discovery

import (
	"testing"
)

func TestStaticDiscovery_GetServiceURL_Found(t *testing.T) {
	serviceMap := map[string]string{
		"serviceA": "http://localhost:8080",
	}
	d := NewStaticDiscovery(serviceMap)

	url, err := d.GetServiceURL("serviceA")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if url != "http://localhost:8080" {
		t.Fatalf("expected URL %q, got %q", "http://localhost:8080", url)
	}
}

func TestStaticDiscovery_GetServiceURL_NotFound(t *testing.T) {
	serviceMap := map[string]string{
		"serviceA": "http://localhost:8080",
	}
	d := NewStaticDiscovery(serviceMap)

	_, err := d.GetServiceURL("serviceB")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}
