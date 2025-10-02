// Package bitfield is an abstraction type for bitfield operations.
//
// A bitfield is also known as a Bitlist or BitvectorN in Ethereum 2.0 spec.
// Both variants are static arrays in that they cannot dynamically change in
// size after being constructed. These data types represent a list of bits whose
// value is treated akin to a boolean. The bits are in little endian order.
//
//	BitvectorN - A list of bits that is fixed in size.
//	Bitlist - A list of bits that is determined at runtime.
//
// The key difference between a bitvector and a bitlist is how they track the
// number of bits in the array. A bitvectorN is known to have N bits at compile
// time, so the length is always N no matter how the bitvector is instantiated.
// Whereas the bitlist can be created with size N at runtime. The bitlist uses
// the most significant bit in little endian order to indicate the start of the
// bitlist while in the byte representation.
package bitfield
