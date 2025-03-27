package ethereum

type Config struct {
	Networks map[string]*Network
}

type Network struct {
	Name         string
	GenesisTime  int64
	Forks        *Forks
	ValidatorSet *ValidatorSet
}

type Forks struct {
	Consensus map[string]*ConsensusFork
}

type ConsensusFork struct {
	MinClientVersions MinClientVersions
	Epoch             uint64
}

type MinClientVersions struct {
	Grandine   string
	Lighthouse string
	Lodestar   string
	Nimbus     string
	Prysm      string
	Teku       string
}

type ValidatorSet struct {
	KnownValidators map[string]string // index range -> entity name
}
