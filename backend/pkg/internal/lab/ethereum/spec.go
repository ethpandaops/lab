package ethereum

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/sirupsen/logrus"
	"gopkg.in/yaml.v3"
)

// Spec represents the Ethereum network specification
type Spec struct {
	// Base
	PresetBase string `yaml:"PRESET_BASE"`
	ConfigName string `yaml:"CONFIG_NAME"`

	// Genesis
	MinGenesisActiveValidatorCount uint64 `yaml:"MIN_GENESIS_ACTIVE_VALIDATOR_COUNT"`
	MinGenesisTime                 uint64 `yaml:"MIN_GENESIS_TIME"`
	GenesisForkVersion             string `yaml:"GENESIS_FORK_VERSION"`
	GenesisDelay                   uint64 `yaml:"GENESIS_DELAY"`

	// Forking
	AltairForkVersion    string `yaml:"ALTAIR_FORK_VERSION"`
	AltairForkEpoch      uint64 `yaml:"ALTAIR_FORK_EPOCH"`
	BellatrixForkVersion string `yaml:"BELLATRIX_FORK_VERSION"`
	BellatrixForkEpoch   uint64 `yaml:"BELLATRIX_FORK_EPOCH"`
	CapellaForkVersion   string `yaml:"CAPELLA_FORK_VERSION"`
	CapellaForkEpoch     uint64 `yaml:"CAPELLA_FORK_EPOCH"`
	DenebForkVersion     string `yaml:"DENEB_FORK_VERSION"`
	DenebForkEpoch       uint64 `yaml:"DENEB_FORK_EPOCH"`
	ElectraForkVersion   string `yaml:"ELECTRA_FORK_VERSION"`
	ElectraForkEpoch     uint64 `yaml:"ELECTRA_FORK_EPOCH"`

	// Time parameters
	SecondsPerSlot                   uint64 `yaml:"SECONDS_PER_SLOT"`
	SecondsPerETH1Block              uint64 `yaml:"SECONDS_PER_ETH1_BLOCK"`
	MinValidatorWithdrawabilityDelay uint64 `yaml:"MIN_VALIDATOR_WITHDRAWABILITY_DELAY"`
	ShardCommitteePeriod             uint64 `yaml:"SHARD_COMMITTEE_PERIOD"`
	ETH1FollowDistance               uint64 `yaml:"ETH1_FOLLOW_DISTANCE"`

	// Validator cycle
	InactivityScoreBias             uint64 `yaml:"INACTIVITY_SCORE_BIAS"`
	InactivityScoreRecoveryRate     uint64 `yaml:"INACTIVITY_SCORE_RECOVERY_RATE"`
	EjectionBalance                 uint64 `yaml:"EJECTION_BALANCE"`
	MinPerEpochChurnLimit           uint64 `yaml:"MIN_PER_EPOCH_CHURN_LIMIT"`
	ChurnLimitQuotient              uint64 `yaml:"CHURN_LIMIT_QUOTIENT"`
	MaxPerEpochActivationChurnLimit uint64 `yaml:"MAX_PER_EPOCH_ACTIVATION_CHURN_LIMIT"`

	// Fork choice
	ProposerScoreBoost              uint64 `yaml:"PROPOSER_SCORE_BOOST"`
	ReorgHeadWeightThreshold        uint64 `yaml:"REORG_HEAD_WEIGHT_THRESHOLD"`
	ReorgParentWeightThreshold      uint64 `yaml:"REORG_PARENT_WEIGHT_THRESHOLD"`
	ReorgMaxEpochsSinceFinalization uint64 `yaml:"REORG_MAX_EPOCHS_SINCE_FINALIZATION"`

	// Deposit contract
	DepositChainID         uint64 `yaml:"DEPOSIT_CHAIN_ID"`
	DepositNetworkID       uint64 `yaml:"DEPOSIT_NETWORK_ID"`
	DepositContractAddress string `yaml:"DEPOSIT_CONTRACT_ADDRESS"`

	// Networking
	MaxPayloadSize                  uint64 `yaml:"MAX_PAYLOAD_SIZE"`
	MaxRequestBlocks                uint64 `yaml:"MAX_REQUEST_BLOCKS"`
	EpochsPerSubnetSubscription     uint64 `yaml:"EPOCHS_PER_SUBNET_SUBSCRIPTION"`
	MinEpochsForBlockRequests       uint64 `yaml:"MIN_EPOCHS_FOR_BLOCK_REQUESTS"`
	TtfbTimeout                     uint64 `yaml:"TTFB_TIMEOUT"`
	RespTimeout                     uint64 `yaml:"RESP_TIMEOUT"`
	AttestationPropagationSlotRange uint64 `yaml:"ATTESTATION_PROPAGATION_SLOT_RANGE"`
	MaximumGossipClockDisparity     uint64 `yaml:"MAXIMUM_GOSSIP_CLOCK_DISPARITY"`
	MessageDomainInvalidSnappy      string `yaml:"MESSAGE_DOMAIN_INVALID_SNAPPY"`
	MessageDomainValidSnappy        string `yaml:"MESSAGE_DOMAIN_VALID_SNAPPY"`
	SubnetsPerNode                  uint64 `yaml:"SUBNETS_PER_NODE"`
	AttestationSubnetCount          uint64 `yaml:"ATTESTATION_SUBNET_COUNT"`
	AttestationSubnetExtraBits      uint64 `yaml:"ATTESTATION_SUBNET_EXTRA_BITS"`
	AttestationSubnetPrefixBits     uint64 `yaml:"ATTESTATION_SUBNET_PREFIX_BITS"`

	// Deneb
	MaxRequestBlocksDeneb            uint64 `yaml:"MAX_REQUEST_BLOCKS_DENEB"`
	MaxRequestBlobSidecars           uint64 `yaml:"MAX_REQUEST_BLOB_SIDECARS"`
	MinEpochsForBlobSidecarsRequests uint64 `yaml:"MIN_EPOCHS_FOR_BLOB_SIDECARS_REQUESTS"`
	BlobSidecarSubnetCount           uint64 `yaml:"BLOB_SIDECAR_SUBNET_COUNT"`
	MaxBlobsPerBlock                 uint64 `yaml:"MAX_BLOBS_PER_BLOCK"`

	// Electra
	MinPerEpochChurnLimitElectra        uint64 `yaml:"MIN_PER_EPOCH_CHURN_LIMIT_ELECTRA"`
	MaxPerEpochActivationExitChurnLimit uint64 `yaml:"MAX_PER_EPOCH_ACTIVATION_EXIT_CHURN_LIMIT"`
	BlobSidecarSubnetCountElectra       uint64 `yaml:"BLOB_SIDECAR_SUBNET_COUNT_ELECTRA"`
	MaxBlobsPerBlockElectra             uint64 `yaml:"MAX_BLOBS_PER_BLOCK_ELECTRA"`
	MaxRequestBlobSidecarsElectra       uint64 `yaml:"MAX_REQUEST_BLOB_SIDECARS_ELECTRA"`
}

// FetchSpecFromURLWithContext fetches and parses the Ethereum network specification from a URL with context
func FetchSpecFromURLWithContext(ctx context.Context, url string) (*Spec, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, http.NoBody)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	client := &http.Client{}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch spec from URL: %w", err)
	}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch spec from URL, got status code: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var spec Spec
	if err := yaml.Unmarshal(body, &spec); err != nil {
		return nil, fmt.Errorf("failed to unmarshal spec: %w", err)
	}

	return &spec, nil
}

// FetchSpecFromURL fetches and parses the Ethereum network specification from a URL
func FetchSpecFromURL(url string) (*Spec, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	return FetchSpecFromURLWithContext(ctx, url)
}

// GetPresetBase returns the preset base of the spec
func (s *Spec) GetPresetBase() string {
	return s.PresetBase
}

// GetConfigName returns the config name of the spec
func (s *Spec) GetConfigName() string {
	return s.ConfigName
}

// GetSecondsPerSlot returns the seconds per slot of the spec
func (s *Spec) GetSecondsPerSlot() uint64 {
	return s.SecondsPerSlot
}

// GetGenesisTimestamp returns the genesis timestamp of the spec
func (s *Spec) GetGenesisTimestamp() uint64 {
	return s.MinGenesisTime
}

// GetSlotsPerEpoch returns the slots per epoch of the preset (fixed at 32 for now)
func (s *Spec) GetSlotsPerEpoch() uint64 {
	return 32 // This is a consensus constant
}

// GetElectraForkEpoch returns the epoch number when Electra fork is activated
func (s *Spec) GetElectraForkEpoch() uint64 {
	return s.ElectraForkEpoch
}

// IsForkActive checks if a specific fork is active at the given epoch
func (s *Spec) IsForkActive(fork string, epoch uint64) bool {
	switch fork {
	case "altair":
		return epoch >= s.AltairForkEpoch
	case "bellatrix", "merge":
		return epoch >= s.BellatrixForkEpoch
	case "capella":
		return epoch >= s.CapellaForkEpoch
	case "deneb":
		return epoch >= s.DenebForkEpoch
	case "electra":
		return epoch >= s.ElectraForkEpoch
	default:
		return false
	}
}

// Log logs the important spec values
func (s *Spec) Log(log *logrus.Logger) {
	log.WithFields(logrus.Fields{
		"preset":           s.PresetBase,
		"config":           s.ConfigName,
		"secondsPerSlot":   s.SecondsPerSlot,
		"genesisTimestamp": s.MinGenesisTime,
	}).Info("Loaded Ethereum network specification")
}
