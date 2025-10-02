package bitfield

import (
	"math/bits"
)

var _ = Bitfield(Bitvector8{})

// Bitvector8 is a bitfield with a fixed defined size of 8. There is no length bit
// present in the underlying byte array.
type Bitvector8 []byte

const bitvector8ByteSize = 1
const bitvector8BitSize = bitvector8ByteSize * 8

// NewBitvector8 creates a new bitvector of size 8.
func NewBitvector8() Bitvector8 {
	byteArray := [bitvector8ByteSize]byte{}
	return byteArray[:]
}

// BitAt returns the bit value at the given index. If the index requested
// exceeds the number of bits in the bitvector, then this method returns false.
func (b Bitvector8) BitAt(idx uint64) bool {
	// Out of bounds or incorrect bitvector byte size, must be false.
	if idx >= b.Len() || len(b) != bitvector8ByteSize {
		return false
	}

	i := uint8(1 << (idx % 8))
	return b[idx/8]&i == i
}

// SetBitAt will set the bit at the given index to the given value. If the index
// requested exceeds the number of bits in the bitvector, then this method returns
// false.
func (b Bitvector8) SetBitAt(idx uint64, val bool) {
	// Out of bounds, do nothing.
	if idx >= b.Len() || len(b) != bitvector8ByteSize {
		return
	}

	bit := uint8(1 << idx)
	if val {
		b[0] |= bit
	} else {
		b[0] &^= bit
	}
}

// Len returns the number of bits in the bitvector.
func (b Bitvector8) Len() uint64 {
	return bitvector8BitSize
}

// Count returns the number of 1s in the bitvector.
func (b Bitvector8) Count() uint64 {
	if len(b) == 0 {
		return 0
	}
	return uint64(bits.OnesCount8(b[0]))
}

// Bytes returns the bytes data representing the Bitvector8.
func (b Bitvector8) Bytes() []byte {
	if len(b) == 0 {
		return []byte{}
	}
	if len(b) > bitvector8ByteSize {
		ret := make([]byte, bitvector8ByteSize)
		copy(ret, b[:bitvector8ByteSize])
		return ret[:]
	}
	return b
}

// BitIndices returns the list of indices that are set to 1.
func (b Bitvector8) BitIndices() []int {
	indices := make([]int, 0, 8)
	for i, bt := range b {
		if i >= bitvector8ByteSize {
			break
		}
		for j := 0; j < 8; j++ {
			bit := byte(1 << uint(j))
			if bt&bit == bit {
				indices = append(indices, i*8+j)
			}
		}
	}

	return indices
}

// Contains returns true if the bitlist contains all of the bits from the provided argument
// bitlist. This method will return an error if bitlists are not the same length or not `bitvector8BitSize`.
func (b Bitvector8) Contains(c Bitvector8) (bool, error) {
	if b.Len() != c.Len() {
		return false, ErrBitvectorDifferentLength
	}
	if b.Len() != bitvector8BitSize {
		return false, ErrWrongLen
	}

	// Combine the byte from b and c, then XOR them against b. If the result of this is non-zero, then we
	// are assured that a byte in c had bits not present in b.
	return b[0]^(b[0]|c[0]) == 0, nil
}

// Overlaps returns true if the bitlist contains one of the bits from the provided argument
// bitlist. This method will return an error if bitlists are not the same length.
func (b Bitvector8) Overlaps(c Bitvector8) (bool, error) {
	if b.Len() != c.Len() {
		return false, ErrBitvectorDifferentLength
	}
	if b.Len() != bitvector8BitSize {
		return false, ErrWrongLen
	}

	// Invert b and xor the byte from b and c, then and it against c. If the result is non-zero, then
	// we can be assured that byte in c had bits not overlapped in b.
	mask := uint8(0xFF)
	return (^b[0]^c[0])&c[0]&mask != 0, nil
}

// Or returns the OR result of the two bitfields. This method will return an error if the bitlists are not the same length.
func (b Bitvector8) Or(c Bitvector8) (Bitvector8, error) {
	if b.Len() != c.Len() {
		return nil, ErrBitvectorDifferentLength
	}
	if b.Len() != bitvector8BitSize {
		return nil, ErrWrongLen
	}

	return []byte{b[0] | c[0]}, nil
}
