import apiClient from "./client";
import type { Folder } from "../../types";

export const folderApi = {
  getAll: () =>
    apiClient.get("/api/folders") as Promise<Folder[]>,

  create: (name: string) =>
    apiClient.post("/api/folders", { name }) as Promise<Folder>,

  update: (id: number, name: string) =>
    apiClient.patch(`/api/folders/${id}`, { name }) as Promise<Folder>,

  delete: (id: number) =>
    apiClient.delete(`/api/folders/${id}`) as Promise<void>,

  reorder: (folderIds: number[]) =>
    apiClient.put("/api/folders/reorder", { folderIds }) as Promise<void>,
};

export default folderApi;
