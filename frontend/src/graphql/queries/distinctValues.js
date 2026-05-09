import { gql } from '@apollo/client/core';

export const GET_DISTINCT_VALUES = gql`
  query DistinctValues(
    $table: DataTable!
    $column: String!
    $filter: ColumnFilterContext
  ) {
    distinctValues(table: $table, column: $column, filter: $filter)
  }
`;
