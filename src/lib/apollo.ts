'use client';
import {
  ApolloClient,
  ApolloProvider,
  HttpLink,
  InMemoryCache,
  split,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { useMemo } from 'react';
import { nhost } from './nhost';

// ---------------------------------------------------------------------------
// Apollo client with:
// - HTTP link for queries/mutations (auto-includes latest access token)
// - WebSocket link for subscriptions (reconnects on token refresh)
// - Auth-aware split routing
// ---------------------------------------------------------------------------
export default function ApolloProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = useMemo(() => {
    // HTTP link — base endpoint
    const httpLink = new HttpLink({
      uri: nhost.graphql.httpUrl,
    });

    // Auth link — injects fresh token on every request
    const authLink = setContext(async (_, { headers }) => {
      const token = await nhost.auth.getAccessToken();
      return {
        headers: {
          ...headers,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      };
    });

    // WebSocket link for subscriptions
    const wsLink = new GraphQLWsLink(
      createClient({
        url: nhost.graphql.wsUrl,
        connectionParams: async () => {
          const token = await nhost.auth.getAccessToken();
          return {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          };
        },
        // Reconnect on auth token refresh
        shouldRetry: () => true,
        retryAttempts: 5,
      }),
    );

    // Route subscriptions to WS, everything else to HTTP
    const splitLink = split(
      ({ query }) => {
        const def = getMainDefinition(query);
        return (
          def.kind === 'OperationDefinition' &&
          def.operation === 'subscription'
        );
      },
      wsLink,
      authLink.concat(httpLink),
    );

    return new ApolloClient({
      link: splitLink,
      cache: new InMemoryCache({
        typePolicies: {
          // Real-time step_runs — always use network (no stale cache)
          step_runs: {
            keyFields: ['id'],
          },
          workflow_runs: {
            keyFields: ['id'],
          },
        },
      }),
    });
  }, []);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
