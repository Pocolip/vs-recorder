package com.yeskatronics.vs_recorder_backend.controllers;

import com.yeskatronics.vs_recorder_backend.dto.FolderDTO;
import com.yeskatronics.vs_recorder_backend.entities.Folder;
import com.yeskatronics.vs_recorder_backend.mappers.FolderMapper;
import com.yeskatronics.vs_recorder_backend.repositories.TeamRepository;
import com.yeskatronics.vs_recorder_backend.security.CustomUserDetailsService;
import com.yeskatronics.vs_recorder_backend.services.FolderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/folders")
@RequiredArgsConstructor
@Slf4j
public class FolderController {

    private final FolderService folderService;
    private final FolderMapper folderMapper;
    private final TeamRepository teamRepository;
    private final CustomUserDetailsService userDetailsService;

    private Long getCurrentUserId(Authentication authentication) {
        String username = authentication.getName();
        return userDetailsService.getUserIdByUsername(username);
    }

    @PostMapping
    public ResponseEntity<FolderDTO.Response> createFolder(
            Authentication authentication,
            @Valid @RequestBody FolderDTO.CreateRequest request) {

        Long userId = getCurrentUserId(authentication);
        Folder folder = folderService.createFolder(request.getName(), userId);
        FolderDTO.Response response = folderMapper.toResponse(folder, 0);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<FolderDTO.Response>> getFolders(Authentication authentication) {
        Long userId = getCurrentUserId(authentication);
        List<Folder> folders = folderService.getFoldersByUserId(userId);

        List<FolderDTO.Response> responses = folders.stream()
                .map(folder -> {
                    int teamCount = teamRepository.countByFolderId(folder.getId());
                    return folderMapper.toResponse(folder, teamCount);
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<FolderDTO.Response> updateFolder(
            @PathVariable Long id,
            Authentication authentication,
            @Valid @RequestBody FolderDTO.UpdateRequest request) {

        Long userId = getCurrentUserId(authentication);
        Folder folder = folderService.updateFolder(id, userId, request.getName());
        int teamCount = teamRepository.countByFolderId(folder.getId());
        FolderDTO.Response response = folderMapper.toResponse(folder, teamCount);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFolder(
            @PathVariable Long id,
            Authentication authentication) {

        Long userId = getCurrentUserId(authentication);
        folderService.deleteFolder(id, userId);
        return ResponseEntity.noContent().build();
    }
}
