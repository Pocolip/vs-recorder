package com.yeskatronics.vs_recorder_backend.entities;

import com.yeskatronics.vs_recorder_backend.utils.Utilities;
import lombok.Data;

@Data
public class BasicEntity {

    private String name;

    public BasicEntity(){
        this.name = Utilities.generateName();
    }
}
