package com.yeskatronics.vs_recorder_backend.mappers;

import com.yeskatronics.vs_recorder_backend.dto.FolderDTO;
import com.yeskatronics.vs_recorder_backend.entities.Folder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface FolderMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "position", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    Folder toEntity(FolderDTO.CreateRequest dto);

    @Mapping(source = "folder.id", target = "id")
    @Mapping(source = "folder.name", target = "name")
    @Mapping(source = "folder.position", target = "position")
    @Mapping(source = "folder.createdAt", target = "createdAt")
    @Mapping(source = "teamCount", target = "teamCount")
    FolderDTO.Response toResponse(Folder folder, int teamCount);
}
