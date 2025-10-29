package state_analytics

import (
	"context"
	"fmt"
	"sort"

	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/state_analytics"
)

// GetHierarchicalState returns state organized hierarchically by category -> protocol -> contract
func (s *Service) GetHierarchicalState(
	ctx context.Context,
	req *pb.GetHierarchicalStateRequest,
) (*pb.GetHierarchicalStateResponse, error) {
	// Step 1: Get flat contract list with labels
	flatReq := &pb.GetContractStateCompositionRequest{
		Limit:         10000,
		MinSizeBytes:  0,
		IncludeLabels: true,
	}

	flatResp, err := s.GetContractStateComposition(ctx, flatReq)
	if err != nil {
		return nil, err
	}

	// Step 2: Set defaults for hierarchy parameters
	maxDepth := req.MaxDepth
	if maxDepth == 0 {
		maxDepth = 3 // Default: show all levels
	}

	contractsPerProtocol := req.ContractsPerProtocol
	if contractsPerProtocol == 0 {
		contractsPerProtocol = 20 // Default: show top 20 contracts per protocol
	}

	// Step 3: Build hierarchy
	root := buildHierarchy(flatResp.Contracts, maxDepth, contractsPerProtocol)

	return &pb.GetHierarchicalStateResponse{
		Root:        root,
		BlockNumber: flatResp.BlockNumber,
		Timestamp:   flatResp.Timestamp,
	}, nil
}

// buildHierarchy transforms flat contract list into hierarchical tree structure
func buildHierarchy(contracts []*pb.ContractStateEntry, maxDepth, contractsPerProtocol uint32) *pb.StateNode {
	// Create root node
	root := &pb.StateNode{
		Name:      "Ethereum State",
		Type:      "root",
		SizeBytes: 0,
		Children:  make([]*pb.StateNode, 0),
		Metadata:  make(map[string]string),
	}

	// Group by category
	categoryMap := make(map[string]*pb.StateNode)

	for _, contract := range contracts {
		category := contract.Category
		if category == "" {
			category = "Other"
		}

		// Get or create category node
		catNode, exists := categoryMap[category]
		if !exists {
			catNode = &pb.StateNode{
				Name:      category,
				Type:      "category",
				SizeBytes: 0,
				Children:  make([]*pb.StateNode, 0),
				Metadata:  map[string]string{"category": category},
			}
			categoryMap[category] = catNode
		}

		catNode.SizeBytes += contract.State.TotalBytes

		// If maxDepth >= 2, group by protocol
		if maxDepth >= 2 {
			protocol := contract.Protocol
			if protocol == "" {
				protocol = "Unknown"
			}

			// Find or create protocol node
			var protocolNode *pb.StateNode
			for _, child := range catNode.Children {
				if child.Name == protocol {
					protocolNode = child
					break
				}
			}

			if protocolNode == nil {
				protocolNode = &pb.StateNode{
					Name:      protocol,
					Type:      "protocol",
					SizeBytes: 0,
					Children:  make([]*pb.StateNode, 0),
					Metadata: map[string]string{
						"category": category,
						"protocol": protocol,
					},
				}
				catNode.Children = append(catNode.Children, protocolNode)
			}

			protocolNode.SizeBytes += contract.State.TotalBytes

			// If maxDepth >= 3, add individual contracts
			if maxDepth >= 3 {
				label := contract.Label
				if label == "" {
					label = fmt.Sprintf("%s...%s", contract.Address[:10], contract.Address[len(contract.Address)-8:])
				}

				contractNode := &pb.StateNode{
					Name:      label,
					Type:      "contract",
					SizeBytes: contract.State.TotalBytes,
					Metadata: map[string]string{
						"address":       contract.Address,
						"category":      category,
						"protocol":      protocol,
						"slot_count":    fmt.Sprintf("%d", contract.State.StorageSlotCount),
						"bytecode_size": fmt.Sprintf("%d", contract.State.BytecodeBytes),
					},
				}
				protocolNode.Children = append(protocolNode.Children, contractNode)
			}
		}
	}

	// Sort and limit children at each level
	for _, catNode := range categoryMap {
		root.SizeBytes += catNode.SizeBytes
		root.Children = append(root.Children, catNode)

		// Sort protocols by size
		sort.Slice(catNode.Children, func(i, j int) bool {
			return catNode.Children[i].SizeBytes > catNode.Children[j].SizeBytes
		})

		// Limit contracts per protocol
		for _, protocolNode := range catNode.Children {
			if uint32(len(protocolNode.Children)) > contractsPerProtocol {
				// Sort contracts by size
				sort.Slice(protocolNode.Children, func(i, j int) bool {
					return protocolNode.Children[i].SizeBytes > protocolNode.Children[j].SizeBytes
				})
				// Keep only top N contracts
				protocolNode.Children = protocolNode.Children[:contractsPerProtocol]
			}
		}
	}

	// Sort categories by size
	sort.Slice(root.Children, func(i, j int) bool {
		return root.Children[i].SizeBytes > root.Children[j].SizeBytes
	})

	return root
}
