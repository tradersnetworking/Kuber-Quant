import { useQuery } from "@tanstack/react-query";
import { publicFetchJson } from "@/lib/api-fetch";
import {
  DEFAULT_SERVICE_VISIBILITY,
  type ServiceKey,
  type ServiceVisibilityItem,
} from "@/lib/service-catalog";

export function useServiceVisibility() {
  const { data } = useQuery({
    queryKey: ["/api/service-visibility"],
    queryFn: () => publicFetchJson<{ services: ServiceVisibilityItem[] }>("/service-visibility"),
    staleTime: 60_000,
  });

  const services = data?.services && data.services.length > 0 ? data.services : DEFAULT_SERVICE_VISIBILITY;

  const isEnabled = (key: ServiceKey) => services.find(s => s.key === key)?.enabled !== false;

  return { services, isEnabled };
}
