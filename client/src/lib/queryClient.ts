import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        // Special handling for trial status endpoint
        const isTrial = queryKey[0] === '/api/trial/status';
        
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
          // Add cache-busting for trial status
          headers: isTrial ? {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          } : undefined
        });

        if (!res.ok) {
          if (res.status >= 500) {
            throw new Error(`${res.status}: ${res.statusText}`);
          }

          throw new Error(`${res.status}: ${await res.text()}`);
        }

        const data = await res.json();
        return data;
      },
      // Default settings
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 0,
      cacheTime: 0,
      retry: false,
    },
    mutations: {
      retry: false,
    }
  },
});
