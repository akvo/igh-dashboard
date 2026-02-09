/**
 * Test helper for making GraphQL queries against the API
 */

import { ApolloServer } from "@apollo/server";
import { typeDefs } from "../../src/schema/typeDefs.js";
import { resolvers } from "../../src/schema/resolvers.js";
import { createLoaders } from "../../src/utils/dataloader.js";

// Shared server instance for tests
let server: ApolloServer | null = null;

/**
 * Get or create the Apollo Server instance
 */
export function getServer(): ApolloServer {
  if (!server) {
    server = new ApolloServer({
      typeDefs,
      resolvers,
    });
  }
  return server;
}

/**
 * Execute a GraphQL query against the test server
 */
export async function query<T = unknown>(
  queryString: string,
  variables?: Record<string, unknown>,
): Promise<{ data: T; errors?: Array<{ message: string }> }> {
  const srv = getServer();

  const response = await srv.executeOperation(
    {
      query: queryString,
      variables,
    },
    {
      contextValue: {
        loaders: createLoaders(),
      },
    },
  );

  if (response.body.kind === "single") {
    return {
      data: response.body.singleResult.data as T,
      errors: response.body.singleResult.errors as Array<{ message: string }> | undefined,
    };
  }

  throw new Error("Unexpected incremental response");
}
