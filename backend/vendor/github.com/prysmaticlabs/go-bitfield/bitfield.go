package bitfield

// Bitfield is the abstraction implemented by Bitlist or BitvectorN.
type Bitfield interface {
	// BitAt returns true if the bit at the given index is 1.
	BitAt(idx uint64) bool
	// SetBitAt sets the bit at the given index to val.
	SetBitAt(idx uint64, val bool)
	// Len returns the length of the bitfield.
	Len() uint64
	// Count returns the number of 1s in the bitfield.
	Count() uint64
	// Bytes returns the bytes value of the bitfield, without the length bit.
	Bytes() []byte
	// BitIndices returns the indices which have a 1.
	BitIndices() []int
}
