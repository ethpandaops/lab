// Code generated by protoc-gen-go-grpc. DO NOT EDIT.
// versions:
// - protoc-gen-go-grpc v1.5.1
// - protoc             (unknown)
// source: pkg/srv/proto/beacon_chain_timings/beacon_chain_timings.proto

package beacon_chain_timings

import (
	context "context"
	grpc "google.golang.org/grpc"
	codes "google.golang.org/grpc/codes"
	status "google.golang.org/grpc/status"
)

// This is a compile-time assertion to ensure that this generated file
// is compatible with the grpc package it is being compiled against.
// Requires gRPC-Go v1.64.0 or later.
const _ = grpc.SupportPackageIsVersion9

const (
	BeaconChainTimingsService_GetTimingData_FullMethodName  = "/beacon_chain_timings.BeaconChainTimingsService/GetTimingData"
	BeaconChainTimingsService_GetSizeCDFData_FullMethodName = "/beacon_chain_timings.BeaconChainTimingsService/GetSizeCDFData"
)

// BeaconChainTimingsServiceClient is the client API for BeaconChainTimingsService service.
//
// For semantics around ctx use and closing/ending streaming RPCs, please refer to https://pkg.go.dev/google.golang.org/grpc/?tab=doc#ClientConn.NewStream.
//
// Service definitions
type BeaconChainTimingsServiceClient interface {
	// Get timing data for a specific network and time window
	GetTimingData(ctx context.Context, in *GetTimingDataRequest, opts ...grpc.CallOption) (*GetTimingDataResponse, error)
	// Get size CDF data for a specific network
	GetSizeCDFData(ctx context.Context, in *GetSizeCDFDataRequest, opts ...grpc.CallOption) (*GetSizeCDFDataResponse, error)
}

type beaconChainTimingsServiceClient struct {
	cc grpc.ClientConnInterface
}

func NewBeaconChainTimingsServiceClient(cc grpc.ClientConnInterface) BeaconChainTimingsServiceClient {
	return &beaconChainTimingsServiceClient{cc}
}

func (c *beaconChainTimingsServiceClient) GetTimingData(ctx context.Context, in *GetTimingDataRequest, opts ...grpc.CallOption) (*GetTimingDataResponse, error) {
	cOpts := append([]grpc.CallOption{grpc.StaticMethod()}, opts...)
	out := new(GetTimingDataResponse)
	err := c.cc.Invoke(ctx, BeaconChainTimingsService_GetTimingData_FullMethodName, in, out, cOpts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

func (c *beaconChainTimingsServiceClient) GetSizeCDFData(ctx context.Context, in *GetSizeCDFDataRequest, opts ...grpc.CallOption) (*GetSizeCDFDataResponse, error) {
	cOpts := append([]grpc.CallOption{grpc.StaticMethod()}, opts...)
	out := new(GetSizeCDFDataResponse)
	err := c.cc.Invoke(ctx, BeaconChainTimingsService_GetSizeCDFData_FullMethodName, in, out, cOpts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

// BeaconChainTimingsServiceServer is the server API for BeaconChainTimingsService service.
// All implementations must embed UnimplementedBeaconChainTimingsServiceServer
// for forward compatibility.
//
// Service definitions
type BeaconChainTimingsServiceServer interface {
	// Get timing data for a specific network and time window
	GetTimingData(context.Context, *GetTimingDataRequest) (*GetTimingDataResponse, error)
	// Get size CDF data for a specific network
	GetSizeCDFData(context.Context, *GetSizeCDFDataRequest) (*GetSizeCDFDataResponse, error)
	mustEmbedUnimplementedBeaconChainTimingsServiceServer()
}

// UnimplementedBeaconChainTimingsServiceServer must be embedded to have
// forward compatible implementations.
//
// NOTE: this should be embedded by value instead of pointer to avoid a nil
// pointer dereference when methods are called.
type UnimplementedBeaconChainTimingsServiceServer struct{}

func (UnimplementedBeaconChainTimingsServiceServer) GetTimingData(context.Context, *GetTimingDataRequest) (*GetTimingDataResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "method GetTimingData not implemented")
}
func (UnimplementedBeaconChainTimingsServiceServer) GetSizeCDFData(context.Context, *GetSizeCDFDataRequest) (*GetSizeCDFDataResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "method GetSizeCDFData not implemented")
}
func (UnimplementedBeaconChainTimingsServiceServer) mustEmbedUnimplementedBeaconChainTimingsServiceServer() {
}
func (UnimplementedBeaconChainTimingsServiceServer) testEmbeddedByValue() {}

// UnsafeBeaconChainTimingsServiceServer may be embedded to opt out of forward compatibility for this service.
// Use of this interface is not recommended, as added methods to BeaconChainTimingsServiceServer will
// result in compilation errors.
type UnsafeBeaconChainTimingsServiceServer interface {
	mustEmbedUnimplementedBeaconChainTimingsServiceServer()
}

func RegisterBeaconChainTimingsServiceServer(s grpc.ServiceRegistrar, srv BeaconChainTimingsServiceServer) {
	// If the following call pancis, it indicates UnimplementedBeaconChainTimingsServiceServer was
	// embedded by pointer and is nil.  This will cause panics if an
	// unimplemented method is ever invoked, so we test this at initialization
	// time to prevent it from happening at runtime later due to I/O.
	if t, ok := srv.(interface{ testEmbeddedByValue() }); ok {
		t.testEmbeddedByValue()
	}
	s.RegisterService(&BeaconChainTimingsService_ServiceDesc, srv)
}

func _BeaconChainTimingsService_GetTimingData_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(GetTimingDataRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(BeaconChainTimingsServiceServer).GetTimingData(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: BeaconChainTimingsService_GetTimingData_FullMethodName,
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(BeaconChainTimingsServiceServer).GetTimingData(ctx, req.(*GetTimingDataRequest))
	}
	return interceptor(ctx, in, info, handler)
}

func _BeaconChainTimingsService_GetSizeCDFData_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(GetSizeCDFDataRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(BeaconChainTimingsServiceServer).GetSizeCDFData(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: BeaconChainTimingsService_GetSizeCDFData_FullMethodName,
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(BeaconChainTimingsServiceServer).GetSizeCDFData(ctx, req.(*GetSizeCDFDataRequest))
	}
	return interceptor(ctx, in, info, handler)
}

// BeaconChainTimingsService_ServiceDesc is the grpc.ServiceDesc for BeaconChainTimingsService service.
// It's only intended for direct use with grpc.RegisterService,
// and not to be introspected or modified (even as a copy)
var BeaconChainTimingsService_ServiceDesc = grpc.ServiceDesc{
	ServiceName: "beacon_chain_timings.BeaconChainTimingsService",
	HandlerType: (*BeaconChainTimingsServiceServer)(nil),
	Methods: []grpc.MethodDesc{
		{
			MethodName: "GetTimingData",
			Handler:    _BeaconChainTimingsService_GetTimingData_Handler,
		},
		{
			MethodName: "GetSizeCDFData",
			Handler:    _BeaconChainTimingsService_GetSizeCDFData_Handler,
		},
	},
	Streams:  []grpc.StreamDesc{},
	Metadata: "pkg/srv/proto/beacon_chain_timings/beacon_chain_timings.proto",
}
