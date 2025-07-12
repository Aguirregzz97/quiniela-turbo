"use client";

import { GetUserType } from "@/lib/user/getUser";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

async function queryUser(id: string) {
  const response = await axios.get<GetUserType>(`/api/user/${id}`);
  return response.data;
}

export default function useUser(id: string) {
  return useQuery({
    queryKey: [`user-${id}`],
    queryFn: () => queryUser(id),
  });
}
