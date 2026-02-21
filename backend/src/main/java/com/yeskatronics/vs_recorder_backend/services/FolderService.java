package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.entities.Folder;
import com.yeskatronics.vs_recorder_backend.entities.User;
import com.yeskatronics.vs_recorder_backend.repositories.FolderRepository;
import com.yeskatronics.vs_recorder_backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class FolderService {

    private final FolderRepository folderRepository;
    private final UserRepository userRepository;

    public Folder createFolder(String name, Long userId) {
        log.info("Creating folder '{}' for user ID: {}", name, userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));

        Folder folder = new Folder();
        folder.setName(name);
        folder.setUser(user);

        return folderRepository.save(folder);
    }

    @Transactional(readOnly = true)
    public List<Folder> getFoldersByUserId(Long userId) {
        return folderRepository.findByUserIdOrderByNameAsc(userId);
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

        folderRepository.delete(folder);
    }

    @Transactional(readOnly = true)
    public Folder getFolderByIdAndUserId(Long id, Long userId) {
        return folderRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Folder not found with ID: " + id + " for user: " + userId));
    }
}
