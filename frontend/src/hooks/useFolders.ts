import { useState, useEffect, useCallback } from "react";
import { folderApi } from "../services/api/folderApi";
import type { Folder } from "../types";

export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setFolders(await folderApi.getAll());
    } catch (err) {
      console.error("Failed to load folders:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createFolder = useCallback(async (name: string) => {
    const folder = await folderApi.create(name);
    setFolders((prev) => [...prev, folder].sort((a, b) => a.name.localeCompare(b.name)));
    return folder;
  }, []);

  const renameFolder = useCallback(async (id: number, name: string) => {
    const updated = await folderApi.update(id, name);
    setFolders((prev) =>
      prev.map((f) => (f.id === id ? updated : f)).sort((a, b) => a.name.localeCompare(b.name))
    );
    return updated;
  }, []);

  const deleteFolder = useCallback(async (id: number) => {
    await folderApi.delete(id);
    setFolders((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return { folders, loading, refresh, createFolder, renameFolder, deleteFolder };
}
