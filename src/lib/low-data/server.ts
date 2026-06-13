import { LOW_DATA_PAGE_SIZE } from "@/lib/low-data/constants";

/** Platform always uses compact pagination for minimal payload sizes. */
export async function getDataPageSize(): Promise<number> {
  return LOW_DATA_PAGE_SIZE;
}
