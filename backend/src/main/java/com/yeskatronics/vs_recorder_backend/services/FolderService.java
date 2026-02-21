package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.entities.Folder;
import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.entities.User;
import com.yeskatronics.vs_recorder_backend.repositories.FolderRepository;
import com.yeskatronics.vs_recorder_backend.repositories.TeamRepository;
import com.yeskatronics.vs_recorder_backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class FolderService {

    private final FolderRepository folderRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;

    public Folder createFolder(String name, Long userId) {
        log.info("Creating folder '{}' for user ID: {}", name, userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));

        Folder folder = new Folder();
        folder.setName(name);
        folder.setUser(user);
        folder.setPosition(folderRepository.countByUserId(userId));

        return folderRepository.save(folder);
    }

    @Transactional(readOnly = true)
    public List<Folder> getFoldersByUserId(Long userId) {
        return folderRepository.findByUserIdOrderByPositionAsc(userId);
    }

    public Folder updateFolder(Long id, Long userId, String name) {
        log.info("Updating folder ID: {} for user ID: {}", id, userId);

        Folder folder = folderRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Folder not found with ID: " + id + " for user: " + userId));

        folder.setName(name);
        return folderRepository.save(folder);
    }

    public void deleteFolder(Long id, Long userId) {
        log.info("Deleting folder ID: {} for user ID: {}", id, userId);

        Folder folder = folderRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Folder not found with ID: " + id + " for user: " + userId));

        // Remove folder from all teams (clears team_folders join table rows)
        List<Team> teams = teamRepository.findByFolderId(id);
        for (Team team : teams) {
            team.removeFolder(folder);
        }
        teamRepository.saveAll(teams);

        folderRepository.delete(folder);

        // Re-compact positions to avoid gaps
        List<Folder> remaining = folderRepository.findByUserIdOrderByPositionAsc(userId);
        for (int i = 0; i < remaining.size(); i++) {
            remaining.get(i).setPosition(i);
        }
        folderRepository.saveAll(remaining);
    }

    public void reorderFolders(Long userId, List<Long> orderedIds) {
        log.info("Reordering {} folders for user ID: {}", orderedIds.size(), userId);

        List<Folder> folders = folderRepository.findByUserIdOrderByPositionAsc(userId);

        if (folders.size() != orderedIds.size()) {
            throw new IllegalArgumentException("Folder count mismatch: expected " + folders.size() + ", got " + orderedIds.size());
        }

        Map<Long, Folder> folderMap = folders.stream()
                .collect(Collectors.toMap(Folder::getId, f -> f));

        for (int i = 0; i < orderedIds.size(); i++) {
            Folder folder = folderMap.get(orderedIds.get(i));
            if (folder == null) {
                throw new IllegalArgumentException("Folder ID " + orderedIds.get(i) + " not found for user: " + userId);
            }
            folder.setPosition(i);
        }

        folderRepository.saveAll(folders);
    }

    @Transactional(readOnly = true)
    public Folder getFolderByIdAndUserId(Long id, Long userId) {
        return folderRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Folder not found with ID: " + id + " for user: " + userId));
    }
}
