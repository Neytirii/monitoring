package sender

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"time"

	"github.com/neytirii/monitoring-agent/collector"
)

const maxRetries = 3

// Sender handles communication with the monitoring server.
type Sender struct {
	serverURL  string
	agentToken string
	hostID     string
	client     *http.Client
}

// RegisterResponse holds data returned after agent registration.
type RegisterResponse struct {
	HostID     string `json:"hostId"`
	AgentToken string `json:"agentToken"`
}

type registerRequest struct {
	Hostname  string `json:"hostname"`
	OS        string `json:"os,omitempty"`
	IPAddress string `json:"ipAddress,omitempty"`
}

type ingestRequest struct {
	HostID    string           `json:"host_id"`
	Metrics   []metricPayload  `json:"metrics"`
	Timestamp string           `json:"timestamp"`
}

type metricPayload struct {
	Name  string            `json:"name"`
	Value float64           `json:"value"`
	Tags  map[string]string `json:"tags"`
}

// New creates a new Sender instance.
func New(serverURL, agentToken, hostID string) *Sender {
	return &Sender{
		serverURL:  serverURL,
		agentToken: agentToken,
		hostID:     hostID,
		client: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

// Register registers the agent with the server and retrieves host credentials.
func (s *Sender) Register(hostname string) (*RegisterResponse, error) {
	body := registerRequest{Hostname: hostname}

	data, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshal register request: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, s.serverURL+"/api/v1/agent/register", bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("create register request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.agentToken)

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("register request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			return nil, fmt.Errorf("register failed with status %d (could not read response body: %w)", resp.StatusCode, readErr)
		}
		return nil, fmt.Errorf("register failed with status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var result struct {
		Host struct {
			ID string `json:"id"`
		} `json:"host"`
		AgentToken string `json:"agentToken"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode register response: %w", err)
	}

	return &RegisterResponse{
		HostID:     result.Host.ID,
		AgentToken: result.AgentToken,
	}, nil
}

// Send posts a batch of metrics to the server, retrying on failure.
func (s *Sender) Send(metrics []collector.Metric) error {
	payload := ingestRequest{
		HostID:    s.hostID,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}

	for _, m := range metrics {
		tags := m.Tags
		if tags == nil {
			tags = map[string]string{}
		}
		payload.Metrics = append(payload.Metrics, metricPayload{
			Name:  m.Name,
			Value: m.Value,
			Tags:  tags,
		})
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal ingest payload: %w", err)
	}

	var lastErr error
	for attempt := 0; attempt < maxRetries; attempt++ {
		if attempt > 0 {
			backoff := time.Duration(math.Pow(2, float64(attempt))) * time.Second
			time.Sleep(backoff)
		}

		req, err := http.NewRequest(http.MethodPost, s.serverURL+"/api/v1/agent/ingest", bytes.NewReader(data))
		if err != nil {
			lastErr = fmt.Errorf("create ingest request: %w", err)
			continue
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+s.agentToken)

		resp, err := s.client.Do(req)
		if err != nil {
			lastErr = fmt.Errorf("ingest request attempt %d: %w", attempt+1, err)
			continue
		}
		resp.Body.Close()

		if resp.StatusCode == http.StatusNoContent || resp.StatusCode == http.StatusOK {
			return nil
		}

		lastErr = fmt.Errorf("ingest returned status %d on attempt %d", resp.StatusCode, attempt+1)
	}

	return fmt.Errorf("all %d attempts failed, last error: %w", maxRetries, lastErr)
}
