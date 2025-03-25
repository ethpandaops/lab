package srv

import (
	"fmt"
)

const (
	Name        = "lab.ethpandaops.io"
	ServiceName = "srv"
)

var (
	QualifiedName = fmt.Sprintf("%s.%s", ServiceName, Name)
)
