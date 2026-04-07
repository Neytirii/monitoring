package collector

import (
	"fmt"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
)

// Metric represents a single collected data point.
type Metric struct {
	Name  string            `json:"name"`
	Value float64           `json:"value"`
	Tags  map[string]string `json:"tags"`
}

// Collect gathers all system metrics and returns them as a slice.
func Collect() ([]Metric, error) {
	var metrics []Metric
	var errs []error

	// CPU usage
	cpuPercents, err := cpu.Percent(0, false)
	if err != nil {
		errs = append(errs, fmt.Errorf("cpu: %w", err))
	} else if len(cpuPercents) > 0 {
		metrics = append(metrics, Metric{
			Name:  "cpu.usage_percent",
			Value: cpuPercents[0],
			Tags:  map[string]string{},
		})
	}

	// Memory
	vmStat, err := mem.VirtualMemory()
	if err != nil {
		errs = append(errs, fmt.Errorf("mem: %w", err))
	} else {
		metrics = append(metrics,
			Metric{Name: "mem.used_percent", Value: vmStat.UsedPercent, Tags: map[string]string{}},
			Metric{Name: "mem.used_bytes", Value: float64(vmStat.Used), Tags: map[string]string{}},
			Metric{Name: "mem.total_bytes", Value: float64(vmStat.Total), Tags: map[string]string{}},
		)
	}

	// Disk usage for root partition
	diskStat, err := disk.Usage("/")
	if err != nil {
		errs = append(errs, fmt.Errorf("disk: %w", err))
	} else {
		metrics = append(metrics, Metric{
			Name:  "disk.used_percent",
			Value: diskStat.UsedPercent,
			Tags:  map[string]string{"path": "/"},
		})
	}

	// Network I/O (aggregate across all interfaces)
	netStats, err := net.IOCounters(false)
	if err != nil {
		errs = append(errs, fmt.Errorf("net: %w", err))
	} else if len(netStats) > 0 {
		metrics = append(metrics,
			Metric{
				Name:  "net.bytes_sent",
				Value: float64(netStats[0].BytesSent),
				Tags:  map[string]string{},
			},
			Metric{
				Name:  "net.bytes_recv",
				Value: float64(netStats[0].BytesRecv),
				Tags:  map[string]string{},
			},
		)
	}

	if len(errs) > 0 && len(metrics) == 0 {
		return nil, fmt.Errorf("all collectors failed: %v", errs)
	}

	return metrics, nil
}
