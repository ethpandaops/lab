package bitfield

import (
	"encoding/binary"
	"math/bits"
)

var _ = Bitfield(Bitvector512{})

// Bitvector512 is a bitfield with a fixed defined size of 512. There is no length bit
// present in the underlying byte array.
type Bitvector512 []byte

const bitvector512ByteSize = 64
const bitvector512BitSize = bitvector512ByteSize * 8

// NewBitvector512 creates a new bitvector of size 512.
func NewBitvector512() Bitvector512 {
	byteArray := [bitvector512ByteSize]byte{}
	return byteArray[:]
}

// BitAt returns the bit value at the given index. If the index requested
// exceeds the number of bits in the bitvector, then this method returns false.
func (b Bitvector512) BitAt(idx uint64) bool {
	// Out of bounds, must be false.
	if idx >= b.Len() || len(b) != bitvector512ByteSize {
		return false
	}

	i := uint8(1 << (idx % 8))
	return b[idx/8]&i == i
}

// SetBitAt will set the bit at the given index to the given value. If the index
// requested exceeds the number of bits in the bitvector, then this method returns
// false.
func (b Bitvector512) SetBitAt(idx uint64, val bool) {
	// Out of bounds, do nothing.
	if idx >= b.Len() || len(b) != bitvector512ByteSize {
		return
	}

	bit := uint8(1 << (idx % 8))
	if val {
		b[idx/8] |= bit
	} else {
		b[idx/8] &^= bit
	}
}

// Len returns the number of bits in the bitvector.
func (b Bitvector512) Len() uint64 {
	return bitvector512BitSize
}

// Count returns the number of 1s in the bitvector.
func (b Bitvector512) Count() uint64 {
	if len(b) == 0 {
		return 0
	}
	c := 0
	for i, bt := range b {
		if i >= bitvector512ByteSize {
			break
		}
		c += bits.OnesCount8(bt)
	}
	return uint64(c)
}

// Bytes returns the bytes data representing the Bitvector512.
func (b Bitvector512) Bytes() []byte {
	if len(b) == 0 {
		return []byte{}
	}
	ln := min(len(b), bitvector512ByteSize)
	ret := make([]byte, ln)
	copy(ret, b[:ln])
	return ret[:]
}

// Shift bitvector by i. If i >= 0, perform left shift, otherwise right shift.
func (b Bitvector512) Shift(i int) {
	if len(b) == 0 {
		return
	}

	// Shifting greater than 1024 bits is pointless and can have unexpected behavior.
	if i > bitvector512BitSize {
		i = bitvector512BitSize
	} else if i < -bitvector512BitSize {
		i = -bitvector512BitSize
	}
	if i >= 0 {
		num := binary.BigEndian.Uint64(b)
		num <<= uint8(i)
		binary.BigEndian.PutUint64(b, num)
	} else {
		num := binary.BigEndian.Uint64(b)
		num >>= uint8(i * -1)
		binary.BigEndian.PutUint64(b, num)
	}
}

// BitIndices returns the list of indices that are set to 1.
func (b Bitvector512) BitIndices() []int {
	indices := make([]int, 0, bitvector512BitSize)
	for i, bt := range b {
		if i >= bitvector512ByteSize {
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
