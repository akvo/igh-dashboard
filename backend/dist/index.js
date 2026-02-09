import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { typeDefs } from "./schema/typeDefs.js";
import { resolvers } from "./schema/resolvers.js";
import { createLoaders } from "./utils/dataloader.js";
const server = new ApolloServer({
    typeDefs,
    resolvers,
});
const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async () => ({
        // Create fresh DataLoaders for each request to ensure proper batching
        loaders: createLoaders(),
    }),
});
console.log(`GraphQL API ready at ${url}`);
//# sourceMappingURL=index.js.map