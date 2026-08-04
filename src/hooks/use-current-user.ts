"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type UserDto } from "@/lib/api-client";

export function useCurrentUser() {
  return useQuery<UserDto>({
    queryKey: ["user"],
    queryFn: () => api<UserDto>("/api/user"),
    staleTime: 15_000,
  });
}
