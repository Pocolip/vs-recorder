import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { folderApi } from "../services/api/folderApi";
import type { Folder } from "../types";

interface FolderContextType {
  folders: Folder[];
  loading: boolean;
  refreshFolders: () => Promise<void>;
  createFolder: (name: string) => Promise<Folder>;
  renameFolder: (id: number, name: string) => Promise<Folder>;
  deleteFolder: (id: number) => Promise<void>;
  /** Bumped when teams are added/removed from folders so both sidebar and homepage can react */
  dataVersion: number;
  bumpDataVersion: () => void;
}

const FolderContext = createContext<FolderContextType | null>(null);

export const FolderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataVersion, setDataVersion] = useState(0);

  const refreshFolders = useCallback(async () => {
    try {
      setFolders(await folderApi.getAll());
    } catch (err) {
      console.error("Failed to load folders:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshFolders();
  }, [refreshFolders]);

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

  const bumpDataVersion = useCallback(() => {
    setDataVersion((v) => v + 1);
  }, []);

  return (
    <FolderContext.Provider
      value={{
        folders,
        loading,
        refreshFolders,
        createFolder,
        renameFolder,
        deleteFolder,
        dataVersion,
        bumpDataVersion,
      }}
    >
      {children}
    </FolderContext.Provider>
  );
};

export function useFolderContext() {
  const ctx = useContext(FolderContext);
  if (!ctx) throw new Error("useFolderContext must be used within FolderProvider");
  return ctx;
}
