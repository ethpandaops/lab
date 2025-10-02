package bitfield

import (
	"math/bits"
)

var _ = Bitfield(Bitvector4{})

// Bitvector4 is a bitfield with a known size of 4. There is no length bit
// present in the underlying byte array.
type Bitvector4 []byte

const bitvector4ByteSize = 1
const bitvector4BitSize = 4

// NewBitvector4 creates a new bitvector of size 4.
func NewBitvector4() Bitvector4 {
	byteArray := [bitvector4ByteSize]byte{}
	return byteArray[:]
}

// BitAt returns the bit value at the given index. If the index requested
// exceeds the number of bits in the bitvector, then this method returns false.
func (b Bitvector4) BitAt(idx uint64) bool {
	// Out of bounds, must be false.
	if idx >= b.Len() || len(b) != bitvector4ByteSize {
		return false
	}

	i := uint8(1 << idx)
	return b[0]&i == i

}

// SetBitAt will set the bit at the given index to the given value. If the index
// requested exceeds the number of bits in the bitvector, then this method returns
// false.
func (b Bitvector4) SetBitAt(idx uint64, val bool) {
	// Out of bounds, do nothing.
	if idx >= b.Len() || len(b) != bitvector4ByteSize {
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
func (b Bitvector4) Len() uint64 {
	return bitvector4BitSize
}

// Count returns the number of 1s in the bitvector.
func (b Bitvector4) Count() uint64 {
	if len(b) == 0 {
		return 0
	}
	return uint64(bits.OnesCount8(b.Bytes()[0]))
}

// Bytes returns the bytes data representing the bitvector4. This method
// bitmasks the underlying data to ensure that it is an accurate representation.
func (b Bitvector4) Bytes() []byte {
	if len(b) == 0 {
		return []byte{}
	}
	return []byte{b[0] & 0x0F}
}

// Shift bitvector by i. If i >= 0, perform left shift, otherwise right shift.
func (b Bitvector4) Shift(i int) {
	if len(b) == 0 {
		return
	}

	// Shifting greater than 4 bits is pointless and can have unexpected behavior.
	if i > 4 {
		i = 4
	} else if i < -4 {
		i = -4
	}

	if i >= 0 {
		b[0] <<= uint8(i)
	} else {
		b[0] >>= uint8(i * -1)
	}
	b[0] &= 0x0F
}

// BitIndices returns the list of indices that are set to 1.
func (b Bitvector4) BitIndices() []int {
	indices := make([]int, 0, 4)
	for i, bt := range b {
		for j := 0; j < 8; j++ {
			bit := byte(1 << uint(j))
			if bt&bit == bit {
				indices = append(indices, i*8+j)
			}
		}
	}

	return indices
}
