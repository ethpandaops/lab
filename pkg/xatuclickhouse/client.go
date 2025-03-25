package xatuclickhouse

import (
	"context"
	"fmt"
	"reflect"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// XatuClickhouse provides a strongly-typed client for interacting with Xatu ClickHouse data.
type XatuClickhouse struct {
	client driver.Conn
}

// NewXatuClickhouse creates a new XatuClickhouse client using the provided ClickHouse client.
func NewXatuClickhouse(client driver.Conn) *XatuClickhouse {
	return &XatuClickhouse{
		client: client,
	}
}

// QueryParams defines the interface for query parameters
type QueryParams interface {
	GetLimit() *uint64
	GetOffset() *uint64
}

// BaseQueryParams provides a base implementation of QueryParams
type BaseQueryParams struct {
	Limit  *uint64
	Offset *uint64
}

// GetLimit returns the limit parameter
func (p BaseQueryParams) GetLimit() *uint64 {
	return p.Limit
}

// GetOffset returns the offset parameter
func (p BaseQueryParams) GetOffset() *uint64 {
	return p.Offset
}

// TableNamer provides the table name for a model
type TableNamer interface {
	TableName() string
}

// Model is a type for all table models that provide a TableName() method
type Model interface {
	TableName() string
}

// ModelCreator is a function that creates a new instance of a model
type ModelCreator func() Model

// QueryOptions provides optional parameters for customizing queries
type QueryOptions struct {
	// Select specifies columns to select (empty means SELECT *)
	Select []string

	// GroupBy specifies columns for GROUP BY
	GroupBy []string

	// OrderBy specifies columns and direction for ORDER BY
	// Format: "column_name ASC" or "column_name DESC"
	OrderBy []string

	// Aggregations specifies aggregation functions to apply
	// Format: "function(column) as alias"
	// Example: "MAX(slot) as max_slot"
	Aggregations []string
}

// QueryWithModel executes a query against a table using a model creator function
func (x *XatuClickhouse) QueryWithModel(
	ctx context.Context,
	modelCreator ModelCreator,
	params interface{},
) ([]Model, error) {
	// Create an instance of the model to get the table name
	model := modelCreator()
	tableName := model.TableName()

	// Extract conditions from params
	conditions := ExtractConditions(params)

	// Get limit and offset
	limit := getLimitFromAny(params)
	offset := getOffsetFromAny(params)

	// Build the query
	query, args := x.buildGenericQuery(tableName, conditions, limit, offset, nil)

	// Execute the query
	rows, err := x.client.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query %s: %w", tableName, err)
	}
	defer rows.Close()

	// Process the results
	results := []Model{}

	for rows.Next() {
		result := modelCreator()
		if err := rows.ScanStruct(&result); err != nil {
			return nil, fmt.Errorf("failed to scan result: %w", err)
		}
		results = append(results, result)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	return results, nil
}

// QueryWithModelAndOptions executes a query with custom options like aggregations and GROUP BY
func (x *XatuClickhouse) QueryWithModelAndOptions(
	ctx context.Context,
	modelCreator ModelCreator,
	params interface{},
	options *QueryOptions,
) ([]Model, error) {
	// Create an instance of the model to get the table name
	model := modelCreator()
	tableName := model.TableName()

	// Extract conditions from params
	conditions := ExtractConditions(params)

	// Get limit and offset
	limit := getLimitFromAny(params)
	offset := getOffsetFromAny(params)

	// Build the query
	query, args := x.buildGenericQuery(tableName, conditions, limit, offset, options)

	// Execute the query
	rows, err := x.client.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query %s: %w", tableName, err)
	}
	defer rows.Close()

	// Process the results
	results := []Model{}

	for rows.Next() {
		result := modelCreator()
		if err := rows.ScanStruct(&result); err != nil {
			return nil, fmt.Errorf("failed to scan result: %w", err)
		}
		results = append(results, result)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	return results, nil
}

// ExecuteAggregateQuery executes an aggregate query and returns the results
func (x *XatuClickhouse) ExecuteAggregateQuery(
	ctx context.Context,
	tableName string,
	aggregations []string,
	groupBy []string,
	conditions map[string]interface{},
	limit *uint64,
) (interface{}, error) {
	// Build query options
	options := &QueryOptions{
		Aggregations: aggregations,
		GroupBy:      groupBy,
	}

	// Build the query
	query, args := x.buildGenericQuery(tableName, conditions, limit, nil, options)

	// Execute the query directly
	rows, err := x.client.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to execute aggregate query: %w", err)
	}
	defer rows.Close()

	// For simplicity, just return the first row, first column value for single aggregates
	if len(aggregations) == 1 && len(groupBy) == 0 {
		if rows.Next() {
			var result interface{}
			if err := rows.Scan(&result); err != nil {
				return nil, fmt.Errorf("failed to scan result: %w", err)
			}
			return result, nil
		}
		return nil, nil // No results
	}

	// For more complex queries, return all rows as a slice of maps
	type resultRow struct {
		Values []interface{}
	}

	resultRows := []resultRow{}
	columnCount := len(aggregations) + len(groupBy)

	for rows.Next() {
		values := make([]interface{}, columnCount)
		scanArgs := make([]interface{}, columnCount)

		// Create pointers to scan into
		for i := range values {
			scanArgs[i] = &values[i]
		}

		if err := rows.Scan(scanArgs...); err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}

		// Extract values from pointers
		rowValues := make([]interface{}, columnCount)
		for i, v := range scanArgs {
			rowValues[i] = *v.(*interface{})
		}

		resultRows = append(resultRows, resultRow{Values: rowValues})
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	return resultRows, nil
}

// ExecuteAggregate provides a simple way to execute an aggregate function
func (x *XatuClickhouse) ExecuteAggregate(
	ctx context.Context,
	tableName string,
	aggregateFunc string,
	column string,
	conditions map[string]interface{},
) (interface{}, error) {
	// Build the aggregate expression
	aggregate := fmt.Sprintf("%s(%s)", aggregateFunc, column)

	// Build query options
	options := &QueryOptions{
		Aggregations: []string{aggregate},
	}

	// Build the query
	query, args := x.buildGenericQuery(tableName, conditions, nil, nil, options)

	// Execute the query directly
	rows, err := x.client.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to execute aggregate query: %w", err)
	}
	defer rows.Close()

	// Get the single result
	if rows.Next() {
		var result interface{}
		if err := rows.Scan(&result); err != nil {
			return nil, fmt.Errorf("failed to scan result: %w", err)
		}
		return result, nil
	}

	return nil, nil // No results
}

// GroupByAggregate executes an aggregation with a GROUP BY clause
func (x *XatuClickhouse) GroupByAggregate(
	ctx context.Context,
	tableName string,
	aggregateFunc string,
	aggregateColumn string,
	groupByColumns []string,
	conditions map[string]interface{},
	limit *uint64,
) ([][]interface{}, error) {
	// Build the aggregate expression
	aggregate := fmt.Sprintf("%s(%s)", aggregateFunc, aggregateColumn)

	// Build query options
	options := &QueryOptions{
		Aggregations: []string{aggregate},
		GroupBy:      groupByColumns,
	}

	// Build the query
	query, args := x.buildGenericQuery(tableName, conditions, limit, nil, options)

	// Execute the query directly
	rows, err := x.client.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to execute group by query: %w", err)
	}
	defer rows.Close()

	// Get the results
	results := [][]interface{}{}
	colCount := len(groupByColumns) + 1 // group by columns + aggregate

	for rows.Next() {
		// Create a slice to hold the values for this row
		row := make([]interface{}, colCount)
		rowPtrs := make([]interface{}, colCount)

		// Create pointers for scanning
		for i := range row {
			rowPtrs[i] = &row[i]
		}

		// Scan the row
		if err := rows.Scan(rowPtrs...); err != nil {
			return nil, fmt.Errorf("failed to scan row: %w", err)
		}

		// Add the row to the results
		results = append(results, row)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	return results, nil
}

// buildGenericQuery builds a SQL query with conditions, limit, and offset
func (x *XatuClickhouse) buildGenericQuery(
	tableName string,
	conditions map[string]interface{},
	limit, offset *uint64,
	options *QueryOptions,
) (string, []interface{}) {
	// Build the SELECT clause
	var selectClause string
	if options == nil || (len(options.Select) == 0 && len(options.Aggregations) == 0) {
		selectClause = "SELECT *"
	} else {
		// Combine regular columns and aggregations
		var selectParts []string

		// Add regular columns
		if len(options.Select) > 0 {
			selectParts = append(selectParts, options.Select...)
		}

		// Add aggregations
		if len(options.Aggregations) > 0 {
			selectParts = append(selectParts, options.Aggregations...)
		}

		selectClause = "SELECT " + strings.Join(selectParts, ", ")
	}

	// Build the full query
	query := fmt.Sprintf("%s FROM %s", selectClause, tableName)

	var whereConditions []string
	var args []interface{}

	// Add conditions to the query
	for column, value := range conditions {
		// Handle nil pointer values
		if reflect.ValueOf(value).Kind() == reflect.Ptr && reflect.ValueOf(value).IsNil() {
			continue
		}

		// Handle range conditions (StartX, EndX, MinX, MaxX)
		if strings.HasPrefix(column, "Start") {
			actualColumn := strings.TrimPrefix(column, "Start")
			whereConditions = append(whereConditions, toSnakeCase(actualColumn)+" >= ?")
			args = append(args, value)
		} else if strings.HasPrefix(column, "End") {
			actualColumn := strings.TrimPrefix(column, "End")
			whereConditions = append(whereConditions, toSnakeCase(actualColumn)+" <= ?")
			args = append(args, value)
		} else if strings.HasPrefix(column, "Min") {
			actualColumn := strings.TrimPrefix(column, "Min")
			whereConditions = append(whereConditions, toSnakeCase(actualColumn)+" >= ?")
			args = append(args, value)
		} else if strings.HasPrefix(column, "Max") {
			actualColumn := strings.TrimPrefix(column, "Max")
			whereConditions = append(whereConditions, toSnakeCase(actualColumn)+" <= ?")
			args = append(args, value)
		} else {
			// Regular equality condition
			whereConditions = append(whereConditions, toSnakeCase(column)+" = ?")
			args = append(args, value)
		}
	}

	if len(whereConditions) > 0 {
		query += " WHERE " + strings.Join(whereConditions, " AND ")
	}

	// Add GROUP BY clause if specified
	if options != nil && len(options.GroupBy) > 0 {
		query += " GROUP BY " + strings.Join(options.GroupBy, ", ")
	}

	// Add ORDER BY clause if specified
	if options != nil && len(options.OrderBy) > 0 {
		query += " ORDER BY " + strings.Join(options.OrderBy, ", ")
	}

	// Add limit and offset
	if limit != nil {
		query += fmt.Sprintf(" LIMIT %d", *limit)
	}

	if offset != nil {
		query += fmt.Sprintf(" OFFSET %d", *offset)
	}

	return query, args
}

// Helper to extract conditions from a struct using reflection
func ExtractConditions(params interface{}) map[string]interface{} {
	conditions := make(map[string]interface{})

	v := reflect.ValueOf(params)
	if v.Kind() == reflect.Ptr {
		if v.IsNil() {
			return conditions
		}
		v = v.Elem()
	}

	if v.Kind() != reflect.Struct {
		return conditions
	}

	t := v.Type()
	for i := 0; i < v.NumField(); i++ {
		field := v.Field(i)
		fieldName := t.Field(i).Name

		// Skip unexported fields
		if !field.CanInterface() {
			continue
		}

		// Skip nil pointers
		if field.Kind() == reflect.Ptr && field.IsNil() {
			continue
		}

		// Skip Limit and Offset fields
		if fieldName == "Limit" || fieldName == "Offset" {
			continue
		}

		// Add field to conditions
		conditions[fieldName] = field.Interface()
	}

	return conditions
}

// Helper function to extract limit from params
func getLimitFromAny(params interface{}) *uint64 {
	// Try to use the QueryParams interface if implemented
	if qp, ok := params.(QueryParams); ok {
		return qp.GetLimit()
	}

	// Otherwise, use reflection to find a Limit field
	v := reflect.ValueOf(params)
	if v.Kind() == reflect.Ptr {
		v = v.Elem()
	}

	if v.Kind() == reflect.Struct {
		field := v.FieldByName("Limit")
		if field.IsValid() && field.Kind() == reflect.Ptr && !field.IsNil() {
			if limit, ok := field.Interface().(*uint64); ok {
				return limit
			}
		}
	}

	return nil
}

// Helper function to extract offset from params
func getOffsetFromAny(params interface{}) *uint64 {
	// Try to use the QueryParams interface if implemented
	if qp, ok := params.(QueryParams); ok {
		return qp.GetOffset()
	}

	// Otherwise, use reflection to find an Offset field
	v := reflect.ValueOf(params)
	if v.Kind() == reflect.Ptr {
		v = v.Elem()
	}

	if v.Kind() == reflect.Struct {
		field := v.FieldByName("Offset")
		if field.IsValid() && field.Kind() == reflect.Ptr && !field.IsNil() {
			if offset, ok := field.Interface().(*uint64); ok {
				return offset
			}
		}
	}

	return nil
}

// Helper to convert camelCase to snake_case
func toSnakeCase(s string) string {
	var result strings.Builder
	for i, r := range s {
		if i > 0 && r >= 'A' && r <= 'Z' {
			result.WriteRune('_')
		}
		result.WriteRune(r)
	}
	return strings.ToLower(result.String())
}

// USAGE PATTERN DOCUMENTATION
// ---------------------------
//
// The generic query system provides an efficient way to create
// query methods for all Xatu ClickHouse tables without duplicating code.
//
// To add support for a new table:
//
// 1. Define a params struct with the fields you want to query by in a separate file.
// 2. Create a wrapper method that uses QueryWithModel in the appropriate table-specific file.
//
// Special parameter naming conventions:
// - Regular fields (Field1, Hash, etc.) create equality conditions (field = ?)
// - StartX fields create >= conditions (x >= ?)
// - EndX fields create <= conditions (x <= ?)
// - MinX fields create >= conditions (x >= ?)
// - MaxX fields create <= conditions (x <= ?)
// - Limit and Offset are used for pagination
