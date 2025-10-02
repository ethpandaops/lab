package bitfield

import "errors"

var (
	ErrBitlistDifferentLength   = errors.New("bitlists are different lengths")
	ErrBitvectorDifferentLength = errors.New("bitvectors are different lengths")
	ErrWrongLen                 = errors.New("bitvector is wrong length")
)
