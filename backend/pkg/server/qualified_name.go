package srv

import (
	"fmt"
)

const (
	Name        = "lab.ethpandaops.io"
	ServiceName = "server"
)

var (
	QualifiedName = fmt.Sprintf("%s.%s", ServiceName, Name)
)
