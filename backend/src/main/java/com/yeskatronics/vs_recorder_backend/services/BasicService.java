package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.entities.BasicEntity;
import lombok.Data;
import org.springframework.stereotype.Service;

@Data
@Service
public class BasicService {

    private BasicEntity entity;

    public BasicService(){
        this.entity = new BasicEntity();
    }
}
