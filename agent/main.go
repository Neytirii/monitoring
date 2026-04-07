package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/neytirii/monitoring-agent/collector"
	"github.com/neytirii/monitoring-agent/sender"
)

func main() {
	serverURL := getEnv("SERVER_URL", "http://localhost:3000")
	agentToken := getEnv("AGENT_TOKEN", "")
	hostID := getEnv("HOST_ID", "")
	collectIntervalStr := getEnv("COLLECT_INTERVAL", "10")

	if agentToken == "" {
		log.Fatal("AGENT_TOKEN environment variable is required")
	}

	collectInterval, err := strconv.Atoi(collectIntervalStr)
	if err != nil || collectInterval < 1 {
		collectInterval = 10
	}

	s := sender.New(serverURL, agentToken, hostID)

	if hostID == "" {
		hostname, _ := os.Hostname()
		info, err := s.Register(hostname)
		if err != nil {
			log.Fatalf("Failed to register agent: %v", err)
		}
		hostID = info.HostID
		agentToken = info.AgentToken
		s = sender.New(serverURL, agentToken, hostID)
		fmt.Printf("Registered as host ID: %s\n", hostID)
	}

	ticker := time.NewTicker(time.Duration(collectInterval) * time.Second)
	defer ticker.Stop()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)

	log.Printf("Monitoring agent started. Server: %s, Host ID: %s, Interval: %ds",
		serverURL, hostID, collectInterval)

	for {
		select {
		case <-ticker.C:
			metrics, err := collector.Collect()
			if err != nil {
				log.Printf("Collection error: %v", err)
				continue
			}

			if err := s.Send(metrics); err != nil {
				log.Printf("Send error: %v", err)
			}

		case sig := <-quit:
			log.Printf("Received signal %v, shutting down...", sig)
			return
		}
	}
}

func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}
