import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import { useAppStore } from "../store/useAppStore";

// Shape returned by GET /profile/completeness. Kept here (not in api.ts) so
// every consumer (Dashboard, Profile) works off one typed contract instead
// of each page re-guessing the field names off `any`.
export interface ProfileCompleteness {
  overall_percentage: number;
  sections: Record<string, number>;
  suggestions: string[];
}

export function useProfile() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ["profile"],
    queryFn: api.getProfile,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: isAuthenticated,
  });
}

export function useProfileCompleteness() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  return useQuery<ProfileCompleteness>({
    queryKey: ["profileCompleteness"],
    queryFn: api.getProfileCompleteness,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: isAuthenticated,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Record<string, unknown>) => api.updateProfile(updates),
    onMutate: async (newUpdates) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["profile"] });

      // Snapshot the previous value
      const previousProfile = queryClient.getQueryData(["profile"]);

      // Optimistically update to the new value
      queryClient.setQueryData(["profile"], (old: Record<string, unknown> | undefined) => {
        if (!old) return old;
        return {
          ...old,
          ...newUpdates,
        };
      });

      // Return a context object with the snapshotted value
      return { previousProfile };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (_err, _newUpdates, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(["profile"], context.previousProfile);
      }
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["profileCompleteness"] });
    },
  });
}
